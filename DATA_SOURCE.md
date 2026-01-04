# Data Source Configuration

## Current Setup

The dashboard now reads **directly from the Excel file** instead of a pre-generated JSON file.

### Excel File
- **File:** `Oncehub_Doxy Report (in use) (3).xlsx`
- **Location:** Root directory
- **Format:** Microsoft Excel (.xlsx)

### How It Works

1. **On Page Load:**
   - The website fetches the Excel file using the XLSX.js library
   - Parses all sheets in the workbook
   - Converts each sheet to JSON format in real-time
   - Displays the data in the dashboard

2. **Benefits:**
   - ✅ No need to run `read_excel.py` anymore
   - ✅ Always shows current data from Excel
   - ✅ Single source of truth
   - ✅ Automatic updates when Excel file changes

3. **Fallback:**
   - If Excel file fails to load, falls back to `data.json`
   - Ensures the site always has data to display

## Updating Data

### Option 1: Replace Excel File (Recommended)
1. Replace `Oncehub_Doxy Report (in use) (3).xlsx` with new file
2. Keep the same filename or update `script.js` line with new filename
3. Commit and push:
   ```bash
   git add "Oncehub_Doxy Report (in use) (3).xlsx"
   git commit -m "Update report data"
   git push
   ```
4. Vercel auto-deploys in ~30 seconds

### Option 2: Keep Both Excel and JSON
If you want to maintain both options:
1. Update Excel file
2. Run: `python read_excel.py` to regenerate JSON
3. Commit both files
4. The site will try Excel first, fall back to JSON if needed

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

### Libraries Used
- **SheetJS (xlsx)** - v0.18.5
- Loaded from CDN: `https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js`

### Code Location
- Main data loading function: `script.js` → `loadExcelFile()`
- Initialization: `script.js` → `init()`

### Data Flow
```
Excel File (.xlsx)
    ↓
Browser Fetch API
    ↓
XLSX.read() - Parse binary
    ↓
XLSX.utils.sheet_to_json() - Convert to JSON
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

