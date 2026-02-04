# EBITDA Portfolio Dashboard - Static Version

## Bloomberg Terminal-styled financial dashboard with 129 companies

### Features:
- **129 Companies** from S&P 500 top 30%, NASDAQ 100 top 30%, and all DOW stocks
- **Bloomberg Terminal Styling** - Dark theme with professional colors
- **Portfolio Filtering** - Filter by index (S&P 500, NASDAQ, DOW)
- **Search Functionality** - Search by symbol or company name
- **Individual Company Pages** - Detailed EBITDA analysis with charts
- **Quarterly Data Annualization** - Proper disclaimers and calculations
- **Responsive Design** - Works on desktop and mobile

### Files Structure:
```
cloudflare/
├── index.html              # Portfolio overview page
├── company.html            # Individual company detail page
├── css/
│   └── styles.css          # Bloomberg Terminal styling
├── js/
│   ├── portfolio.js        # Portfolio functionality
│   └── company.js          # Company page functionality
└── data/
    └── portfolio_ebitda_data.json  # 129 companies with EBITDA data
```

### Deployment to Cloudflare Pages:

1. **Upload the `cloudflare` folder contents** to Cloudflare Pages
2. **Set index.html as the root page**
3. **No build process required** - pure static HTML/CSS/JS

### Data Source:
- **SEC EDGAR API** - Official financial data
- **Pre-generated JSON** - 129 companies with complete EBITDA data
- **Index Classifications** - S&P 500, NASDAQ 100, DOW Industrial

### Limitations (Static Version):
- **No real-time stock prices** (would require API calls)
- **No data updates** (data is pre-generated)
- **Company pages use localStorage** for navigation

### Data Updates (Automatic Current Periods):

**Initial Setup:**
```bash
python generate_portfolio_data.py
```

**Regular Updates:**
```bash
python update_data.py              # Checks if update needed
# OR
update_portfolio_data.bat          # Windows batch file
```

**Automation:**
- Schedule `update_portfolio_data.bat` to run weekly
- Data automatically includes current quarter periods
- Only updates when data is >7 days old or missing current quarter

**Manual Force Update:**
```bash
python generate_portfolio_data.py  # Always generates fresh data
```

### Browser Compatibility:
- Modern browsers with ES6+ support
- Chart.js for visualizations
- CSS Grid and Flexbox layouts