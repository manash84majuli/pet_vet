# Database setup and migrations (Drizzle)

This project uses Drizzle ORM and `drizzle-kit` for schema generation and migrations.

Important: do NOT commit secrets to `.env.example`. Use a local `.env.local` (already in `.gitignore`) with real credentials.

Required env vars (set in `.env.local`):

- `DATABASE_URL` — PostgreSQL connection string (production DB)
- `SUPABASE_SERVICE_ROLE_KEY` — Supabase service role key (for server-side admin operations)
- `NEXT_PUBLIC_SUPABASE_URL` — Supabase project URL

Quick commands (run from project root):

- Generate a migration from `lib/schema.ts`:

```bash
npm run db:generate
```

- Run pending migrations (safe):

```bash
npm run db:migrate
```

- Force push schema (destructive) — only use when you understand the consequences:

```bash
npm run db:push
```

Notes:
- All `db:*` scripts run `scripts/check-env.js` first and will abort if required env vars are missing.
- For production deploy, ensure `DATABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are configured in your deployment environment (Vercel, Fly, etc.).
- Review generated migration files in the `drizzle` folder before applying them to production.

If you want, I can: generate migration files now, or run migrations against the DB in `.env.local`. If you want me to run them, confirm that the DB is correct and that you approve applying migrations now.
