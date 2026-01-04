# 📋 Context & Tooltip Guide

This guide explains all the enhanced contextual information available throughout the dashboard. Hover over any element with a tooltip to see detailed explanations!

## 🎯 Summary Cards (Top of Page)

### Total Visits Card
**Hover to see:**
- Total visits for the current week
- Number of active providers included
- Average visits per provider
- Week-over-week comparison details

**Change Indicator shows:**
- Exact number of visit increase/decrease
- Percentage change from previous week
- Average per provider with change amount

### Top Performer Card
**Hover to see:**
- Provider name with highest visits
- Number of visits
- Percentage of total visits
- Performance multiple vs average (e.g., "2.5x the average")

### Active Programs Card
**Hover to see:**
- Number of unique programs with activity
- List of all program names
- Average visits per program

### Active Providers Card
**Hover to see:**
- Number of providers with recorded data
- Average visits per provider
- Total contribution
- Highest and lowest visit counts

## 📊 Monthly Overview Panel

### Monthly Total
**Hover to see:**
- Total across all providers for all weeks
- Week-by-week breakdown with specific values
- Data range (first week to last week)

### Weekly Average
**Hover to see:**
- Average visits per week
- Calculation method (total ÷ weeks)
- Highest week value
- Lowest week value
- Range (difference between highest and lowest)

### Trend Indicator
**Hover to see:**
- How trend is calculated (first half vs second half of weeks)
- First half average
- Second half average
- Whether performance is improving, declining, or stable

### Provider Average
**Hover to see:**
- Average visits per provider for entire month
- Calculation method (total ÷ providers)
- Weekly average per provider

### Monthly Projection
**Hover to see:**
- For partial months: How projection is calculated (current avg × 4 weeks)
- Current data: number of weeks and total visits
- Remaining weeks to reach projection
- For complete months: Total actual visits (not a projection)

## 📈 Week-by-Week Averages

### Each Week Card
**Hover to see:**
- Detailed breakdown for that specific week
- Average per provider calculation
- Highest provider performance
- Lowest provider performance
- Standard deviation (consistency measure)
- Week-over-week change analysis

## 📊 Analytics Cards

### Total Visits (Latest Week)
**Hover to see:**
- Week identifier
- Previous week total for comparison
- Exact change amount and percentage
- Number of active providers

### Average per Provider
**Hover to see:**
- Calculation method (total ÷ providers)
- Previous week average
- Change per provider (amount and percentage)

### Previous Week
**Hover to see:**
- Week identifier
- Total visits
- Average per provider
- Number of active providers

## 🏆 Top Performers Section

### Each Performer
**Hover to see:**
- Provider name
- Current week visits
- Previous week visits
- Week-over-week change (amount and percentage)
- Percentage of total visits
- Performance multiple vs average

## 📈 Biggest Increases Section

### Each Provider
**Hover to see:**
- Previous week visit count
- Current week visit count
- Improvement amount and percentage
- Total percentage increase

## 📉 Biggest Decreases Section

### Each Provider
**Hover to see:**
- Previous week visit count
- Current week visit count
- Decline amount and percentage
- Attention flag for significant drops

## 📋 Data Table Cells

### Week Column Cells (Numeric Values)
**Hover to see:**
- Provider name and week
- Number of visits
- Percentage of week total
- Performance vs week average
- Rank among all providers
- Week range (min to max)
- Week-over-week comparison (if available)

### Provider Name Cells
**Hover to see:**
- "Click to view detailed performance history and analytics"

### Zero Values (—)
**Hover to see:**
- "No activity this period"

### Empty Cells (—)
**Hover to see:**
- "No data available"

## 🎨 Visual Indicators

### Heat Map Colors
- **Dark Green**: Excellent performance (50+ visits)
- **Light Green**: Good performance (30-49 visits)
- **Yellow**: Average performance (15-29 visits)
- **Orange**: Low performance (1-14 visits)

### Trend Arrows
- **↑ Green**: Increase from previous week
- **↓ Red**: Decrease from previous week
- **→ Gray**: No change

### Anomaly Badges
- **🚀**: Large increase (celebration worthy)
- **⚠️**: Large drop (needs attention)
- **🔴**: Zero visits after previous activity (urgent attention)

### Progress Bars (under current week)
- **Green**: At or above goal (100%+)
- **Orange**: Close to goal (80-99%)
- **Red**: Below goal (<80%)

## 💡 Tips for Using Context

1. **Hover Anywhere**: Almost every number, card, and header has detailed tooltips
2. **Click Provider Names**: Opens detailed modal with full history
3. **Check Anomaly Badges**: Red and yellow flags highlight issues needing attention
4. **Compare Weeks**: Use the week-by-week cards to spot trends
5. **Read the Analytics**: The top sections provide quick insights without scrolling

## 🔍 Understanding Calculations

### Average per Provider
```
Total Visits ÷ Number of Active Providers = Average per Provider
```

### Week-over-Week Change
```
Current Week - Previous Week = Change
(Change ÷ Previous Week) × 100 = Change Percentage
```

### Trend Calculation
```
First Half Average = Average of first half of weeks
Second Half Average = Average of second half of weeks
Trend = (Second Half - First Half) ÷ First Half × 100
```

### Standard Deviation
Measures consistency/variability in performance across providers
- **Low**: Providers perform similarly
- **High**: Large spread in performance levels

### Rank
Position among all providers for that week
- Calculated by counting how many providers had higher values
- Rank 1 = Top performer

---

**Last Updated:** January 3, 2026

For more information, see the main [README.md](README.md) or [FEATURES_RELEASE.md](FEATURES_RELEASE.md)

