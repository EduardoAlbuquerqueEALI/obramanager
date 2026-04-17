# Obra Manager

SaaS platform for construction site management — tracks checklist progress per unit, purchase requests, and team assignments across multiple projects.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router, TypeScript) |
| UI | shadcn/ui (Radix UI) + Tailwind CSS |
| Database | Supabase (PostgreSQL + RLS + Realtime) |
| Auth | Supabase Auth |
| Drag & Drop | @dnd-kit/core |
| Charts | recharts |
| Email | Resend (optional) |

---

## Prerequisites

- Node.js 18+
- A [Supabase](https://supabase.com) project (free tier works)

---

## Setup

### 1. Clone and install

```bash
git clone <repo-url>
cd obra-manager
npm install
```

### 2. Configure environment

Copy `.env.example` to `.env.local` and fill in your values:

```bash
cp .env.example .env.local
```

Required variables:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Optional — emails are no-op if absent
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=noreply@yourdomain.com
NEXT_PUBLIC_APP_URL=http://localhost:4040
```

### 3. Run migrations

In the Supabase dashboard → **SQL Editor**, run each migration file **in order**:

1. `supabase/migrations/0001_initial_schema.sql`
2. `supabase/migrations/0002_profiles_email.sql`
3. `supabase/migrations/0003_areas_servico_org_level.sql`
4. `supabase/migrations/0004_member_workflow.sql`
5. `supabase/migrations/0005_kanban_enhancements.sql`

### 4. Create the first admin user

1. In Supabase → **Authentication → Users**, create a new user (email + password).
2. In **SQL Editor**, run:

```sql
INSERT INTO profiles (id, org_id, full_name, role, email)
VALUES (
  '<user-id-from-auth>',
  '<org-id-from-organizations-table>',
  'Your Name',
  'admin',
  'you@example.com'
);
```

> If no organization exists yet, insert one first:
> ```sql
> INSERT INTO organizations (name, slug) VALUES ('Minha Empresa', 'minha-empresa');
> ```

### 5. Run locally

```bash
npm run dev
```

App runs at **http://localhost:4040**.

---

## Deploy (Vercel)

1. Push to GitHub.
2. Import in [Vercel](https://vercel.com) → set all environment variables from `.env.local`.
3. Deploy. No custom build command needed.

---

## Project Structure

```
src/
├── app/
│   ├── (auth)/          # Login, forgot-password, reset-password
│   ├── admin/           # Admin panel
│   │   ├── page.tsx           # Dashboard (KPIs + chart)
│   │   ├── empreendimentos/   # Project management
│   │   ├── areas/             # Service areas
│   │   ├── usuarios/          # User management & permissions
│   │   ├── kanban-compras/    # Purchase request Kanban
│   │   └── kanban-tarefas/    # Task Kanban
│   └── app/             # Member-facing espelho de obra
├── actions/             # Server actions (auth, admin, member)
├── components/
│   ├── admin/           # Admin-specific components (Kanbans, chart)
│   ├── member/          # Member-facing components
│   └── ui/              # shadcn/ui primitives
├── hooks/               # React hooks (realtime, etc.)
├── lib/                 # Supabase clients, utils
└── types/               # TypeScript types (database, kanban, member)
supabase/
└── migrations/          # SQL migration files 0001–0005
```

---

## Features

### Admin
- **Dashboard** — KPI cards (units, % complete, tasks in progress, pending purchases) + bar chart by service area + recent completions feed
- **Kanban Compras** — 6-column drag-and-drop board (Solicitado → Em Cotação → Aprovado → Comprado → Entregue → Recusado), card detail drawer with comments, filters by project/area/urgency
- **Kanban Tarefas** — 4-column board (Pendente → Com Pendência → Em Andamento → Concluído) based on virtual column logic, filters by project/area/member
- **Empreendimentos** — create and manage construction projects, towers, and units
- **Áreas de Serviço** — define service areas (electrical, plumbing, etc.) with checklists
- **Usuários** — invite members, assign to projects and areas, set roles

### Member
- **Espelho de Obra** — view assigned units, complete checklist items with photo + signature, submit purchase requests
