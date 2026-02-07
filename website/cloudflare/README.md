# EBITDA Portfolio Dashboard - Static Version

## Bloomberg Terminal-styled financial dashboard with 157 companies

### Features:
- **157 Companies** from S&P 500 top 30%, NASDAQ 100 top 30%, and all DOW stocks
- **Financial Companies Supported** - Banks, insurance, and other financial institutions
- **EBITDA Y/Y Trend Analysis** - 2-period moving average slope with filtering
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
    ├── portfolio_ebitda_data.json  # 157 companies with EBITDA data
    ├── stock_ohlc.json             # 2 years daily prices + valuation bands
    └── stock_prices.json           # Current prices and metrics
```

### Deployment to Cloudflare Pages:

1. **Upload the `cloudflare` folder contents** to Cloudflare Pages
2. **Set index.html as the root page**
3. **No build process required** - pure static HTML/CSS/JS

### Data Source:
- **SEC EDGAR API** - Official financial data from 10-K and 10-Q filings
- **Yahoo Finance API** - 2 years of daily stock prices with valuation bands
- **Pre-generated JSON** - 157 companies with complete EBITDA data
- **Index Classifications** - S&P 500, NASDAQ 100, DOW Industrial

### Limitations (Static Version):
- **No real-time stock prices** (data refreshed manually)
- **Company pages use localStorage** for navigation

### Data Updates:

**Step 1: Generate EBITDA Data** (from project root)
```bash
cd financials/website
python generate_portfolio_data.py
```
This fetches financial data from SEC EDGAR for all 157 companies.

**Step 2: Update Stock Prices** (from project root)
```bash
python update_stock_prices.py
```
This fetches 2 years of daily stock prices and calculates valuation bands.

**What Gets Updated:**
- `portfolio_ebitda_data.json` - EBITDA metrics, growth rates, MA slopes (~500KB)
- `stock_ohlc.json` - 2 years daily close prices with 252-day MA and std dev (~3-5MB)
- `stock_prices.json` - Current prices, market cap, P/E ratios (~15KB)

**Recommended Schedule:**
- Run after quarterly earnings season (Jan, Apr, Jul, Oct)
- Stock prices can be updated weekly if desired

### Browser Compatibility:
- Modern browsers with ES6+ support
- Chart.js for visualizations
- CSS Grid and Flexbox layouts