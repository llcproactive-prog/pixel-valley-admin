Paste this into v0 on the **v0-pixel-valley-painting** project:

---

Add a "Projects" section to the site, fed by Supabase. Don't change any existing pages except to add a nav link and a homepage teaser.

**Data source.** Use the existing Supabase project (URL `https://jbbmrixgcyuiuekgksgo.supabase.co`) with the publishable/anon key, server-side. Query only the table `published_projects`, which is public read-only. Columns:
- `slug` (text, primary key), `title`, `city`, `neighborhood`, `service_type`, `completed_on` (date)
- `body_markdown` (text, Markdown with ## sections)
- `seo_title`, `meta_description`
- `faq` (jsonb array of `{ q, a }`)
- `photos` (jsonb array of `{ url, alt, caption, stage }`, where `stage` is "before", "during" or "after")
- `published_at`

**Pages**
1. `/projects`: a grid of project cards, newest first. Each card shows the first "after" photo (or the first photo if there's no "after"), the title, `service_type · city`, and the completed month and year. Filter chips for `service_type` and `city`, built from the data. Use ISR with `revalidate = 300`.
2. `/projects/[slug]`:
   - Hero with the title and `service_type · neighborhood, city`.
   - A before/after comparison slider when the page has both a "before" and an "after" photo, then a photo gallery that uses each photo's `alt` exactly as stored.
   - `body_markdown` rendered with react-markdown and typography styles.
   - An FAQ accordion when `faq` isn't empty.
   - A CTA block: "Get a quote" linking to the existing quote form, plus the phone number 408-516-7750 and the line "Licensed · CSLB #1155142".
   - `generateMetadata` uses `seo_title` and `meta_description`, with `og:image` set to the first "after" photo.
   - JSON-LD: an `Article` with `about` → the LocalBusiness / HousePainter entity already defined on the site, plus `FAQPage` when FAQs exist.
   - `generateStaticParams` from all slugs, `dynamicParams = true`, `revalidate = 300`. Call `notFound()` when a slug doesn't exist.
3. Add every `/projects/[slug]` URL to `sitemap.ts`.
4. Add "Projects" to the main nav, and a "Recent projects" strip of 3 cards on the homepage that's hidden when there are no rows.

**Rules.** Never show prices. Don't invent placeholder projects or testimonials: if the table is empty, `/projects` shows "Project write-ups coming soon" and a quote CTA. Images come from `*.supabase.co/storage/v1/object/public/published-media/**`, so add that to `next.config` `images.remotePatterns`.
