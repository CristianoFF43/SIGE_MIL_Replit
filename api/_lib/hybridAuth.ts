import type { RequestHandler } from "express";
import admin from "firebase-admin";
import { storage } from "./storage";

let firebaseInitialized = false;

function initializeFirebaseIfNeeded() {
  if (firebaseInitialized) return;
  
  const projectId = process.env.VITE_FIREBASE_PROJECT_ID;
  
  if (!projectId) {
    console.warn("[HYBRID AUTH] VITE_FIREBASE_PROJECT_ID not set, Firebase Auth disabled");
    return;
  }
  
  try {
    admin.initializeApp({
      projectId: projectId,
    });
    firebaseInitialized = true;
    console.log(`[HYBRID AUTH] Firebase Admin initialized with project: ${projectId}`);
  } catch (error: any) {
    if (error.code === 'app/duplicate-app') {
      firebaseInitialized = true;
      console.log("[HYBRID AUTH] Firebase Admin already initialized");
    } else {
      console.error("[HYBRID AUTH] Failed to initialize Firebase:", error);
      throw new Error("Firebase initialization failed - server cannot verify tokens");
    }
  }
}

export const hybridAuth: RequestHandler = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      initializeFirebaseIfNeeded();
      
      if (!firebaseInitialized) {
        console.error("[HYBRID AUTH] Firebase not initialized but Bearer token provided");
        return res.status(500).json({ message: "Firebase authentication not configured" });
      }
      
      const token = authHeader.split('Bearer ')[1];
      const decodedToken = await admin.auth().verifyIdToken(token);
      
      const userId = decodedToken.uid;
      let user = await storage.getUser(userId);
      
      if (!user) {
        console.log(`[HYBRID AUTH] New Firebase user, creating: ${decodedToken.email}`);
        await storage.upsertUser({
          id: userId,
          email: decodedToken.email || undefined,
          firstName: decodedToken.name?.split(' ')[0] || undefined,
          lastName: decodedToken.name?.split(' ').slice(1).join(' ') || undefined,
          profileImageUrl: decodedToken.picture || undefined,
          role: "user",
        });
        user = await storage.getUser(userId);
      }
      
      (req as any).user = {
        claims: {
          sub: userId,
          email: decodedToken.email,
          name: decodedToken.name,
        },
        firebaseUser: true,
      };
      
      console.log(`[HYBRID AUTH] Firebase user authenticated: ${decodedToken.email}`);
      return next();
    } catch (error: any) {
      console.error("[HYBRID AUTH] Firebase token verification failed:", error.message);
      return res.status(401).json({ message: "Invalid Firebase token" });
    }
  }
  
  if ((req as any).user?.claims?.sub) {
    console.log(`[HYBRID AUTH] Replit Auth user: ${(req as any).user.claims.email}`);
    return next();
  }
  
  return res.status(401).json({ message: "Authentication required" });
};
