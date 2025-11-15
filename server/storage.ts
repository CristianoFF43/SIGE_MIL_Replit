import {
  users,
  militaryPersonnel,
  savedFilterGroups,
  customFieldDefinitions,
  userPreferences,
  type User,
  type UpsertUser,
  type MilitaryPersonnel,
  type InsertMilitaryPersonnel,
  type UpdateMilitaryPersonnel,
  type SavedFilterGroup,
  type InsertSavedFilterGroup,
  type UpdateSavedFilterGroup,
  type CustomFieldDefinition,
  type InsertCustomFieldDefinition,
  type UpdateCustomFieldDefinition,
  type UserPreference,
  type InsertUserPreference,
  type FilterTree,
} from "@shared/schema";
import { db } from "./db";
import { eq, ilike, or, and, sql, SQL } from "drizzle-orm";
import { buildFilterPredicate } from "./filterBuilder";

export interface IStorage {
  // User operations (mandatory for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  getAllUsers(): Promise<User[]>;
  updateUserRole(userId: string, role: string): Promise<User>;
  createUser(data: any): Promise<User>;
  updateUser(userId: string, data: any): Promise<User>;
  deleteUser(userId: string): Promise<void>;
  deleteAllUsers(): Promise<void>;

  // Military Personnel operations
  getAllMilitaryPersonnel(): Promise<MilitaryPersonnel[]>;
  getMilitaryPersonnelById(id: number): Promise<MilitaryPersonnel | undefined>;
  createMilitaryPersonnel(data: InsertMilitaryPersonnel): Promise<MilitaryPersonnel>;
  updateMilitaryPersonnel(id: number, data: UpdateMilitaryPersonnel): Promise<MilitaryPersonnel>;
  deleteMilitaryPersonnel(id: number): Promise<void>;

  // Stats operations
  getStats(): Promise<{
    total: number;
    byCompany: Record<string, number>;
    byRank: Record<string, number>;
    byStatus: Record<string, number>;
    byMission: Record<string, number>;
  }>;
  getDynamicStats(fieldName: string): Promise<{
    field: string;
    data: Array<{ name: string; value: number }>;
  }>;
  getCustomFieldDefinitions(): Promise<CustomFieldDefinition[]>;

  // Saved Filter Groups operations
  getSavedFilterGroups(userId: string): Promise<SavedFilterGroup[]>;
  getSavedFilterGroupById(id: string): Promise<SavedFilterGroup | undefined>;
  createSavedFilterGroup(data: InsertSavedFilterGroup): Promise<SavedFilterGroup>;
  updateSavedFilterGroup(id: string, data: UpdateSavedFilterGroup): Promise<SavedFilterGroup>;
  deleteSavedFilterGroup(id: string): Promise<void>;
  
  // Custom Field Definitions operations
  getAllCustomFieldDefinitions(): Promise<CustomFieldDefinition[]>;
  getCustomFieldDefinitionById(id: string): Promise<CustomFieldDefinition | undefined>;
  createCustomFieldDefinition(data: InsertCustomFieldDefinition): Promise<CustomFieldDefinition>;
  updateCustomFieldDefinition(id: string, data: UpdateCustomFieldDefinition): Promise<CustomFieldDefinition>;
  deleteCustomFieldDefinition(id: string): Promise<void>;
  
  // Advanced filtering
  getMilitaryPersonnelWithFilter(filterTree: FilterTree): Promise<MilitaryPersonnel[]>;

  // User Preferences operations
  getUserPreference(userId: string, preferenceKey: string): Promise<UserPreference | undefined>;
  upsertUserPreference(userId: string, preferenceKey: string, preferenceValue: any): Promise<UserPreference>;
  deleteUserPreference(userId: string, preferenceKey: string): Promise<void>;
}

/**
 * Validates and normalizes custom field values according to their definitions
 * - Converts number fields to actual numbers
 * - Validates select options
 * - Validates required fields
 * Throws error if validation fails
 * 
 * EXPORTED for use in imports (Google Sheets, Excel) to ensure data integrity
 * 
 * @param customFields - Custom field values to validate
 * @param definitions - Custom field definitions (pass to avoid repeated queries)
 */
