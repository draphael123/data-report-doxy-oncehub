# 📈 Trend Analysis Features

## Overview

The dashboard now focuses on **week-over-week trends** to help you identify performance changes and patterns in provider visits.

---

## 🎯 Key Trend Features

### 1. **Trend Summary**
At the top of each analytics section, you'll see:
- **X providers trending ↑ up** - Number of providers with increased visits
- **Y providers trending ↓ down** - Number of providers with decreased visits  
- **Z unchanged** - Providers with same visit count

### 2. **Week-over-Week Comparison**
Every metric shows:
- **Current week value**
- **Change from previous week** (absolute number)
- **Percentage change**
- **Visual indicators** (↑ for increase, ↓ for decrease)

### 3. **Top 5 Performers (with Trends)**
Shows current week's top performers with:
- Current week visit count
- Change from previous week
- Percentage change
- Color coding: Green ↑ for gains, Red ↓ for declines

### 4. **Biggest Increases Week-over-Week** 📈
New section showing:
- Providers with largest absolute increases
- How many more visits they had
- Percentage improvement
- Ranked by size of increase

### 5. **Biggest Decreases Week-over-Week** 📉
New section showing:
- Providers with largest absolute decreases
- How many fewer visits they had
- Percentage decline
- Ranked by size of decrease

---

## 🎨 Visual Indicators

### Colors
- **Green** ↑ = Improvement / Increase
- **Red** ↓ = Decline / Decrease
- **Gray** = No change

### Arrows
- **↑** = Trending up
- **↓** = Trending down

### Percentages
- Always shown with trend indicators
- Calculated as: `(Current - Previous) / Previous × 100`

---

## 📊 Example Display

```
📊 Doxy Visits Analysis - Week over Week Trends
15 providers trending ↑ up | 8 trending ↓ down | 2 unchanged

Total Visits (Latest Week): 1,234
↑ 156 visits (14.5%) vs last week

🏆 Top 5 Performers (Current Week)
#1  Ashley Escoe        76  ↑ 7 (+10.1%)
#2  Alexis Foster       65  ↓ 11 (-14.5%)
#3  Ashley Grout        44  ↑ 9 (+25.7%)
#4  Bill Carbonneau     41  ↑ 30 (+272.7%)
#5  Bryana Anderson     33  ↑ 21 (+175.0%)

📈 Biggest Increases Week-over-Week
#1  Bill Carbonneau     41  ↑ 30 (+272.7%)
#2  Bryana Anderson     33  ↑ 21 (+175.0%)
#3  Ashley Grout        44  ↑ 9 (+25.7%)

📉 Biggest Decreases Week-over-Week
#1  Alexis Foster       65  ↓ 11 (-14.5%)
```

---

## 🔍 How to Use This Data

### Identify High Performers
- Look at **Top 5 Performers** for current leaders
- Check their trends - are they maintaining or improving?

### Spot Improvement Opportunities
- Review **Biggest Decreases** section
- Investigate why these providers' visits declined
- Provide support or training if needed

### Celebrate Wins
- Highlight providers in **Biggest Increases**
- Share success stories
- Learn what's working well

### Track Overall Health
- Monitor the trend summary at the top
- Ideal: More providers trending up than down
- Concern: Many providers trending down = need action

---

## 📈 Actionable Insights

### Week-over-Week Analysis Workflow

**Step 1: Check Overall Trend**
- Are total visits up or down?
- What's the percentage change?

**Step 2: Review Top Performers**
- Are your best providers maintaining their performance?
- Are top performers trending up (good) or down (concern)?

**Step 3: Identify Declining Providers**
- Who's in the "Biggest Decreases" section?
- Is it a one-time dip or pattern?
- Schedule check-ins with declining providers

**Step 4: Learn from Winners**
- Who's in the "Biggest Increases" section?
- What are they doing differently?
- Can it be replicated?

**Step 5: Take Action**
- Support struggling providers
- Recognize improving providers
- Adjust scheduling or resources

---

## 🎯 Key Metrics to Watch

### Red Flags 🚩
- **Total visits declining** week-over-week
- **More providers trending down** than up
- **Top performers showing declines**
- **Consistent decreases** in same providers

### Green Flags ✅
- **Total visits increasing** week-over-week
- **More providers trending up** than down
- **New providers appearing** in top performers
- **Consistent improvement** in multiple providers

---

## 💡 Tips for Best Results

### 1. **Weekly Review Cadence**
- Check trends every Monday
- Compare to previous week
- Note any significant changes

### 2. **Context Matters**
- Consider holidays, seasons
- Account for provider schedules (vacations, part-time)
- Compare to same week last month/year

### 3. **Combine with Other Data**
- Cross-reference with hours worked (Gusto Hours tab)
- Check visit duration (Doxy 20+ Minutes tab)
- Review by program type (Program tabs)

### 4. **Set Baselines**
- Know your average visits per provider
- Understand typical week-over-week variation
- Flag changes beyond normal range

---

## 🔄 Data Updates

Trends automatically recalculate when you:
- Switch tabs
- Load new data
- Filter providers

**To update with new weekly data:**
1. Update your Excel file
2. Run `python read_excel.py`
3. Commit and push to deploy
4. New trends appear immediately

---

## 📱 Mobile Viewing

Trend indicators are:
- Fully responsive
- Easy to read on mobile
- Touch-friendly
- Optimized for quick scanning

---

## 🎓 Understanding the Calculations

### Absolute Change
```
Change = Current Week - Previous Week
Example: 76 - 69 = +7 visits
```

### Percentage Change
```
% Change = (Change / Previous Week) × 100
Example: (7 / 69) × 100 = +10.1%
```

### Sorting
- **Top Performers**: Sorted by current week (highest first)
- **Biggest Increases**: Sorted by absolute change (largest gain first)
- **Biggest Decreases**: Sorted by absolute change (largest loss first)

---

## ✅ Additional Improvements

### Text Styling
- ✅ **White text** for performer values (better contrast)
- ✅ **Color-coded trends** (green for up, red for down)
- ✅ **Bold percentages** for emphasis

### Data Filtering
- ✅ **"Total" rows removed** from all displays
- ✅ **Clean provider lists** without aggregate rows
- ✅ **Valid data only** (no null/undefined rows)

---

## 🚀 Future Enhancements

Potential additions:
- [ ] Multi-week trend sparklines
- [ ] Historical trend charts
- [ ] Predictive analytics
- [ ] Automated alerts for significant changes
- [ ] Provider performance scores
- [ ] Trend export to PDF/Excel

---

## 📞 Questions?

For detailed usage:
- **Main docs**: [README.md](README.md)
- **Analytics guide**: [ANALYTICS.md](ANALYTICS.md)
- **Data updates**: [UPDATE_DATA.md](UPDATE_DATA.md)

---

**Version:** 2.1.0  
**Last Updated:** January 4, 2026  
**Status:** ✅ Live on Vercel

