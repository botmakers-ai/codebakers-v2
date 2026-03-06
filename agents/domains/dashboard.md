# Domain: Analytics Dashboard
# CodeBakers V4 | agents/domains/dashboard.md

**App Type:** Analytics Dashboard / Business Intelligence / Metrics Dashboard

**Auto-loaded when:** project-profile.md contains `domain: dashboard` or `domain: analytics`

---

## Domain-Specific Expectations

### Core Components

**Key Performance Indicators (KPIs):**
```
┌───────────────┬───────────────┬───────────────┬───────────────┐
│ Total Revenue │ Active Users  │   Churn Rate  │   MRR Growth  │
│   $1.2M       │    5,432      │     2.3%      │    +15%       │
│   ↑ 8% MoM    │   ↑ 12% MoM   │   ↓ 0.5% MoM  │   ↑ 3% MoM    │
└───────────────┴───────────────┴───────────────┴───────────────┘
```

- Current value (large, prominent)
- Trend indicator (↑ green, ↓ red, → gray)
- Comparison to previous period (MoM, YoY, vs. target)
- Sparkline or mini-chart (optional)

**Time Series Charts:**
- Line charts for trends over time
- Bar charts for comparisons
- Area charts for cumulative metrics
- Default time range: Last 30 days
- Interactive: hover shows exact value + date
- Zoom: click-and-drag to focus on date range

**Breakdowns:**
- Pie charts for category distribution
- Stacked bars for segment comparison
- Tables for detailed drill-down
- Always show percentage + absolute value

---

### Data Patterns

**Aggregation Levels:**
```typescript
type TimeGranularity = 'hour' | 'day' | 'week' | 'month' | 'quarter' | 'year'

// Auto-select based on date range:
// 1-7 days → hourly or daily
// 8-90 days → daily or weekly
// 91-365 days → weekly or monthly
// 1+ years → monthly or quarterly
```

**Real-Time vs. Cached:**
- Critical metrics (revenue, active users): real-time (fetch every 30s)
- Historical trends: cached (refresh every 5 min)
- Large datasets: pre-aggregated (don't query millions of rows on dashboard load)

**Drill-Down Pattern:**
```
Revenue (total) → Revenue by product → Revenue by customer → Individual transactions
    ↓
Click on chart segment → filter entire dashboard to that segment
    ↓
Breadcrumb navigation: All > Product A > Customer X
    ↓
"Clear filters" returns to top level
```

---

### UX Patterns

**Loading States:**
```
┌───────────────┐
│ Loading...    │  ← Generic spinner (bad)
└───────────────┘

┌───────────────┐
│ ████████░░░░  │  ← Skeleton with approximate size (good)
│ ▓▓▓▓░░░░░░░░  │
└───────────────┘
```
- Show skeleton charts/numbers while loading
- Load critical KPIs first (above the fold)
- Lazy load charts below fold (as user scrolls)
- Never block entire dashboard on slow query

**Empty States:**
```
No data for selected period

Try:
• Selecting a different date range
• Checking if data source is connected
• Verifying filters aren't too restrictive
```

**Error States:**
```
Failed to load revenue data

• Check your connection
• Retry
• View cached data (last updated: 2 hours ago)
```

---

### Filter Patterns

**Global Filters (affect entire dashboard):**
- Date range picker (presets: Today, Last 7 days, Last 30 days, Last 90 days, Custom)
- Team/Department selector (if multi-team)
- Product/Category selector
- Region/Location (if applicable)

**Persistent Filters:**
- Save filter state in URL query params
- Shareable links preserve filters
- "Save as preset" for frequently used combinations

**Auto-Refresh:**
```typescript
// Refresh every 30s for real-time dashboards
const refreshInterval = 30000

// Stop refreshing if user is inactive (tab not focused)
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    clearInterval(refreshTimer)
  } else {
    startRefresh()
  }
})
```

---

### Performance Expectations

**Query Optimization:**
- Pre-aggregate data (daily rollups, not live sums)
- Use materialized views for complex calculations
- Cache results with TTL (5 min for trends, 30s for real-time)
- Limit drill-down depth (max 3-4 levels)

**Chart Rendering:**
- Limit data points: 100 max for line charts (downsample if more)
- Virtual scrolling for large tables (>100 rows)
- Lazy load charts below fold (IntersectionObserver)
- Use canvas for >500 data points (not SVG - performance)

**Data Transfer:**
- Send aggregated data, not raw rows (server-side aggregation)
- Compress responses (gzip)
- Paginate tables (50 rows per page)
- Incremental updates (only fetch changed data on refresh)

---

### Accessibility

**Screen Reader Announcements:**
```html
<div role="status" aria-live="polite">
  Revenue increased by 8% compared to last month. Current value: $1.2 million.
</div>
```

**Keyboard Navigation:**
- Tab through KPI cards
- Arrow keys to navigate chart segments
- Enter to drill down
- Escape to go back up

**Color Contrast:**
- Use more than color to indicate trends (↑↓ symbols + color)
- High contrast mode support
- Patterns in charts (not just colors for different series)

---

### Export Capabilities

**Standard Exports:**
- CSV: table data (filterable + full dataset)
- PDF: dashboard snapshot (with current filters in header)
- PNG: individual charts (for presentations)

**Scheduled Reports:**
- Email daily/weekly/monthly summary
- Attach CSV + PDF
- Only send if metrics meet threshold (e.g., "email if churn > 5%")

---

## CodeBakers Integration

**Auto-add to FLOWS.md when domain=dashboard:**
- View KPI summary (with trend indicators)
- View time series chart (with date range selector)
- Apply filters (date range, category, team)
- Drill down into metric (click chart segment)
- Export data (CSV, PDF)
- Refresh dashboard (manual + auto-refresh)

**Automatic decisions:**
- Charts use SSR-safe lazy loading (agents/patterns/ssr-safe-imports.md)
- Real-time metrics refresh every 30s, not on every render
- Date range defaults to Last 30 days
- Trend indicators show MoM comparison by default
- Large tables use pagination (50 rows/page)
- Export includes current filter state in filename

**Don't ask about:**
- "Should KPIs show trends?" (yes, always)
- "Should charts be interactive?" (yes, hover tooltips + drill-down)
- "Should there be a date range filter?" (yes, fundamental)
- "Should data auto-refresh?" (yes, for real-time dashboards)

**Do ask about:**
- Specific metrics to track (varies by business)
- Alert thresholds (when to notify user)
- Custom calculations (revenue recognition, churn definition)
- Data retention period (how far back to show history)

---

## Anti-Patterns

**❌ Fetching raw data on client-side**
→ Always aggregate on server, send summary only

**❌ No loading states**
→ Blank dashboard while loading looks broken

**❌ Real-time metrics that poll every second**
→ Unnecessary load, 30s refresh is sufficient

**❌ Charts that don't update when filters change**
→ Filters must apply to entire dashboard, not just tables

**❌ No empty state when date range has no data**
→ "0" vs. "No data for this period" are different meanings

**❌ Exporting chart as image requires screenshot**
→ Provide native export buttons

---

*CodeBakers V4 | Domain: Analytics Dashboard | agents/domains/dashboard.md*
