# Pixel Valley Admin — Marketing Agent

Internal app at **admin.pixelvalleypainting.com**. This first module is the Marketing Agent from the AI Command Center brief, workflow D ("Project completion → marketing"):

1. Log a finished job from your phone. You enter the facts; the agent only uses what you write.
2. Upload before/after photos and mark the ones that are **OK for marketing**.
3. **Draft content.** The agent writes a GBP post, a project page, an Instagram caption, a Facebook post, a review request, and photo alt text.
4. Deterministic guardrails check every draft: no phone number in GBP posts, the license number where it's required, no street addresses, no customer name without permission, no banned claims, no other-city stuffing. Red flags block approval.
5. You edit, approve, then post. Project pages go out with **Publish to website**. The other channels are copy/paste, and you click **I posted it** once they're up.
6. Every agent run, edit, approval and publish is written to an append-only log on the **Activity** page.

Nothing is sent or published without your click.

## Stack

- Next.js 15 (App Router) on Vercel. Project: `pixel-valley-admin`.
- Supabase project `supabase-rose-river` (`jbbmrixgcyuiuekgksgo`). It's the same database as the website's `quote_leads` table.
- AI SDK 5 → Vercel AI Gateway → `anthropic/claude-sonnet-5.5`. On Vercel the gateway authenticates through OIDC, so no API key is needed. Set `ANTHROPIC_API_KEY` to call Anthropic directly instead.

## Security model

- Sign-in is by Supabase magic link. Access is granted only by the `admin_users` table, which every RLS policy checks through `private.is_admin()`. Anyone else who signs in sees "No access" and can read no data.
- The app uses only the publishable (anon) key. There is no service-role key anywhere.
- Photos live in the private bucket `job-photos`. Approving a photo for marketing copies it to the public bucket `published-media`.
- `published_projects` is the only table the public can read, and it only contains what you published.

## Database (migrations applied 2026-09-30)

| Table | Purpose |
|---|---|
| `admin_users` | Email allowlist (owner role) |
| `brand_settings` | Business rules as config: license, cities, brand state, voice, review link |
| `jobs` | Finished-job intake |
| `job_photos` | Photos, stage, alt text, marketing approval |
| `content_items` | Drafts per channel with status draft → pending_approval → approved → published / rejected |
| `agent_runs` | Append-only activity log (no update/delete policy) |
| `published_projects` | Public feed for the website |
| `quote_leads` (existing) | Admin got read access; the table itself is unchanged |

## Website tie-in (v0 site)

The public site reads published project pages with the anon key:

```ts
const { data } = await supabase.from("published_projects").select("*").order("published_at", { ascending: false });
```

Columns: `slug, title, city, neighborhood, service_type, completed_on, body_markdown, seo_title, meta_description, faq (jsonb [{q,a}]), photos (jsonb [{url,alt,caption,stage}]), published_at`.

## Environment variables

| Key | Value |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://jbbmrixgcyuiuekgksgo.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase publishable key |
| `MARKETING_MODEL` | `anthropic/claude-sonnet-5.5` (optional) |
| `ANTHROPIC_API_KEY` / `ANTHROPIC_MODEL` | Optional. Direct Anthropic instead of the gateway |
| `AGENT_HEALTH_TOKEN` | Guards `/api/agent-health?token=…`, a no-database smoke test of the model |

## Local development

```bash
cp .env.example .env.local   # fill in the publishable key
npm install
npm run dev
npm test                      # guardrail tests
```

To sign in locally, add `http://localhost:3000/auth/callback` to the Supabase Auth redirect URLs.

## Next modules (from the brief)

Phase 1 still needs Projects, Estimates and Expenses tables plus the read-only "Ask Pixel Valley" assistant. The agent and approval patterns here (`lib/agents`, `agent_runs`, status workflow, `requireAdmin`) are meant to be reused.
