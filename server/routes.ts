import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage.js";
import { db } from "./db.js";
import { sql } from "drizzle-orm";
import { firebaseAuth, requirePermission } from "./firebaseAuth.js";
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import {
  insertMilitaryPersonnelSchema,
  updateMilitaryPersonnelSchema,
  insertSavedFilterGroupSchema,
  updateSavedFilterGroupSchema,
  insertCustomFieldDefinitionSchema,
  updateCustomFieldDefinitionSchema,
  filterTreeSchema,
  createUserSchema,
  updateUserSchema,
  DEFAULT_PERMISSIONS,
} from "@shared/schema";
import { fromError } from "zod-validation-error";
import { simpleFiltersToTree } from "./filterBuilder.js";

const isAuthenticated = firebaseAuth;

export async function registerRoutes(app: Express): Promise<Server> {
  app.get('/api/health/db', async (_req, res) => {
    try {
      await db.execute(sql`select 1`);
      const result: any = await db.execute(sql`select table_name from information_schema.tables where table_schema = 'public' and table_name in ('users','military_personnel','custom_field_definitions','saved_filter_groups')`);
      const tables = (result.rows || result)?.map((r: any) => r.table_name) || [];
      res.json({ ok: true, tables });
    } catch (error: any) {
      res.status(500).json({ ok: false, message: error.message });
    }
  });
  // No additional auth setup needed - Firebase Auth is stateless
  // Setup file upload (in-memory) 
  const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      const err = error as any;
      res.status(500).json({
        message: "Failed to fetch user",
        error: err.message,
        stack: err.stack
      });
    }
  });

  // User management routes (Permission-based)
  app.get('/api/users', isAuthenticated, requirePermission("usuarios", "view"), async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.patch('/api/users/:id/role', isAuthenticated, requirePermission("usuarios", "manage"), async (req, res) => {
    try {
      const { id } = req.params;
      const { role } = req.body;

      if (!role || !["user", "manager", "administrator"].includes(role)) {
        return res.status(400).json({ message: "Invalid role" });
      }

      const user = await storage.updateUserRole(id, role);
      res.json(user);
    } catch (error) {
      console.error("Error updating user role:", error);
      res.status(500).json({ message: "Failed to update user role" });
    }
  });

  // Create new user (Permission-based)
  app.post('/api/users', isAuthenticated, requirePermission("usuarios", "manage"), async (req, res) => {
    try {
      const validated = createUserSchema.parse(req.body);

      // If no custom permissions provided, use default for the role
      if (!validated.permissions) {
        validated.permissions = DEFAULT_PERMISSIONS[validated.role];
      }

      const user = await storage.createUser(validated);
      res.json(user);
    } catch (error: any) {
      if (error.name === "ZodError") {
        const validationError = fromError(error);
        return res.status(400).json({ message: validationError.toString() });
      }
      console.error("Error creating user:", error);
      res.status(500).json({ message: "Failed to create user" });
    }
  });

  // Update user (Permission-based)
  app.patch('/api/users/:id', isAuthenticated, requirePermission("usuarios", "manage"), async (req, res) => {
    try {
      const { id } = req.params;
      const validated = updateUserSchema.parse({ ...req.body, id });

      const user = await storage.updateUser(id, validated);
      res.json(user);
    } catch (error: any) {
      if (error.name === "ZodError") {
        const validationError = fromError(error);
        return res.status(400).json({ message: validationError.toString() });
      }
      console.error("Error updating user:", error);
      res.status(500).json({ message: "Failed to update user" });
    }
  });

  // Delete user (Permission-based)
  app.delete('/api/users/:id', isAuthenticated, requirePermission("usuarios", "manage"), async (req, res) => {
    try {
      const { id } = req.params;
      const currentUserId = (req.user as any)?.claims?.sub;

      // Prevent self-deletion
      if (id === currentUserId) {
        return res.status(400).json({ message: "Cannot delete your own account" });
      }

      await storage.deleteUser(id);
      res.json({ message: "User deleted successfully" });
    } catch (error) {
      console.error("Error deleting user:", error);
      res.status(500).json({ message: "Failed to delete user" });
    }
  });

  // Military Personnel routes
  app.get('/api/militares', isAuthenticated, requirePermission("militares", "view"), async (req: any, res) => {
    try {
      const { filter_id, filter_tree, companhia, posto, situacao, missaoOp, search } = req.query;

      let militares;

      // Prioridade 1: filter_id (filtro salvo)
      if (filter_id) {
        const userId = (req.user as any)?.claims?.sub;
        const savedFilter = await storage.getSavedFilterGroupById(filter_id as string);
        if (!savedFilter) {
          return res.status(404).json({ message: "Saved filter not found" });
        }

        // Verificação de autorização: apenas dono ou filtro compartilhado
        if (savedFilter.ownerId !== userId && savedFilter.scope !== 'shared') {
          return res.status(403).json({ message: "You don't have permission to use this filter" });
        }

        militares = await storage.getMilitaryPersonnelWithFilter(savedFilter.filterTree);
      }
      // Prioridade 2: filter_tree (filtro avançado inline)
      else if (filter_tree) {
        try {
          const parsedTree = JSON.parse(filter_tree as string);
          const validatedTree = filterTreeSchema.parse(parsedTree);
          militares = await storage.getMilitaryPersonnelWithFilter(validatedTree);
        } catch (parseError) {
          return res.status(400).json({ message: "Invalid filter tree format" });
        }
      }
      // Prioridade 3: filtros simples (compatibilidade retroativa)
      else if (companhia || posto || situacao || missaoOp || search) {
        const simpleTree = simpleFiltersToTree({
          companhia: companhia as string,
          posto: posto as string,
          situacao: situacao as string,
          missaoOp: missaoOp as string,
          search: search as string,
        });
        militares = await storage.getMilitaryPersonnelWithFilter(simpleTree);
      }
      // Sem filtros: retorna todos
      else {
        militares = await storage.getAllMilitaryPersonnel();
      }

      res.json(militares);
    } catch (error) {
      console.error("Error fetching military personnel:", error);
      res.status(500).json({ message: "Failed to fetch military personnel" });
    }
  });

  app.get('/api/militares/:id', isAuthenticated, requirePermission("militares", "view"), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const militar = await storage.getMilitaryPersonnelById(id);

      if (!militar) {
        return res.status(404).json({ message: "Military personnel not found" });
      }

      res.json(militar);
    } catch (error) {
      console.error("Error fetching military personnel:", error);
      res.status(500).json({ message: "Failed to fetch military personnel" });
    }
  });

  app.post('/api/militares', isAuthenticated, requirePermission("militares", "create"), async (req, res) => {
    try {
      const validatedData = insertMilitaryPersonnelSchema.parse(req.body);
      const militar = await storage.createMilitaryPersonnel(validatedData);
      res.status(201).json(militar);
    } catch (error: any) {
      if (error.name === "ZodError") {
        const validationError = fromError(error);
        return res.status(400).json({ message: validationError.toString() });
      }
      console.error("Error creating military personnel:", error);
      res.status(500).json({ message: "Failed to create military personnel" });
    }
  });

  app.patch('/api/militares/:id', isAuthenticated, requirePermission("militares", "edit"), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = updateMilitaryPersonnelSchema.parse(req.body);

      const militar = await storage.updateMilitaryPersonnel(id, validatedData);
      res.json(militar);
    } catch (error: any) {
      if (error.name === "ZodError") {
        const validationError = fromError(error);
        return res.status(400).json({ message: validationError.toString() });
      }
      console.error("Error updating military personnel:", error);
      res.status(500).json({ message: "Failed to update military personnel" });
    }
  });

  app.delete('/api/militares/:id', isAuthenticated, requirePermission("militares", "delete"), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteMilitaryPersonnel(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting military personnel:", error);
      res.status(500).json({ message: "Failed to delete military personnel" });
    }
  });

  // Stats route
  app.get('/api/stats', isAuthenticated, requirePermission("dashboard", "view"), async (req, res) => {
    try {
      const stats = await storage.getStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching stats:", error);
      res.status(500).json({ message: "Failed to fetch stats" });
    }
  });

  // Dynamic stats route - returns aggregated data for any field
  app.get('/api/stats/dynamic', isAuthenticated, requirePermission("dashboard", "view"), async (req, res) => {
    try {
      const { field } = req.query;

      if (!field || typeof field !== 'string') {
        return res.status(400).json({ message: "Field parameter is required" });
      }

      const stats = await storage.getDynamicStats(field);
      res.json(stats);
    } catch (error) {
      console.error(`Error fetching dynamic stats for field ${req.query.field}:`, error);
      res.status(500).json({ message: "Failed to fetch dynamic stats" });
    }
  });

  // Get all available fields for dynamic stats (standard + custom)
  app.get('/api/stats/fields', isAuthenticated, requirePermission("dashboard", "view"), async (req, res) => {
    try {
      const customFields = await storage.getCustomFieldDefinitions();

      // Standard fields
      const standardFields = [
        { name: 'companhia', label: 'Companhia', type: 'standard' },
        { name: 'postoGraduacao', label: 'Posto/Graduação', type: 'standard' },
        { name: 'situacao', label: 'Situação', type: 'standard' },
        { name: 'missaoOp', label: 'Missão', type: 'standard' },
        { name: 'armaQuadroServico', label: 'A/Q/S', type: 'standard' },
        { name: 'secaoFracao', label: 'SEÇ/FRAÇÃO', type: 'standard' },
        { name: 'funcao', label: 'Função', type: 'standard' },
      ];

      // Custom fields
      const customFieldsFormatted = customFields.map(cf => ({
        name: `customFields.${cf.name}`,
        label: cf.label,
        type: 'custom',
        fieldType: cf.fieldType,
      }));

      res.json({
        standard: standardFields,
        custom: customFieldsFormatted,
        all: [...standardFields, ...customFieldsFormatted],
      });
    } catch (error) {
      console.error("Error fetching available fields:", error);
      res.status(500).json({ message: "Failed to fetch available fields" });
    }
  });

  // Saved Filter Groups routes (authenticated users can manage their own filters)
  app.get('/api/filters', isAuthenticated, requirePermission("militares", "view"), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const filters = await storage.getSavedFilterGroups(userId);
      res.json(filters);
    } catch (error) {
      console.error("Error fetching saved filters:", error);
      res.status(500).json({ message: "Failed to fetch saved filters" });
    }
  });

  app.post('/api/filters', isAuthenticated, requirePermission("militares", "view"), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const validatedData = insertSavedFilterGroupSchema.parse({
        ...req.body,
        ownerId: userId,
      });

      const filter = await storage.createSavedFilterGroup(validatedData);
      res.status(201).json(filter);
    } catch (error: any) {
      if (error.name === "ZodError") {
        const validationError = fromError(error);
        return res.status(400).json({ message: validationError.toString() });
      }
      console.error("Error creating saved filter:", error);
      res.status(500).json({ message: "Failed to create saved filter" });
    }
  });

  app.patch('/api/filters/:id', isAuthenticated, requirePermission("militares", "view"), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const filterId = req.params.id;

      // Verifica se o usuário é o dono do filtro
      const existingFilter = await storage.getSavedFilterGroupById(filterId);
      if (!existingFilter) {
        return res.status(404).json({ message: "Filter not found" });
      }

      if (existingFilter.ownerId !== userId) {
        return res.status(403).json({ message: "You can only edit your own filters" });
      }

      const validatedData = updateSavedFilterGroupSchema.parse(req.body);
      const filter = await storage.updateSavedFilterGroup(filterId, validatedData);
      res.json(filter);
    } catch (error: any) {
      if (error.name === "ZodError") {
        const validationError = fromError(error);
        return res.status(400).json({ message: validationError.toString() });
      }
      console.error("Error updating saved filter:", error);
      res.status(500).json({ message: "Failed to update saved filter" });
    }
  });

  app.delete('/api/filters/:id', isAuthenticated, requirePermission("militares", "view"), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const filterId = req.params.id;

      // Verifica se o usuário é o dono do filtro
      const existingFilter = await storage.getSavedFilterGroupById(filterId);
      if (!existingFilter) {
        return res.status(404).json({ message: "Filter not found" });
      }

      if (existingFilter.ownerId !== userId) {
        return res.status(403).json({ message: "You can only delete your own filters" });
      }

      await storage.deleteSavedFilterGroup(filterId);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting saved filter:", error);
      res.status(500).json({ message: "Failed to delete saved filter" });
    }
  });

  // Custom Field Definitions routes (Admin only)
  app.get('/api/custom-fields', isAuthenticated, requirePermission("usuarios", "manage"), async (req, res) => {
    try {
      const fields = await storage.getAllCustomFieldDefinitions();
      res.json(fields);
    } catch (error) {
      console.error("Error fetching custom fields:", error);
      res.status(500).json({ message: "Failed to fetch custom fields" });
    }
  });

  app.get('/api/custom-fields/:id', isAuthenticated, requirePermission("usuarios", "manage"), async (req, res) => {
    try {
      const field = await storage.getCustomFieldDefinitionById(req.params.id);
      if (!field) {
        return res.status(404).json({ message: "Custom field not found" });
      }
      res.json(field);
    } catch (error) {
      console.error("Error fetching custom field:", error);
      res.status(500).json({ message: "Failed to fetch custom field" });
    }
  });

  app.post('/api/custom-fields', isAuthenticated, requirePermission("usuarios", "manage"), async (req, res) => {
    try {
      const validatedData = insertCustomFieldDefinitionSchema.parse(req.body);
      const field = await storage.createCustomFieldDefinition(validatedData);
      res.status(201).json(field);
    } catch (error: any) {
      if (error.name === "ZodError") {
        const validationError = fromError(error);
        return res.status(400).json({ message: validationError.toString() });
      }
      console.error("Error creating custom field:", error);
      res.status(500).json({ message: "Failed to create custom field" });
    }
  });

  app.patch('/api/custom-fields/:id', isAuthenticated, requirePermission("usuarios", "manage"), async (req, res) => {
    try {
      const existing = await storage.getCustomFieldDefinitionById(req.params.id);
      if (!existing) {
        return res.status(404).json({ message: "Custom field not found" });
      }

      const validatedData = updateCustomFieldDefinitionSchema.parse(req.body);
      const field = await storage.updateCustomFieldDefinition(req.params.id, validatedData);
      res.json(field);
    } catch (error: any) {
      if (error.name === "ZodError") {
        const validationError = fromError(error);
        return res.status(400).json({ message: validationError.toString() });
      }
      console.error("Error updating custom field:", error);
      res.status(500).json({ message: "Failed to update custom field" });
    }
  });

  app.delete('/api/custom-fields/:id', isAuthenticated, requirePermission("usuarios", "manage"), async (req, res) => {
    try {
      const existing = await storage.getCustomFieldDefinitionById(req.params.id);
      if (!existing) {
        return res.status(404).json({ message: "Custom field not found" });
      }

      await storage.deleteCustomFieldDefinition(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting custom field:", error);
      res.status(500).json({ message: "Failed to delete custom field" });
    }
  });

  // User Preferences routes
  app.get('/api/preferences/:preferenceKey', isAuthenticated, async (req, res) => {
    try {
      const userId = (req as any).user?.claims?.sub;
      const { preferenceKey } = req.params;

      const preference = await storage.getUserPreference(userId, preferenceKey);
      if (!preference) {
        return res.json({ preferenceValue: null }); // Return null if no preference set
      }

      res.json(preference);
    } catch (error) {
      console.error("Error fetching preference:", error);
      res.status(500).json({ message: "Failed to fetch preference" });
    }
  });

  app.put('/api/preferences/:preferenceKey', isAuthenticated, async (req, res) => {
    try {
      const userId = (req as any).user?.claims?.sub;
      const { preferenceKey } = req.params;
      const { preferenceValue } = req.body;

      const preference = await storage.upsertUserPreference(userId, preferenceKey, preferenceValue);
      res.json(preference);
    } catch (error) {
      console.error("Error saving preference:", error);
      res.status(500).json({ message: "Failed to save preference" });
    }
  });

  app.delete('/api/preferences/:preferenceKey', isAuthenticated, async (req, res) => {
    try {
      const userId = (req as any).user?.claims?.sub;
      const { preferenceKey } = req.params;

      await storage.deleteUserPreference(userId, preferenceKey);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting preference:", error);
      res.status(500).json({ message: "Failed to delete preference" });
    }
  });

  // Import from Google Sheets or Excel file (Admin only)
  app.post('/api/import/google-sheets', isAuthenticated, requirePermission("importar", "import"), async (req, res) => {
    try {
      const { spreadsheetUrl, sheetName } = req.body;

      if (!spreadsheetUrl) {
        return res.status(400).json({ message: "Spreadsheet URL or ID is required" });
      }

      // Tenta primeiro como arquivo Excel (Google Drive)
      try {
        const { importFromExcelFile, extractFileId } = await import('./importFromExcel');
        const fileId = extractFileId(spreadsheetUrl);
        const result = await importFromExcelFile(fileId);
        return res.json(result);
      } catch (excelError: any) {
        // Se falhar, tenta como Google Sheets nativo
        console.log('Not an Excel file, trying Google Sheets...');
        const { importFromGoogleSheets, extractSpreadsheetId } = await import('./googleSheetsImport');
        const spreadsheetId = extractSpreadsheetId(spreadsheetUrl);
        const result = await importFromGoogleSheets(spreadsheetId, sheetName || 'Sheet1');
        return res.json(result);
      }
    } catch (error: any) {
      console.error("Error importing data:", error);
      res.status(500).json({
        message: "Failed to import data",
        error: error.message
      });
    }
  });

  // Import by direct file upload (CSV or XLSX) - Admin only
  app.post('/api/import/upload', isAuthenticated, requirePermission("importar", "import"), upload.single('file'), async (req: any, res) => {
    try {
      if (!req.file || !req.file.buffer) {
        return res.status(400).json({ message: 'No file uploaded. Expect field "file" with CSV/XLSX.' });
      }

      console.log(`[UPLOAD IMPORT] Received file: ${req.file.originalname} (${req.file.mimetype}) size=${req.file.size}`);

      const { importFromBuffer } = await import('./importFromExcel');
      const result = await importFromBuffer(req.file.buffer);
      return res.json(result);
    } catch (error: any) {
      console.error('[UPLOAD IMPORT] Error:', error);
      res.status(500).json({ message: 'Failed to import uploaded file', error: error.message });
    }
  });

  // Import from a local file path on server (CSV or XLSX) - Admin only
  app.post('/api/import/local-file', isAuthenticated, requirePermission("importar", "import"), async (req: any, res) => {
    try {
      const { filePath, fileName } = req.body || {};
      const baseDir = process.cwd();

      if (!filePath && !fileName) {
        return res.status(400).json({ message: 'Provide "filePath" or "fileName" in request body.' });
      }

      const provided = (filePath || fileName) as string;
      const candidatePath = path.isAbsolute(provided)
        ? provided
        : path.resolve(baseDir, provided);

      const relative = path.relative(baseDir, candidatePath);
      if (relative.startsWith('..') || path.isAbsolute(relative)) {
        return res.status(400).json({ message: 'Invalid path: must be inside project directory.' });
      }

      console.log(`[LOCAL IMPORT] Reading file: ${candidatePath}`);
      const buffer = await fs.readFile(candidatePath);

      const { importFromBuffer } = await import('./importFromExcel');
      const result = await importFromBuffer(buffer);
      return res.json(result);
    } catch (error: any) {
      console.error('[LOCAL IMPORT] Error:', error);
      res.status(500).json({ message: 'Failed to import local file', error: error.message });
    }
  });

  // Export routes (authenticated users only)
  app.get('/api/export/excel', isAuthenticated, requirePermission("relatorios", "export"), async (req, res) => {
    try {
      const { filter_id, filter_tree, search } = req.query;

      // Handle multi-value filters (arrays)
      // Express parses ?param=a&param=b as array, but ?param=a as string
      // We normalize everything to array or undefined
      const normalizeArray = (val: any) => {
        if (!val) return undefined;
        return Array.isArray(val) ? val : [val];
      };

      const companhia = normalizeArray(req.query.companhia);
      const posto = normalizeArray(req.query.posto);
      const situacao = normalizeArray(req.query.situacao);
      const missaoOp = normalizeArray(req.query.missaoOp);
      const secaoFracao = normalizeArray(req.query.secaoFracao);
      const funcao = normalizeArray(req.query.funcao);

      // Handle column selection
      const columns = normalizeArray(req.query.columns);

      let militares;

      // Prioridade 1: filter_id (filtro salvo)
      if (filter_id) {
        const userId = (req.user as any)?.claims?.sub;
        const savedFilter = await storage.getSavedFilterGroupById(filter_id as string);
        if (!savedFilter) {
          return res.status(404).json({ message: "Saved filter not found" });
        }

        // Verificação de autorização: apenas dono ou filtro compartilhado
        if (savedFilter.ownerId !== userId && savedFilter.scope !== 'shared') {
          return res.status(403).json({ message: "You don't have permission to use this filter" });
        }

        militares = await storage.getMilitaryPersonnelWithFilter(savedFilter.filterTree);
      }
      // Prioridade 2: filter_tree (filtro avançado inline)
      else if (filter_tree) {
        try {
          const parsedTree = JSON.parse(filter_tree as string);
          const validatedTree = filterTreeSchema.parse(parsedTree);
          militares = await storage.getMilitaryPersonnelWithFilter(validatedTree);
        } catch (parseError) {
          return res.status(400).json({ message: "Invalid filter tree format" });
        }
      }
      // Prioridade 3: filtros simples (compatibilidade retroativa + novos filtros)
      else if (companhia || posto || situacao || missaoOp || secaoFracao || funcao || search) {
        const simpleTree = simpleFiltersToTree({
          companhia,
          posto,
          situacao,
          missaoOp,
          secaoFracao,
          funcao,
          search: search as string,
        });
        militares = await storage.getMilitaryPersonnelWithFilter(simpleTree);
      }
      // Sem filtros: retorna todos
      else {
        militares = await storage.getAllMilitaryPersonnel();
      }

      // Log de confirmação do total de registros
      console.log(`[EXPORT EXCEL] Exportando ${militares.length} militares`);

      // Busca campos customizáveis
      const customFields = await storage.getAllCustomFieldDefinitions();

      // Gera arquivo Excel
      const { generateExcel } = await import('./exportService');
      const excelBuffer = generateExcel(militares, customFields, columns as string[]);

      // Define headers para download
      const fileName = `efetivo_militar_${new Date().toISOString().split('T')[0]}.xlsx`;
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      res.setHeader('Content-Length', excelBuffer.length);
      res.setHeader('X-Total-Records', militares.length.toString());

      res.send(excelBuffer);
    } catch (error) {
      console.error("Error exporting to Excel:", error);
      res.status(500).json({ message: "Failed to export to Excel" });
    }
  });

  app.get('/api/export/pdf', isAuthenticated, requirePermission("relatorios", "export"), async (req, res) => {
    try {
      const { filter_id, filter_tree, search } = req.query;

      // Handle multi-value filters (arrays)
      const normalizeArray = (val: any) => {
        if (!val) return undefined;
        return Array.isArray(val) ? val : [val];
      };

      const companhia = normalizeArray(req.query.companhia);
      const posto = normalizeArray(req.query.posto);
      const situacao = normalizeArray(req.query.situacao);
      const missaoOp = normalizeArray(req.query.missaoOp);
      const secaoFracao = normalizeArray(req.query.secaoFracao);
      const funcao = normalizeArray(req.query.funcao);

      // Handle column selection
      const columns = normalizeArray(req.query.columns);

      let militares;

      // Prioridade 1: filter_id (filtro salvo)
      if (filter_id) {
        const userId = (req.user as any)?.claims?.sub;
        const savedFilter = await storage.getSavedFilterGroupById(filter_id as string);
        if (!savedFilter) {
          return res.status(404).json({ message: "Saved filter not found" });
        }

        // Verificação de autorização: apenas dono ou filtro compartilhado
        if (savedFilter.ownerId !== userId && savedFilter.scope !== 'shared') {
          return res.status(403).json({ message: "You don't have permission to use this filter" });
        }

        militares = await storage.getMilitaryPersonnelWithFilter(savedFilter.filterTree);
      }
      // Prioridade 2: filter_tree (filtro avançado inline)
      else if (filter_tree) {
        try {
          const parsedTree = JSON.parse(filter_tree as string);
          const validatedTree = filterTreeSchema.parse(parsedTree);
          militares = await storage.getMilitaryPersonnelWithFilter(validatedTree);
        } catch (parseError) {
          return res.status(400).json({ message: "Invalid filter tree format" });
        }
      }
      // Prioridade 3: filtros simples (compatibilidade retroativa + novos filtros)
      else if (companhia || posto || situacao || missaoOp || secaoFracao || funcao || search) {
        const simpleTree = simpleFiltersToTree({
          companhia,
          posto,
          situacao,
          missaoOp,
          secaoFracao,
          funcao,
          search: search as string,
        });
        militares = await storage.getMilitaryPersonnelWithFilter(simpleTree);
      }
      // Sem filtros: retorna todos
      else {
        militares = await storage.getAllMilitaryPersonnel();
      }

      // Log de confirmação do total de registros
      console.log(`[EXPORT PDF] Exportando ${militares.length} militares`);

      // Busca campos customizáveis
      const customFields = await storage.getAllCustomFieldDefinitions();

      // Gera arquivo PDF
      const { generatePDF } = await import('./exportService');
      const localTime = req.query.localTime as string | undefined;
      const pdfBuffer = generatePDF(militares, customFields, columns as string[], localTime);

      // Define headers para download
      const fileName = `efetivo_militar_${new Date().toISOString().split('T')[0]}.pdf`;
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      res.setHeader('Content-Length', pdfBuffer.length);
      res.setHeader('X-Total-Records', militares.length.toString());

      res.send(pdfBuffer);
    } catch (error) {
      console.error("Error exporting to PDF:", error);
      res.status(500).json({ message: "Failed to export to PDF" });
    }
  });

  // Test-only login endpoint (bypasses Firebase OAuth for automated testing)
  // Protected by TEST_AUTH_ENABLED flag + shared secret to prevent production exposure
  app.post('/api/test-login', async (req: any, res) => {
    const testAuthEnabled = process.env.TEST_AUTH_ENABLED === 'true';
    // Use default secret in non-production, require explicit secret in production
    const testAuthSecret = process.env.TEST_AUTH_SECRET ||
      (process.env.NODE_ENV === 'production' ? undefined : 'test-secret-123');
    const providedSecret = req.headers['x-test-auth-secret'];

    if (!testAuthEnabled) {
      return res.status(404).json({ message: "Not found" });
    }

    if (!testAuthSecret || providedSecret !== testAuthSecret) {
      console.warn("[TEST-LOGIN] Invalid or missing test auth secret");
      return res.status(403).json({ message: "Invalid credentials" });
    }

    try {
      const { sub, email, first_name, last_name, role } = req.body;

      if (!sub || !email) {
        return res.status(400).json({ message: "Missing required fields: sub, email" });
      }

      // Upsert user with provided claims
      let user = await storage.getUser(sub);
      if (!user) {
        const userRole = role || "administrator"; // Default to administrator for test users
        console.log(`[TEST-LOGIN] Creating test user: ${email} with role ${userRole}`);
        await storage.upsertUser({
          id: sub,
          email,
          firstName: first_name,
          lastName: last_name,
          role: userRole,
          permissions: DEFAULT_PERMISSIONS[userRole as keyof typeof DEFAULT_PERMISSIONS],
        });
        user = await storage.getUser(sub);
      }

      // Create mock session similar to Replit Auth (for Passport compatibility)
      // This allows isAuthenticated middleware to work
      const mockUser = {
        claims: {
          sub,
          email,
          first_name,
          last_name,
          name: `${first_name} ${last_name}`,
        },
        access_token: `test-token-${sub}`,
        refresh_token: `test-refresh-${sub}`,
        expires_at: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60), // 7 days from now
        testUser: true,
      };

      // Establish session using Passport's login method
      req.login(mockUser, (err: any) => {
        if (err) {
          console.error("[TEST-LOGIN] Session creation failed:", err);
          return res.status(500).json({ message: "Failed to create session" });
        }

        console.log(`[TEST-LOGIN] Test user authenticated with session: ${email} (role: ${user?.role})`);

        res.json({
          success: true,
          user: {
            id: sub,
            email,
            name: `${first_name} ${last_name}`,
            role: user?.role || role || "user",
          }
        });
      });
    } catch (error) {
      console.error("[TEST-LOGIN] Error:", error);
      res.status(500).json({ message: "Test login failed" });
    }
  });

  // Bootstrap endpoint - promote first user to administrator (one-time use for initial setup)
  app.post('/api/bootstrap/admin', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const allUsers = await storage.getAllUsers();

      console.log(`[BOOTSTRAP] User ${userId} attempting to become admin`);
      console.log(`[BOOTSTRAP] Total users in database: ${allUsers.length}`);
      console.log(`[BOOTSTRAP] Users: ${JSON.stringify(allUsers.map(u => ({ id: u.id, email: u.email, role: u.role })))}`);

      // Only allow if there are no administrators yet AND this is the first user
      const hasAdmin = allUsers.some(u => u.role === 'administrator');
      console.log(`[BOOTSTRAP] Has admin: ${hasAdmin}`);

      if (hasAdmin) {
        const adminUsers = allUsers.filter(u => u.role === 'administrator');
        console.log(`[BOOTSTRAP] Existing admins: ${JSON.stringify(adminUsers.map(u => ({ id: u.id, email: u.email })))}`);
        return res.status(403).json({ message: "Administrator already exists" });
      }

      // Additional security: only allow the very first user (lowest ID or first created)
      // to prevent race conditions
      // RELAXED FOR DEPLOYMENT: Allow any user to claim admin if none exists
      /*
      const sortedUsers = allUsers.sort((a, b) => {
        return (a.createdAt?.getTime() || 0) - (b.createdAt?.getTime() || 0);
      });

      if (sortedUsers.length > 0 && sortedUsers[0].id !== userId) {
        return res.status(403).json({ message: "Only the first registered user can become administrator" });
      }
      */

      // Promote current user to administrator
      const user = await storage.updateUserRole(userId, 'administrator');

      // Force logout to refresh session with new role
      req.logout(() => {
        res.json({
          message: "Promoted to administrator successfully. Please log in again to access admin features.",
          requiresRelogin: true
        });
      });
    } catch (error) {
      console.error("Error bootstrapping admin:", error);
      res.status(500).json({ message: "Failed to bootstrap admin" });
    }
  });

  // Admin: Reset all users (DB + Firebase Auth) - protected by secret
  app.post('/api/admin/reset-users', async (req: any, res) => {
    try {
      const secretHeader = req.headers['x-reset-secret'];
      const expectedSecret = process.env.RESET_ADMIN_SECRET;

      if (!expectedSecret || secretHeader !== expectedSecret) {
        return res.status(403).json({ message: 'Forbidden' });
      }

      // Confirm DB driver
      let dbSource = 'databaseUrl';
      if (process.env.SUPABASE_DATABASE_URL) dbSource = 'supabase';

      // Delete sessions table if exists
      let sessionsDeleted = 0;
      try {
        const { db } = await import('./db');
        const { sql } = await import('drizzle-orm');
        // Attempt to delete sessions (ignore if table missing)
        const result: any = await db.execute(sql`DELETE FROM sessions`);
        sessionsDeleted = (result.rowCount || 0);
      } catch { }

      // Delete app users (cascade will remove related preferences/filters)
      let usersDeleted = 0;
      try {
        const { db } = await import('./db');
        const { sql } = await import('drizzle-orm');
        const result: any = await db.execute(sql`DELETE FROM users`);
        usersDeleted = (result.rowCount || 0);
      } catch { }

      // Delete Firebase Auth users
      let firebaseDeleted = 0;
      try {
        const admin = (await import('firebase-admin')).default;
        const listResult = await admin.auth().listUsers();
        for (const u of listResult.users) {
          await admin.auth().deleteUser(u.uid);
          firebaseDeleted++;
        }
      } catch { }

      return res.json({
        ok: true,
        dbSource,
        sessionsDeleted,
        usersDeleted,
        firebaseDeleted,
      });
    } catch (error: any) {
      console.error('[RESET USERS] Error:', error);
      res.status(500).json({ ok: false, message: error.message });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
