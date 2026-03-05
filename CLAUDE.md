# LandscapeCRM — GreenScape Landscape & Nursery CRM

A full-featured CRM for landscape and nursery businesses. Manages customers, jobs, quotes, invoices, contracts, crews, equipment, leads, scheduling, inventory, and reporting.

## Tech Stack

- **Framework:** React 19 + TypeScript 5.9
- **Build:** Vite 7
- **Styling:** Tailwind CSS v4
- **Routing:** React Router v7 (react-router-dom)
- **Charts:** Recharts
- **Icons:** lucide-react
- **Dates:** date-fns
- **Utilities:** clsx
- **Data Fetching:** @tanstack/react-query
- **Deployment:** Railway (Docker/nginx)

## Project Structure

```
LandscapeCRM/
├── CLAUDE.md              # This file — project context for Claude
├── Dockerfile             # Multi-stage build: npm build → nginx serve
├── nginx.conf             # Production nginx config (SPA fallback)
├── railway.json           # Railway deployment config
├── package.json           # Dependencies and scripts
├── vite.config.ts         # Vite config
├── tsconfig.json          # TypeScript project references
├── tsconfig.app.json      # App TypeScript config
├── tsconfig.node.json     # Node/build TypeScript config
├── eslint.config.js       # ESLint flat config
├── index.html             # Vite entry HTML
├── public/                # Static assets
├── src/
│   ├── main.tsx           # App entry point
│   ├── App.tsx            # Root component with router setup
│   ├── index.css          # Global styles / Tailwind imports
│   ├── api/
│   │   ├── client.ts      # Fetch wrapper with bearer token auth
│   │   └── endpoints.ts   # API endpoint definitions
│   ├── components/
│   │   ├── Layout.tsx     # Main app layout (sidebar, header)
│   │   └── Sidebar.tsx    # Navigation sidebar
│   ├── context/
│   │   ├── AuthContext.tsx # Auth state, login/logout, demo mode
│   │   └── DataContext.tsx # Central data store, CRUD ops, normalization
│   ├── types/
│   │   └── index.ts       # TypeScript interfaces for all entities
│   ├── pages/
│   │   ├── Dashboard.tsx
│   │   ├── Customers.tsx
│   │   ├── CustomerDetail.tsx
│   │   ├── Jobs.tsx
│   │   ├── JobDetail.tsx
│   │   ├── Schedule.tsx
│   │   ├── Inventory.tsx
│   │   ├── Quotes.tsx
│   │   ├── Invoices.tsx
│   │   ├── Contracts.tsx
│   │   ├── Crews.tsx
│   │   ├── Equipment.tsx
│   │   ├── Leads.tsx
│   │   ├── Photos.tsx
│   │   └── Reports.tsx
│   ├── hooks/             # Custom hooks (empty — hooks inline in context)
│   └── assets/            # App assets
└── test-results/          # Playwright screenshot results
```

## Backend API

- **Repo:** `~/landscape-crm-api` (separate project)
- **Local URL:** `http://localhost:8080/api/v1`
- **Not always running** — the frontend has full demo mode fallback

## Local Development

```bash
# Install dependencies
npm install

# Start dev server (use port 5176 to avoid conflicts)
npx vite --port 5176

# Build for production
npm run build

# Lint
npm run lint
```

### Demo Mode

Set `gs_token=demo_token` in localStorage to bypass API authentication. DataContext provides hardcoded demo data (~300 lines of mock customers, jobs, quotes, invoices, etc.) when the API is unavailable.

## Architecture

### Auth Flow
- `AuthContext` manages login state with JWT bearer tokens
- Demo mode: token value `demo_token` skips real API calls
- API client (`src/api/client.ts`) attaches bearer token to all requests

### Data Layer
- `DataContext` is the central data store (React Context, no Redux)
- Provides CRUD methods: `addCustomer()`, `updateCustomer()`, `deleteCustomer()`, `addJob()`, `updateJob()`, etc.
- **Field normalization**: bridges API field name differences (e.g., snake_case API ↔ camelCase frontend)
- All CRUD forms wired to backend API with demo mode fallback
- `@tanstack/react-query` available for data fetching

### Routing
- React Router v7 with all routes defined in `App.tsx`
- Layout component wraps authenticated routes (sidebar + header)
- 15 page routes total

## Features & Pages

| Route | Page | Status |
|-------|------|--------|
| `/` | Dashboard | Working — summary cards, charts |
| `/customers` | Customer List | Working — list, search, add/edit/delete |
| `/customers/:id` | Customer Detail | Working — detail view, edit modal |
| `/jobs` | Job List | Working — list, filters, add/edit/delete |
| `/jobs/:id` | Job Detail | Working — status transitions, edit modal |
| `/schedule` | Schedule | Working — week/month calendar views |
| `/inventory` | Inventory | Working — item list and management |
| `/quotes` | Quotes | Working — quote list and CRUD |
| `/invoices` | Invoices | Working — invoice list and CRUD |
| `/contracts` | Contracts | Working — contract list and CRUD |
| `/crews` | Crews | Working — crew management |
| `/equipment` | Equipment | Working — equipment tracking |
| `/leads` | Leads | Working — kanban board |
| `/photos` | Photos | Stub — no demo data, empty state |
| `/reports` | Reports | Working — charts and data views |

### Completed Features
- Job status transitions: Start, Complete, On Hold, Resume
- All CRUD forms connected to backend API with demo fallback
- Edit modals on Customer and Job detail pages (API PATCH + demo fallback)
- Field normalization for API inconsistencies

## Deployment

- **Platform:** Railway
- **Production URL:** https://landscapecrm-production.up.railway.app
- **Config:** `railway.json` defines build/deploy settings
- **Build:** Multi-stage Docker — `npm run build` → nginx serves static files
- **SPA Routing:** nginx.conf handles client-side routing with `try_files $uri /index.html`

### Environment Variables
- `VITE_API_URL` — Backend API base URL (set in Railway)

## Known Issues

- **Photos page**: No demo data, shows empty state only
- **Materials tracking / time entries**: UI exists but no functionality
- **"Forgot password" link**: Non-functional (rendered but no handler)
- **"Remember me" checkbox**: Rendered but not implemented
- **Settings page**: Users and Appearance tabs are stubs
- **Port conflicts**: Another project (CrownHardware) often runs on :5173, use :5176

## Development Rules (HARD REQUIREMENTS)

1. **ALWAYS push to GitHub** after every commit — no exceptions
2. **ALWAYS test with Playwright** after making changes to verify features work in the browser
3. If Playwright shows something is broken:
   - Build a plan to fix it
   - Execute the fix
   - Test again with Playwright
   - If still broken, repeat — up to **30 iterations max**
4. Only declare success when Playwright confirms the feature works visually
5. **Never claim something works without Playwright verification**

### Playwright Notes
- Playwright is **Python-based** (`pip install playwright`), not Node
- Screenshots saved to `test-results/`
- Dev server must be running on port **5176** before testing
