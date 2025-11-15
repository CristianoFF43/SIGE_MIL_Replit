import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { auth } from "@/lib/firebase";
import { setGlobalIdToken } from "@/lib/queryClient";
import { onIdTokenChanged, type User } from "firebase/auth";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  idToken: string | null;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  idToken: null,
});

export function useFirebaseAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [idToken, setIdToken] = useState<string | null>(null);

  useEffect(() => {
    console.log("[AUTH] AuthProvider initializing...");
    console.log("[AUTH] Firebase config:", {
      projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
      appId: import.meta.env.VITE_FIREBASE_APP_ID,
      hasApiKey: !!import.meta.env.VITE_FIREBASE_API_KEY
    });

    // Check for test-login session if test mode is enabled
    const checkTestSession = async () => {
      if (import.meta.env.VITE_TEST_MODE === 'true') {
        try {
          const response = await fetch('/api/auth/user', {
            credentials: 'include',
          });
          
          if (response.ok) {
            const userData = await response.json();
            const mockUser = {
              uid: userData.id,
              email: userData.email,
              displayName: `${userData.firstName} ${userData.lastName}`,
              getIdToken: async () => 'test-session-token',
            } as User;
            
            setUser(mockUser);
            setIdToken('test-session-token');
            setGlobalIdToken('test-session-token');
            setLoading(false);
            console.log("[AUTH] Test session detected:", userData.email);
            return true;
          }
        } catch (err) {
          console.log("[AUTH] No test session found");
        }
      }
      return false;
    };

    // Listen to ID token changes (handles login, logout, token refresh)
    const unsubscribe = onIdTokenChanged(auth, async (firebaseUser) => {
      console.log("[AUTH] Token changed. User:", firebaseUser ? firebaseUser.email : "null");
      setUser(firebaseUser);
      
      if (firebaseUser) {
        try {
          const token = await firebaseUser.getIdToken();
          setIdToken(token);
          setGlobalIdToken(token);
          console.log("[AUTH] ✅ User logged in:", firebaseUser.email);
          console.log("[AUTH] ✅ Token set (length):", token.length);
          setLoading(false);
        } catch (error) {
          console.error("[AUTH] ❌ Failed to get token:", error);
          setUser(null);
          setIdToken(null);
          setGlobalIdToken(null);
          setLoading(false);
        }
      } else {
        console.log("[AUTH] No Firebase user, checking for test session...");
        const hasTestSession = await checkTestSession();
        if (!hasTestSession) {
          setIdToken(null);
          setGlobalIdToken(null);
          console.log("[AUTH] User logged out");
          setLoading(false);
        }
      }
    });

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, idToken }}>
      {children}
    </AuthContext.Provider>
  );
}
