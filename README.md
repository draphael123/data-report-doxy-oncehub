# Doxy & OnceHub Reports Dashboard

An interactive web dashboard for viewing and analyzing Doxy and OnceHub reports.

## 🔗 Links

- **Live Dashboard:** https://doxy-oncehub-reports.vercel.app ⚡
- **GitHub Repository:** https://github.com/draphael123/data-report-doxy-oncehub

## Features

✨ **Interactive Tabs** - Switch between 9 different report views
📊 **Week-over-Week Analytics** - Automatic performance tracking and insights
🔍 **Real-time Search** - Search across all columns instantly
📈 **Top Performers Tracking** - See rankings and leaders in each category
↕️ **Sortable Columns** - Click any column header to sort
🎨 **Modern Design** - Beautiful, responsive UI that works on all devices
📱 **Mobile Friendly** - Fully responsive design
⚡ **Fast Performance** - Smooth interactions with large datasets

## Tabs Available

1. **Doxy Visits** - Provider visit statistics
2. **Visit Type Data** - OnceHub visit type breakdown
3. **Number of Visits** - Visit count reports
4. **Program Grouped** - Grouped program data
5. **Gusto Hours** - Hours tracking
6. **Doxy 20+ Minutes** - Visits over 20 minutes
7. **OnceHub Pivot** - Pivoted OnceHub data
8. **Program Details** - Detailed program information
9. **Program Pivot** - Program pivot tables

## How to Use

### Option 1: Open Directly
Simply double-click `index.html` to open in your default browser.

### Option 2: Use a Local Server
For better performance, run a local server:

```bash
# Using Python 3
python -m http.server 8000

# Then open: http://localhost:8000
```

## Analytics Dashboard

Each tab now includes automatic week-over-week analytics:
- 📊 **Performance Metrics** - Total visits, hours, and activity tracking
- 📈 **Trend Analysis** - Week-over-week changes with percentage indicators
- 🏆 **Top Performers** - Ranked lists of highest performers
- 📉 **Comparative Data** - Previous week comparisons
- 🎯 **Key Insights** - Average calculations and distributions

See [ANALYTICS.md](ANALYTICS.md) for detailed documentation on all analytics features.

## Features Guide

### Searching
- Type in the search box to filter data across all columns
- Search is case-insensitive
- Results update in real-time

### Sorting
- Click any column header to sort by that column
- Click again to reverse the sort direction
- Arrows indicate current sort direction (↑ ascending, ↓ descending)

### Navigation
- Click any tab to switch between different reports
- The active tab is highlighted in blue
- Row count updates automatically

## Updating Data

To update the dashboard with new Excel data:

1. Replace `Oncehub_Doxy Report (in use) (3).xlsx` with your new file
2. Run: `python read_excel.py`
3. Refresh the webpage

## Files

- `index.html` - Main HTML structure
- `styles.css` - Styling and design
- `script.js` - Interactive functionality
- `data.json` - Data extracted from Excel
- `read_excel.py` - Python script to convert Excel to JSON

## Requirements

- Modern web browser (Chrome, Firefox, Safari, Edge)
- For data updates: Python 3 with pandas library

## Browser Support

✅ Chrome (recommended)
✅ Firefox
✅ Safari
✅ Edge
✅ Mobile browsers

---

Created with ❤️ for efficient report viewing

