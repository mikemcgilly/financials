// Load company data from localStorage
function loadCompanyData() {
    const companyDataStr = localStorage.getItem('selectedCompany');
    if (!companyDataStr) {
        // Redirect back to portfolio if no company selected
        window.location.href = 'index.html';
        return null;
    }
    return JSON.parse(companyDataStr);
}

// Base URL for large data assets (served from R2)
const DATA_BASE = 'https://data.mikemcgilly.com';

// Load cached stock prices from a local JSON file (static snapshot)
// Using a snapshot avoids CORS issues you'd hit trying to call Yahoo Finance directly from the browser.
async function loadStockPriceSnapshot() {
    const possiblePaths = [
        `${DATA_BASE}/stock_prices.json`,
        './data/stock_prices.json',
        '/data/stock_prices.json',
        'data/stock_prices.json'
    ];

    let lastError = null;
    for (const path of possiblePaths) {
        try {
            const response = await fetch(path, { cache: 'no-store' });
            if (response.ok) {
                return await response.json();
            }
        } catch (err) {
            lastError = err;
        }
    }
    console.log('Could not load stock price snapshot:', lastError?.message || 'Unknown error');
    return null;
}

function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
}

// Try to fetch a live quote via Cloudflare Pages Function (/api/quote).
// Falls back gracefully if the endpoint is not deployed or rate-limited.
async function loadLiveQuote(symbol) {
    const paths = [
        `./api/quote?symbol=${encodeURIComponent(symbol)}`,
        `/api/quote?symbol=${encodeURIComponent(symbol)}`
    ];

    for (const p of paths) {
        try {
            const resp = await fetch(p, { cache: "no-store" });
            if (!resp.ok) continue;
            const q = await resp.json();
            // Expected: { symbol, price, marketCap, peRatio }
            if (q && (q.price != null || q.marketCap != null || q.peRatio != null)) {
                return q;
            }
        } catch (_) {
            // ignore and try next path
        }
    }
    return null;
}

// Parse periods like "Q3 2024" into sortable components
function parseQuarterPeriod(period) {
  const m = String(period).trim().match(/^Q([1-4])\s+(\d{4})$/i);
  if (!m) return { year: 0, quarter: 0 };
  return { quarter: Number(m[1]), year: Number(m[2]) };
}

// Format market cap for display
function formatMarketCap(marketCap) {
    if (marketCap >= 1e12) return `$${(marketCap / 1e12).toFixed(2)}T`;
    if (marketCap >= 1e9) return `$${(marketCap / 1e9).toFixed(2)}B`;
    if (marketCap >= 1e6) return `$${(marketCap / 1e6).toFixed(2)}M`;
    return `$${marketCap.toLocaleString()}`;
}

// Create separate EBITDA charts for annual and quarterly data
function createEbitdaChart(companyData) {
    createAnnualChart(companyData);
    createQuarterlyChart(companyData);
    createStockPriceChart(companyData.symbol);
}

function createAnnualChart(companyData) {
    const ctx = document.getElementById('ebitdaChart').getContext('2d');
    
    const annualData = (companyData.annual_data || [])
        .sort((a, b) => a.period.localeCompare(b.period))
        .map(item => ({
            period: item.period,
            ebitda: item.ebitda / 1e6
        }));
    
    const labels = annualData.map(item => item.period);
    const ebitdaValues = annualData.map(item => item.ebitda);
    
    // Calculate 2-period moving average
    const movingAvg = [];
    for (let i = 0; i < ebitdaValues.length; i++) {
        if (i === 0) {
            movingAvg.push(null);
        } else {
            movingAvg.push((ebitdaValues[i-1] + ebitdaValues[i]) / 2);
        }
    }
    
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Annual EBITDA (Millions)',
                    data: ebitdaValues,
                    backgroundColor: '#0066cc',
                    borderColor: '#0066cc',
                    borderWidth: 1,
                    order: 2
                },
                {
                    label: '2-Period Moving Average',
                    data: movingAvg,
                    type: 'line',
                    borderColor: '#ff8800',
                    backgroundColor: 'transparent',
                    borderWidth: 3,
                    pointRadius: 5,
                    pointBackgroundColor: '#ff8800',
                    order: 1
                }
            ]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    display: true,
                    labels: {
                        color: '#ffffff',
                        font: {
                            family: 'Courier New',
                            size: 11
                        }
                    }
                },
                tooltip: {
                    backgroundColor: '#1a1a1a',
                    titleColor: '#ffffff',
                    bodyColor: '#cccccc',
                    borderColor: '#333333',
                    borderWidth: 1,
                    callbacks: {
                        label: function(context) {
                            const label = context.dataset.label || '';
                            const value = context.parsed.y;
                            if (value !== null) {
                                return `${label}: $${value.toFixed(2)}M`;
                            }
                            return '';
                        }
                    }
                }
            },
            scales: {
                x: {
                    ticks: {
                        color: '#cccccc',
                        font: {
                            family: 'Courier New',
                            size: 10
                        }
                    },
                    grid: {
                        color: '#333333'
                    }
                },
                y: {
                    beginAtZero: false,
                    ticks: {
                        color: '#cccccc',
                        font: {
                            family: 'Courier New',
                            size: 10
                        }
                    },
                    grid: {
                        color: '#333333'
                    },
                    title: {
                        display: true,
                        text: 'Annual EBITDA (Millions USD)',
                        color: '#ffffff',
                        font: {
                            family: 'Courier New',
                            size: 11
                        }
                    }
                }
            }
        }
    });
}

