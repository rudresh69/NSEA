# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Key Commands

The project uses `pnpm` (see `packageManager` in `package.json`). Prefer `pnpm` over `npm` or `yarn`.

### Install dependencies

- Install: `pnpm install`

### Local development

- Start the full stack dev server (Express + Vite):
  - `pnpm dev`
  - This runs `server/_core/index.ts` via `tsx` with `NODE_ENV=development`. In dev mode the Express server mounts Vite (see `server/_core/vite.ts` and `vite.config.ts`), so both API and frontend are available behind the same server.
  - The server prefers port `3000` but will scan a small range for an available port.

### Build and production run

There are separate builds for the client and server; both are required for a complete production bundle.

- Build client assets (Vite, output to `dist/public`):
  - `pnpm build`
- Build the server (esbuild, output to `dist`):
  - `pnpm build:server`
- Start the production server (serves static assets from `dist/public`):
  - `pnpm start`
- Typical production sequence:
  - `pnpm build && pnpm build:server && pnpm start`

### Type-checking and formatting

- TypeScript type-check (no emit):
  - `pnpm check`
- Format the codebase with Prettier:
  - `pnpm format`

There is no dedicated lint script configured (e.g. ESLint); type-checks plus Prettier are the primary quality gates.

### Tests (Vitest)

Tests are wired through Vitest (see `devDependencies.vitest`).

- Run the full test suite (non-watch):
  - `pnpm test`
- Run a single test file or pattern (using the Vitest CLI directly):
  - `pnpm vitest path/to/file.test.ts`
  - `pnpm vitest --run tests/unit/my-feature.test.ts`
- Run tests matching a specific test name:
  - `pnpm vitest -t "name of the test"`

Adjust paths/patterns to whatever test layout you add; there is no existing tests directory yet.

### Database migrations (Drizzle + Postgres)

Database access is via Drizzle ORM targeting Postgres, configured in `drizzle.config.ts` and `drizzle/schema.ts`.

- Ensure `DATABASE_URL` (or `SUPABASE_DATABASE_URL`) is set in your environment; this is used for both Drizzle migrations and runtime DB access.
- Generate SQL and apply migrations:
  - `pnpm db:push`
- Migration artifacts and schema live under `drizzle/`:
  - `drizzle/schema.ts` – source of truth for tables
  - `drizzle/*.sql` and `drizzle/meta/*` – generated migrations and metadata

## High-Level Architecture

This is a full-stack TypeScript app with a shared type layer, a tRPC-based backend, and a Vite + React frontend. The same core backend can run as an Express server or behind Vercel serverless functions.

### Top-level layout

- `server/` – core backend logic (Express HTTP server, tRPC router, Supabase integration, LLM integration, storage, etc.).
- `client/` – React SPA built with Vite, `wouter`, React Query, and a set of headless UI components.
- `shared/` – constants and types shared between server and client (including DB and error types).
- `drizzle/` – Drizzle ORM schema and generated migrations for a Postgres DB.
- `api/` – Vercel-style serverless handlers that wrap the same `server/` logic for deployment as edge/serverless functions.

### Backend: Express + tRPC core

**Entrypoint and HTTP wiring**

- `server/_core/index.ts` is the main Node entry used in development and production:
  - Sets up environment (`dotenv/config`, `ENV` from `server/_core/env.ts`).
  - Initializes an Express app and HTTP server, including JSON/body parsers with large limits for file uploads.
  - Calls `initializeAdminUser` once on startup to ensure an admin user/profile exists in Supabase/DB, driven by environment variables (admin email/password, Supabase keys). This includes safety checks for missing tables and missing Supabase service-role key.
  - Registers OAuth routes (`registerOAuthRoutes` in `server/_core/oauth.ts`).
  - Mounts the tRPC API at `/api/trpc` via `createExpressMiddleware`, using `appRouter` from `server/routers.ts` and `createContext` from `server/_core/context.ts`.
  - In development, calls `setupVite(app, server)` (see `server/_core/vite.ts`) to run Vite in middleware mode for the frontend; in production it serves pre-built static assets from `dist/public` via `serveStatic(app)`.
  - Chooses an available port starting from `process.env.PORT || 3000` and logs the final URL.