export async function validateAndNormalizeCustomFields(
  customFields: Record<string, any> | null,
  definitions?: CustomFieldDefinition[]
): Promise<Record<string, any> | null> {
  if (!customFields) {
    customFields = {};
  }
  const defs = definitions ?? await db.select().from(customFieldDefinitions);
  const normalized: Record<string, any> = {};
  const errors: string[] = [];
  
  for (const def of defs) {
    const rawValue = customFields[def.name];
    
    // Normalize empty values: trim strings and treat empty as null
    const isEmpty = rawValue === undefined || rawValue === null || 
      (typeof rawValue === 'string' && rawValue.trim() === '');
    
    // Check required fields
    if (def.required === 1 && isEmpty) {
      errors.push(`Campo obrigatório ausente: ${def.label}`);
      continue;
    }
    
    // Skip empty optional fields (don't store them)
    if (isEmpty) {
      continue;
    }
    
    // Type conversion and validation
    if (def.fieldType === 'number') {
      const numValue = typeof rawValue === 'number' ? rawValue : parseFloat(rawValue);
      if (isNaN(numValue)) {
        errors.push(`${def.label} deve ser um número válido`);
      } else {
        normalized[def.name] = numValue;
      }
    } else if (def.fieldType === 'select') {
      // Validate that value is one of the allowed options
      const options = def.options || [];
      const strValue = String(rawValue);
      if (!options.includes(strValue)) {
        errors.push(`${def.label}: valor "${strValue}" não está entre as opções válidas`);
      } else {
        normalized[def.name] = strValue;
      }
    } else {
      // text and date fields: store trimmed string
      normalized[def.name] = typeof rawValue === 'string' ? rawValue.trim() : String(rawValue);
    }
  }
  
  if (errors.length > 0) {
    throw new Error(errors.join('; '));
  }
  
  return Object.keys(normalized).length > 0 ? normalized : null;
}

export class DatabaseStorage implements IStorage {
  /**
   * Validates and normalizes custom field values (wrapper around exported function)
   */
  private async validateAndNormalizeCustomFields(customFields: Record<string, any> | null): Promise<Record<string, any> | null> {
    return validateAndNormalizeCustomFields(customFields);
  }

  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    if (user && user.permissions) {
      // Normalize permissions: convert legacy JSON strings to objects
      if (typeof user.permissions === "string") {
        try {
          user.permissions = JSON.parse(user.permissions as string);
        } catch (e) {
          console.error("Failed to parse permissions for user", id, e);
          user.permissions = null;
        }
      }
    }
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const existing = await db.select().from(users).where(eq(users.email, userData.email!));
    
