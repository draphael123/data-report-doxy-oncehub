# Quick Guide: How to Update Dashboard Data

## Simple 3-Step Process

### 1️⃣ Update Your Excel File
Edit `Spreadsheets\Data Sources 1-4\Oncehub_Doxy Report (in use) (5).xlsx` with your new data

### 2️⃣ Convert to JSON
```bash
python read_excel.py
```

### 3️⃣ Deploy
```bash
git add data.json "Spreadsheets/Data Sources 1-4/Oncehub_Doxy Report (in use) (5).xlsx"
git commit -m "Update data - $(date +%F)"
git push
```

Wait 30 seconds, then visit: https://doxy-oncehub-reports.vercel.app

---

## Detailed Steps

### Step 1: Edit Your Excel File

1. Open `Spreadsheets\Data Sources 1-4\Oncehub_Doxy Report (in use) (5).xlsx`
2. Update any data in any of the 9 sheets:
   - Doxy Visits
   - Oncehub Report - Visit Type Dat
   - Oncehub Report - Number of Visi
   - Oncehub - Program Grouped
   - Gusto Hours 
   - Doxy - Over 20 minutes
   - Oncehub Pivot Program
   - Program Grouped
   - Program Pivot
3. **Save the file** (same name, same location)

### Step 2: Generate JSON

Open terminal/command prompt in your project folder:

```bash
cd "C:\Users\danie\OneDrive\Desktop\Cursor Projects\Doxy and Oncehub Reports Display"
python read_excel.py
```

You should see output like:
```
Sheet names: ['Doxy Visits', 'Oncehub Report - Visit Type Dat', ...]
...
Data exported to data.json
```

### Step 3: Commit and Deploy

```bash
# Add files
git add data.json "Spreadsheets/Data Sources 1-4/Oncehub_Doxy Report (in use) (5).xlsx"

# Commit with message
git commit -m "Update dashboard data for week of [DATE]"

# Push to GitHub (triggers Vercel deployment)
git push
```

### Step 4: Verify

1. Wait 30-60 seconds for Vercel to deploy
2. Visit: https://doxy-oncehub-reports.vercel.app
3. Hard refresh: `Ctrl+F5` (Windows) or `Cmd+Shift+R` (Mac)
4. Check that your new data appears

---

## Automation Scripts

### Windows (update_data.bat)

Create a file named `update_data.bat`:

```batch
@echo off
echo Converting Excel to JSON...
python read_excel.py

echo.
echo Committing changes...
git add data.json "Spreadsheets/Data Sources 1-4/Oncehub_Doxy Report (in use) (5).xlsx"
git commit -m "Update data - %date%"

echo.
echo Pushing to GitHub...
git push

echo.
echo Done! Deploying to Vercel...
echo Visit: https://doxy-oncehub-reports.vercel.app
pause
```

**Usage:** Double-click `update_data.bat`

### Mac/Linux (update_data.sh)

Create a file named `update_data.sh`:

```bash
#!/bin/bash
echo "Converting Excel to JSON..."
python read_excel.py

echo ""
echo "Committing changes..."
git add data.json "Spreadsheets/Data Sources 1-4/Oncehub_Doxy Report (in use) (5).xlsx"
git commit -m "Update data - $(date +%Y-%m-%d)"

echo ""
echo "Pushing to GitHub..."
git push

echo ""
echo "Done! Deploying to Vercel..."
echo "Visit: https://doxy-oncehub-reports.vercel.app"
```

Make executable and run:
```bash
chmod +x update_data.sh
./update_data.sh
```

---

## Troubleshooting

### "python: command not found"
- **Windows:** Use `python` or `py`
- **Mac:** May need `python3`
- Install Python from: https://www.python.org/downloads/

### "No module named 'pandas'"
Install required packages:
```bash
pip install pandas openpyxl
```

### "Permission denied" or "Access is denied"
- Make sure Excel file is closed
- Close any programs using the file
- Check file permissions

### Data not updating on website
1. Check Vercel deployment status: https://vercel.com/daniel-8982s-projects/doxy-oncehub-reports
2. Hard refresh browser: `Ctrl+F5` or `Cmd+Shift+R`
3. Clear browser cache
4. Check browser console for errors (F12)

### Git push fails
```bash
# Pull latest changes first
git pull

# Then try push again
git push
```

---

## Important Notes

✅ **DO:**
- Save Excel file before running `read_excel.py`
- Check data.json was updated (file size/date)
- Test locally before deploying if making big changes
- Commit both Excel and JSON files together

❌ **DON'T:**
- Edit `data.json` manually (always regenerate from Excel)
- Change Excel sheet names without updating HTML tabs
- Delete data.json (always regenerate if lost)
- Skip the git push step (data won't update online)

---

## Quick Reference

| Action | Command |
|--------|---------|
| Convert Excel | `python read_excel.py` |
| Check status | `git status` |
| Add files | `git add data.json "Spreadsheets/Data Sources 1-4/Oncehub_Doxy Report (in use) (5).xlsx"` |
| Commit | `git commit -m "Update data"` |
| Deploy | `git push` |
| View site | https://doxy-oncehub-reports.vercel.app |

---

## Need Help?

- **Troubleshooting:** See [TROUBLESHOOTING.md](TROUBLESHOOTING.md)
- **Data Source Info:** See [DATA_SOURCE.md](DATA_SOURCE.md)
- **All Features:** See [README.md](README.md)
- **Vercel Dashboard:** https://vercel.com/daniel-8982s-projects/doxy-oncehub-reports

---

**Last Updated:** January 4, 2026  
**Version:** 2.1.0 - Updated to use Oncehub_Doxy Report (in use) (5)

