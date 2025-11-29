import * as client from "openid-client";
import { Strategy, type VerifyFunction } from "openid-client/passport";

import passport from "passport";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import memoize from "memoizee";
import connectPg from "connect-pg-simple";
import { storage } from "./storage";

if (!process.env.REPLIT_DOMAINS) {
  throw new Error("Environment variable REPLIT_DOMAINS not provided");
}

const getOidcConfig = memoize(
  async () => {
    return await client.discovery(
      new URL(process.env.ISSUER_URL ?? "https://replit.com/oidc"),
      process.env.REPL_ID!
    );
  },
  { maxAge: 3600 * 1000 }
);

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,
    ttl: sessionTtl,
    tableName: "sessions",
  });
  return session({
    secret: process.env.SESSION_SECRET!,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: true,
      maxAge: sessionTtl,
    },
  });
}

function updateUserSession(
  user: any,
  tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers
) {
  user.claims = tokens.claims();
  user.access_token = tokens.access_token;
  user.refresh_token = tokens.refresh_token;
  user.expires_at = user.claims?.exp;
}

async function upsertUser(
  claims: any,
) {
  // Check if user already exists to preserve their role
  const existingUser = await storage.getUser(claims["sub"]);
  
  await storage.upsertUser({
    id: claims["sub"],
    email: claims["email"],
    firstName: claims["first_name"],
    lastName: claims["last_name"],
    profileImageUrl: claims["profile_image_url"],
    role: existingUser?.role || "user", // Preserve existing role or default to "user" for new users
  });
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  const config = await getOidcConfig();

  const verify: VerifyFunction = async (
    tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers,
    verified: passport.AuthenticateCallback
  ) => {
    console.log("[AUTH] Verificando usuário:", tokens.claims()?.email);
    const user = {};
    updateUserSession(user, tokens);
    await upsertUser(tokens.claims());
    console.log("[AUTH] Usuário autenticado com sucesso");
    verified(null, user);
  };

  for (const domain of process.env
    .REPLIT_DOMAINS!.split(",")) {
    const strategy = new Strategy(
      {
        name: `replitauth:${domain}`,
        config,
        scope: "openid email profile offline_access",
        callbackURL: `https://${domain}/api/callback`,
      },
      verify,
    );
    passport.use(strategy);
  }

  passport.serializeUser((user: Express.User, cb) => cb(null, user));
  passport.deserializeUser((user: Express.User, cb) => cb(null, user));

  app.get("/api/login", (req, res, next) => {
    console.log("[AUTH] Iniciando login, hostname:", req.hostname);
    console.log("[AUTH] Domínios disponíveis:", process.env.REPLIT_DOMAINS);
    
    const strategyName = `replitauth:${req.hostname}`;
    console.log("[AUTH] Usando strategy:", strategyName);
    
    passport.authenticate(strategyName, {
      prompt: "login consent",
      scope: ["openid", "email", "profile", "offline_access"],
    })(req, res, (err: any) => {
      if (err) {
        console.error("[AUTH] Erro durante autenticação:", err);
        return res.status(500).json({ 
          message: "Erro ao iniciar autenticação",
          error: err.message,
          hostname: req.hostname,
          availableDomains: process.env.REPLIT_DOMAINS
        });
      }
      next();
    });
  });

  app.get("/api/callback", (req, res, next) => {
    console.log("[AUTH] Callback recebido, hostname:", req.hostname);
    console.log("[AUTH] Query params:", JSON.stringify(req.query));
    
    const strategyName = `replitauth:${req.hostname}`;
    console.log("[AUTH] Usando strategy para callback:", strategyName);
    
    passport.authenticate(strategyName, {
      successReturnToOrRedirect: "/",
      failureRedirect: "/api/login",
    })(req, res, (err: any) => {
      if (err) {
        console.error("[AUTH] Erro durante callback:", err);
        return res.status(500).json({ 
          message: "Erro durante callback de autenticação",
          error: err.message,
          hostname: req.hostname,
          query: req.query
        });
      }
      next();
    });
  });

  app.get("/api/logout", (req, res) => {
    req.logout(() => {
      res.redirect(
        client.buildEndSessionUrl(config, {
          client_id: process.env.REPL_ID!,
          post_logout_redirect_uri: `${req.protocol}://${req.hostname}`,
        }).href
      );
    });
  });
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  const user = req.user as any;

  if (!req.isAuthenticated() || !user.expires_at) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const now = Math.floor(Date.now() / 1000);
  if (now <= user.expires_at) {
    return next();
  }

  const refreshToken = user.refresh_token;
  if (!refreshToken) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  try {
    const config = await getOidcConfig();
    const tokenResponse = await client.refreshTokenGrant(config, refreshToken);
    updateUserSession(user, tokenResponse);
    return next();
  } catch (error) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }
};

// Middleware to check if user is manager or administrator
export const isManager: RequestHandler = async (req, res, next) => {
  const userId = (req.user as any)?.claims?.sub;
  if (!userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const user = await storage.getUser(userId);
  if (!user || (user.role !== "manager" && user.role !== "administrator")) {
    return res.status(403).json({ message: "Forbidden - Manager access required" });
  }

  next();
};

// Middleware to check if user is administrator
export const isAdmin: RequestHandler = async (req, res, next) => {
  const userId = (req.user as any)?.claims?.sub;
  if (!userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const user = await storage.getUser(userId);
  if (!user || user.role !== "administrator") {
    return res.status(403).json({ message: "Forbidden - Administrator access required" });
  }

  next();
};

// Helper function to check granular permissions
export async function userHasPermission(
  userId: string,
  section: string,
  action: string
): Promise<boolean> {
  const user = await storage.getUser(userId);
  if (!user) return false;

  // Administrators always have all permissions
  if (user.role === "administrator") return true;

  // Check custom permissions
  if (user.permissions && typeof user.permissions === "object") {
    const permissions = user.permissions as any;
    if (permissions[section] && permissions[section][action]) {
      return true;
    }
  }

  // Fallback to role-based default permissions
  const { DEFAULT_PERMISSIONS } = await import("@shared/schema");
  const defaultPerms = DEFAULT_PERMISSIONS[user.role] as any;
  if (defaultPerms && defaultPerms[section] && defaultPerms[section][action]) {
    return true;
  }

  return false;
}

// Middleware factory to check specific permissions
export function requirePermission(section: string, action: string): RequestHandler {
  return async (req, res, next) => {
    const userId = (req.user as any)?.claims?.sub;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const hasPermission = await userHasPermission(userId, section, action);
    if (!hasPermission) {
      return res.status(403).json({ 
        message: `Forbidden - Requires ${section}.${action} permission` 
      });
    }

    next();
  };
}
