# STATUS: Merkado PH (merkadoph.se)

Every agent reads this before starting and updates it when a task is finished or blocked (see `CLAUDE.md` and `local/guidelines.md` section 10).
Rules: tasks move between sections with owner and date (YYYY-MM-DD) · bugs get a severity · decisions for Kay get a recommended option · one Log line per change · no personal data in this file · anything not checked is "unverified".

**Phase:** Content & launch prep. The site is built and deployed behind the staging gate (visitors see "coming soon"). Kay is filling in the content.
**% complete (launch prep):** 4 of 16 tasks done ≈ 25%. Counted from the task lists below; update when tasks move.
**Last updated:** 2026-11-19 by Dex (OPS)

---

## In progress

| Task | Owner | Since | Notes |
|---|---|---|---|
| Fill in the site content (blogs, events, portfolio, services, promotions) | Kay | 2026-11-17 | The staging gate stays on until this is done (decided by Kay, 2026-11-19). |

## To do

| Task | Owner | Notes |
|---|---|---|
| Review commit `1e61085` (zoom into a Highlight, full-screen hero, reveal-on-scroll header) | Arvid (ARCH) | Not reviewed yet. |
| Test the homepage on real phones and with touch (zoom in, entry panel, Back, Escape) | Quinn (QA) | 2026-11-19: emulated pass done (headless Chrome, touch on, 320/375/390/414 portrait + 568/667/844/896 landscape, local `next dev`). Journeys work; found B5–B10. **Real iOS Safari / Android Chrome still unverified** (Needs Kay #5). Retest after B5 is fixed. |
| Lighthouse the homepage on mobile and desktop, light and dark | Ally (A11Y) | Not measured since the Highlights homepage was added. |
| Bring home JS under the 170 KB budget | Finn (FE) | 183 KB in the 16 Nov audit; the zoom view added code since, so likely higher (unverified). |
| Remove or unpublish every `sample`-tagged item | Sol (SEO) | `node scripts/seed-sample-content.mjs --remove`. Before launch. |
| Add 301 redirects for old Shopify URLs (Admin → SEO → Redirects) | Sol (SEO) | Old URLs return 404. |
| Rewrite legal pages for a no-shop site | Dana (DATA) | They still describe a shop. |
| Check Workers Logs for "Error 1102" (resource limits) | Dex (OPS) | Seen once in the 16 Nov audit. Needs Cloudflare dashboard access (no token locally). Once monitoring runs, a repeat 1102 shows up as `/api/health` down. |
| Fix the ESLint setup | Finn (FE) | See bug B1. |
| Re-check "noindex on production" after launch with a clean browser | Sol (SEO) | Probably the staging cookie (staged pages add noindex on purpose). |

## Blocked

| Task | Owner | Blocked by |
|---|---|---|
| Launch (`NEXT_PUBLIC_HOMEPAGE_LIVE=true` + deploy) | Dex (OPS) | Kay finishing the content; Needs Kay #1. |
| Set up uptime monitoring and alerts | Dex (OPS), 2026-11-19 | Prepared, **not running yet**: Needs Kay #6. Code on branch `ops/uptime-monitoring` (`f0c6db3`, not pushed): hourly GitHub Actions check (`.github/workflows/uptime.yml`) + Workers Issues on in `wrangler.jsonc`. The existing `/api/health` (Worker + database, outside the staging gate; returned 200 `{"ok":true}` on 2026-11-19) is the endpoint to monitor. |

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
| B5 | Phones in landscape (568×320, 667×375, emulated): the hero's hint bar (`.hint` in `highlights.module.css`: z-index 3, only `.hintText` has `pointer-events: none`) covers the top of the sky and catches taps. In 6 of 12 landscape loads one Highlight (Portfolio, Blogs, Events or Promotions) could not be tapped at all; the "Open/Fold again" button also covers hub labels or tiles in portrait (partly, 5 of 12 portrait loads). Steps: `/` → Open → tap a category near the top. Expected: zooms in. Actual: nothing. Workaround: scroll to the section bands. | Major | Finn (FE) | Fixed 2026-11-19 (`212cd71` + scroll fix): hint bar lets taps through, nodes stay out of the button's corner, 44px tap target per category, page scroll restored when a Highlight closes. Emulated touch retest: 111/113, then 70/70 and 29/29 after the scroll fix (568×320, 667×375, 844×390, 896×414, 375×667, 390×844). Real devices unverified (Needs Kay #5). |
| B6 | Phones in landscape (height < 420px): `.stage` has `min-height: 420px`, so the hero is taller than the screen. The bottom sheet's bottom is cut off (667×375: sheet 168–420px, only 113px of list showing; entry pane 152px), and hubs can land below the fold (568×320: one hub off screen in each of 3 loads). | Minor | Finn (FE) | Open |
| B7 | Small phones, bottom sheet with an entry open: "Read the full story" and Previous/Next sit below the visible part of the sheet (320×568: CTA at 704px, sheet ends 568px; 375×667: 757 vs 667; 390×844: cut off at 844). Users have to scroll inside the sheet. Touch-scrolling the sheet works (it scrolls and the page does not). | Minor | Finn (FE) | Open |
| B8 | Browser Back within ~0.4s of tapping a Highlight (375×667, emulated): the URL goes back to `/` but the Highlight still opens (100ms and 300ms: Events open at `/`; 600ms: OK). The next Back leaves the homepage. Cause: `popstate` arrives before `setWorld()` in `enterWorld()`, so `sync()` sees no world. | Minor | Finn (FE) | Open |
| B9 | With a Highlight open on a phone, swiping on the zoomed sky (top 40%) scrolls the page: the sheet slides up under the revealed header (panel top −62 to −192px) while `?world=` stays in the URL. Needs a UX decision: lock the page scroll while a Highlight is open, or close it. | Minor | Finn (FE) / Uma (UX) | Open |
| B10 | Touch devices see mouse wording: the hint "Hover a category · click to zoom in · drag to rearrange" (shown when width > 560px, e.g. landscape) and the folded prompts "Click." | Cosmetic | Sol (SEO) copy + Finn (FE) | Open |

## Needs Kay

1. **Launch timing.** Recommended: keep the staging gate on until the content is in and the sample items are removed, then flip `NEXT_PUBLIC_HOMEPAGE_LIVE=true` and deploy. *(Kay, 2026-11-19: keep "coming soon" for now.)*
2. **Deploy the latest commits to the preview** so you can check the new homepage with your staging link. Recommended: yes. Visitors still see "coming soon".
3. **Site focus.** The brief is culture, events and portfolio, but some copy leans towards roofing and home improvement. Recommended: decide the focus, then Sol aligns the copy, Services and Portfolio.
4. **reCAPTCHA loads before anyone uses a form.** Recommended: load it only when a form is focused or in view. Alternative: Cloudflare Turnstile (a new third-party script, so it needs your OK).
5. **Real-phone check of the homepage.** Emulation can't confirm iOS Safari (svh and the address bar, momentum scroll, the Back swipe, tap delay), Android Chrome's Back button and gesture, or real touch accuracy. Recommended: after B5 is fixed, Kay runs Quinn's manual steps on one iPhone (Safari) and one Android phone (Chrome), using the preview with the staging link (needs Needs Kay #2), and reports pass/fail per step. B5 is graded Major (one Highlight can't be tapped in landscape); Kay may downgrade it to Minor because the sections below still work.
6. **Uptime monitoring (adds a third-party service).** Recommended: **UptimeRobot Free** (50 monitors, 5-minute checks, keyword monitors, email alerts; its pricing page says the free plan is for "personal and commercial projects"). Two keyword monitors: `https://merkadoph.se/api/health` must contain `"ok":true` (catches Worker errors such as 1102 and a down database), and `https://merkadoph.se/` must contain `Merkado PH` (the coming-soon page counts as up, so it works before and after launch). Alerts by email to Kay. Plus: OK to push branch `ops/uptime-monitoring` (hourly GitHub Actions check as the fallback, no new service and no secrets) and to switch on Workers Issues (Cloudflare, free in open beta) in the dashboard, with the matching `wrangler.jsonc` line in the next approved deploy. Alternative: Better Stack Free (10 monitors, email/Slack; its pricing says "Free for personal projects", so less clearly fine for a business). Fallback if you don't want any new service: only the GitHub Actions check (hourly, so up to about an hour before you hear). Cloudflare Health Checks need a Pro plan or higher and Cloudflare Notifications list no Workers error alert, so neither is used. Dex has the click-by-click setup steps.

---

## Log

2026-11-14 · FE · Shared tags; constellation section, then constellation as the homepage hero
2026-11-16 · BE · Shopify blog import script (`46f61b4`)
2026-11-16 · FE · Highlights constellation is the new homepage (`b380c4d`)
2026-11-16 · OPS · CI audit failed on `next` advisories; updated `next`/`zod` (`971ef16`)
2026-11-17 · FE · Zoom into a Highlight, full-screen hero, reveal-on-scroll header (`1e61085`); fixed hover lean moving categories away from the pointer
2026-11-19 · PM · Agents moved to `.claude/agents/` so Claude Code loads them; created STATUS.md
2026-11-19 · FE · Coming-soon page: constellation removed, text kept (no client JS on that page now); not deployed
2026-11-19 · QA · Homepage mobile test in emulated Chrome (touch, 320–414 portrait, 568–896 landscape, light + dark at 390): journeys, Back/Forward, Escape, deep links and refresh pass; no horizontal scroll; no console errors. Logged B5 (Major) and B6–B10. Real devices still unverified.
2026-11-19 · FE · Coming-soon page: text moved top-left; twinkling CSS stars (reduced motion: still); not deployed
2026-11-19 · OPS · Uptime monitoring prepared, not live: hourly GitHub Actions uptime check + Workers Issues config on branch `ops/uptime-monitoring` (`f0c6db3`, not pushed); probe tested against production (both checks up) and a fake host (both down); `tsc` and `wrangler deploy --dry-run` pass. External monitor (UptimeRobot recommended) waits for Kay (Needs Kay #6)
2026-11-19 · UI · Homepage + coming-soon text/accents use the brand palette (olive, teal, yellow, orange, red-orange, red #E10606); light mode uses AA-passing shades; highlighter marks on highlighted words; not deployed
2026-11-19 · FE · B5 fix: hint bar no longer catches taps, Open/Fold corner kept clear of nodes, 44px category tap targets; emulated retest in progress
2026-11-19 · FE · B5 retest (emulated touch): 70/70 + 29/29 taps open their Highlight; also fixed the page staying scrolled after closing a Highlight (header then covered the top of the sky)
2026-11-19 · OPS · Deployed `1193fd7` to Cloudflare with Kay's OK (version b5abea63), built with NEXT_PUBLIC_SITE_URL=https://merkadoph.se (`.env.local` would bake in localhost). Checked live: coming-soon page with stars, canonical/OG on merkadoph.se, new og-default.jpg, /api/health ok, gate still redirects /blogs → /. Staged homepage not checked (no STAGE_KEY here)
