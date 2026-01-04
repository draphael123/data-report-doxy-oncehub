# Troubleshooting Guide

## Data Not Loading

If you see "Loading data..." but no data appears, follow these steps:

### Step 1: Check Browser Console

1. **Open Developer Tools:**
   - **Chrome/Edge:** Press `F12` or `Ctrl+Shift+I` (Windows) / `Cmd+Option+I` (Mac)
   - **Firefox:** Press `F12` or `Ctrl+Shift+K`
   - **Safari:** `Cmd+Option+C`

2. **Click the "Console" tab**

3. **Look for messages starting with:**
   - `Initializing dashboard...`
   - `Fetching Excel file...`
   - `Excel file loaded, size: ...`
   - `Workbook parsed, sheets: ...`
   - `Data loaded, total tabs: ...`

### Step 2: Check for Errors

Look for red error messages in the console. Common issues:

#### Error: "Excel library not loaded"
**Solution:** The XLSX library failed to load from CDN.
- Check your internet connection
- Try refreshing the page
- Clear browser cache

#### Error: "HTTP error! status: 404"
**Solution:** Excel file not found
- Verify file name: `Oncehub_Doxy Report (in use) (3).xlsx`
- Check file is in the root directory
- Verify file was committed to git: `git ls-files "*.xlsx"`

#### Error: "Failed to fetch"
**Solution:** CORS or network issue
- Make sure you're accessing via HTTPS (Vercel)
- Check if the file is accessible
- Try local server instead of file://

### Step 3: Verify Files Exist

Run these commands in your project directory:

```bash
# Check if Excel file exists
ls "Oncehub_Doxy Report (in use) (3).xlsx"

# Check if it's in git
git ls-files "*.xlsx"

# Check file size
ls -lh "Oncehub_Doxy Report (in use) (3).xlsx"
```

### Step 4: Test Locally

```bash
# Start local server
python -m http.server 8000

# Open in browser
# http://localhost:8000
```

### Step 5: Verify Library Loading

In the browser console, type:

```javascript
// Check if XLSX is loaded
console.log('XLSX available:', typeof XLSX !== 'undefined');

// Check library version
if (typeof XLSX !== 'undefined') {
    console.log('XLSX version:', XLSX.version);
}
```

### Step 6: Manual Data Test

In the console, try loading manually:

```javascript
// Test fetch
fetch('Oncehub_Doxy Report (in use) (3).xlsx')
    .then(r => {
        console.log('Fetch successful:', r.status, r.ok);
        return r.arrayBuffer();
    })
    .then(buffer => {
        console.log('File size:', buffer.byteLength);
        if (window.XLSX) {
            const wb = XLSX.read(buffer);
            console.log('Sheets:', wb.SheetNames);
        }
    })
    .catch(e => console.error('Error:', e));
```

## Common Solutions

### Solution 1: Use Fallback (data.json)

If Excel loading fails, the system automatically falls back to `data.json`.

To ensure fallback works:
```bash
# Generate JSON from Excel
python read_excel.py

# Commit and deploy
git add data.json
git commit -m "Add data.json fallback"
git push
```

### Solution 2: Clear Cache

Sometimes browsers cache old versions:

1. **Hard Refresh:**
   - Windows: `Ctrl + F5` or `Ctrl + Shift + R`
   - Mac: `Cmd + Shift + R`

2. **Clear Site Data:**
   - Chrome: Settings → Privacy → Clear browsing data
   - Check "Cached images and files"
   - Time range: "Last hour"

### Solution 3: Check File Encoding

Excel files must be valid .xlsx format:

```bash
# Check file type
file "Oncehub_Doxy Report (in use) (3).xlsx"

# Should output: Microsoft Excel 2007+
```

### Solution 4: Rename File (if needed)

Spaces in filenames can cause issues:

1. Rename file to `oncehub-doxy-report.xlsx`
2. Update `script.js` line 41:
   ```javascript
   const response = await fetch('oncehub-doxy-report.xlsx');
   ```
3. Commit and push

### Solution 5: Check Vercel Deployment

In Vercel dashboard:

1. Go to: https://vercel.com/daniel-8982s-projects/doxy-oncehub-reports
2. Click latest deployment
3. Check "Build Logs" for errors
4. Verify file is included in deployment

## Debug Mode

Add this to see detailed logging:

```javascript
// In browser console
localStorage.setItem('debug', 'true');
location.reload();
```

## Still Not Working?

If none of the above work, check:

1. ✅ Excel file is valid .xlsx format
2. ✅ File size is reasonable (< 10MB)
3. ✅ All sheets have headers in first row
4. ✅ No merged cells in data area
5. ✅ File is committed to git repository
6. ✅ Vercel deployment succeeded
7. ✅ Browser is up to date

## Alternative: Always Use JSON

If you prefer to always use JSON instead of Excel:

1. In `script.js`, comment out Excel loading:
```javascript
async function init() {
    // await loadExcelFile(); // Comment this
    const response = await fetch('data.json');
    allData = await response.json();
    // ... rest of code
}
```

2. Always run `python read_excel.py` before deploying

## Contact & Support

- Check GitHub issues: https://github.com/draphael123/data-report-doxy-oncehub/issues
- Review documentation: README.md, DATA_SOURCE.md
- Check Vercel logs: https://vercel.com/daniel-8982s-projects/doxy-oncehub-reports

## Quick Diagnostics Checklist

- [ ] Browser console shows no errors
- [ ] XLSX library loads (check console for "XLSX available: true")
- [ ] Excel file exists in repository
- [ ] Excel file committed to git
- [ ] Vercel deployment successful
- [ ] Hard refresh attempted
- [ ] Tried in different browser
- [ ] Tested locally

---

**Last Updated:** January 3, 2026  
**Version:** 2.0.2

