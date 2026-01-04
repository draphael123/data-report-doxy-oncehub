# Data Source Configuration

## Current Setup

The dashboard reads from **data.json** - a JSON file generated from your Excel spreadsheet.

**Why JSON instead of direct Excel reading?**
- More reliable browser compatibility
- Faster loading times
- No dependency on external libraries at runtime
- Better error handling

### Excel File
- **File:** `Oncehub_Doxy Report (in use) (3).xlsx`
- **Location:** Root directory
- **Format:** Microsoft Excel (.xlsx)

### How It Works

1. **Data Generation (One-time, when updating):**
   - You update the Excel file with new data
   - Run `python read_excel.py` to convert Excel → JSON
   - This creates `data.json` with all sheets as JSON objects

2. **On Page Load:**
   - The website fetches `data.json`
   - Parses the JSON data (instant, no conversion needed)
   - Displays data in the dashboard

3. **Benefits:**
   - ✅ Fast loading (JSON is lightweight)
   - ✅ Reliable (no library dependencies at runtime)
   - ✅ Works offline once cached
   - ✅ Cross-browser compatible
   - ✅ Easy to debug and inspect

## Updating Data

### Steps to Update Your Dashboard Data:

1. **Update your Excel file** with new data
   - File: `Oncehub_Doxy Report (in use) (3).xlsx`

2. **Regenerate JSON from Excel:**
   ```bash
   python read_excel.py
   ```
   This creates/updates `data.json` with your latest data

3. **Commit and deploy:**
   ```bash
   git add data.json "Oncehub_Doxy Report (in use) (3).xlsx"
   git commit -m "Update report data for [date/reason]"
   git push
   ```

4. **Vercel auto-deploys** in ~30 seconds
   - Visit: https://doxy-oncehub-reports.vercel.app
   - Hard refresh to see new data: `Ctrl+F5` (Windows) or `Cmd+Shift+R` (Mac)

### Quick Update Script

Save this as `update_data.sh` (Mac/Linux) or `update_data.bat` (Windows):

```bash
#!/bin/bash
python read_excel.py
git add data.json "Oncehub_Doxy Report (in use) (3).xlsx"
git commit -m "Update data - $(date +%Y-%m-%d)"
git push
echo "Deploying to Vercel..."
```

Then just run: `./update_data.sh`

## Sheet Names in Excel

The dashboard automatically reads all sheets from the Excel file:

1. Doxy Visits
2. Oncehub Report - Visit Type Dat
3. Oncehub Report - Number of Visi
4. Oncehub - Program Grouped
5. Gusto Hours 
6. Doxy - Over 20 minutes
7. Oncehub Pivot Program
8. Program Grouped
9. Program Pivot

**Important:** Sheet names in the Excel file must match the tab names in the HTML.

## Technical Details

### Data Generation (Python)
- **pandas** - Read Excel files
- **Script:** `read_excel.py`
- **Input:** `Oncehub_Doxy Report (in use) (3).xlsx`
- **Output:** `data.json`

### Dashboard (JavaScript)
- **Native Fetch API** - Load JSON
- **No runtime dependencies** for data loading
- **Code location:** `script.js` → `init()` function

### Data Flow
```
Excel File (.xlsx)
    ↓
Python Script (read_excel.py)
    ↓
pandas.read_excel() → JSON conversion
    ↓
data.json (committed to git)
    ↓
Deployed to Vercel
    ↓
Browser Fetch API
    ↓
JSON.parse()
    ↓
allData object (in memory)
    ↓
Dashboard renders data
```

## Troubleshooting

### Data Not Loading
1. Check browser console for errors
2. Verify Excel file exists in root directory
3. Check file name matches in `script.js`
4. Verify file is committed to git: `git ls-files "*.xlsx"`

### Sheet Names Don't Match
1. Open Excel file
2. Note exact sheet names (including spaces)
3. Update HTML tab buttons with exact names
4. Commit and deploy

### Performance Issues
Large Excel files may take longer to load:
- Consider splitting into multiple smaller files
- Or use JSON fallback for faster loading
- Enable browser caching

## Future Improvements

Potential enhancements:
- [ ] Cache parsed Excel data in localStorage
- [ ] Support multiple Excel files
- [ ] Allow user to upload their own Excel files
- [ ] Real-time sync with Google Sheets
- [ ] Diff detection for data changes

---

**Current Status:** ✅ Reading directly from Excel file  
**Last Updated:** January 3, 2026  
**Version:** 2.0.1

