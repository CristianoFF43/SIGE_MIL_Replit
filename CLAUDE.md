# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Military Personnel Management System (SIGE MIL) for the Brazilian Army (7º BIS). Full-stack TypeScript application with React frontend and Express backend, designed for military organizational structures with support for multiple companies and extensive personnel data management.

## Development Commands

### Start Development Server
```bash
npm run dev
```
Runs the development server with Vite HMR on port 5000 (or PORT env variable).

### Build for Production
```bash
npm run build
```
Builds both the frontend (Vite) and backend (esbuild) into the `dist/` directory.

### Start Production Server
```bash
npm start
```
Runs the production server from `dist/index.js`.

### Type Checking
```bash
npm run check
```
Runs TypeScript compiler in no-emit mode to check for type errors.

### Database Migration
```bash
npm run db:push
```
Pushes schema changes to the database using Drizzle Kit (push-based, no migration files).

## Architecture Overview

### Monorepo Structure

- `client/src/` - React frontend with TypeScript
  - `pages/` - Route components (dashboard, militares, companhias, relatorios, admin, login)
  - `components/` - Reusable UI components (Shadcn/ui + custom)
  - `contexts/` - React contexts (AuthContext for Firebase)
  - `hooks/` - Custom React hooks
  - `lib/` - Utilities and configuration (firebase, queryClient, authUtils)
- `server/` - Express backend with TypeScript
  - `index.ts` - Application entry point with middleware setup
  - `routes.ts` - All API route definitions with permission middleware
  - `storage.ts` - Database abstraction layer (Drizzle ORM)
  - `firebaseAuth.ts` - Firebase authentication middleware
  - `hybridAuth.ts` - Hybrid auth supporting both Firebase and test sessions
  - `filterBuilder.ts` - Advanced filter tree to SQL converter
  - `exportService.ts` - Excel/PDF generation
  - `googleSheetsImport.ts` - Google Sheets import
  - `importFromExcel.ts` - Excel file import from Google Drive
- `shared/` - Shared TypeScript code
  - `schema.ts` - Drizzle schema definitions + Zod validation schemas

### Authentication System

**Firebase Authentication** (Primary):
- Supports Google Sign-In OAuth and Email/Password
- Token-based: Firebase ID tokens sent via `Authorization: Bearer <token>` header
- Auto-registration: New Firebase users automatically created in database with "user" role
- Session persistence: 7-day token refresh in browser

**Test Authentication** (Testing Only):
- Session-based authentication via Passport for Playwright automated tests
- Enabled only when `TEST_AUTH_ENABLED=true` environment variable is set
- Endpoint: `POST /api/test-login` with `X-Test-Auth-Secret` header
- Protected by `TEST_AUTH_SECRET` (defaults to "test-secret-123" in non-production)
- Frontend toggle: "Test Login (Auto)" button visible only when `VITE_TEST_MODE=true`
- Sessions table auto-created by `connect-pg-simple` when test mode enabled
- Cookie `secure` flag respects `NODE_ENV` (false in dev/test for HTTP localhost)

**Hybrid Middleware**:
- `firebaseAuth` middleware in `server/firebaseAuth.ts` accepts both Firebase tokens and test sessions
- Test sessions bypass OAuth popups during automated testing

### Permission System

Three-tier role system with granular permissions:

**Roles**: `user`, `manager`, `administrator`

**Permission Sections** (defined in `shared/schema.ts`):
- `dashboard` - view
- `militares` - view, edit, create, delete
- `companhias` - view
- `relatorios` - view, export
- `usuarios` - view, manage
- `importar` - import

**Permission Enforcement**:
- Backend: `requirePermission(section, action)` middleware in `server/firebaseAuth.ts`
- Applied to all protected routes in `server/routes.ts`
- Frontend: Permission checks in components to hide/disable UI elements

**Default Permissions** (`DEFAULT_PERMISSIONS` in `shared/schema.ts`):
- `user`: Read-only access (view dashboard, militares, companhias, relatorios)
- `manager`: User permissions + edit militares, export relatorios
- `administrator`: Full access to all features

