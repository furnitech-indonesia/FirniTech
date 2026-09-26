# AGENTS.md

## What this repo actually is right now

A GitHub Codespaces **template** (single commit, `decd3b8 Initial commit`, no remote) with a Fast Refresh demo page. The FurniTech SaaS product described in `PRD.md` / `ROADMAP.md` is **not implemented yet** — those files are planning artifacts, and they are **untracked in git**.

Installed and real:
- Next.js **16.3.0**, **Pages Router**, plain **JavaScript** (`.js`), CSS Modules (`Button.module.css`, `styles/home.module.css`)
- React 18.2, Turbopack builds

**Not** installed: TypeScript, Tailwind, Drizzle ORM, Supabase, any test/lint/format tooling. Do not write code that imports them until you add the dependency.

## Commands

```bash
npm run dev     # dev server, http://localhost:3000
npm run build   # the ONLY verification step in this repo
npm run start   # serve the production build
```

There is no `lint`, `typecheck`, `test`, or `format` script. Do not invent one in a plan/report; `npm run build` is the gate.

Quirks:
- The dev server is **already running** in this codespace (`.devcontainer/devcontainer.json` → `postAttachCommand: npm run dev`, port 3000 forwarded). Do not start a second one; edit files and let Fast Refresh pick it up.
- Codespace **rebuilds** run `npm install && npm run build`, so a broken build surfaces on every rebuild.
- `npm run build` prints a harmless warning: Next ignores `package-lock.json` in `/workspaces` (outside the git repo). Do not "fix" it by setting `turbopack.root`.

## Pushing to GitHub (read before the first `git push`)

`origin` = `https://github.com/furnitech-indonesia/FirniTech.git` (public, branch `main`).

The codespace's built-in token (`GITHUB_TOKEN`, a `ghu_` app token) is scoped **only** to `github/codespaces-nextjs`, so plain `git push` fails with `403 Permission denied` even though `gh api` reads work. `/etc/gitconfig` also registers `/.codespaces/bin/gitcredential_github.sh` as the *first* credential helper, which shadows the repo's own helper.

A real PAT lives in `.env` (`GITHUB_TOKEN=ghp_…`, mode 600, gitignored) and in `.git/gh-credentials` (gitignored by construction, mode 600). Always push with the helper list reset — the leading empty `credential.helper=` is what drops the codespaces helper:

```bash
git -c credential.helper= -c 'credential.helper=store --file=.git/gh-credentials' push
```

Do **not** try to wrap this in a `git config alias` — nested quoting in a `!`-alias breaks the inner `-c` value, and the alias silently falls back to printing git usage.

Rules:
- **Never** commit `.env`; `.gitignore` now covers `.env` and re-allows `!.env.example`. If you add a real `.env.example`, keep it token-free.
- Never echo/print the token or run `git credential fill` without redacting — it returns the codespaces token first, not the PAT, which is a misleading way to check auth.
- Verify a token works with `gh api` / `curl -H "Authorization: Bearer $(sed -n 's/^GITHUB_TOKEN=//p' .env)" …`, not with a push.

## Doc vs. code conflicts (docs describe the target, code is the current state)

- `PRD.md` / `ROADMAP.md` mandate **App Router + Tailwind CSS + Material Symbols**; the code is **Pages Router + CSS Modules**. Migrating to App Router is an intentional project decision, not an oversight — but it has not happened. Match the surrounding code's router unless the task is the migration.
- `DESIGN.md` tokens are written as **Tailwind classes** mapped to slate/amber scales (primary `#0F172A`/`#334155`, CTA amber-600 `#D97706`, app bg slate-50, status colors per progress stage). They are not usable until Tailwind exists. `global.css` currently carries an unrelated SF Pro font stack from the template.
- Env vars: full list at the bottom of `ROADMAP.md`. `.env` (real secrets, mode 600, gitignored) and a committed `.env.example` (placeholders) both exist — keep them in sync when adding a var.
- Supabase project `irpweashghfmhzqnunyj`, region **ap-northeast-1** (`aws-0-ap-northeast-1.pooler.supabase.com`). `DATABASE_URL` uses the **transaction pooler on port 6543**; no direct (5432) connection string is configured yet.
- This project uses Supabase's **new API key format** (`sb_publishable_*` / `sb_secret_*`), not the legacy `anon`/`service_role` JWTs. `NEXT_PUBLIC_SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY` hold the new-style keys; the legacy JWTs are kept alongside in `.env` as `SUPABASE_ANON_JWT` / `SUPABASE_SERVICE_ROLE_JWT` because some tooling still expects them. Verified working: `auth/v1/settings` responds.
- Midtrans core + IRIS, Cloudflare, Fonnte, and Firebase keys are **still unset** — features depending on them will fail until filled in.

## `examples-schema.ts`

A **design reference only**, at the repo root. Nothing imports it and `drizzle-orm` is not installed, so it will not compile as-is. Treat its table/enum names as the source of truth for the data model when the real schema lands (`tenants`, `users`, `products`, `materials`, `orders`, `order_items`, `production_progress`, `payout_logs`, `shipping_rates`; enums `user_role`, `order_status`, `payment_status`, `progress_stage`, `payout_status`, `subscription_plan`). Move it into a proper location and add the dependency before using it. Don't delete it as dead code.

## Conventions

- Product docs (`PRD.md`, `ROADMAP.md`, `DESIGN.md`) are written in **Indonesian**; mirror that when editing them. Code/identifiers stay English.
- Business rules that are easy to get wrong: no free trial (paid plan at signup), platform fee 1.5%, Midtrans MDR deducted before the craftsman's balance, IRIS payouts at 06:00 and 18:00 WIB, progress stages `bahan_dipotong → perakitan → finishing → packing_qc`.
- Multi-tenancy is a single database with `tenant_id` isolation + Supabase RLS, resolved by Next middleware (subdomain + Cloudflare for SaaS custom domain). There is no `middleware.ts` yet.
