# Installation Instructions for PDF Export Fix

## Step 1: Install Updated Packages

Run this command to install the compatible Chromium and Puppeteer versions:

```bash
npm install
```

This will install:

- `@sparticuz/chromium@131.0.0` (includes all required system libraries)
- `puppeteer@23.7.0` (compatible with Chromium 131)
- `puppeteer-core@23.7.0` (compatible with Chromium 131)

## Step 2: Test Locally

```bash
# Test in development mode
npm run dev
# Try exporting a PDF

# Test in production mode locally
npm run build
npm run start
# Try exporting a PDF
```

Both should work now!

## Step 3: Deploy to Vercel

```bash
git add .
git commit -m "Fix PDF export: update to compatible Chromium 131 and Puppeteer 23"
git push
```

## Why These Versions?

**Problem:** `@sparticuz/chromium@119` was missing `libnss3.so` and other system libraries on Vercel.

**Solution:** `@sparticuz/chromium@131` is the latest version that:

- ✅ Includes all required Linux shared libraries
- ✅ Works on Vercel's Node.js 20 runtime
- ✅ Compatible with `puppeteer-core@23.7.0`
- ✅ Optimized for serverless environments (50MB compressed)

## What Changed?

1. **package.json:**

   - `@sparticuz/chromium`: `^119.0.0` → `^131.0.0`
   - `puppeteer`: `^24.28.0` → `^23.7.0`
   - `puppeteer-core`: `^24.28.0` → `^23.7.0`

2. **route.ts:**

   - Detects Vercel environment (`process.env.VERCEL`)
   - Uses `@sparticuz/chromium` on Vercel
   - Uses full `puppeteer` locally

3. **vercel.json:**

   - Memory: 3008 MB
   - Timeout: 60 seconds
   - Function path: `app/api/export-article-pdf/route.ts`

4. **next.config.js:**
   - Webpack externals only in production builds
   - Allows local development to work properly

## Expected Result

After deploying, PDF export should work both locally and on Vercel with properly styled output.