### Database Schema

**PostgreSQL via Neon Serverless** - Managed with Drizzle ORM

Core Tables:
- `sessions` - Session storage (auto-created by connect-pg-simple when test mode enabled)
- `users` - User accounts with role and granular permissions (JSONB)
- `military_personnel` - Personnel records with standard fields + customFields (JSONB)
- `saved_filter_groups` - User-saved advanced filter configurations (JSONB filter trees)
- `custom_field_definitions` - Admin-defined custom field schemas (Excel-like extensibility)

**Key Schema Features**:
- JSONB storage for flexible custom fields and permissions
- Filter trees support recursive AND/OR groups with 10 operators
- Ownership verification on saved filters (private vs shared scope)

### Filter System

**Advanced Filter Tree Structure** (defined in `shared/schema.ts`):
- Recursive groups with AND/OR operators
- Leaf conditions with field, comparator, value
- Supported comparators: `=`, `!=`, `IN`, `NOT IN`, `LIKE`, `ILIKE`, `>`, `<`, `>=`, `<=`
- Filterable fields: companhia, postoGraduacao, situacao, missaoOp, nomeCompleto, nomeGuerra, cpf, telefone, email (+ custom fields via `customFields.{fieldName}`)
- Multi-select support for IN/NOT_IN operators
- Saved filters: private (owner only) or shared (all users)

**Filter Builder** (`server/filterBuilder.ts`):
- Converts filter tree to Drizzle ORM SQL conditions
- Supports nested groups with proper parentheses
- Custom field filtering via JSONB operators
- Legacy simple filters converted to tree format for backward compatibility

### Frontend State Management

- **TanStack Query** for server state synchronization and caching
- **React Context** for authentication state (AuthContext)
- **React Hook Form** with Zod validation for forms
- **Wouter** for client-side routing (lightweight alternative to React Router)

### Design System

**Material Design 3 with Carbon Design influences**

**Color Scheme**:
- Military green primary color (145° hue, 35% saturation, 45% lightness)
- Dark mode optimized (background: 220° 15% 8%)
- Professional, data-dense interface

**UI Components** (Shadcn/ui + Radix UI):
- Located in `client/src/components/ui/`
- Customized with military theme via Tailwind CSS
- Consistent spacing scale (4, 6, 8, 12, 16, 20, 24)

**Typography**:
- Primary: Inter (Google Fonts)
- Monospace: JetBrains Mono (for CPF, ID numbers)

### Key Features

**Personnel Management**:
- Excel-style inline editing (click-to-edit cells)
- Per-cell "Salvando..." loading indicator during saves
- Auto-save on blur (clicking away from edited cell)
- Separated "Nome Completo" and "Nome de Guerra" columns
- Add/Delete rows (Administrator only)
- Robust field validation (CPF, telefone, email) with inline error messages

**Company Views**:
- Organized cards by company (1ª-3ª CIA, CEF, CCAP, B ADM, EM, SEDE)
- PEF Card: Aggregates all PEF personnel (1º-6º PEF) identified by companhia containing "PEF" OR (companhia="CEF" AND missaoOp="PEF")
- Status display: "Pronto" vs "Não Pronto" (singular form)
- CEF card excludes PEF personnel to prevent double counting

**Dashboards**:
- 5 chart types: Bar (vertical), Pie, Line, Area, Radar
- 3 configurable charts with independent metric and type selectors
- 4 available metrics: Company distribution, Rank distribution, Status distribution, Mission distribution
- Interactive tab-based chart type selection
- Complete data-testid coverage for all interactive elements

**Reporting & Export**:
- Excel (.xlsx) and PDF export with filter respect
- Visual export confirmation showing exact record count (text-5xl/48px)
- Color-coded filter status (⚠️ amber for active, ✓ green for none)
- Backend logging: `[EXPORT EXCEL|PDF] Exportando N militares`
- Response headers: `X-Total-Records` confirms export count

