# Visit Pack (placeholder name)

Prepaid visit packages for independent providers. Project brief and rules: [CLAUDE.md](CLAUDE.md).
First-time account and database setup: [docs/SETUP.md](docs/SETUP.md).

## Run it on your computer

1. Install [Node.js LTS](https://nodejs.org) and Git.
2. In this folder, run `npm install` once.
3. Copy `.env.example` to `.env.local` and fill in the three Supabase values.
4. Run `npm run dev` and open http://localhost:3000.

The home page runs a system check. Both lines should show a green ✓:
- **Server can read the database**: the app reached Supabase with the secret key.
- **Browser key is blocked from provider data**: row-level security is working.

## Useful commands

| Command         | What it does                                  |
| --------------- | --------------------------------------------- |
| `npm run dev`   | Start the app locally, reloading on changes   |
| `npm run lint`  | Check the code for common mistakes            |
| `npm run build` | Build the production version (catches errors) |

## Where things live

- `src/app/`: pages and server routes (Next.js App Router)
- `src/lib/supabase/admin.ts`: the server-only database client
- `supabase/`: database migrations, demo data and logic tests
