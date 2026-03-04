import { DEFAULT_PERMISSIONS, type AccessRole, type Permission, type User } from "@shared/schema";
import { LOCAL_DEFAULT_PERMISSIONS, getAccessMeta, isS1Section, isSameCompany } from "@shared/accessControl";

type PermissionSection = Exclude<keyof Permission, "__meta">;

export type AccessContext = {
  globalRole: AccessRole;
  localRole: AccessRole | null;
  assignedCompany: string | null;
  assignedSection: string | null;
  isGlobalAdmin: boolean;
  isGlobalManager: boolean;
  isLocalAdmin: boolean;
  isLocalManager: boolean;
};

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

export function buildAccessContext(user: User): AccessContext {
  const meta = getAccessMeta(user.permissions as Permission | null | undefined);
  const globalRole = normalizeRole(user.role);
  const localRole = meta.localRole ? normalizeRole(meta.localRole) : null;

  return {
    globalRole,
    localRole,
    assignedCompany: meta.assignedCompany || null,
    assignedSection: meta.assignedSection || null,
    isGlobalAdmin: globalRole === "administrator",
    isGlobalManager: globalRole === "manager" || globalRole === "administrator",
    isLocalAdmin: localRole === "administrator" && !!meta.assignedCompany,
    isLocalManager: (localRole === "manager" || localRole === "administrator") && !!meta.assignedCompany,
  };
}

export function hasGlobalPermission(user: User, section: string, action: string): boolean {
  const context = buildAccessContext(user);
  if (context.isGlobalAdmin) return true;

  const stored = readPermissionValue(user.permissions as Permission | null | undefined, section, action);
  if (typeof stored === "boolean") {
    return stored;
  }

  return readPermissionValue(DEFAULT_PERMISSIONS[context.globalRole], section, action) ?? false;
}

export function hasLocalPermission(user: User, section: string, action: string): boolean {
  const context = buildAccessContext(user);
  if (!context.localRole || !context.assignedCompany) return false;
  return readPermissionValue(LOCAL_DEFAULT_PERMISSIONS[context.localRole], section, action) ?? false;
}

export function hasEffectivePermission(user: User, section: string, action: string): boolean {
  return hasGlobalPermission(user, section, action) || hasLocalPermission(user, section, action);
}

export function canManageMilitaryRecord(
  user: User,
  company: string | null | undefined,
  action: "view" | "edit" | "create" | "delete",
): boolean {
  if (action === "view") {
    return hasEffectivePermission(user, "militares", "view");
  }

  if (hasGlobalPermission(user, "militares", action)) {
    return true;
  }

  const context = buildAccessContext(user);
  if (!context.assignedCompany || !context.localRole) {
    return false;
  }

  if (!isSameCompany(context.assignedCompany, company)) {
    return false;
  }

  return hasLocalPermission(user, "militares", action);
}

export function canExportCompany(user: User, company: string | null | undefined): boolean {
  if (hasGlobalPermission(user, "relatorios", "export")) {
    return true;
  }

  const context = buildAccessContext(user);
  return !!context.assignedCompany && isSameCompany(context.assignedCompany, company) && hasLocalPermission(user, "relatorios", "export");
}

export function canViewUsersGlobally(user: User): boolean {
  return hasGlobalPermission(user, "usuarios", "view");
}

export function canManageUsersGlobally(user: User): boolean {
  return hasGlobalPermission(user, "usuarios", "manage");
}

export function canManageUsersLocally(user: User): boolean {
  const context = buildAccessContext(user);
  return !!context.assignedCompany && hasLocalPermission(user, "usuarios", "manage");
}

export function canViewUsersLocally(user: User): boolean {
  const context = buildAccessContext(user);
  return !!context.assignedCompany && hasLocalPermission(user, "usuarios", "view");
}

export function scopeUsersForActor(actor: User, users: User[]): User[] {
  if (canViewUsersGlobally(actor)) {
    return users;
  }

  const context = buildAccessContext(actor);
  if (!context.assignedCompany || !canViewUsersLocally(actor)) {
    return users.filter((user) => user.id === actor.id);
  }

  return users.filter((user) => {
    const targetContext = buildAccessContext(user);
    return isSameCompany(context.assignedCompany, targetContext.assignedCompany) || user.id === actor.id;
  });
}

export function canManageTargetUser(actor: User, target: User): boolean {
  if (canManageUsersGlobally(actor)) {
    return true;
  }

  if (!canManageUsersLocally(actor)) {
    return false;
  }

  const actorContext = buildAccessContext(actor);
  const targetContext = buildAccessContext(target);

  if (!actorContext.assignedCompany || !isSameCompany(actorContext.assignedCompany, targetContext.assignedCompany)) {
    return false;
  }

  return targetContext.globalRole === "user";
}

export function validateGlobalRoleEligibility(role: AccessRole, section?: string | null): boolean {
  if (role === "user") return true;
  return isS1Section(section);
}

export async function ensureSingleGlobalAdministrator(
  users: User[],
  targetRole: AccessRole,
  targetUserId?: string,
): Promise<void> {
  if (targetRole !== "administrator") return;

  const existingAdmin = users.find((user) => user.role === "administrator" && user.id !== targetUserId);
  if (existingAdmin) {
    throw new Error("Já existe um administrador global no sistema");
  }
}
