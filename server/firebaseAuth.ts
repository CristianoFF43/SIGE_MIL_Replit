import type { RequestHandler } from "express";
import admin from "firebase-admin";
import { storage } from "./storage.js";
import { DEFAULT_PERMISSIONS } from "@shared/schema";

let firebaseInitialized = false;

function initializeFirebaseIfNeeded() {
  if (firebaseInitialized) return;

  const projectId = process.env.VITE_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (!projectId) {
    throw new Error("FIREBASE_PROJECT_ID or VITE_FIREBASE_PROJECT_ID is required");
  }

  try {
    // If we have full credentials, use them. Otherwise, try with just projectId (limited functionality)
    if (clientEmail && privateKey) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          privateKey: privateKey.replace(/\\n/g, '\n'), // Convert literal \n to actual newlines
        }),
      });
      console.log(`[FIREBASE AUTH] Initialized with service account credentials`);
    } else {
      admin.initializeApp({
        projectId: projectId,
      });
      console.log(`[FIREBASE AUTH] Initialized with project ID only (limited - get service account for full functionality)`);
    }

    firebaseInitialized = true;
    console.log(`[FIREBASE AUTH] Project: ${projectId}`);
  } catch (error: any) {
    if (error.code === 'app/duplicate-app') {
      firebaseInitialized = true;
      console.log("[FIREBASE AUTH] Already initialized");
    } else {
      console.error("[FIREBASE AUTH] Initialization failed:", error);
      throw error;
    }
  }
}

export const firebaseAuth: RequestHandler = async (req, res, next) => {
  console.log(`[FIREBASE AUTH] ===== NEW REQUEST =====`);
  console.log(`[FIREBASE AUTH] Method: ${req.method} ${req.path}`);
  console.log(`[FIREBASE AUTH] Headers:`, Object.keys(req.headers));

  // Check for Passport session first (test-login support)
  if (process.env.TEST_AUTH_ENABLED === 'true' && (req as any).user?.testUser) {
    console.log(`[TEST AUTH] Session authenticated: ${(req as any).user.claims.email}`);
    return next();
  }

  const authHeader = req.headers.authorization;
  console.log(`[FIREBASE AUTH] Authorization header:`, authHeader ? `Bearer ${authHeader.substring(7, 20)}...` : 'MISSING');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.log(`[FIREBASE AUTH] ❌ NO AUTH HEADER - Rejecting with 401`);
    // In test mode, check if there's a Passport session before rejecting
    if (process.env.TEST_AUTH_ENABLED === 'true' && (req as any).isAuthenticated?.()) {
      console.log(`[TEST AUTH] Passport session found, allowing access`);
      return next();
    }
    return res.status(401).json({ message: "Unauthorized - Authentication required" });
  }

  try {
    initializeFirebaseIfNeeded();

    const token = authHeader.split('Bearer ')[1];
    console.log(`[FIREBASE AUTH] Attempting to verify token (length: ${token?.length || 0})`);

    try {
      const decodedToken = await admin.auth().verifyIdToken(token);
      console.log(`[FIREBASE AUTH] Token verified for: ${decodedToken.email}`);

      const userId = decodedToken.uid;
      let user = await storage.getUser(userId);
      console.log(`[FIREBASE AUTH] User in database: ${user ? 'found' : 'not found'}`);

      if (!user) {
        console.log(`[FIREBASE AUTH] New user, auto-creating: ${decodedToken.email}`);
        await storage.upsertUser({
          id: userId,
          email: decodedToken.email || undefined,
          firstName: decodedToken.name?.split(' ')[0] || undefined,
          lastName: decodedToken.name?.split(' ').slice(1).join(' ') || undefined,
          profileImageUrl: decodedToken.picture || undefined,
          role: "user",
          permissions: DEFAULT_PERMISSIONS.user,
        });
        user = await storage.getUser(userId);
      }

      (req as any).user = {
        claims: {
          sub: userId,
          email: decodedToken.email,
          name: decodedToken.name,
        },
      };

      console.log(`[FIREBASE AUTH] User authenticated: ${decodedToken.email}`);
      return next();
    } catch (verifyError: any) {
      console.error("[FIREBASE AUTH] Token verification failed:", verifyError.message);
      // Se o token expirou ou é inválido, retornamos 401 para forçar o client a renovar
      return res.status(401).json({ message: "Unauthorized - Invalid or expired token", error: verifyError.message });
    }
  } catch (error: any) {
    console.error("[FIREBASE AUTH] Unexpected error:", error);
    return res.status(500).json({ message: "Internal auth error" });
  }
};

export const requirePermission = (section: string, action: string): RequestHandler => {
  return async (req, res, next) => {
    try {
      const userId = (req as any).user?.claims?.sub;

      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const user = await storage.getUser(userId);

      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }

      console.log(`[PERMISSION CHECK] User: ${user.email}, Role: ${user.role}, Section: ${section}, Action: ${action}`);
      // console.log(`[PERMISSION CHECK] Permissions:`, JSON.stringify(user.permissions, null, 2));

      if (!user.permissions || typeof user.permissions !== 'object') {
        console.log(`[PERMISSION CHECK] FAILED: No permissions object`);
        return res.status(403).json({
          message: `Forbidden - No permissions configured`
        });
      }

      const sectionPerms = (user.permissions as any)[section];
      if (!sectionPerms || !sectionPerms[action]) {
        console.log(`[PERMISSION CHECK] FAILED: Missing ${section}.${action}`);
        console.log(`[PERMISSION CHECK] Available for ${section}:`, sectionPerms);
        return res.status(403).json({
          message: `Forbidden - Requires ${section}.${action} permission`
        });
      }

      next();
    } catch (error) {
      console.error("Permission check error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  };
};
