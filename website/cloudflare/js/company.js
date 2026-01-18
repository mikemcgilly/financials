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

// Load cached stock prices from a local JSON file (static snapshot)
// Using a snapshot avoids CORS issues you'd hit trying to call Yahoo Finance directly from the browser.
async function loadStockPriceSnapshot() {
    const possiblePaths = [
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
    
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Annual EBITDA (Millions)',
                data: ebitdaValues,
                backgroundColor: '#0066cc',
                borderColor: '#0066cc',
                borderWidth: 1
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
    const ctx = document.getElementById('stockChart').getContext('2d');
    
    const quarterlyData = (companyData.quarterly_data || [])
        .sort((a, b) => a.period.localeCompare(b.period))
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
    try {
        const live = await loadLiveQuote(companyData.symbol);
        if (live) {
            setText('current-price', live.price != null ? `$${Number(live.price).toFixed(2)}` : 'N/A');
            setText('market-cap', live.marketCap != null ? formatMarketCap(Number(live.marketCap)) : 'N/A');
            setText('pe-ratio', live.peRatio != null && Number(live.peRatio) !== 0 ? Number(live.peRatio).toFixed(2) : 'N/A');
        } else {
            const snapshot = await loadStockPriceSnapshot();
            const q = snapshot ? snapshot[companyData.symbol] : null;

            setText('current-price', q?.current_price != null ? `$${Number(q.current_price).toFixed(2)}` : 'N/A');
            setText('market-cap', q?.market_cap != null ? formatMarketCap(Number(q.market_cap)) : 'N/A');
            setText('pe-ratio', q?.pe_ratio != null && Number(q.pe_ratio) !== 0 ? Number(q.pe_ratio).toFixed(2) : 'N/A');
        }
    } catch (e) {
        console.log('Quote render failed:', e?.message || e);
        setText('current-price', 'N/A');
        setText('market-cap', 'N/A');
        setText('pe-ratio', 'N/A');
    }
});
