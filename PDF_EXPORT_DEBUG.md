# PDF Export Debugging Guide

## Changes Made

### 1. Fixed Local Development (`next.config.js`)

- Webpack externals now only apply in production builds (`!dev`)
- This allows local development to work properly

### 2. Updated Vercel Configuration (`vercel.json`)

- Changed path from `src/app/api/export-article-pdf/route.ts` to `api/export-article-pdf`
- Memory: 3008 MB (maximum)
- Timeout: 60 seconds

### 3. Enhanced Error Logging (`route.ts`)

- Added detailed console.log statements at each stage
- Returns JSON error responses with stack traces
- Logs when puppeteer loads successfully

## How to View Vercel Logs

### Option 1: Via Vercel Dashboard

1. Go to https://vercel.com/dashboard
2. Click on your project
3. Click on "Deployments"
4. Click on the latest deployment
5. Click on "Functions" tab
6. Find `/api/export-article-pdf`
7. Click on the function to see real-time logs

### Option 2: Via Vercel CLI

```bash
# Install Vercel CLI if not already installed
npm i -g vercel

# Login to Vercel
vercel login

# View logs in real-time
vercel logs --follow

# Or view logs for specific function
vercel logs api/export-article-pdf
```

## Testing Locally

1. **Start development server:**

   ```bash
   npm run dev
   ```

2. **Test PDF export** - should use full `puppeteer` package

3. **Build and test production locally:**
   ```bash
   npm run build
   npm run start
   ```

## Expected Log Output

### Successful Export:

```
[export-article-pdf] Attempting to load puppeteer-core + @sparticuz/chromium...
[export-article-pdf] Successfully loaded serverless chromium
[export-article-pdf] Launching browser with: { executablePath: '...', argsCount: 15 }
[export-article-pdf] Browser launched successfully
[export-article-pdf] Setting page content...
[export-article-pdf] Content set, generating PDF...
```

### Fallback to Local Puppeteer (Development):

```
[export-article-pdf] Attempting to load puppeteer-core + @sparticuz/chromium...
[export-article-pdf] @sparticuz/chromium not available, falling back to puppeteer: [Error details]
[export-article-pdf] Successfully loaded full puppeteer for local development
[export-article-pdf] Launching browser with: { executablePath: undefined, argsCount: 5 }
[export-article-pdf] Browser launched successfully
...
```

## Common Issues and Solutions

### Issue 1: "Failed to generate PDF" in Production

**Check:**

- Vercel function logs for specific error message
- Memory limit (requires Pro plan for 3008MB)
- Timeout settings (60s should be enough)

### Issue 2: Works Locally but Not in Production

**Possible causes:**

- Webpack bundling issues → Check `next.config.js` externals
- Missing packages → Verify `@sparticuz/chromium` and `puppeteer-core` in `dependencies`
- Vercel function size limit exceeded
- Insufficient memory/timeout

### Issue 3: Broken UI Locally

**Solution:**

- Updated webpack config to only mark packages as external in production (`!dev`)
- Restart dev server after config changes

## Next Steps

1. **Deploy the changes:**

   ```bash
   git add .
   git commit -m "Fix PDF export with enhanced logging and serverless Chromium"
   git push
   ```

2. **Test in production and check logs**

3. **If still failing, share the error logs from Vercel**
   - Look for the detailed JSON error response
   - Check for browser launch errors
   - Verify chromium executable path

## Package Versions (Current)

- `puppeteer`: ^24.28.0
- `puppeteer-core`: ^24.28.0
- `@sparticuz/chromium`: ^119.0.0

Note: Ensure these versions are compatible. If issues persist, consider:

- Downgrading to `puppeteer-core@22.10.0` and `@sparticuz/chromium@123.0.1`
- These are known stable versions for serverless environments
