# Analytics Features Documentation

## Overview

The dashboard now includes comprehensive week-over-week analytics for each section, providing actionable insights and performance tracking.

## 📊 Analytics Features

### 1. **Doxy Visits Analysis**
- **Total Visits Tracking**: Current week total with comparison to previous week
- **Week-over-Week Changes**: Percentage and absolute change indicators
- **Color-Coded Trends**: Green for increases, red for decreases
- **Average Metrics**: Per-provider average calculations
- **Top 5 Performers**: Ranked list of highest-performing providers

**Metrics Displayed:**
- Total visits for latest week
- Previous week comparison
- Percentage change (↑ or ↓)
- Average visits per provider
- Top 5 providers by visit count

---

### 2. **OnceHub Reports Analysis**
- **Total Count Summary**: Aggregate numbers across all records
- **Provider Tracking**: Number of unique providers
- **Distribution Metrics**: Average per provider calculations
- **Multi-week Overview**: When multiple weeks are available

**Metrics Displayed:**
- Total scheduled visits/appointments
- Number of active providers
- Average scheduling per provider
- Data completeness indicators

---

### 3. **Gusto Hours Analysis**
- **Total Hours Calculation**: Sum of all provider hours
- **Workload Distribution**: Average hours per provider
- **Top 5 by Hours**: Providers with most hours logged
- **Team Capacity Overview**: Total team availability

**Metrics Displayed:**
- Total hours worked (latest week)
- Average hours per provider
- Top 5 providers by hours
- Team size metrics

---

### 4. **Doxy Over 20 Minutes Analysis**
- **Quality Time Metrics**: Percentage of longer visits
- **Performance Comparison**: Highest vs. lowest rates
- **Average Calculations**: Mean percentage across providers
- **Quality Indicators**: Shows depth of patient engagement

**Metrics Displayed:**
- Average % of visits over 20 minutes
- Highest rate provider
- Lowest rate provider
- Provider count

---

### 5. **Program Analysis**
- **Program Distribution**: Breakdown by program type (HRT, TRT, etc.)
- **Visit Type Tracking**: Initial vs. Follow-up visits
- **Record Counts**: Total entries per category
- **Category Overview**: Summary of all tracked programs

**Metrics Displayed:**
- Total records
- Number of programs tracked
- Visit type breakdown
- Program names and counts

---

## 🎨 Visual Design

### Analytics Cards
Each metric is displayed in a dedicated card with:
- **Title**: Clear metric description
- **Large Value**: Prominent number display
- **Change Indicator**: Arrows and percentages
- **Context**: Supporting information

### Color Coding
- **Green Border**: Positive trends (increases)
- **Red Border**: Negative trends (decreases)
- **Blue Border**: Neutral/informational metrics

### Top Performers Section
- **Ranked Display**: #1-5 with ranks
- **Provider Names**: Clear identification
- **Values**: Specific numbers/hours
- **Visual Hierarchy**: Easy scanning

---

## 📈 How It Works

### Automatic Calculation
1. System identifies week columns in data
2. Calculates totals for each time period
3. Compares latest week to previous week
4. Generates percentage changes
5. Ranks providers by performance

### Real-Time Updates
- Analytics recalculate when switching tabs
- Search filtering preserves analytics
- Sorting doesn't affect analytics
- Data updates automatically on page load

### Responsive Design
- Desktop: 3-column grid layout
- Tablet: 2-column layout
- Mobile: Single column stacked

---

## 🔍 Insights Provided

### Performance Tracking
- **Trend Identification**: Spot increases or decreases
- **Provider Comparison**: See who's performing best
- **Team Metrics**: Understand overall capacity
- **Quality Indicators**: Track visit duration and depth

### Decision Support
- **Capacity Planning**: Based on hours and visit counts
- **Resource Allocation**: Identify high/low performers
- **Quality Assurance**: Monitor visit duration patterns
- **Program Balance**: Track program distribution

---

## 📱 User Interface

### Layout Structure
```
┌─────────────────────────────────────┐
│  Header & Navigation Tabs           │
├─────────────────────────────────────┤
│  Analytics Summary Box              │
│  (Context and description)          │
├─────────────────────────────────────┤
│  ┌──────┐ ┌──────┐ ┌──────┐        │
│  │Card 1│ │Card 2│ │Card 3│        │
│  └──────┘ └──────┘ └──────┘        │
├─────────────────────────────────────┤
│  Top Performers List                │
│  #1 Provider Name    [Value]        │
│  #2 Provider Name    [Value]        │
│  #3 Provider Name    [Value]        │
├─────────────────────────────────────┤
│  Search & Controls                  │
├─────────────────────────────────────┤
│  Data Table                         │
└─────────────────────────────────────┘
```

---

## 💡 Usage Tips

### Best Practices
1. **Review analytics first** before diving into detailed data
2. **Use color indicators** to quickly spot trends
3. **Check top performers** for benchmarking
4. **Compare week-over-week** to understand patterns
5. **Filter data** while maintaining analytics context

### Interpreting Results
- **Green arrows ↑**: Performance improvement
- **Red arrows ↓**: Performance decrease
- **Large percentages**: Significant changes worth investigating
- **Top 5 lists**: Benchmark targets for team

---

## 🔄 Data Updates

When you update the Excel file and regenerate data:
1. Analytics automatically recalculate
2. Week comparisons update to latest data
3. Top performers list refreshes
4. All percentages and totals update

No manual configuration needed!

---

## 🚀 Future Enhancements

Potential additions (not yet implemented):
- [ ] Historical trend charts
- [ ] Export analytics to PDF
- [ ] Custom date range selection
- [ ] Comparative analytics across tabs
- [ ] Alert thresholds for metrics
- [ ] Email reports

---

## 📊 Example Analytics Output

### Doxy Visits Tab
```
Total Visits (Latest Week): 1,234
↑ 156 visits (14.5%)

Previous Week Total: 1,078
Week of 12/21-12/28

Average Visits per Provider: 41.1
Based on 30 providers

Top 5 Performers:
#1 Ashley Escoe - 76
#2 Alexis Foster-Horton - 65
#3 Ashley Grout - 44
```

---

## Support

For questions or feature requests regarding analytics:
- Check the main [README.md](README.md)
- Review [DEPLOYMENT.md](DEPLOYMENT.md) for updates
- File an issue on GitHub

---

**Version**: 1.0.0  
**Last Updated**: January 3, 2026  
**Status**: ✅ Active and Deployed


