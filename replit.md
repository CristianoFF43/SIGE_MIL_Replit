# Military Personnel Management System

## Overview

This project is a comprehensive Military Personnel Management System for the Brazilian Army (7º BIS). It provides robust control over military personnel data, including rank, company assignments, status tracking, mission oversight, and role-based access. Key capabilities include interactive dashboards, detailed reporting with Excel and PDF export, multi-level security (User, Manager, Administrator), **Excel-like customizable fields with JSONB storage**, and **end-to-end test automation support via Playwright**. The system is a full-stack TypeScript application with a React frontend and Express backend, designed for military organizational structures with support for multiple companies and extensive personnel data management. Its business vision is to provide a specialized, efficient, and secure digital solution for military personnel administration.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### UI/UX Decisions

The system features a professional dark mode interface, optimized for military operations, using a military green color scheme (145° hue). It prioritizes data-dense layouts for usability and employs the Inter font for readability, with JetBrains Mono for military identifiers. UI components are built with Shadcn/ui (Radix UI primitives), following Material Design 3 principles and influenced by Carbon Design for enterprise data handling.

### Technical Implementations

The frontend is built with **React** and **TypeScript**, using **Vite**. State management relies on **TanStack Query** for server state synchronization and React hooks for local component state. **Wouter** handles client-side routing.
The backend uses **Express.js** with **TypeScript**, implementing a **RESTful API** with conventional HTTP methods. It includes middleware for JSON/URL-encoded bodies, request logging, and session management. Route protection is enforced via role-based middleware.
The database is **PostgreSQL** via **Neon serverless**, managed with **Drizzle ORM** for type-safe schema definitions. Core tables include `sessions`, `users`, `military_personnel`, and `saved_filter_groups`. A push-based migration strategy is used with Drizzle Kit.

**Authentication**: The system uses **Firebase Authentication** for user login, supporting multiple methods:
*   **Google Sign-In**: OAuth flow allowing users to choose their Google account
*   **Email/Password**: Traditional email and password registration and login
*   **Hybrid Middleware**: Backend supports both Firebase Auth (new) and legacy Replit Auth during transition
*   **Token-Based**: Firebase ID tokens sent via `Authorization: Bearer <token>` header
*   **Auto-Registration**: New Firebase users automatically created in database with "user" role
*   **Session Management**: Firebase session persistence in browser, with 7-day token refresh
*   **Test Authentication**: Dedicated test-login system for Playwright automated testing:
    *   **Session-Based**: Uses Passport sessions (not Firebase) to bypass OAuth popups during automated tests
    *   **Environment Gated**: Enabled only when `TEST_AUTH_ENABLED=true` flag is set
    *   **Auto-Table Creation**: Sessions table auto-created via `connect-pg-simple` when needed
    *   **HTTP Support**: Cookie `secure` flag respects `NODE_ENV` (false in dev/test for HTTP localhost)
    *   **Shared Secret**: Protected by `TEST_AUTH_SECRET` (defaults to "test-secret-123" in non-production)
    *   **Endpoint**: POST `/api/test-login` creates user and establishes Passport session
    *   **Frontend Toggle**: "Test Login (Auto)" button visible only when `VITE_TEST_MODE=true`
    *   **Hybrid Auth**: `firebaseAuth` middleware accepts both Firebase tokens and test sessions
    *   **Security**: Test mode endpoints return 404 when flag disabled; production requires explicit secret

### Feature Specifications

*   **Dashboards**: Interactive statistics and visualizations with multiple chart types:
    *   **5 Chart Types**: Bar (vertical), Pie, Line, Area, and Radar charts
    *   **Interactive Type Selection**: Tab-based selectors for switching chart types in real-time
    *   **3 Configurable Charts**: All three charts have independent metric and type selectors
    *   **4 Available Metrics**: Company distribution, Rank distribution, Status distribution, Mission distribution
    *   **Data-testid Coverage**: Complete test IDs for all interactive elements (TabsTriggers, SelectItems, chart1-*, chart2-*, chart3-*)
*   **Personnel Management**: Excel-style editable table with CRUD operations and advanced filtering:
    *   **Inline Editing**: Click-to-edit functionality for all cells (Manager+ permission)
    *   **Separated Name Columns**: Distinct columns for "Nome Completo" and "Nome de Guerra"
    *   **Scoped Loading Feedback**: Per-cell "Salvando..." indicator during saves (not global)
    *   **Auto-save**: Automatic save on blur (clicking away from edited cell)
    *   **Add/Delete Rows**: Administrator-only capabilities for personnel management
    *   **Robust Field Validation**:
        *   **CPF**: Accepts only digits (formatting like . - spaces allowed). Regex `/^[0-9]+$/` after stripping formatting. Exactly 11 digits required.
        *   **Telefone**: Accepts only digits (formatting like ( ) - spaces + allowed). 10-11 digits required.
        *   **Email**: Basic format validation requiring @ and domain (min 3 chars after @)
        *   **Error Display**: Inline error messages with red border on invalid fields, plus toast notifications
    *   **Advanced Combined Filters**: Recursive AND/OR groups supporting complex filter logic
    *   **Supported Operators**: equals, not_equals, contains, not_contains, is_one_of (IN), is_not_one_of (NOT_IN), greater_than, less_than, greater_or_equal, less_or_equal
    *   **Filterable Fields**: companhia, postoGraduacao, situacao, missaoOp, nomeCompleto, nomeGuerra, cpf, telefone, email
    *   **Multi-select Support**: IN/NOT_IN operators support multiple values via checkbox UI
    *   **Saved Filters**: Users can save filter configurations with name, description, and scope (private/shared)
    *   **Filter Sharing**: Shared filters accessible to all authenticated users; private filters only to owner
    *   **Backend Authorization**: Ownership verification prevents unauthorized access to private filters