function createQuarterlyChart(companyData) {
    const ctx = document.getElementById('quarterlyChart').getContext('2d');
    
    const quarterlyData = (companyData.quarterly_data || [])
        .sort((a, b) => {
            const pa = parseQuarterPeriod(a.period);
            const pb = parseQuarterPeriod(b.period);
            if (pa.year !== pb.year) return pa.year - pb.year;      // older -> newer
            return pa.quarter - pb.quarter;                         // Q1 -> Q4
            })

        .map(item => ({
            period: item.period,
            ebitda: item.ebitda / 1e6
        }));
    
    const labels = quarterlyData.map(item => item.period);
    const ebitdaValues = quarterlyData.map(item => item.ebitda);
    
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Quarterly EBITDA (Millions)',
                data: ebitdaValues,
                borderColor: '#00cc66',
                backgroundColor: 'rgba(0, 204, 102, 0.1)',
                tension: 0.1,
                fill: true,
                pointRadius: 3,
                pointHoverRadius: 5
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    backgroundColor: '#1a1a1a',
                    titleColor: '#ffffff',
                    bodyColor: '#cccccc',
                    borderColor: '#333333',
                    borderWidth: 1
                }
            },
            scales: {
                x: {
                    ticks: {
                        color: '#cccccc',
                        font: {
                            family: 'Courier New',
                            size: 10
                        }
                    },
                    grid: {
                        color: '#333333'
                    }
                },
                y: {
                    beginAtZero: false,
                    ticks: {
                        color: '#cccccc',
                        font: {
                            family: 'Courier New',
                            size: 10
                        }
                    },
                    grid: {
                        color: '#333333'
                    },
                    title: {
                        display: true,
                        text: 'Quarterly EBITDA (Millions USD)',
                        color: '#ffffff',
                        font: {
                            family: 'Courier New',
                            size: 11
                        }
                    }
                }
            }
        }
    });
}

