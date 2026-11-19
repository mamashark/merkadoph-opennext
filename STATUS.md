# STATUS: Merkado PH (merkadoph.se)

Every agent reads this before starting and updates it when a task is finished or blocked (see `CLAUDE.md` and `local/guidelines.md` section 10).
Rules: tasks move between sections with owner and date (YYYY-MM-DD) · bugs get a severity · decisions for Kay get a recommended option · one Log line per change · no personal data in this file · anything not checked is "unverified".

**Phase:** Content & launch prep. The site is built and deployed behind the staging gate (visitors see "coming soon"). Kay is filling in the content.
**% complete (launch prep):** 4 of 16 tasks done ≈ 25%. Counted from the task lists below; update when tasks move.
**Last updated:** 2026-11-19 by Pia (PM)

---

## In progress

| Task | Owner | Since | Notes |
|---|---|---|---|
| Fill in the site content (blogs, events, portfolio, services, promotions) | Kay | 2026-11-17 | The staging gate stays on until this is done (decided by Kay, 2026-11-19). |

## To do

| Task | Owner | Notes |
|---|---|---|
| Review commit `1e61085` (zoom into a Highlight, full-screen hero, reveal-on-scroll header) | Arvid (ARCH) | Not reviewed yet. |
| Test the homepage on real phones and with touch (zoom in, entry panel, Back, Escape) | Quinn (QA) | Tested only in headless Chrome at ≥ 500px wide; real devices unverified. |
| Lighthouse the homepage on mobile and desktop, light and dark | Ally (A11Y) | Not measured since the Highlights homepage was added. |
| Bring home JS under the 170 KB budget | Finn (FE) | 183 KB in the 16 Nov audit; the zoom view added code since, so likely higher (unverified). |
| Deploy `971ef16` (security update) and `1e61085` to Cloudflare | Dex (OPS) | Needs Kay's OK. Whether the live Worker already has them is unverified (no Cloudflare token locally). |
| Remove or unpublish every `sample`-tagged item | Sol (SEO) | `node scripts/seed-sample-content.mjs --remove`. Before launch. |
| Add 301 redirects for old Shopify URLs (Admin → SEO → Redirects) | Sol (SEO) | Old URLs return 404. |
| Rewrite legal pages for a no-shop site | Dana (DATA) | They still describe a shop. |
| Set up uptime monitoring and alerts | Dex (OPS) | Not confirmed. |
| Check Workers Logs for "Error 1102" (resource limits) | Dex (OPS) | Seen once in the 16 Nov audit. |
| Fix the ESLint setup | Finn (FE) | See bug B1. |
| Re-check "noindex on production" after launch with a clean browser | Sol (SEO) | Probably the staging cookie (staged pages add noindex on purpose). |

## Blocked

| Task | Owner | Blocked by |
|---|---|---|
| Launch (`NEXT_PUBLIC_HOMEPAGE_LIVE=true` + deploy) | Dex (OPS) | Kay finishing the content; Needs Kay #1. |

## Done

| Task | Owner | Date | Ref |
|---|---|---|---|
| Zoom into a Highlight (entry constellation + side panel), full-screen hero, header hidden until the About section | Finn (FE) | 2026-11-17 | `1e61085` |
| Security update: `next` 16.4.6, `zod` 4.6.7 (CI audit was failing) | Dex (OPS) | 2026-11-16 | `971ef16` |
| Highlights constellation as the new homepage | Finn (FE) | 2026-11-16 | `b380c4d` |
| Shopify blog import script (posts imported as drafts, images copied to Supabase) | Bea (BE) | 2026-11-16 | `46f61b4`. Kay runs it (needs the service-role key). Imported posts are visible on the site; whether every post came across is unverified. |

---

## Bugs

| # | Bug | Severity | Owner | Status |
|---|---|---|---|---|
| B1 | `npm run lint` / ESLint crashes on its own config ("Converting circular structure to JSON") before checking any file | Minor | Finn (FE) | Open |
| B2 | Home JS 183 KB, over the 170 KB budget; one 245 ms long task | Major | Finn (FE) | Open (16 Nov audit) |
| B3 | Old Shopify URLs return 404 | Major | Sol (SEO) | Open |
| B4 | Legal pages describe a shop | Major | Dana (DATA) | Open |

## Needs Kay

1. **Launch timing.** Recommended: keep the staging gate on until the content is in and the sample items are removed, then flip `NEXT_PUBLIC_HOMEPAGE_LIVE=true` and deploy. *(Kay, 2026-11-19: keep "coming soon" for now.)*
2. **Deploy the latest commits to the preview** so you can check the new homepage with your staging link. Recommended: yes. Visitors still see "coming soon".
3. **Site focus.** The brief is culture, events and portfolio, but some copy leans towards roofing and home improvement. Recommended: decide the focus, then Sol aligns the copy, Services and Portfolio.
4. **reCAPTCHA loads before anyone uses a form.** Recommended: load it only when a form is focused or in view. Alternative: Cloudflare Turnstile (a new third-party script, so it needs your OK).

---

## Log

2026-11-14 · FE · Shared tags; constellation section, then constellation as the homepage hero
2026-11-16 · BE · Shopify blog import script (`46f61b4`)
2026-11-16 · FE · Highlights constellation is the new homepage (`b380c4d`)
2026-11-16 · OPS · CI audit failed on `next` advisories; updated `next`/`zod` (`971ef16`)
2026-11-17 · FE · Zoom into a Highlight, full-screen hero, reveal-on-scroll header (`1e61085`); fixed hover lean moving categories away from the pointer
2026-11-19 · PM · Agents moved to `.claude/agents/` so Claude Code loads them; created STATUS.md
2026-11-19 · FE · Coming-soon page: constellation removed, text kept (no client JS on that page now); not deployed
