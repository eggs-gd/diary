# Images

These are not screenshots of features. They show what the journal is for: jot down even the
smallest thing, and see how the day really went. Calm, plain, nothing to learn.

All images are made in the `en` locale, from the fictional data in
`scripts/lib/appstore-seed.mjs` (no real people, no real entries). Never use a real archive.

Large title. Tiny subtitle. Use the exact title and subtitle below; do not rewrite, improve,
shorten or replace them.

Size: 1242 × 2688 px. The phone frame, background and type are drawn by
`scripts/generate-appstore-images.mjs` (same layout as the I Ching images).

## What the set must say

1. **The simple daily mode works on its own.** You do not reflect on every event. You jot it
   down, with a score, and move on.
2. **The day adds up.** The day score is a damped sum (each score counts as
   `sign × √|score|`, summed), so many small good moments outweigh one big bad one. The sample
   day *feels* like one bad event (−7), but the report says +3.
3. **Reflection is optional and deeper.** Up to four short questions, then a second score.
   A −7 can look different afterwards.
4. **It is a simplified tool, not therapy.** No medical language anywhere, in the images or
   in the titles.

## 1

Show today's list in the simple daily mode (reflection mode off).
- the year and month headings are hidden, so the list starts at the day
- the "ask the I Ching" button on each row is hidden: it is not part of this story

Title: WRITE IT DOWN
Subtitle: Even the smallest thing.
One line, one tap.

## 2

Show today's day report, opened from the day heading.
- the day score on top, bright dots on the positive side (+3)
- the sections "Events that brought me joy today" and "Events that upset me today" visible

Title: THE DAY ADDS UP
Subtitle: Many small moments
outweigh one bad one.

## 3

Reflection mode on. Open "Heated argument in the planning meeting" (the −7 entry).
- the first question, "What upset you about this?", half answered with the sample text

Title: LOOK CLOSER
Subtitle: Two to four short questions.
Only when you want.

## 4

Same entry after reflecting (the sample answers are seeded).
- scroll so the last answer and "How does it look now?" with the score dots are visible

Title: SEE IT DIFFERENTLY
Subtitle: Re-score once you have looked.

## 5

The archive: earlier days stacked up, each with its own score dots.
- a lighter day above a heavier one, so both colours show
- start the list at a day heading (year and month headings hidden)

Title: COME BACK
Subtitle: See how your days
really went.

## How to make them

```sh
cd App && yarn dev        # the app on http://127.0.0.1:5173
# in another terminal, from the repository root:
make appstore             # writes AppStore/appstore-*.png
```

Requirements: Google Chrome (path in `CHROME_PATH`, default `/Applications/Google Chrome.app`)
and the app's own `node_modules` (the script uses its `sharp`).

What the script does, so a failing run is easy to read:
- starts headless Chrome and drives the app through DevTools; every shot starts from a clean
  profile, seeded with `localStorage` (`guanming.events.v1`, locale `en`, the reflection-mode
  flag, and `analyticsConsent` so the statistics popup does not appear);
- blocks the Google Analytics hosts, so a run sends no test traffic;
- the date is "today" every run, so the day headings change; nothing else does.

Environment variables: `APPSTORE_APP_URL`, `APPSTORE_OUTPUT_DIR`, `APPSTORE_TMP_DIR`,
`APPSTORE_REMOTE_PORT`, `CHROME_PATH`.

After a run, copy the images to the landing page: `cp AppStore/appstore-*.png
Site/static/screenshots/`.
