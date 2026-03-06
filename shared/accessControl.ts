import { DEFAULT_PERMISSIONS, PEF_SECTIONS, type AccessMeta, type AccessRole, type Permission } from "./schema";

export const LOCAL_DEFAULT_PERMISSIONS: Record<AccessRole, Permission> = {
  user: {
    dashboard: { view: true },
    militares: { view: true, edit: false, create: false, delete: false },
    companhias: { view: true },
    relatorios: { view: true, export: false },
    usuarios: { view: false, manage: false },
    importar: { import: false },
  },
  manager: {
    dashboard: { view: true },
    militares: { view: true, edit: true, create: false, delete: false },
    companhias: { view: true },
    relatorios: { view: true, export: true },
    usuarios: { view: true, manage: false },
    importar: { import: false },
  },
  administrator: {
    dashboard: { view: true },
    militares: { view: true, edit: true, create: true, delete: true },
    companhias: { view: true },
    relatorios: { view: true, export: true },
    usuarios: { view: true, manage: true },
    importar: { import: false },
  },
};

export function normalizeAccessValue(value?: string | null): string {
  if (!value) return "";
  return value
    .trim()
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Z0-9]/g, "");
}

export function isSameCompany(left?: string | null, right?: string | null): boolean {
  return normalizeAccessValue(left) !== "" && normalizeAccessValue(left) === normalizeAccessValue(right);
}

export function isSameSection(left?: string | null, right?: string | null): boolean {
  return normalizeAccessValue(left) !== "" && normalizeAccessValue(left) === normalizeAccessValue(right);
}

export function isPefSection(value?: string | null): boolean {
  const normalized = normalizeAccessValue(value);
  if (!normalized) return false;
  return PEF_SECTIONS.some((section) => normalizeAccessValue(section) === normalized);
}

export function isS1Section(value?: string | null): boolean {
  return normalizeAccessValue(value) === "S1";
}

export function getAccessMeta(permissions?: Permission | null): AccessMeta {
  const meta = permissions?.__meta;
  return {
    assignedCompany: meta?.assignedCompany || null,
    assignedSection: meta?.assignedSection || null,
    localRole: meta?.localRole || null,
    linkedMilitaryId: typeof meta?.linkedMilitaryId === "number"
      ? meta.linkedMilitaryId
      : meta?.linkedMilitaryId
        ? Number(meta.linkedMilitaryId)
        : null,
    linkedMilitaryCpf: meta?.linkedMilitaryCpf || null,
    linkedMilitaryIdentity: meta?.linkedMilitaryIdentity || null,
    linkedMilitaryEmail: meta?.linkedMilitaryEmail || null,
    linkedMilitaryName: meta?.linkedMilitaryName || null,
    linkedMilitaryRank: meta?.linkedMilitaryRank || null,
  };
}

export function withAccessMeta(
  permissions: Permission | null | undefined,
  meta: AccessMeta,
): Permission {
  return {
    ...(permissions || DEFAULT_PERMISSIONS.user),
    __meta: {
      assignedCompany: meta.assignedCompany || null,
      assignedSection: meta.assignedSection || null,
      localRole: meta.localRole || null,
      linkedMilitaryId: typeof meta.linkedMilitaryId === "number" ? meta.linkedMilitaryId : null,
      linkedMilitaryCpf: meta.linkedMilitaryCpf || null,
      linkedMilitaryIdentity: meta.linkedMilitaryIdentity || null,
      linkedMilitaryEmail: meta.linkedMilitaryEmail || null,
      linkedMilitaryName: meta.linkedMilitaryName || null,
      linkedMilitaryRank: meta.linkedMilitaryRank || null,
    },
  };
}