    if (existing.length > 0) {
      // User exists, update it
      const [user] = await db
        .update(users)
        .set({
          ...userData,
          updatedAt: new Date(),
        })
        .where(eq(users.email, userData.email!))
        .returning();
      return user;
    } else {
      // New user, insert it
      const [user] = await db
        .insert(users)
        .values(userData)
        .returning();
      return user;
    }
  }

  async getAllUsers(): Promise<User[]> {
    const allUsers = await db.select().from(users);
    return allUsers.map((user: User) => {
      if (user.permissions && typeof user.permissions === "string") {
        try {
          user.permissions = JSON.parse(user.permissions as string);
        } catch (e) {
          console.error("Failed to parse permissions for user", user.id, e);
          user.permissions = null;
        }
      }
      return user;
    });
  }

  async updateUserRole(userId: string, role: string): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ role, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async createUser(data: any): Promise<User> {
    const [user] = await db
      .insert(users)
      .values({
        id: sql`gen_random_uuid()`,
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        nomeGuerra: data.nomeGuerra || null,
        postoGraduacao: data.postoGraduacao || null,
        role: data.role || 'user',
        permissions: data.permissions || null, // Drizzle handles JSONB serialization
      })
      .returning();
    return user;
  }

  async updateUser(userId: string, data: any): Promise<User> {
    const updateData: any = {
      updatedAt: new Date(),
    };
    
    if (data.email !== undefined) updateData.email = data.email;
    if (data.firstName !== undefined) updateData.firstName = data.firstName;
    if (data.lastName !== undefined) updateData.lastName = data.lastName;
    if (data.nomeGuerra !== undefined) updateData.nomeGuerra = data.nomeGuerra;
    if (data.postoGraduacao !== undefined) updateData.postoGraduacao = data.postoGraduacao;
    if (data.role !== undefined) updateData.role = data.role;
    if (data.permissions !== undefined) {
      updateData.permissions = data.permissions || null; // Drizzle handles JSONB serialization
    }

    const [user] = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async deleteUser(userId: string): Promise<void> {
    await db.delete(users).where(eq(users.id, userId));
  }

  async deleteAllUsers(): Promise<void> {
    console.log('🗑️ DELETING ALL USERS FROM DATABASE');
    await db.delete(users);
    console.log('✅ All users deleted successfully');
  }

  // Military Personnel operations
  async getAllMilitaryPersonnel(): Promise<MilitaryPersonnel[]> {
    return await db.select().from(militaryPersonnel).orderBy(militaryPersonnel.ord);
  }

  async getMilitaryPersonnelById(id: number): Promise<MilitaryPersonnel | undefined> {
    const [person] = await db
      .select()
      .from(militaryPersonnel)
      .where(eq(militaryPersonnel.id, id));
    return person;
  }

  async createMilitaryPersonnel(data: InsertMilitaryPersonnel): Promise<MilitaryPersonnel> {
    // Validate and normalize custom fields (required, types, select options)
    const customFieldsInput = data.customFields && typeof data.customFields === 'object' && !Array.isArray(data.customFields)
      ? data.customFields as Record<string, any>
      : null;
    const normalizedCustomFields = await this.validateAndNormalizeCustomFields(customFieldsInput);
    
    const [person] = await db
      .insert(militaryPersonnel)
      .values({ ...data, customFields: normalizedCustomFields })
      .returning();
    return person;
  }

  async updateMilitaryPersonnel(
    id: number,
    data: UpdateMilitaryPersonnel
  ): Promise<MilitaryPersonnel> {
    // If customFields is being updated, validate and normalize
    let normalizedData = { ...data };
    if (data.customFields !== undefined) {
      const customFieldsInput = data.customFields && typeof data.customFields === 'object' && !Array.isArray(data.customFields)
        ? data.customFields as Record<string, any>
        : null;
      const normalizedCustomFields = await this.validateAndNormalizeCustomFields(customFieldsInput);
      normalizedData.customFields = normalizedCustomFields;
    }
    
    const [person] = await db
      .update(militaryPersonnel)
      .set({ ...normalizedData, updatedAt: new Date() })
      .where(eq(militaryPersonnel.id, id))
      .returning();
    return person;
  }

  async deleteMilitaryPersonnel(id: number): Promise<void> {
    await db.delete(militaryPersonnel).where(eq(militaryPersonnel.id, id));
  }

  // Stats operations
  async getStats() {
    const allPersonnel = await this.getAllMilitaryPersonnel();

    const byCompany: Record<string, number> = {};
    const byRank: Record<string, number> = {};
    const byStatus: Record<string, number> = {};
    const byMission: Record<string, number> = {};

    allPersonnel.forEach((person) => {
      // By company
      if (person.companhia) {
        byCompany[person.companhia] = (byCompany[person.companhia] || 0) + 1;
      }

      // By rank
      if (person.postoGraduacao) {
        byRank[person.postoGraduacao] = (byRank[person.postoGraduacao] || 0) + 1;
      }

      // By status
      if (person.situacao) {
        byStatus[person.situacao] = (byStatus[person.situacao] || 0) + 1;
      }

      // By mission
      if (person.missaoOp) {
        byMission[person.missaoOp] = (byMission[person.missaoOp] || 0) + 1;
      }
    });

    return {
      total: allPersonnel.length,
      byCompany,
      byRank,
      byStatus,
      byMission,
    };
  }

  // Dynamic stats - aggregates data for any field (standard or custom)
  async getDynamicStats(fieldName: string): Promise<{ field: string; data: Array<{ name: string; value: number }> }> {
    const allPersonnel = await this.getAllMilitaryPersonnel();
    const aggregation: Record<string, number> = {};

    allPersonnel.forEach((person) => {
      let fieldValue: any;

      // Check if it's a custom field (format: customFields.fieldName)
      if (fieldName.startsWith('customFields.')) {
        const customFieldName = fieldName.replace('customFields.', '');
        const customFieldsData = person.customFields as Record<string, any>;
        fieldValue = customFieldsData?.[customFieldName];
      } else {
        // Standard field
        fieldValue = (person as any)[fieldName];
      }

      // Only count non-null/non-empty values
      if (fieldValue !== null && fieldValue !== undefined && fieldValue !== '') {
        const key = String(fieldValue);
        aggregation[key] = (aggregation[key] || 0) + 1;
      }
    });

    // Convert to array format for charts
    const data = Object.entries(aggregation).map(([name, value]) => ({
      name,
      value,
    }));

    return {
      field: fieldName,
      data,
    };
  }

  // Saved Filter Groups operations
  async getSavedFilterGroups(userId: string): Promise<SavedFilterGroup[]> {
    // Retorna filtros pessoais do usuário + filtros compartilhados
    return await db
      .select()
      .from(savedFilterGroups)
      .where(
        or(
          eq(savedFilterGroups.ownerId, userId),
          eq(savedFilterGroups.scope, 'shared')
        )
      )
      .orderBy(savedFilterGroups.createdAt);
  }

  async getSavedFilterGroupById(id: string): Promise<SavedFilterGroup | undefined> {
    const [filterGroup] = await db
      .select()
      .from(savedFilterGroups)
      .where(eq(savedFilterGroups.id, id));
    return filterGroup;
  }

  async createSavedFilterGroup(data: InsertSavedFilterGroup): Promise<SavedFilterGroup> {
    const [filterGroup] = await db
      .insert(savedFilterGroups)
      .values(data)
      .returning();
    return filterGroup;
  }

  async updateSavedFilterGroup(
    id: string,
    data: UpdateSavedFilterGroup
  ): Promise<SavedFilterGroup> {
    const [filterGroup] = await db
      .update(savedFilterGroups)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(savedFilterGroups.id, id))
      .returning();
    return filterGroup;
  }

  async deleteSavedFilterGroup(id: string): Promise<void> {
    await db.delete(savedFilterGroups).where(eq(savedFilterGroups.id, id));
  }

  // Custom Field Definitions operations
  async getAllCustomFieldDefinitions(): Promise<CustomFieldDefinition[]> {
    return await db
      .select()
      .from(customFieldDefinitions)
      .orderBy(customFieldDefinitions.orderIndex);
  }

  // Alias for getAllCustomFieldDefinitions (for convenience)
  async getCustomFieldDefinitions(): Promise<CustomFieldDefinition[]> {
    return this.getAllCustomFieldDefinitions();
  }

  async getCustomFieldDefinitionById(id: string): Promise<CustomFieldDefinition | undefined> {
    const [fieldDef] = await db
      .select()
      .from(customFieldDefinitions)
      .where(eq(customFieldDefinitions.id, id));
    return fieldDef;
  }

  async createCustomFieldDefinition(data: InsertCustomFieldDefinition): Promise<CustomFieldDefinition> {
    const [fieldDef] = await db
      .insert(customFieldDefinitions)
      .values(data)
      .returning();
    return fieldDef;
  }

  async updateCustomFieldDefinition(
    id: string,
    data: UpdateCustomFieldDefinition
  ): Promise<CustomFieldDefinition> {
    const [fieldDef] = await db
      .update(customFieldDefinitions)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(customFieldDefinitions.id, id))
      .returning();
    return fieldDef;
  }

  async deleteCustomFieldDefinition(id: string): Promise<void> {
    await db.delete(customFieldDefinitions).where(eq(customFieldDefinitions.id, id));
  }

  // Advanced filtering
  async getMilitaryPersonnelWithFilter(filterTree: FilterTree): Promise<MilitaryPersonnel[]> {
    const predicate = buildFilterPredicate(filterTree);

    if (!predicate) {
      // Se não há predicado, retorna todos
      return await this.getAllMilitaryPersonnel();
    }

    return await db
      .select()
      .from(militaryPersonnel)
      .where(predicate)
      .orderBy(militaryPersonnel.ord);
  }

  // User Preferences operations
  async getUserPreference(userId: string, preferenceKey: string): Promise<UserPreference | undefined> {
    const [preference] = await db
      .select()
      .from(userPreferences)
      .where(and(
        eq(userPreferences.userId, userId),
        eq(userPreferences.preferenceKey, preferenceKey)
      ));
    return preference;
  }

  async upsertUserPreference(userId: string, preferenceKey: string, preferenceValue: any): Promise<UserPreference> {
    const existing = await this.getUserPreference(userId, preferenceKey);

    if (existing) {
      // Update existing preference
      const [updated] = await db
        .update(userPreferences)
        .set({
          preferenceValue,
          updatedAt: new Date(),
        })
        .where(eq(userPreferences.id, existing.id))
        .returning();
      return updated;
    } else {
      // Insert new preference
      const [inserted] = await db
        .insert(userPreferences)
        .values({
          userId,
          preferenceKey,
          preferenceValue,
        })
        .returning();
      return inserted;
    }
  }

  async deleteUserPreference(userId: string, preferenceKey: string): Promise<void> {
    await db
      .delete(userPreferences)
      .where(and(
        eq(userPreferences.userId, userId),
        eq(userPreferences.preferenceKey, preferenceKey)
      ));
  }
}

export const storage = new DatabaseStorage();
