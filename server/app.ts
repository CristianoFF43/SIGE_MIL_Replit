import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";

declare module 'http' {
    interface IncomingMessage {
        rawBody: unknown
    }
}

export async function createApp() {
    const app = express();

    app.use(express.json({
        verify: (req, _res, buf) => {
            req.rawBody = buf;
        }
    }));
    app.use(express.urlencoded({ extended: false }));

    // Logging middleware
    app.use((req, res, next) => {
        const start = Date.now();
        const path = req.path;
        let capturedJsonResponse: Record<string, any> | undefined = undefined;

        const originalResJson = res.json;
        res.json = function (bodyJson, ...args) {
            capturedJsonResponse = bodyJson;
            return originalResJson.apply(res, [bodyJson, ...args]);
        };

        res.on("finish", () => {
            const duration = Date.now() - start;
            // Log ALL requests to debug Vercel routing
            let logLine = `[${req.method}] ${req.url} (original: ${req.originalUrl}) ${res.statusCode} in ${duration}ms`;
            if (capturedJsonResponse) {
                logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
            }

            if (logLine.length > 200) {
                logLine = logLine.slice(0, 199) + "…";
            }

            log(logLine);
        });

        next();
    });

    // Setup Passport session middleware for test-login support (if enabled)
    if (process.env.TEST_AUTH_ENABLED === 'true') {
        console.log('[TEST MODE] Enabling Passport session middleware for test-login');
        const passport = (await import('passport')).default;
        const session = (await import('express-session')).default;
        const connectPg = (await import('connect-pg-simple')).default;

        // Create lightweight session store for test mode
        const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
        const pgStore = connectPg(session);
        const sessionStore = new pgStore({
            conString: process.env.DATABASE_URL,
            createTableIfMissing: true, // Auto-create sessions table in test mode
            ttl: sessionTtl,
            tableName: "sessions",
        });

        app.set("trust proxy", 1);
        app.use(session({
            secret: process.env.SESSION_SECRET || 'test-session-secret',
            store: sessionStore,
            resave: false,
            saveUninitialized: false,
            cookie: {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production', // Allow HTTP in test/dev
                maxAge: sessionTtl,
            },
        }));
        app.use(passport.initialize());
        app.use(passport.session());

        // Simple serialization for test users
        passport.serializeUser((user: any, cb) => cb(null, user));
        passport.deserializeUser((user: any, cb) => cb(null, user));

        console.log('[TEST MODE] Passport session configured with secure:', process.env.NODE_ENV === 'production');
    }

    // Import initial data if needed (skip in production for faster startup)
    if (process.env.NODE_ENV === 'development' && process.env.IMPORT_INITIAL_DATA !== 'false') {
        try {
            const { importInitialData } = await import("./importData");
            await importInitialData();
        } catch (error) {
            console.error("Error importing initial data:", error);
        }
    }

    const server = await registerRoutes(app);

    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
        const status = err.status || err.statusCode || 500;
        const message = err.message || "Internal Server Error";

        res.status(status).json({ message });
        throw err;
    });

    // importantly only setup vite in development and after
    // setting up all the other routes so the catch-all route
    // doesn't interfere with the other routes
    if (app.get("env") === "development") {
        await setupVite(app, server);
    } else {
        serveStatic(app);
    }

    return { app, server };
}
