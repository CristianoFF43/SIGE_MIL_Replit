import { useQuery } from "@tanstack/react-query";
import { useFirebaseAuth } from "@/contexts/AuthContext";
import { DEFAULT_PERMISSIONS, type AccessRole, type Permission, type User } from "@shared/schema";
import { LOCAL_DEFAULT_PERMISSIONS, getAccessMeta, isPefSection, isSameCompany, isSameSection } from "@shared/accessControl";

type PermissionSection = Exclude<keyof Permission, "__meta">;

function normalizeRole(role?: string | null): AccessRole {
  if (role === "administrator" || role === "manager") return role;
  return "user";
}

function readPermissionValue(
  permissions: Permission | null | undefined,
  section: string,
  action: string,
): boolean | undefined {
  const sectionPerms = permissions?.[section as PermissionSection] as Record<string, boolean> | undefined;
  if (sectionPerms && typeof sectionPerms[action] === "boolean") {
    return sectionPerms[action];
  }
  return undefined;
}

export function useAuth() {
  const { user: firebaseUser, loading: firebaseLoading, idToken } = useFirebaseAuth();

  const { data: user, isLoading: userDataLoading, error: queryError } = useQuery<User>({
    queryKey: ["/api/auth/user"],
    enabled: !!firebaseUser && !!idToken,
    retry: false,
  });

  if (firebaseLoading) console.log("[useAuth] Firebase loading...");
  if (firebaseUser) console.log("[useAuth] Firebase User:", firebaseUser.email);
  if (idToken) console.log("[useAuth] ID Token present");
  if (firebaseUser && !idToken) console.warn("[useAuth] Firebase user present but ID token missing");
  if (userDataLoading) console.log("[useAuth] Fetching DB user...");
  if (user) console.log("[useAuth] DB User found:", user.email);
  if (queryError) console.error("[useAuth] Query Error:", queryError);

  const globalRole = normalizeRole(user?.role);
  const accessMeta = getAccessMeta(user?.permissions as Permission | null | undefined);
  const localRole = accessMeta.localRole ? normalizeRole(accessMeta.localRole) : null;

  const hasGlobalPermission = (section: string, action: string): boolean => {
    if (!user) return false;
    if (globalRole === "administrator") return true;

    const stored = readPermissionValue(user.permissions as Permission | null | undefined, section, action);
    if (typeof stored === "boolean") return stored;

    return readPermissionValue(DEFAULT_PERMISSIONS[globalRole], section, action) ?? false;
  };

  const hasLocalPermission = (section: string, action: string): boolean => {
    if (!user || !localRole || !accessMeta.assignedCompany) return false;
    return readPermissionValue(LOCAL_DEFAULT_PERMISSIONS[localRole], section, action) ?? false;
  };

  const hasPermission = (section: string, action: string): boolean => {
    return hasGlobalPermission(section, action) || hasLocalPermission(section, action);
  };

  const canManageCompany = (
    company: string | null | undefined,
    action: "view" | "edit" | "create" | "delete",
    section?: string | null,
  ): boolean => {
    if (!user) return false;
    if (action === "view") return hasPermission("militares", "view");
    if (hasGlobalPermission("militares", action)) return true;
    if (!localRole || !accessMeta.assignedCompany || !isSameCompany(accessMeta.assignedCompany, company)) return false;
    const restrictToSection = isSameCompany(accessMeta.assignedCompany, "CEF") && isPefSection(accessMeta.assignedSection);
    if (restrictToSection) {
      if (!section) return false;
      if (!isSameSection(accessMeta.assignedSection, section)) return false;
    }
    return hasLocalPermission("militares", action);
  };

  const canExportCompany = (company: string | null | undefined, section?: string | null): boolean => {
    if (!user) return false;
    if (hasGlobalPermission("relatorios", "export")) return true;
    if (!accessMeta.assignedCompany || !isSameCompany(accessMeta.assignedCompany, company)) return false;
    const restrictToSection = isSameCompany(accessMeta.assignedCompany, "CEF") && isPefSection(accessMeta.assignedSection);
    if (restrictToSection) {
      if (!section) return false;
      if (!isSameSection(accessMeta.assignedSection, section)) return false;
    }
    return hasLocalPermission("relatorios", "export");
  };

  const roleLabel = user?.role === "administrator"
    ? "Administrador Global"
    : user?.role === "manager"
      ? "Gerente Global"
      : localRole === "administrator" && accessMeta.assignedCompany
        ? `Administrador ${accessMeta.assignedCompany}`
        : localRole === "manager" && accessMeta.assignedCompany
          ? `Gerente ${accessMeta.assignedCompany}`
          : accessMeta.assignedCompany
            ? `Usuário ${accessMeta.assignedCompany}`
            : "Usuário";

  return {
    user,
    isLoading: firebaseLoading || userDataLoading,
    isAuthenticated: !!user,
    isAdmin: globalRole === "administrator" || localRole === "administrator",
    isManager: ["manager", "administrator"].includes(globalRole) || ["manager", "administrator"].includes(localRole || ""),
    isUser: !!user,
    isGlobalAdmin: globalRole === "administrator",
    isGlobalManager: globalRole === "manager" || globalRole === "administrator",
    isLocalAdmin: localRole === "administrator" && !!accessMeta.assignedCompany,
    isLocalManager: (localRole === "manager" || localRole === "administrator") && !!accessMeta.assignedCompany,
    globalRole,
    localRole,
    assignedCompany: accessMeta.assignedCompany || null,
    assignedSection: accessMeta.assignedSection || null,
    roleLabel,
    hasGlobalPermission,
    hasLocalPermission,
    hasPermission,
    canManageCompany,
    canExportCompany,
    canManageUsersGlobally: hasGlobalPermission("usuarios", "manage"),
    canViewUsersGlobally: hasGlobalPermission("usuarios", "view"),
  };
}