**tRPC setup and auth guards**

- `server/_core/trpc.ts` configures the tRPC instance with `superjson` and a context type `TrpcContext` from `server/_core/context.ts`.
- It exports three key procedure helpers used across routers:
  - `publicProcedure` – no authentication required.
  - `protectedProcedure` – requires `ctx.user` to be set; otherwise throws `TRPCError(UNAUTHORIZED)` with message `UNAUTHED_ERR_MSG` from `shared/const.ts`.
  - `adminProcedure` – requires `ctx.user.role === 'admin'`; otherwise throws `TRPCError(FORBIDDEN)` with message `NOT_ADMIN_ERR_MSG`.
- These guards are the canonical way to protect backend routes; any new tRPC router or procedure should compose them rather than rolling custom auth logic.

**tRPC router surface (`server/routers.ts`)**

`server/routers.ts` defines `appRouter`, the single tRPC router exposed to both the Express server and the Vercel `/api/trpc` handler. It composes multiple sub-routers and procedures:

- `system` – system-level utilities (from `server/_core/systemRouter.ts`):
  - `health` – simple health check endpoint with a timestamp input.
  - `notifyOwner` – admin-only notification entrypoint that delegates to `notifyOwner` in `server/_core/notification.ts`.
- `auth` – authentication/session helpers:
  - `me` – returns `ctx.user` if present.
  - `logout` – clears Supabase-related cookies (`sb-access-token`, `sb-refresh-token`, `sb-session-token`) and the legacy cookie (`COOKIE_NAME` from `shared/const.ts`).
- `profile` – profile read/update operations, all `protectedProcedure`.
- `sessions` – manage the current user’s sessions via `user_sessions` table (uses DB helpers like `getUserSessions`, `revokeUserSession`, `revokeAllUserSessions`).
- `loginHistory` – returns the authenticated user’s login history with pagination.
- `vehicles` – CRUD around vehicles owned by the current user, keyed by userId/vehicleId.
- `emissions` – ingestion and querying of emission readings:
  - `latest`, `history` – read emission data per vehicle.
  - `ingest` – public ingestion endpoint keyed by `deviceId`; resolves to a vehicle, inserts an `emissionReadings` row, and raises alerts if thresholds are exceeded.
  - `generateMock`, `populateHistory` – utilities to generate mock readings and historical data for vehicles; used for demos/testing and admin tooling.
- `alerts` – access to active alerts and alerts per vehicle.
- `admin` – admin-only reporting endpoints, including system stats, user list, all vehicles, and recent emission readings.
- `ai` – integration with the LLM system (see below), exposing a `chat` mutation that accepts an array of `{ role, content }` messages, injects a system prompt if missing, calls the LLM, and returns a plain-text response.

Any new backend functionality should be wired here so it’s automatically available to the frontend via typed tRPC calls.

### Backend: LLM integration

- `server/_core/llm.ts` defines a small, library-like wrapper around an external chat-completions API:
  - Strongly typed `Message`, content variants (`TextContent`, `ImageContent`, `FileContent`), tool definitions, and response structures.
  - `invokeLLM(params: InvokeParams)` normalizes messages/content, tool configuration, and response formats.
  - Uses env configuration from `ENV` in `server/_core/env.ts` to determine the API URL and API key. If the API key is missing, it throws early.
  - Sends a POST request with a JSON payload including `model`, `messages`, optional tools, `tool_choice`, `max_tokens`, and `response_format`.
- The `ai.chat` tRPC route in `server/routers.ts` is the primary entrypoint for application code to call `invokeLLM`.
- On the frontend, `client/src/components/AIChatBox.tsx` is a reusable chat UI component that expects an array of messages and a callback `onSendMessage`, making it straightforward to wire the `ai.chat` mutation to a visible chat experience.

