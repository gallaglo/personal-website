# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # Start dev server at localhost:3000
npm run build     # Production build
npm run lint      # ESLint via next lint
```

There is no test suite.

To get a Gmail OAuth2 refresh token (one-time setup):
```bash
export GMAIL_CLIENT_ID="..." GMAIL_CLIENT_SECRET="..."
npm run get-gmail-token
```

## Architecture

This is a Next.js App Router site. All routes live under `app/`, with standard Next.js conventions (`page.tsx`, `layout.tsx`).

**Blog posts** are authored as plain React/JSX files — no MDX or markdown. Each post is a full `page.tsx` file under `app/blog/[slug]/`. The blog index at `app/blog/page.tsx` pulls from the manually maintained registry in `lib/posts.ts`. To add a new post: create the directory and page, then add an entry to `lib/posts.ts`.

**Contact form** (`app/contact/page.tsx` + `components/contact-form.tsx`) submits to `app/api/contact/route.ts`, which calls `lib/gmail.ts`. Gmail is accessed via OAuth2 with a refresh token — no app passwords or third-party email services. Required env vars are in `.env.example`; in production they come from GCP Secret Manager.

**Deployment** is fully automated via GitHub Actions (`.github/workflows/deploy.yml`) using Workload Identity Federation — no long-lived GCP credentials stored in GitHub. Pushes to `main` deploy to production on Cloud Run; other branches get a preview URL via `--no-traffic`.

**Styling** uses Tailwind CSS with shadcn/ui components. Fonts are Montserrat (sans, headings) and Lora (serif, body), loaded via `next/font` in `app/layout.tsx`. The layout constrains content to `max-w-3xl`.

**RSS feed** is a static file at `app/blog/rss.xml` — it must be updated manually when new posts are added.