// Create stock price chart with candlestick data (last 252 trading days)
async function createStockPriceChart(symbol) {
    console.log(`[DEBUG] Creating stock chart for ${symbol}`);
    const ctx = document.getElementById('stockChart').getContext('2d');
    
    try {
        const ohlcData = await loadOHLCData(symbol);
        console.log(`[DEBUG] Received OHLC data:`, ohlcData?.length || 0, 'days');
        
        if (!ohlcData || !ohlcData.length) {
            console.log(`[DEBUG] No data available, showing unavailable message`);
            ctx.canvas.parentElement.innerHTML = '<p style="color: #cccccc; text-align: center; padding: 20px;">Stock price data unavailable</p>';
            return;
        }
        
        // Get last 252 trading days
        const last252 = ohlcData.slice(-252);
        console.log(`[DEBUG] Using last ${last252.length} trading days`);
        
        const labels = last252.map(item => item.date);
        const closePrices = last252.map(item => item.close);
        const ma252 = last252.map(item => item.ma252);
        const upper1 = last252.map(item => item.upper1);
        const lower1 = last252.map(item => item.lower1);
        const upper2 = last252.map(item => item.upper2);
        const lower2 = last252.map(item => item.lower2);
        const upper3 = last252.map(item => item.upper3);
        const lower3 = last252.map(item => item.lower3);
        
        new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: '+3σ',
                        data: upper3,
                        borderColor: 'rgba(255, 0, 0, 0.5)',
                        backgroundColor: 'rgba(255, 0, 0, 0.15)',
                        borderWidth: 1,
                        borderDash: [5, 5],
                        fill: '+1',
                        pointRadius: 0
                    },
                    {
                        label: '+2σ',
                        data: upper2,
                        borderColor: 'rgba(255, 100, 0, 0.6)',
                        borderWidth: 1,
                        borderDash: [3, 3],
                        fill: false,
                        pointRadius: 0
                    },
                    {
                        label: '+1σ',
                        data: upper1,
                        borderColor: 'rgba(255, 200, 0, 0.7)',
                        backgroundColor: 'rgba(255, 165, 0, 0.2)',
                        borderWidth: 1,
                        fill: '+1',
                        pointRadius: 0
                    },
                    {
                        label: '252-Day MA',
                        data: ma252,
                        borderColor: '#ffffff',
                        borderWidth: 2,
                        fill: false,
                        pointRadius: 0
                    },
                    {
                        label: '-1σ',
                        data: lower1,
                        borderColor: 'rgba(255, 200, 0, 0.7)',
                        backgroundColor: 'rgba(255, 165, 0, 0.2)',
                        borderWidth: 1,
                        fill: '-1',
                        pointRadius: 0
                    },
                    {
                        label: '-2σ',
                        data: lower2,
                        borderColor: 'rgba(255, 100, 0, 0.6)',
                        borderWidth: 1,
                        borderDash: [3, 3],
                        fill: false,
                        pointRadius: 0
                    },
                    {
                        label: '-3σ',
                        data: lower3,
                        borderColor: 'rgba(255, 0, 0, 0.5)',
                        backgroundColor: 'rgba(0, 255, 0, 0.15)',
                        borderWidth: 1,
                        borderDash: [5, 5],
                        fill: '-1',
                        pointRadius: 0
                    },
                    {
                        label: 'Stock Price',
                        data: closePrices,
                        borderColor: '#ff6b35',
                        borderWidth: 2,
                        fill: false,
                        pointRadius: 0,
                        pointHoverRadius: 4
                    }
                ]
            },
            options: {
                responsive: true,
                interaction: {
                    mode: 'index',
                    intersect: false
                },
                plugins: {
                    legend: {
                        display: true,
                        labels: {
                            color: '#cccccc',
                            font: {
                                family: 'Courier New',
                                size: 10
                            }
                        }
                    },
                    tooltip: {
                        backgroundColor: '#1a1a1a',
                        titleColor: '#ffffff',
                        bodyColor: '#cccccc',
                        borderColor: '#333333',
                        borderWidth: 1,
                        callbacks: {
                            label: function(context) {
                                const idx = context.dataIndex;
                                const data = last252[idx];
                                return [
                                    `Close: $${data.close}`,
                                    `Open: $${data.open}`,
                                    `High: $${data.high}`,
                                    `Low: $${data.low}`,
                                    `Volume: ${(data.volume / 1e6).toFixed(2)}M`
                                ];
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        ticks: {
                            color: '#cccccc',
                            font: {
                                family: 'Courier New',
                                size: 10
                            },
                            maxTicksLimit: 10
                        },
                        grid: {
                            color: '#333333'
                        }
                    },
                    y: {
                        ticks: {
                            color: '#cccccc',
                            font: {
                                family: 'Courier New',
                                size: 10
                            }
                        },
                        grid: {
                            color: '#333333'
                        },
                        title: {
                            display: true,
                            text: 'Stock Price (USD) - Last 252 Trading Days',
                            color: '#ffffff',
                            font: {
                                family: 'Courier New',
                                size: 11
                            }
                        }
                    }
                }
            }
        });
        
        console.log(`[DEBUG] Stock chart created successfully`);
    } catch (error) {
        console.log('[DEBUG] Stock chart error:', error);
        ctx.canvas.parentElement.innerHTML = '<p style="color: #cccccc; text-align: center; padding: 20px;">Stock price chart unavailable</p>';
    }
}