### Backend: Supabase and auth/session model

Auth is delegated to Supabase, with additional user and session metadata stored in the Postgres DB and managed via Drizzle.

- `server/_core/supabase.ts` exports:
  - `supabaseAdmin` – service-side Supabase client authenticated with a service-role key (or falling back to the anon key) used for admin operations (creating users, reading admin-only data).
  - `createSupabaseClient(accessToken?: string)` – helper to create a Supabase client for a specific user token.
- `server/_core/env.ts` centralizes configuration for:
  - JWT/cookie secret
  - Database URL(s)
  - Admin bootstrap credentials (email/password)
  - Supabase URLs and keys
  - External Forge/LLM API URL and key
  - OAuth client config
- `server/_core/index.ts` uses the env values to:
  - Check that Supabase tables exist.
  - Locate or create the admin auth user and associated `user_profiles` record.
- `api/auth/login.ts` is a Vercel function that handles username/password login:
  - Uses Supabase auth (via `supabaseAuth` from `server/_core/supabaseAuth.ts`).
  - Records login history and session metadata in the DB (`login_history`, `user_sessions`) via `db` helpers.
  - Sets long-lived cookies (`sb-access-token`, `sb-refresh-token`, `sb-session-token`) with consistent options via `getSessionCookieOptions`.

### Database: Drizzle schema and usage

The relational schema is defined centrally in `drizzle/schema.ts` and used both by backend code and by consumers via `shared/types.ts`.

Key tables (names from `drizzle/schema.ts`):

- `userProfiles` (`user_profiles`) – extra profile and role info keyed by Supabase auth user ID (`uuid`).
- `vehicles` – vehicles owned by a user, including `fuelType` and a unique `deviceId` (sensor identifier).
- `emissionReadings` – time-series emission data per vehicle (CO2, CO, NOx, PM level, timestamps).
- `alerts` – alerts generated when emission thresholds are exceeded (including measured/threshold values and active flag).
- `userSessions` – long-lived session tokens and associated device/agent metadata.
- `loginHistory` – audit trail of login attempts (status, failure reasons, IP/user agent/device info).

Important shared exports:

- `shared/types.ts` re-exports Drizzle types (`EmissionReading`, `Vehicle`, `UserProfile`, `Alert`, etc.) and error types from `shared/_core/errors.ts`, making these available to both server and client.
- `shared/const.ts` holds constants that must remain consistent across tiers:
  - `COOKIE_NAME`, `ONE_YEAR_MS`, `AXIOS_TIMEOUT_MS`.
  - `UNAUTHED_ERR_MSG`, `NOT_ADMIN_ERR_MSG` – used by both backend errors and frontend error handling.

The `server/db.ts` module (not fully listed here) encapsulates DB access and is the only layer the tRPC routers talk to for persistence. When adding new tables or queries, mirror the existing pattern:

1. Extend `drizzle/schema.ts` with new tables/columns.
2. Run `pnpm db:push` to generate/apply migrations.
3. Add strongly-typed helpers in `server/db.ts`.
4. Expose the new functionality through `server/routers.ts`.

### Frontend: React + Vite + tRPC

**Vite configuration and module resolution**

- `vite.config.ts` sets up the tooling:
  - Plugins: React (`@vitejs/plugin-react`), Tailwind CSS (`@tailwindcss/vite`), a JSX location plugin, and `vite-plugin-manus-runtime`.
  - `root` is `client/`, with `publicDir` as `client/public` and build output to `dist/public`.
  - Aliases:
    - `@` → `client/src`
    - `@shared` → `shared`
    - `@assets` → `attached_assets`
- These aliases are used heavily in both client and server code to share constants/types (`@shared`) and keep import paths ergonomic.

**Client bootstrapping and networking**