*   **Company Views**: Organized views of personnel by company with dedicated cards:
    *   **PEF Card**: Separate aggregation for all PEF personnel (1º-6º PEF), identified by companhia containing "PEF" OR (companhia="CEF" AND missaoOp="PEF")
    *   **Status Display**: All cards show "Pronto" (singular) for personnel with situacao="Pronto" and "Não Pronto" (singular) for all others
    *   **CEF Exclusion**: PEF personnel are excluded from the CEF card to prevent double counting
*   **Reporting & Analytics**: Comprehensive reports with Excel (.xlsx) and PDF export functionality, respecting applied filters:
    *   **Configurable Charts**: Distribution graph supports 5 chart types (bar, pie, line, area, radar) and 4 metrics (company, rank, status, mission) with independent selectors
    *   **Data-testid Coverage**: Full test IDs for chart type tabs (relatorios-chart-type-*) and metric selector (relatorios-chart-metric-select)
    *   **Visual Export Confirmation**: Large, prominent display showing exact count of records to be exported (text-5xl/48px)
    *   **Filter Status Warning**: Color-coded indicators (⚠️ amber for active filters, ✓ green for no filters) prevent unintended partial exports
    *   **Backend Logging**: Server logs `[EXPORT EXCEL|PDF] Exportando N militares` for operational monitoring
    *   **Response Headers**: `X-Total-Records` header confirms export count
    *   **Field Mapping**: Correct mapping of database fields (`telefoneContato1`, `email`) to export columns
*   **User Management**: Administration panel with comprehensive user management:
    *   **User CRUD**: Create, edit, and delete users with full profile information
    *   **Military Data**: Nome de guerra and posto/graduação fields for military personnel
    *   **Role-Based Profiles**: Three base profiles (User, Manager, Administrator) with predefined permissions
    *   **Granular Permissions**: Customizable permissions per user with 6 permission sections:
        - Dashboard (view)
        - Militares (view, edit, create, delete)
        - Companhias (view)
        - Relatórios (view, export)
        - Usuários (view, manage)
        - Importar (import)
    *   **Permission System**: Choose between profile defaults or customize individual permissions
    *   **UI Features**: Modal dialog with tabs (Basic Data | Permissions), permission cards with checkboxes
    *   **Data-testid Coverage**: Permission checkboxes use format `perm-{section}-{action}` (e.g., `perm-usuarios-view`, `perm-militares-edit`)
    *   **Backend Enforcement**: Granular permission middleware with `requirePermission(section, action)` applied to all protected routes:
        - Dashboard: `/api/stats` → dashboard.view
        - Militares: GET/POST/PATCH/DELETE → militares.view/create/edit/delete
        - Filtros: GET/POST/PATCH/DELETE `/api/filters` → militares.view
        - Relatórios: `/api/export/excel|pdf` → relatorios.export
        - Usuários: `/api/users` CRUD → usuarios.view/manage
        - Importar: `/api/import/google-sheets` → importar.import
    *   **Data Normalization**: Automatic conversion of legacy permission data on read
*   **Data Import System**: Admin-only feature supporting atomic, idempotent imports from Excel (.xlsx) files or Google Sheets, with transactional integrity for over 900 military personnel records:
    *   **Import Bug Fix** (Oct 2025): Fixed issue where empty cells in Google Sheets were being filled with header names instead of remaining empty
    *   **Validation**: Enhanced `cleanStr` function validates cell content before accepting it
*   **Authentication & Authorization**: Firebase Authentication with three access levels: User (read-only), Manager (limited modification), and Administrator (full access, including user role management). The first authenticated user can self-promote to Administrator if no admin exists.
*   **Localization**: 100% in Brazilian Portuguese, including CPF/phone formatting and date formats.

## External Dependencies

*   **Authentication Service**: Firebase Authentication for user login with multiple providers (Google, Email/Password)
*   **Database Provider**: Neon Serverless PostgreSQL, accessed via `DATABASE_URL`.
*   **UI Components**: Radix UI primitives (`@radix-ui/react-*`).
*   **Charting Library**: Recharts for dashboard visualizations.
*   **Form Management**: React Hook Form with Zod validation.
*   **Date Handling**: date-fns for date formatting.
*   **Styling**: Tailwind CSS with CSS variables.
*   **Excel Export**: `xlsx` library.
*   **PDF Export**: `jsPDF` and `jspdf-autotable`.
*   **Fonts**: Google Fonts (Inter, JetBrains Mono).
*   **Firebase Libraries**: `firebase` (client), `firebase-admin` (server)
*   **Environment Variables**: 
    *   `DATABASE_URL` - PostgreSQL connection string
    *   `VITE_FIREBASE_PROJECT_ID` - Firebase project identifier
    *   `VITE_FIREBASE_APP_ID` - Firebase app identifier
    *   `VITE_FIREBASE_API_KEY` - Firebase web API key
    *   `SESSION_SECRET` - Session encryption key (legacy)
    *   `REPLIT_DOMAINS`, `REPL_ID`, `ISSUER_URL` (legacy Replit Auth)