import { sql } from 'drizzle-orm';
import {
  index,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  text,
  integer,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table (mandatory for Replit Auth)
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table with role-based access control
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  nomeGuerra: varchar("nome_guerra", { length: 100 }), // War name
  postoGraduacao: varchar("posto_graduacao", { length: 50 }), // Military rank
  profileImageUrl: varchar("profile_image_url"),
  role: varchar("role", { length: 20 }).notNull().default("user"), // 'user', 'manager', 'administrator'
  permissions: jsonb("permissions"), // Custom granular permissions
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const upsertUserSchema = createInsertSchema(users).omit({
  createdAt: true,
  updatedAt: true,
});

export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

// Permission system - granular permissions for each feature
export type Permission = {
  dashboard?: {
    view?: boolean;
  };
  militares?: {
    view?: boolean;
    edit?: boolean;
    create?: boolean;
    delete?: boolean;
  };
  companhias?: {
    view?: boolean;
  };
  relatorios?: {
    view?: boolean;
    export?: boolean;
  };
  usuarios?: {
    view?: boolean;
    manage?: boolean;
  };
  importar?: {
    import?: boolean;
  };
};

// Default permissions for each role
export const DEFAULT_PERMISSIONS: Record<string, Permission> = {
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
    importar: { import: true },
  },
};

// Schema for creating/updating users with permissions
export const createUserSchema = z.object({
  email: z.string().email("Email inválido"),
  firstName: z.string().min(1, "Nome é obrigatório"),
  lastName: z.string().min(1, "Sobrenome é obrigatório"),
  nomeGuerra: z.string().optional(),
  postoGraduacao: z.string().optional(),
  role: z.enum(["user", "manager", "administrator"]),
  permissions: z.custom<Permission>().optional(),
});

export const updateUserSchema = createUserSchema.partial().extend({
  id: z.string(),
});

export type CreateUser = z.infer<typeof createUserSchema>;
export type UpdateUser = z.infer<typeof updateUserSchema>;