- `client/src/main.tsx` is the SPA entrypoint:
  - Creates a `QueryClient` for React Query.
  - Subscribes to Query and Mutation caches to globally handle errors; if an error corresponds to an unauthorized tRPC response (`UNAUTHED_ERR_MSG` or error code `UNAUTHORIZED`), and if the user is not already on a public route (`/`, `/login`, `/register`), it redirects to `/login` with a simple loop prevention based on `sessionStorage`.
  - Builds a tRPC client (`trpc.createClient`) pointing to `/api/trpc` using `httpBatchLink`, `superjson`, and `credentials: 'include'` for cookie-based auth.
  - Renders `<App />` wrapped in `trpc.Provider` and `QueryClientProvider`.

**Routing and layout**

- `client/src/App.tsx` sets up the app shell:
  - Wraps everything in `ErrorBoundary`, `ThemeProvider`, `TooltipProvider`, and global `<Toaster />` notifications.
  - Uses `wouter`’s `<Switch>` and `<Route>` components to define routes:
    - `/` → `Home`
    - `/login` → `Login`
    - `/register` → `Register`
    - `/dashboard` → `Dashboard`
    - `/my-vehicles` → `VehicleManagement`
    - `/admin/overview` → `AdminDashboard`
    - `/profile` → `Profile`
    - `/sessions` → `Sessions`
    - Fallback → `NotFound`
  - There is a note in `App.tsx` to consider authentication for certain routes; the core enforcement currently comes from server-side guards and the global unauthorized redirect logic in `main.tsx`.

**UI components and composition**

- `client/src/components/ui/*` contains a set of composable UI primitives (buttons, forms, inputs, dialogs, tooltips, etc.) in a style similar to shadcn/ui.
- Higher-level components like `DashboardLayout`, `DashboardLayoutSkeleton`, and `AIChatBox` compose these primitives into application-level layouts and experiences.
- `client/src/_core/hooks/useAuth.ts` and other hooks in `client/src/hooks` provide reusable client-side state and composition logic.

### Shared types and constants

The `shared/` directory is the central place for:

- Shared constants (`shared/const.ts`) controlling cookies, timeouts, and error messages that must remain consistent across server/client.
- Shared types (`shared/types.ts`) re-exporting Drizzle-generated types and shared error types.
- Any new cross-cutting types or constants should be added here and imported via the `@shared` alias to avoid duplication.

### Vercel serverless integration

The `api/` directory adapts the core backend to Vercel’s serverless model while reusing the same routers and context.

- `api/trpc/[...path].ts`:
  - Uses `@trpc/server/adapters/fetch` (`fetchRequestHandler`) to expose `appRouter` over Vercel’s `VercelRequest`/`VercelResponse` objects.
  - Implements CORS preflight for `OPTIONS` and normalizes the Vercel request into a Fetch `Request`, then into an Express-like `req`/`res` pair expected by `createContext`.
  - Bridges response back to Vercel by copying headers and sending the response body.
- `api/auth/*.ts` (e.g. `login.ts`) expose auth flows as serverless endpoints but still rely on shared DB and Supabase helpers under `server/`.

Use the serverless handlers for Vercel deployments; in local development or traditional Node hosting, the Express entrypoint under `server/_core/index.ts` remains the primary runtime.

## How to Extend the System Safely

When using Warp agents to modify this codebase, prefer following the existing layering and patterns:

- **New API functionality**: Add procedures to `server/routers.ts` (using `publicProcedure`/`protectedProcedure`/`adminProcedure`), implement DB access in `server/db.ts`, and consume them from the frontend through `trpc.*` hooks generated from `client/src/lib/trpc.ts`.
- **New DB tables/fields**: Update `drizzle/schema.ts`, run `pnpm db:push`, then surface typed accessors in `server/db.ts` and re-export any useful types via `shared/types.ts`.
- **New pages/routes**: Add a React component in `client/src/pages`, register it in `client/src/App.tsx`, and wire any data requirements through tRPC hooks.
- **Auth-protected features**: Use the tRPC guards (`protectedProcedure`, `adminProcedure`) and rely on the global unauthorized redirect in `client/src/main.tsx` instead of performing ad hoc checks in multiple places.
