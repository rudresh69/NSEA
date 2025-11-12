import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router, protectedProcedure, adminProcedure } from "./_core/trpc";
import { z } from "zod";
import { getUserVehicles, getVehicleById, getVehicleByDeviceId, createVehicle, deleteVehicle, getLatestEmissionReading, getEmissionHistory, createEmissionReading, getActiveAlerts, getVehicleAlerts, createAlert, updateUserProfile, getUserSessions, revokeUserSession, revokeAllUserSessions, getUserLoginHistory, getAllUsers, getAllVehicles, getAllEmissionReadings, getSystemStats } from "./db";
import { invokeLLM, type Message } from "./_core/llm";
import { generateMockEmissionReading, generateHistoricalData } from "./_core/mockDataGenerator";

export const appRouter = router({
  // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      // Clear Supabase auth cookies
      ctx.res.clearCookie("sb-access-token", { ...cookieOptions, maxAge: -1 });
      ctx.res.clearCookie("sb-refresh-token", { ...cookieOptions, maxAge: -1 });
      ctx.res.clearCookie("sb-session-token", { ...cookieOptions, maxAge: -1 });
      // Also clear legacy cookie if it exists
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  // Profile management
  profile: router({
    get: protectedProcedure.query(async ({ ctx }) => {
      if (!ctx.user) {
        throw new Error("Unauthorized");
      }
      return ctx.user;
    }),
    update: protectedProcedure.input(z.object({
      name: z.string().optional(),
      email: z.string().email().optional(),
      phone: z.string().optional(),
      avatarUrl: z.string().url().optional().nullable(),
    })).mutation(async ({ ctx, input }) => {
      if (!ctx.user) {
        throw new Error("Unauthorized");
      }
      const updatedUser = await updateUserProfile(ctx.user.id, input);
      return updatedUser;
    }),
  }),

  // Session management
  sessions: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      if (!ctx.user) {
        throw new Error("Unauthorized");
      }
      const sessions = await getUserSessions(ctx.user.id);
      return sessions;
    }),
    revoke: protectedProcedure.input(z.object({
      sessionId: z.string().uuid(),
    })).mutation(async ({ ctx, input }) => {
      if (!ctx.user) {
        throw new Error("Unauthorized");
      }
      const success = await revokeUserSession(input.sessionId, ctx.user.id);
      return { success };
    }),
    revokeAll: protectedProcedure.mutation(async ({ ctx }) => {
      if (!ctx.user) {
        throw new Error("Unauthorized");
      }
      const success = await revokeAllUserSessions(ctx.user.id);
      return { success };
    }),
  }),

  // Login history
  loginHistory: router({
    list: protectedProcedure.input(z.object({
      limit: z.number().min(1).max(100).default(50),
    })).query(async ({ ctx, input }) => {
      if (!ctx.user) {
        throw new Error("Unauthorized");
      }
      const history = await getUserLoginHistory(ctx.user.id, input.limit);
      return history;
    }),
  }),

  // Vehicle management
  vehicles: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      // If no user, return empty array
      if (!ctx.user) return [];
      const vehicles = await getUserVehicles(ctx.user.id);
      return vehicles || [];
    }),
    get: protectedProcedure.input(z.object({ vehicleId: z.number() })).query(async ({ input }) => {
      const vehicle = await getVehicleById(input.vehicleId);
      return vehicle || null;
    }),
    create: protectedProcedure.input(z.object({
      make: z.string(),
      model: z.string(),
      fuelType: z.string(),
      deviceId: z.string(),
    })).mutation(async ({ ctx, input }) => {
      if (!ctx.user) {
        throw new Error("Unauthorized");
      }
      
      const result = await createVehicle({
        ownerId: ctx.user.id,
        ...input,
      });
      return result || { success: true };
    }),
    delete: protectedProcedure.input(z.object({ vehicleId: z.number() })).mutation(async ({ ctx, input }) => {
      if (!ctx.user) {
        throw new Error("Unauthorized");
      }
      const success = await deleteVehicle(input.vehicleId, ctx.user.id);
      if (!success) {
        throw new Error("Vehicle not found or you don't have permission to delete it");
      }
      return { success: true };
    }),
  }),

  // Emission readings and compliance
  emissions: router({
    latest: protectedProcedure.input(z.object({ vehicleId: z.number() })).query(async ({ input }) => {
      const reading = await getLatestEmissionReading(input.vehicleId);
      return reading || null;
    }),
    history: protectedProcedure.input(z.object({ vehicleId: z.number(), hoursBack: z.number().default(24) })).query(async ({ input }) => {
      const history = await getEmissionHistory(input.vehicleId, input.hoursBack);
      return history || [];
    }),
    ingest: publicProcedure.input(z.object({
      deviceId: z.string(),
      co2: z.number().optional(),
      co: z.number().optional(),
      nox: z.number().optional(),
      pmLevel: z.number().optional(),
    })).mutation(async ({ input }) => {
      const vehicle = await getVehicleByDeviceId(input.deviceId);
      if (!vehicle) throw new Error("Vehicle not found");
      
      const reading = await createEmissionReading({
        vehicleId: vehicle.id,
        co2: input.co2 || null,
        co: input.co || null,
        nox: input.nox || null,
        pmLevel: input.pmLevel || null,
      });
      
      // Check thresholds and create alerts if needed
      const thresholds = { co2: 1000, co: 50, nox: 100, pmLevel: 100 };
      if (input.co2 && input.co2 > thresholds.co2) {
        await createAlert({
          vehicleId: vehicle.id,
          gasType: "CO2",
          measuredValue: input.co2,
          thresholdValue: thresholds.co2,
        });
      }
      if (input.co && input.co > thresholds.co) {
        await createAlert({
          vehicleId: vehicle.id,
          gasType: "CO",
          measuredValue: input.co,
          thresholdValue: thresholds.co,
        });
      }
      if (input.nox && input.nox > thresholds.nox) {
        await createAlert({
          vehicleId: vehicle.id,
          gasType: "NOx",
          measuredValue: input.nox,
          thresholdValue: thresholds.nox,
        });
      }
      if (input.pmLevel && input.pmLevel > thresholds.pmLevel) {
        await createAlert({
          vehicleId: vehicle.id,
          gasType: "PM",
          measuredValue: input.pmLevel,
          thresholdValue: thresholds.pmLevel,
        });
      }
      
      return reading || { success: true };
    }),
    // Mock data generation endpoints
    generateMock: protectedProcedure.input(z.object({ 
      vehicleId: z.number().optional(),
      generateForAll: z.boolean().default(false),
    })).mutation(async ({ input }) => {
      const thresholds = { co2: 1000, co: 50, nox: 100, pmLevel: 100 };
      
      if (input.generateForAll) {
        // Generate for all vehicles
        const vehicles = await getAllVehicles();
        const results = [];
        
        for (const vehicle of vehicles) {
          const mockData = generateMockEmissionReading(vehicle.id, vehicle.fuelType);
          const reading = await createEmissionReading({
            vehicleId: vehicle.id,
            co2: mockData.co2,
            co: mockData.co,
            nox: mockData.nox,
            pmLevel: mockData.pmLevel,
          });
          
          // Check thresholds and create alerts
          if (mockData.co2 > thresholds.co2) {
            await createAlert({
              vehicleId: vehicle.id,
              gasType: "CO2",
              measuredValue: mockData.co2,
              thresholdValue: thresholds.co2,
            });
          }
          if (mockData.co > thresholds.co) {
            await createAlert({
              vehicleId: vehicle.id,
              gasType: "CO",
              measuredValue: mockData.co,
              thresholdValue: thresholds.co,
            });
          }
          if (mockData.nox > thresholds.nox) {
            await createAlert({
              vehicleId: vehicle.id,
              gasType: "NOx",
              measuredValue: mockData.nox,
              thresholdValue: thresholds.nox,
            });
          }
          if (mockData.pmLevel > thresholds.pmLevel) {
            await createAlert({
              vehicleId: vehicle.id,
              gasType: "PM",
              measuredValue: mockData.pmLevel,
              thresholdValue: thresholds.pmLevel,
            });
          }
          
          results.push({ vehicleId: vehicle.id, reading });
        }
        
        return { success: true, generated: results.length, results };
      } else if (input.vehicleId) {
        // Generate for specific vehicle
        const vehicle = await getVehicleById(input.vehicleId);
        if (!vehicle) throw new Error("Vehicle not found");
        
        const mockData = generateMockEmissionReading(vehicle.id, vehicle.fuelType);
        const reading = await createEmissionReading({
          vehicleId: vehicle.id,
          co2: mockData.co2,
          co: mockData.co,
          nox: mockData.nox,
          pmLevel: mockData.pmLevel,
        });
        
        // Check thresholds and create alerts
        if (mockData.co2 > thresholds.co2) {
          await createAlert({
            vehicleId: vehicle.id,
            gasType: "CO2",
            measuredValue: mockData.co2,
            thresholdValue: thresholds.co2,
          });
        }
        if (mockData.co > thresholds.co) {
          await createAlert({
            vehicleId: vehicle.id,
            gasType: "CO",
            measuredValue: mockData.co,
            thresholdValue: thresholds.co,
          });
        }
        if (mockData.nox > thresholds.nox) {
          await createAlert({
            vehicleId: vehicle.id,
            gasType: "NOx",
            measuredValue: mockData.nox,
            thresholdValue: thresholds.nox,
          });
        }
        if (mockData.pmLevel > thresholds.pmLevel) {
          await createAlert({
            vehicleId: vehicle.id,
            gasType: "PM",
            measuredValue: mockData.pmLevel,
            thresholdValue: thresholds.pmLevel,
          });
        }
        
        return { success: true, vehicleId: vehicle.id, reading, mockData };
      } else {
        throw new Error("Either vehicleId or generateForAll must be provided");
      }
    }),
    populateHistory: adminProcedure.input(z.object({
      vehicleId: z.number().optional(),
      hoursBack: z.number().default(24),
      intervalMinutes: z.number().default(5),
    })).mutation(async ({ input }) => {
      const thresholds = { co2: 1000, co: 50, nox: 100, pmLevel: 100 };
      
      if (input.vehicleId) {
        const vehicle = await getVehicleById(input.vehicleId);
        if (!vehicle) throw new Error("Vehicle not found");
        
        const historicalData = generateHistoricalData(
          vehicle.id,
          vehicle.fuelType,
          input.hoursBack,
          input.intervalMinutes
        );
        
        const results = [];
        for (const data of historicalData) {
          const reading = await createEmissionReading({
            vehicleId: vehicle.id,
            co2: data.co2,
            co: data.co,
            nox: data.nox,
            pmLevel: data.pmLevel,
          });
          
          // Check thresholds (but don't create too many alerts for historical data)
          if (Math.random() > 0.9) { // Only create alerts for 10% of readings
            if (data.co2 > thresholds.co2) {
              await createAlert({
                vehicleId: vehicle.id,
                gasType: "CO2",
                measuredValue: data.co2,
                thresholdValue: thresholds.co2,
              });
            }
          }
          
          results.push(reading);
        }
        
        return { success: true, vehicleId: vehicle.id, generated: results.length };
      } else {
        // Generate for all vehicles
        const vehicles = await getAllVehicles();
        const totalResults = [];
        
        for (const vehicle of vehicles) {
          const historicalData = generateHistoricalData(
            vehicle.id,
            vehicle.fuelType,
            input.hoursBack,
            input.intervalMinutes
          );
          
          for (const data of historicalData) {
            await createEmissionReading({
              vehicleId: vehicle.id,
              co2: data.co2,
              co: data.co,
              nox: data.nox,
              pmLevel: data.pmLevel,
            });
          }
          
          totalResults.push({ vehicleId: vehicle.id, generated: historicalData.length });
        }
        
        return { success: true, generated: totalResults };
      }
    }),
  }),

  // Alerts
  alerts: router({
    active: publicProcedure.query(async () => {
      const alerts = await getActiveAlerts();
      return alerts || [];
    }),
    vehicleAlerts: protectedProcedure.input(z.object({ vehicleId: z.number() })).query(async ({ input }) => {
      const alerts = await getVehicleAlerts(input.vehicleId);
      return alerts || [];
    }),
  }),

  // Admin routes
  admin: router({
    stats: adminProcedure.query(async () => {
      const stats = await getSystemStats();
      return stats;
    }),
    users: adminProcedure.query(async () => {
      const users = await getAllUsers();
      return users || [];
    }),
    allVehicles: adminProcedure.query(async () => {
      const vehicles = await getAllVehicles();
      return vehicles || [];
    }),
    recentReadings: adminProcedure.input(z.object({ limit: z.number().min(1).max(100).default(50) })).query(async ({ input }) => {
      const readings = await getAllEmissionReadings(input.limit);
      return readings || [];
    }),
  }),

  // AI Chat routes
  ai: router({
    chat: protectedProcedure.input(z.object({
      messages: z.array(z.object({
        role: z.enum(["system", "user", "assistant"]),
        content: z.string(),
      })),
    })).mutation(async ({ input }) => {
      try {
        // Convert input messages to LLM Message format
        const llmMessages: Message[] = input.messages.map(msg => ({
          role: msg.role,
          content: msg.content,
        }));

        // Add a system message if not present to provide context about the emission monitoring system
        const hasSystemMessage = llmMessages.some(msg => msg.role === "system");
        if (!hasSystemMessage) {
          llmMessages.unshift({
            role: "system",
            content: "You are a helpful assistant for a vehicle emission monitoring system. You help users understand emission data, compliance status, and provide insights about vehicle emissions and environmental impact.",
          });
        }

        // Invoke LLM
        const result = await invokeLLM({
          messages: llmMessages,
        });

        // Extract the assistant's response
        const assistantMessage = result.choices[0]?.message;
        if (!assistantMessage || !assistantMessage.content) {
          throw new Error("No response from AI");
        }

        // Extract and return the response content as a string
        const content = typeof assistantMessage.content === "string"
          ? assistantMessage.content
          : Array.isArray(assistantMessage.content)
          ? assistantMessage.content
              .filter((c: any) => c.type === "text")
              .map((c: any) => c.text)
              .join("\n")
          : "";

        // Return just the content string to match the component's expected usage
        return content;
      } catch (error: any) {
        console.error("[AI] Chat error:", error);
        throw new Error(error.message || "Failed to get AI response");
      }
    }),
  }),
});

export type AppRouter = typeof appRouter;
