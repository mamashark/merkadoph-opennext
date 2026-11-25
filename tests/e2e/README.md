# End-to-end tests (Playwright)

An automated suite that GitHub Actions runs on every push to `main` and every pull request (`.github/workflows/e2e.yml`). It ports the checks Quinn, Ally, Arvid and Finn proved with headless-Chrome scripts, so regressions are caught without AI testers. Lighthouse is not part of it (release-time check).

**Read-only.** The tests only load pages and click around. They never submit forms, write data or call admin routes. Pages read published content from production Supabase with the public anon key from the committed `.env.production`. No secrets are needed or used.

## What is covered

| File | Checks |
|---|---|
| `smoke.spec.ts` | Every public route is 200 at 390 and 1280 (one `<h1>`, no console errors, no sideways scroll); an unknown route is 404; RSS is served; internal links on the homepage resolve |
| `constellation.spec.ts` | Each Highlight opens the right `?world=` and Escape closes it (390 portrait touch, 667x375 landscape touch, 1280 mouse); no label overlaps and no covered squares over 3 landscape loads each at 667x375 and 844x390 (B5/B18); `#` tiles cause no console error (B30) |
| `jumps-and-restore.spec.ts` | B28: every About index `[data-dive]` link and the header `#contact` land at the 64px scroll margin (±2px) at 390 and 1280. B29: Back from a card and reload at a band restore the position (±2px) |
| `a11y.spec.ts` | axe (wcag2a, wcag2aa, wcag21aa, wcag22aa) on `/`, `/blogs`, one blog post, `/events`, `/impact`, one Community Impact entry, `/privacy`, `/cookies` at 390 and 1280, light and dark. B33: the `/cookies` table wrapper takes Tab focus and scrolls with ArrowRight at 320 |
| `content.spec.ts` | Homepage blog card summaries clamp to 3 lines at 320, 390, 768, 1280 |

The constellation lays itself out at random on every load, so nothing asserts exact positions. Tests use thresholds and the config allows one retry locally (two in CI). A test that passes only on a retry is shown as "flaky" in the report: look at it.

## Run it locally

```bash
npm run test:e2e:build   # next build with NEXT_PUBLIC_HOMEPAGE_LIVE=true and NEXT_PUBLIC_SITE_URL=http://localhost:3310
npm run test:e2e         # Playwright starts `next start -p 3310` and runs the suite
npx playwright show-report   # after a failure
```

- First time only: `npx playwright install chromium`.
- `NEXT_PUBLIC_*` values are inlined at build time, so the gate must be off **when building**. It is set only in the `test:e2e:build` script and the Playwright `webServer`, never in an `.env` file (launch is Kay's decision). `globalSetup` fails fast with a clear message if the server still shows the coming-soon page.
- Port 3310 is used so it never clashes with `npm run dev` on 3000. An already-running server on 3310 is reused locally (not in CI), so rebuild and stop the old one after code changes.
- `next start` works without Cloudflare bindings for all these pages (they fall back to uncached reads). Routes that need bindings (admin, forms) are not tested.

## Known open bugs (the allow-list)

`a11y.spec.ts` has a `KNOWN_OPEN` list. A listed rule on a listed page does not fail CI but is added to the report as a `known-open-bug` annotation, so it stays visible. Each entry carries its `STATUS.md` bug number.

When a bug is fixed: delete its `KNOWN_OPEN` entry in the same commit as the fix. The test then fails if the violation returns. To add one, use only a real `STATUS.md` bug number and a comment saying what it is. Never add an entry to make a red build green.

Current entries: B36 (`heading-order` on blog posts), the landmark-unique follow-up from Arvid's B33 review (`/cookies`, `/privacy`). B35 was fixed by the site design (2026-11-25) and removed.