// Load OHLC data from local file
async function loadOHLCData(symbol) {
    console.log(`[DEBUG] Loading OHLC data for ${symbol}`);
    
    const paths = [
        `${DATA_BASE}/stock_ohlc.json`,
        './data/stock_ohlc.json',
        '/data/stock_ohlc.json',
        'data/stock_ohlc.json'
    ];

    for (const path of paths) {
        try {
            console.log(`[DEBUG] Trying path: ${path}`);
            const resp = await fetch(path, { cache: "no-store" });
            console.log(`[DEBUG] Response status: ${resp.status}`);
            
            if (!resp.ok) continue;
            
            const allData = await resp.json();
            console.log(`[DEBUG] Loaded OHLC data for ${Object.keys(allData).length} symbols`);
            // return allData[symbol] || [];
            const sym = String(symbol).trim().toUpperCase();

            // Direct hit
            let series = allData[sym];

            // Fallback: keys may contain hidden whitespace/newlines
            if (!series) {
            const matchKey = Object.keys(allData).find(k => k.trim().toUpperCase() === sym);
            if (matchKey) series = allData[matchKey];
            }

            return Array.isArray(series) ? series : [];

        } catch (error) {
            console.log(`[DEBUG] Path ${path} threw error:`, error.message);
        }
    }
    
    console.log(`[DEBUG] All paths failed, returning empty array`);
    return [];
}

// Populate data tables
function populateDataTables(companyData) {
    // Annual data table
    const annualTableBody = document.querySelector('#annual-data tbody');
    (companyData.annual_data || []).forEach(item => {
        const row = annualTableBody.insertRow();
        row.innerHTML = `
            <td>${item.period}</td>
            <td>$${(item.operating_income / 1e6).toFixed(2)}M</td>
            <td>$${(item.depreciation / 1e6).toFixed(2)}M</td>
            <td>$${(item.ebitda / 1e6).toFixed(2)}M</td>
        `;
    });
    
    // Quarterly data table - removed annualized column
    const quarterlyTableBody = document.querySelector('#quarterly-data tbody');
    (companyData.quarterly_data || []).forEach(item => {
        const row = quarterlyTableBody.insertRow();
        row.innerHTML = `
            <td>${item.period}</td>
            <td>$${(item.operating_income / 1e6).toFixed(2)}M</td>
            <td>$${(item.depreciation / 1e6).toFixed(2)}M</td>
            <td>$${(item.ebitda / 1e6).toFixed(2)}M</td>
        `;
    });
}

// Initialize page
document.addEventListener('DOMContentLoaded', async function() {
    const companyData = loadCompanyData();
    
    if (!companyData) {
        return; // Will redirect to index
    }
    
    // Update page title and header
    document.getElementById('page-title').textContent = `${companyData.company_name} - Financial Analysis`;
    document.getElementById('company-header').textContent = `${companyData.company_name} (${companyData.symbol})`;
    
    // Create charts
    createEbitdaChart(companyData);
    
    // Populate tables
    populateDataTables(companyData);


    // Stock quote rendering
    // 1) Try live Yahoo quote via Cloudflare Pages Function (/api/quote)
    // 2) Fall back to the cached snapshot in /data/stock_prices.json
    // try {
    //     const live = await loadLiveQuote(companyData.symbol);
    //     if (live) {
    //         setText('current-price', live.price != null ? `$${Number(live.price).toFixed(2)}` : 'Data not available');
    //         setText('market-cap', live.marketCap != null ? formatMarketCap(Number(live.marketCap)) : 'Data not available');
    //         setText('pe-ratio', live.peRatio != null && Number(live.peRatio) !== 0 ? Number(live.peRatio).toFixed(2) : 'Data not available');
    //     } else {
    //         const snapshot = await loadStockPriceSnapshot();
    //         const q = snapshot ? snapshot[companyData.symbol] : null;

    //         setText('current-price', q?.current_price != null ? `$${Number(q.current_price).toFixed(2)}` : 'Data not available');
    //         setText('market-cap', q?.market_cap != null ? formatMarketCap(Number(q.market_cap)) : 'Data not available');
    //         setText('pe-ratio', q?.pe_ratio != null && Number(q.pe_ratio) !== 0 ? Number(q.pe_ratio).toFixed(2) : 'Data not available');
    //     }
    // } catch (e) {
    //     console.log('Quote render failed:', e?.message || e);
    //     setText('current-price', 'Data not available');
    //     setText('market-cap', 'Data not available');
    //     setText('pe-ratio', 'Data not available');
    // }
});
