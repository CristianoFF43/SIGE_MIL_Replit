# Design Guidelines: Military Personnel Management System

## Design Approach: Design System-Based
**Selected System:** Material Design 3 with Carbon Design influences for data-heavy enterprise features
**Rationale:** This utility-focused application requires consistency, scalability, and excellent support for tables, forms, and dashboards. Material Design provides robust component patterns while Carbon Design principles guide our data visualization approach.

## Core Design Principles
1. **Hierarchy & Clarity:** Clear visual organization for complex military data structures
2. **Efficiency First:** Minimize clicks and cognitive load for frequent operations
3. **Professional Authority:** Convey trust and reliability appropriate for military use
4. **Data Density Balance:** Display comprehensive information without overwhelming users

---

## Color Palette

### Dark Mode (Primary)
- **Background Base:** 220 15% 8%
- **Surface Elevated:** 220 15% 12%
- **Surface Container:** 220 15% 16%
- **Military Primary:** 145 35% 45% (professional military green)
- **Primary Variant:** 145 30% 38%
- **Text Primary:** 220 10% 95%
- **Text Secondary:** 220 8% 70%
- **Border Subtle:** 220 12% 25%
- **Status Success:** 145 50% 50%
- **Status Warning:** 45 90% 60%
- **Status Error:** 0 70% 55%
- **Status Info:** 210 80% 60%

### Light Mode
- **Background Base:** 220 15% 98%
- **Surface Elevated:** 0 0% 100%
- **Surface Container:** 220 15% 95%
- **Military Primary:** 145 40% 40%
- **Text Primary:** 220 15% 15%
- **Text Secondary:** 220 10% 45%

---

## Typography
- **Primary Font:** Inter (Google Fonts) - clean, professional, excellent readability for data tables
- **Monospace Font:** JetBrains Mono - for CPF, ID numbers, codes
- **Headings:** 
  - H1: 2.5rem (40px), font-weight 700, military primary color
  - H2: 2rem (32px), font-weight 600
  - H3: 1.5rem (24px), font-weight 600
  - H4: 1.25rem (20px), font-weight 500
- **Body Text:** 1rem (16px), font-weight 400, line-height 1.6
- **Table/Data Text:** 0.875rem (14px), font-weight 400, tight line-height 1.4
- **Labels:** 0.875rem (14px), font-weight 500, uppercase tracking-wide

---

## Layout System
**Spacing Scale:** Use Tailwind units of 1, 2, 3, 4, 6, 8, 12, 16, 20, 24
- **Common padding:** p-4, p-6, p-8
- **Component spacing:** gap-4, gap-6
- **Section spacing:** py-8, py-12, py-16
- **Container max-width:** max-w-7xl for main content areas

---

## Component Library

### Navigation
- **Top Navigation Bar:** Full-width, h-16, military primary background, contains logo, breadcrumbs, user profile dropdown
- **Sidebar Navigation:** w-64, collapsible to w-16 (icon-only), sticky positioning, organized by functional areas (Dashboard, Personnel, Companies, Reports, Admin)
- **Breadcrumbs:** Always visible for deep navigation hierarchy

### Forms & Inputs
- **Form Containers:** Surface elevated background, p-6 rounded-lg border
- **Input Fields:** Consistent h-10, rounded borders, focus ring in military primary
- **Select Dropdowns:** Custom styled with military theme, searchable for long lists
- **Multi-select Tags:** For assigning multiple missions/statuses
- **Date Pickers:** Localized for Brazilian format (DD/MM/YYYY)
- **File Upload:** Drag-and-drop zone with preview for documents/photos

### Data Display

**Tables (Primary Component):**
- Sticky headers with h-12
- Alternating row backgrounds for readability
- Row hover states with subtle highlight
- Sortable columns with clear indicators
- Inline edit capabilities for Manager/Admin roles
- Pagination with items per page selector (25, 50, 100)
- Dense mode toggle for experienced users
- Expandable rows for detailed personnel information

**Cards:**
- Personnel summary cards with avatar placeholder, rank badge, primary info
- Statistics cards: Large number display with trend indicators
- Company overview cards: Headcount, composition breakdown

**Badges & Status Indicators:**
- Rank badges: Custom military insignia representations
- Status pills: Rounded, colored backgrounds (Ativo, Férias, Licença, etc.)
- Mission tags: Outlined style, stackable

### Dashboards
- **Grid Layout:** 12-column grid for flexible dashboard composition
- **Widget Types:**
  - KPI Cards: Large numbers with comparison periods
  - Bar Charts: Personnel by company, by rank distribution
  - Pie Charts: Status breakdown, mission allocation
  - Heatmaps: Personnel availability calendar
  - Tables: Top-level summaries with drill-down capability
- **Chart Library:** Chart.js or Recharts with military green color scheme
- **Export Actions:** Visible on each dashboard widget (PDF, Excel, Image)

### Modals & Overlays
- **Add/Edit Personnel Modal:** Large modal, multi-step form for comprehensive data entry
- **Confirmation Dialogs:** Centered, max-w-md, clear action buttons
- **Quick View Overlay:** Slide-in panel from right for personnel details
- **Admin Panel:** Full-screen overlay for user management

### Buttons & Actions
- **Primary Actions:** Military primary background, white text, h-10
- **Secondary Actions:** Outline variant with military primary border
- **Danger Actions:** Error red for delete/remove operations
- **Icon Buttons:** Square, consistent size, tooltip on hover
- **Floating Action Button:** Bottom-right for quick "Add Personnel" access

---

## Access Level Visual Indicators
- **Administrator:** Gold accent border on profile avatar, full access badge
- **Manager (Gerente):** Silver accent, partial access indicator
- **User:** Standard styling, view-only badge where applicable

---

## Responsive Behavior
- **Desktop (1280px+):** Sidebar + main content, multi-column dashboards
- **Tablet (768px-1279px):** Collapsible sidebar, 2-column layouts
- **Mobile (<768px):** Bottom navigation, single-column stack, simplified tables with horizontal scroll

---

## Animations
**Minimal and purposeful only:**
- Page transitions: 150ms ease
- Modal entry/exit: 200ms scale and fade
- Dropdown menus: 150ms slide
- Loading states: Skeleton screens, no spinners
- NO decorative animations

---

## Images
**No hero images.** This is a data-focused enterprise application. Use:
- Placeholder avatars for personnel (initials-based, military green background)
- Brazilian Army emblem in navigation header
- Icon-based empty states for tables/lists

---

## Critical Implementation Notes
- All tables must support CSV export
- Forms must validate CPF format (Brazilian tax ID)
- Phone numbers formatted for Brazilian standards
- Maintain consistent dark mode across all form inputs
- Role-based UI: Hide/disable features based on access level
- Audit trail visible for Admin users (who changed what, when)