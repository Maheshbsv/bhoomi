# Hale Dakhale / ಹಳೆ ದಾಖಲೆ — Old Land Records (Stage 1 demo)

A clickable, bilingual (English / Kannada) demo of a portal for ordering Karnataka's old land records: old RTCs, mutation registers, land grant files, land reform files and RRT dispute files. One visitor can play every role end to end: citizen, operator (back office) and advocate.

**Live demo:** https://maheshbsv.github.io/bhoomi/

**This is sample data with simulated integrations.** Nothing is real:

- OTP is always `123456` and is shown on screen. No SMS is sent.
- WhatsApp, email and delivery are simulated. Messages appear in an on-screen thread only.
- All data lives in your own browser (IndexedDB). Nothing is sent to a server and nothing is shared between visitors. Use "Reset demo data" in the page footer to start over.
- The watermark and PDF merge are real and run in the browser.
- The Kannada wording is machine-assisted and **awaits native-speaker review**.

## Demo script

1. Landing in Kannada, then switch to English.
2. Order an Old RTC for Bagalur village, upload a photo, choose digital delivery, verify with the demo OTP and get `KAR-2026-RTC-xxxx`.
3. Switch to Operator, find it in the queue (green), set it to Under review and send the "multiple entries" template.
4. Switch to Citizen: the track page shows the banner. Reply with the father's name.
5. Operator: assign a runner, print the run sheet, set Searching, upload two scan images, generate the watermarked PDF and Deliver.
6. Citizen: download the PDF from the track page.
7. Advocate: bulk-order 5 survey numbers under "Devanahalli 15-Acre Title Verification", then view the matter progress and the vault.
8. Admin overview: the SLA picture across districts.

## Commands

```bash
npm run dev     # local dev server at http://localhost:3000/bhoomi
npm test        # unit tests (Vitest)
npm run build   # static export to out/
npm run e2e     # Playwright smoke tests against out/ (run npm run build first)
```

The first `npm run e2e` on a machine needs `npx playwright install chromium`. `npm run test:build` rebuilds and checks the shape of `out/`.

## How it is built

Next.js 16 static export under the `/bhoomi` base path, React 19, Tailwind 4, shadcn/ui, `next-intl` for English and Kannada, `pdf-lib` for the deliverable. Data goes through a `DataStore` interface (`src/data/`); Stage 1 implements it with IndexedDB so that Stage 2 can swap in a real backend without changing the screens.

Pushes to `main` run `.github/workflows/deploy.yml`: install, unit tests, build, e2e, then deploy `out/` to GitHub Pages. The repository's Pages source must be set to "GitHub Actions" once.

The design spec is in `docs/superpowers/specs/`.
