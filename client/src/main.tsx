import { trpc } from "@/lib/trpc";
import { UNAUTHED_ERR_MSG } from '@shared/const';
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink, TRPCClientError } from "@trpc/client";
import { createRoot } from "react-dom/client";
import superjson from "superjson";
import App from "./App";
import "./index.css";

const queryClient = new QueryClient();

const redirectToLoginIfUnauthorized = (error: unknown) => {
  if (!(error instanceof TRPCClientError)) return;
  if (typeof window === "undefined") return;

  const isUnauthorized = error.message === UNAUTHED_ERR_MSG || error.data?.code === "UNAUTHORIZED";

  if (!isUnauthorized) return;

  // Don't redirect if already on public pages
  const publicPaths = ["/", "/login", "/register"];
  const currentPath = window.location.pathname;
  
  if (publicPaths.includes(currentPath)) return;
  
  // Prevent redirect loops - only redirect once
  if (sessionStorage.getItem("auth-redirect-attempted")) {
    return;
  }
  
  sessionStorage.setItem("auth-redirect-attempted", "true");
  setTimeout(() => {
    sessionStorage.removeItem("auth-redirect-attempted");
    window.location.href = "/login";
  }, 100);
};

queryClient.getQueryCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.query.state.error;
    // Don't redirect for auth.me queries - they're expected to fail when not logged in
    const queryKey = event.query.queryKey;
    if (Array.isArray(queryKey) && queryKey[0]?.[0] === "auth" && queryKey[0]?.[1] === "me") {
      // This is expected - user is not authenticated
      return;
    }
    redirectToLoginIfUnauthorized(error);
    console.error("[API Query Error]", error);
  }
});

queryClient.getMutationCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.mutation.state.error;
    redirectToLoginIfUnauthorized(error);
    console.error("[API Mutation Error]", error);
  }
});

const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: "/api/trpc",
      transformer: superjson,
      fetch(input, init) {
        return globalThis.fetch(input, {
          ...(init ?? {}),
          credentials: "include",
        });
      },
    }),
  ],
});

createRoot(document.getElementById("root")!).render(
  <trpc.Provider client={trpcClient} queryClient={queryClient}>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </trpc.Provider>
);
