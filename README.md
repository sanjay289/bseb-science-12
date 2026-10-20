# विज्ञान 12 BSEB — Science Class 12 (Bihar Board)

Offline Android app for Bihar Board (BSEB) Inter / Class 12 Science board-exam practice, in Hindi and English.

- Physics, Chemistry, Biology and Mathematics, chapter-wise per the NCERT (rationalised) syllabus
- Key points and formulas for every chapter
- Chapter-wise MCQs with instant feedback and explanations, options shuffled each time
- Timed subject-wise mock test (30 random questions) with review of wrong answers
- Best scores saved on the device, Hindi/English toggle, share score

Content is in `app/src/main/assets/data/*.js` (one file per subject, format in `data/FORMAT.md`), shown in a WebView by `app.js`. Check content with:

```
node tools/check-data.js     # content structure, bilingual pairs
node tools/smoke-test.js     # every route and quiz, stub DOM
node tools/e2e-chromium.js   # real Chromium: clicks, reload persistence, English mode on all 570 screens
```

## Build

```
./gradlew assembleDebug
```

The APK is at `app/build/outputs/apk/debug/app-debug.apk`. CI builds it on every push to `master`.

Content is for practice; check the official syllabus at biharboardonline.bihar.gov.in.