// Military Personnel table - core data structure
export const militaryPersonnel = pgTable("military_personnel", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  ord: integer("ord"), // Order number from spreadsheet
  postoGraduacao: varchar("posto_graduacao", { length: 50 }).notNull(), // P/GRAD (Rank)
  armaQuadroServico: varchar("arma_quadro_servico", { length: 50 }), // A/Q/S
  nomeCompleto: varchar("nome_completo", { length: 200 }).notNull(),
  nomeGuerra: varchar("nome_guerra", { length: 100 }), // War name
  companhia: varchar("companhia", { length: 50 }).notNull(), // CIA (Company)
  secaoFracao: varchar("secao_fracao", { length: 100 }), // SEÇ/FRAÇÃO (Section/Fraction)
  funcao: varchar("funcao", { length: 100 }), // Function/Role
  dataPraca: varchar("data_praca", { length: 50 }), // Date
  curso: varchar("curso", { length: 100 }), // Course
  situacao: varchar("situacao", { length: 50 }), // Status (Pronto, Transferido, etc.)
  missaoOp: varchar("missao_op", { length: 100 }), // Mission/Operation
  cpf: varchar("cpf", { length: 14 }), // Brazilian CPF
  identidade: varchar("identidade", { length: 50 }), // ID document
  endereco: text("endereco"), // Address
  numeroResidencia: varchar("numero_residencia", { length: 20 }), // House number
  bairro: varchar("bairro", { length: 100 }), // Neighborhood
  pontoReferencia: varchar("ponto_referencia", { length: 200 }), // Reference point
  cidade: varchar("cidade", { length: 100 }), // City
  telefoneContato1: varchar("telefone_contato_1", { length: 20 }), // Phone 1
  telefoneContato2: varchar("telefone_contato_2", { length: 20 }), // Phone 2
  email: varchar("email", { length: 200 }), // Email
  observacoes: text("observacoes"), // Observations/Notes
  temp: varchar("temp", { length: 10 }), // TEMP (SIM/NÃO)
  customFields: jsonb("custom_fields"), // Dynamic custom fields (Excel-like)
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertMilitaryPersonnelSchema = createInsertSchema(militaryPersonnel, {
  nomeCompleto: z.string().min(1, "Nome completo é obrigatório"),
  postoGraduacao: z.string().min(1, "Posto/Graduação é obrigatório"),
  companhia: z.string().min(1, "Companhia é obrigatória"),
  cpf: z.string().optional().nullable(),
  email: z.string().email("Email inválido").optional().nullable().or(z.literal("")),
  temp: z.enum(["SIM", "NÃO"]).optional().nullable(),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const updateMilitaryPersonnelSchema = insertMilitaryPersonnelSchema.partial();

export type InsertMilitaryPersonnel = z.infer<typeof insertMilitaryPersonnelSchema>;
export type UpdateMilitaryPersonnel = z.infer<typeof updateMilitaryPersonnelSchema>;
export type MilitaryPersonnel = typeof militaryPersonnel.$inferSelect;

// Predefined values for dropdowns
// Ordenação hierárquica militar (do mais alto ao mais baixo)
export const RANKS = [
  // Oficiais Generais
  "Gen Ex", "Gen Div", "Gen Brig",
  // Oficiais Superiores
  "Cel", "Ten Cel", "Maj",
  // Oficiais Intermediários e Subalternos
  "Cap", "1º Ten", "2º Ten",
  // Aspirante e Cadete
  "Asp Of", "Cadete",
  // Subtenente
  "S Ten",
  // Sargentos
  "1º Sgt", "2º Sgt", "3º Sgt",
  // Taifeiro
  "Taifeiro",
  // Cabos
  "Cb EP", "Cb EV", "Cb",
  // Soldados
  "Sd EP", "Sd EV", "Sd 1ª Cl", "Sd 2ª Cl"
] as const;

export const COMPANIES = [
  "1ª CIA", "2ª CIA", "3ª CIA", "CEF", "CCAP", "B ADM", "EM", "SEDE"
] as const;

export const STATUSES = [
  "Pronto", "Férias", "Licença", "Transferido", "Destacado",
  "À Disposição", "Apto recom.", "Preso Disp Jus", "Instalação",
  "Desc Férias", "CHQAO", "Reint. Jud.", "Waikas"
] as const;

export const MISSIONS = [
  "FORPRON", "SEDE", "PEF", "Administrativa"
] as const;

// Filter system types and schema
export const filterComparators = [
  "=", "!=", "IN", "NOT IN", "LIKE", "ILIKE", ">", "<", ">=", "<="
] as const;

export const filterOperators = ["AND", "OR"] as const;

// Campos permitidos para filtros (deve corresponder aos campos do militaryPersonnel)
export const filterableFields = [
  "postoGraduacao",
  "companhia",
  "secaoFracao",
  "situacao",
  "missaoOp",
  "nomeCompleto",
  "nomeGuerra",
  "funcao",
  "armaQuadroServico",
  "cpf",
  "identidade",
  "ord",
  "temp",
] as const;

// Define filter condition (leaf node)
// Field can be a standard field OR a custom field with pattern "customFields.{fieldName}"
export const filterConditionSchema = z.object({
  type: z.literal("condition"),
  field: z.union([
    z.enum(filterableFields),
    z.string().regex(/^customFields\..+$/, "Custom fields must start with 'customFields.'")
  ]),
  comparator: z.enum(filterComparators),
  value: z.union([z.string(), z.number(), z.array(z.string())]), // single value or array for IN
});

export type FilterCondition = z.infer<typeof filterConditionSchema>;

// Define filter group (branch node with AND/OR operator)
export type FilterGroup = {
  type: "group";
  operator: typeof filterOperators[number];
  children: (FilterCondition | FilterGroup)[];
};

export const filterGroupSchema: z.ZodType<FilterGroup> = z.lazy(() =>
  z.object({
    type: z.literal("group"),
    operator: z.enum(filterOperators),
    children: z.array(z.union([filterConditionSchema, filterGroupSchema])),
  })
);

// Filter tree is just a FilterGroup (top level)
export const filterTreeSchema: z.ZodType<FilterGroup> = filterGroupSchema;
export type FilterTree = FilterGroup;

// Saved filter groups table
export const savedFilterGroups = pgTable("saved_filter_groups", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 200 }).notNull(),
  description: text("description"),
  ownerId: varchar("owner_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  scope: varchar("scope", { length: 20 }).notNull().default("personal"), // 'personal' or 'shared'
  filterTree: jsonb("filter_tree").notNull().$type<any>(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertSavedFilterGroupSchema = createInsertSchema(savedFilterGroups, {
  name: z.string().min(1, "Nome do filtro é obrigatório").max(200),
  description: z.string().optional(),
  scope: z.enum(["personal", "shared"]),
  filterTree: filterTreeSchema,
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const updateSavedFilterGroupSchema = insertSavedFilterGroupSchema.partial();

export type InsertSavedFilterGroup = z.infer<typeof insertSavedFilterGroupSchema>;
export type UpdateSavedFilterGroup = z.infer<typeof updateSavedFilterGroupSchema>;
export type SavedFilterGroup = typeof savedFilterGroups.$inferSelect;

// Custom Field Definitions - Excel-like customizable fields
export const FIELD_TYPES = ["text", "number", "select", "date"] as const;
export type FieldType = typeof FIELD_TYPES[number];

export const customFieldDefinitions = pgTable("custom_field_definitions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 100 }).notNull(), // Field name (e.g., "Especialização")
  label: varchar("label", { length: 200 }).notNull(), // Display label
  fieldType: varchar("field_type", { length: 20 }).notNull(), // 'text', 'number', 'select', 'date'
  options: jsonb("options").$type<string[]>(), // For 'select' type fields
  required: integer("required").default(0), // 0 = optional, 1 = required
  orderIndex: integer("order_index").notNull().default(0), // Display order
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertCustomFieldDefinitionSchema = createInsertSchema(customFieldDefinitions, {
  name: z.string().min(1, "Nome do campo é obrigatório").max(100),
  label: z.string().min(1, "Rótulo é obrigatório").max(200),
  fieldType: z.enum(FIELD_TYPES),
  options: z.array(z.string()).optional().nullable(),
  required: z.number().min(0).max(1).optional(),
  orderIndex: z.number().optional(),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const updateCustomFieldDefinitionSchema = insertCustomFieldDefinitionSchema.partial();

export type InsertCustomFieldDefinition = z.infer<typeof insertCustomFieldDefinitionSchema>;
export type UpdateCustomFieldDefinition = z.infer<typeof updateCustomFieldDefinitionSchema>;
export type CustomFieldDefinition = typeof customFieldDefinitions.$inferSelect;

// User Preferences table - stores user UI preferences (card order, visibility, etc.)
export const userPreferences = pgTable("user_preferences", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  preferenceKey: varchar("preference_key", { length: 100 }).notNull(), // e.g., "companhias_card_order"
  preferenceValue: jsonb("preference_value").notNull(), // Flexible JSON storage
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("IDX_user_preferences_userId").on(table.userId),
  index("IDX_user_preferences_key").on(table.userId, table.preferenceKey),
]);

export const insertUserPreferenceSchema = createInsertSchema(userPreferences).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const updateUserPreferenceSchema = insertUserPreferenceSchema.partial();

export type InsertUserPreference = z.infer<typeof insertUserPreferenceSchema>;
export type UpdateUserPreference = z.infer<typeof updateUserPreferenceSchema>;
export type UserPreference = typeof userPreferences.$inferSelect;
