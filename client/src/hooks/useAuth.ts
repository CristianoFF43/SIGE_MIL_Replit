import { useQuery } from "@tanstack/react-query";
import { useFirebaseAuth } from "@/contexts/AuthContext";
import type { User } from "@shared/schema";
import { DEFAULT_PERMISSIONS } from "@shared/schema";

export function useAuth() {
  const { user: firebaseUser, loading: firebaseLoading, idToken } = useFirebaseAuth();

  const { data: user, isLoading: userDataLoading } = useQuery<User>({
    queryKey: ["/api/auth/user"],
    enabled: !!firebaseUser && !!idToken,
    retry: false,
  });

  const hasPermission = (section: string, action: string): boolean => {
    if (!user) return false;

    if (user.role === "administrator") return true;

    if (user.permissions && typeof user.permissions === "object") {
      const sectionPerms = (user.permissions as any)[section];
      if (sectionPerms && typeof sectionPerms[action] === "boolean") {
        return sectionPerms[action];
      }
    }

    const defaultPerms = DEFAULT_PERMISSIONS[user.role as keyof typeof DEFAULT_PERMISSIONS];
    if (defaultPerms) {
      const sectionPerms = (defaultPerms as any)[section];
      if (sectionPerms && typeof sectionPerms[action] === "boolean") {
        return sectionPerms[action];
      }
    }

    return false;
  };

  return {
    user,
    isLoading: firebaseLoading || userDataLoading,
    isAuthenticated: !!user,
    isAdmin: user?.role === "administrator",
    isManager: user?.role === "manager" || user?.role === "administrator",
    isUser: !!user,
    hasPermission,
  };
}