**Data Import**:
- Admin-only atomic, idempotent imports
- Supports Excel (.xlsx) files and Google Sheets
- Transactional integrity for 900+ military personnel records
- Enhanced validation: `cleanStr` function prevents empty cells from being filled with header names

**User Management**:
- CRUD operations on users with full profile information
- Military data: nome de guerra, posto/graduação
- Role-based profiles with customizable granular permissions
- Modal dialog with tabs (Basic Data | Permissions)
- Permission cards with checkboxes (data-testid: `perm-{section}-{action}`)
- Backend enforcement: Ownership verification prevents unauthorized access

### Brazilian Localization

- 100% Portuguese interface
- CPF validation: 11 digits after stripping formatting (. - spaces allowed)
- Phone validation: 10-11 digits after stripping formatting (( ) - + spaces allowed)
- Date format: DD/MM/YYYY via date-fns

### Environment Variables

**Required**:
- `DATABASE_URL` - PostgreSQL connection string (Neon serverless)
- `VITE_FIREBASE_PROJECT_ID` - Firebase project identifier
- `VITE_FIREBASE_APP_ID` - Firebase app identifier
- `VITE_FIREBASE_API_KEY` - Firebase web API key

**Optional**:
- `PORT` - Server port (default: 5000)
- `NODE_ENV` - Environment (development/production)
- `SESSION_SECRET` - Session encryption key (legacy, used for test auth)
- `TEST_AUTH_ENABLED` - Enable test authentication endpoint (default: false)
- `TEST_AUTH_SECRET` - Shared secret for test auth (default: "test-secret-123" in non-production)
- `VITE_TEST_MODE` - Show test login button in frontend (default: false)

## Code Path Aliases

TypeScript path mappings (defined in `tsconfig.json`):
- `@/*` → `./client/src/*`
- `@shared/*` → `./shared/*`

## Common Development Patterns

### Adding a New API Route

1. Define route in `server/routes.ts`
2. Add permission middleware: `isAuthenticated, requirePermission(section, action)`
3. Validate request body with Zod schema from `@shared/schema`
4. Use `storage` methods for database operations
5. Return JSON response with proper error handling

### Adding a New Database Field

1. Update table schema in `shared/schema.ts`
2. Add to insert/update Zod schemas
3. Run `npm run db:push` to apply migration
4. Update storage methods in `server/storage.ts`
5. Update frontend forms/tables in relevant components

### Adding a New Permission

1. Update `Permission` type in `shared/schema.ts`
2. Update `DEFAULT_PERMISSIONS` for each role
3. Add `requirePermission(section, action)` to relevant routes
4. Update frontend components to check permissions via AuthContext
5. Add permission checkboxes in UserDialog (`client/src/components/UserDialog.tsx`)

### Working with Filters

1. Filter trees are defined in `shared/schema.ts` (FilterTree type)
2. Backend conversion in `server/filterBuilder.ts` (buildFilterConditions)
3. Frontend builder in `client/src/components/FilterBuilder.tsx`
4. Saved filters stored in `saved_filter_groups` table with ownership verification

## Bootstrap Process

**First User Admin Promotion**:
- Endpoint: `POST /api/bootstrap/admin`
- Only works if no administrator exists AND user is the first registered
- Forces logout to refresh session with new role
- Use this for initial system setup

## Important Implementation Notes

- All API routes use Firebase Auth middleware (firebaseAuth) which also accepts test sessions
- Database operations use Drizzle ORM with type-safe queries
- Frontend uses TanStack Query for automatic caching and refetching
- Export operations respect applied filters (filter_id, filter_tree, or simple filters)
- CPF/phone validation strips formatting before regex check
- PEF personnel identified by compound logic: companhia LIKE '%PEF%' OR (companhia='CEF' AND missaoOp='PEF')
- Test authentication bypasses Firebase OAuth for Playwright automated testing
- Sessions table is auto-created when TEST_AUTH_ENABLED=true
