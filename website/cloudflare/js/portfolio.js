// Global variables
let currentFilter = 'ALL';
let currentValuationFilter = 'ALL';
let currentSlopeFilter = 'ALL';
let currentSearch = '';
let allCompanies = [];
let stockPrices = {};

// Base URL for large data assets (served from R2)
const DATA_BASE = 'https://data.mikemcgilly.com';

// Load cached stock prices from a local JSON file (static snapshot)
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
                console.log(`Loaded stock prices from ${path}`);
                return await response.json();
            }
        } catch (err) {
            lastError = err;
        }
    }

    console.log('Could not load stock price snapshot:', lastError?.message || 'Unknown error');
    return null;
}

// Load portfolio data from JSON
async function loadPortfolioData() {
    try {
        console.log('Attempting to load portfolio data...');
        // Try multiple path variations for different hosting environments
        const possiblePaths = [
            `${DATA_BASE}/portfolio_ebitda_data.json`,
            './data/portfolio_ebitda_data.json',
            '/data/portfolio_ebitda_data.json',
            'data/portfolio_ebitda_data.json'
        ];
        
        let data = null;
        let lastError = null;
        
        for (const path of possiblePaths) {
            try {
                console.log(`Trying path: ${path}`);
                const response = await fetch(path);
                
                if (response.ok) {
                    data = await response.json();
                    console.log(`Successfully loaded ${data.length} companies from ${path}`);
                    break;
                }
            } catch (error) {
                lastError = error;
                console.log(`Failed to load from ${path}:`, error.message);
            }
        }
        
        if (!data) {
            throw lastError || new Error('All paths failed');
        }
        
        return data;
    } catch (error) {
        console.error('Error loading portfolio data:', error);
        
        // Show user-friendly error message
        const portfolioGrid = document.getElementById('portfolio-grid');
        if (portfolioGrid) {
            portfolioGrid.innerHTML = `
                <div style="color: #ff6b6b; text-align: center; padding: 20px;">
                    <h3>Data Loading Error</h3>
                    <p>Unable to load portfolio data. Error: ${error.message}</p>
                    <p><em>Check the browser console for more details.</em></p>
                </div>
            `;
        }
        
        return [];
    }
}

// Filter and search functionality
function filterCompanies() {
    let filteredCompanies = allCompanies;
    
    // Apply index filter
    if (currentFilter !== 'ALL') {
        filteredCompanies = filteredCompanies.filter(company => 
            company.primary_index === currentFilter || 
            (company.indices && company.indices.includes(currentFilter))
        );
    }
    
    // Apply valuation filter
    if (currentValuationFilter !== 'ALL') {
        filteredCompanies = filteredCompanies.filter(company => 
            company.valuation_band === currentValuationFilter
        );
    }
    
    // Apply MA slope filter
    if (currentSlopeFilter !== 'ALL') {
        filteredCompanies = filteredCompanies.filter(company => {
            const slope = company.ma_slope;
            if (slope === null || slope === undefined) return false;
            
            switch(currentSlopeFilter) {
                case 'POSITIVE':
                    return slope > 0;
                case 'NEGATIVE':
                    return slope < 0;
                case 'STRONG_POSITIVE':
                    return slope > 1;
                case 'STRONG_NEGATIVE':
                    return slope < -1;
                default:
                    return true;
            }
        });
    }
    
    // Apply search filter
    if (currentSearch) {
        filteredCompanies = filteredCompanies.filter(company => 
            company.symbol.toLowerCase().includes(currentSearch.toLowerCase()) ||
            company.company_name.toLowerCase().includes(currentSearch.toLowerCase())
        );
    }
    
    displayCompanies(filteredCompanies);
    updateFilterCounts();
    return filteredCompanies;
}

function displayCompanies(companies) {
    const portfolioGrid = document.getElementById('portfolio-grid');
    portfolioGrid.innerHTML = '';
    
    companies.forEach(company => {
        const card = document.createElement('div');
        card.className = 'company-card';
        card.onclick = () => {
            localStorage.setItem('selectedCompany', JSON.stringify(company));
            window.location.href = 'company.html';
        };
        
        const growthDisplay = company.ebitda_growth ? 
            `<div class="metric">
                <span class="label">EBITDA Growth:</span>
                <span class="value ${company.ebitda_growth > 0 ? 'positive' : 'negative'}">${company.ebitda_growth.toFixed(1)}%</span>
            </div>` : '';
        
        const maSlopeDisplay = company.ma_slope !== null && company.ma_slope !== undefined ?
            `<div class="metric">
                <span class="label">EBITDA Y/Y Trend (Smoothed):</span>
                <span class="value ${company.ma_slope > 0 ? 'positive' : 'negative'}">${company.ma_slope.toFixed(2)}B</span>
            </div>` : '';
        
        const valuationDisplay = company.valuation_band ?
            `<div class="metric">
                <span class="label">Valuation:</span>
                <span class="badge ${company.valuation_band}">${company.valuation_band.replace('_', ' ')}</span>
            </div>` : '';
        
        const indexBadges = company.indices ? 
            company.indices.map(index => `<span class="index-badge">${index}</span>`).join('') : '';
        
        const priceDisplay = company.current_price ?
            `<div class="metric">
                <span class="label">Price:</span>
                <span class="value">$${company.current_price.toFixed(2)}</span>
            </div>` : '';
        
        card.innerHTML = `
            <h3>${company.company_name}</h3>
            <div class="symbol">${company.symbol}</div>
            <div class="index-badges">${indexBadges}</div>
            ${priceDisplay}
            <div class="metric">
                <span class="label">Latest EBITDA:</span>
                <span class="value">$${(company.latest_ebitda / 1000000).toFixed(2)}M</span>
            </div>
            ${growthDisplay}
            ${maSlopeDisplay}
            ${valuationDisplay}
        `;
        
        portfolioGrid.appendChild(card);
    });
    
    document.getElementById('total-companies').textContent = companies.length;
}

function updateFilterCounts() {
    // Update index filter counts
    const indexButtons = document.querySelectorAll('.filter-btn:not(.valuation-btn):not(.slope-filter-btn)');
    indexButtons.forEach(btn => {
        const filter = btn.dataset.filter;
        let count;
        
        if (filter === 'ALL') {
            count = allCompanies.length;
        } else {
            count = allCompanies.filter(company => 
                company.primary_index === filter || 
                (company.indices && company.indices.includes(filter))
            ).length;
        }
        
        const text = btn.textContent.split('(')[0].trim();
        btn.textContent = `${text} (${count})`;
    });
    
    // Update valuation filter counts
    const valuationButtons = document.querySelectorAll('.valuation-btn');
    valuationButtons.forEach(btn => {
        const valuation = btn.dataset.valuation;
        let count;
        
        if (valuation === 'ALL') {
            count = allCompanies.length;
        } else {
            count = allCompanies.filter(company => 
                company.valuation_band === valuation
            ).length;
        }
        
        const text = btn.textContent.split('(')[0].trim();
        btn.textContent = `${text} (${count}}`;
    });
    
    // Update slope filter counts
    const slopeButtons = document.querySelectorAll('.slope-filter-btn');
    slopeButtons.forEach(btn => {
        const slope = btn.dataset.slope;
        let count;
        
        if (slope === 'ALL') {
            count = allCompanies.length;
        } else {
            count = allCompanies.filter(company => {
                const maSlope = company.ma_slope;
                if (maSlope === null || maSlope === undefined) return false;
                
                switch(slope) {
                    case 'POSITIVE':
                        return maSlope > 0;
                    case 'NEGATIVE':
                        return maSlope < 0;
                    case 'STRONG_POSITIVE':
                        return maSlope > 1;
                    case 'STRONG_NEGATIVE':
                        return maSlope < -1;
                    default:
                        return true;
                }
            }).length;
        }
        
        const text = btn.textContent.split('(')[0].trim();
        btn.textContent = `${text} (${count})`;
    });
}

// Create portfolio overview chart with filtered data
function createPortfolioChart(companies = null) {
    const ctx = document.getElementById('portfolio-chart').getContext('2d');
    const dataToUse = companies || allCompanies;
    
    // Limit to top 20 for readability
    const topCompanies = dataToUse
        .sort((a, b) => (b.latest_ebitda || 0) - (a.latest_ebitda || 0))
        .slice(0, 20);
    
    const labels = topCompanies.map(company => company.symbol);
    const ebitdaValues = topCompanies.map(company => company.latest_ebitda / 1e6);
    
    // Clear existing chart
    if (window.portfolioChart) {
        window.portfolioChart.destroy();
    }
    
    window.portfolioChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Latest EBITDA (Millions)',
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
                            size: 11
                        }
                    },
                    grid: {
                        color: '#333333'
                    }
                },
                y: {
                    beginAtZero: true,
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
                        text: 'EBITDA (Millions USD)',
                        color: '#ffffff',
                        font: {
                            family: 'Courier New',
                            size: 11
                        }
                    }
                }
            },
            onClick: (event, elements) => {
                if (elements.length > 0) {
                    const index = elements[0].index;
                    const company = topCompanies[index];
                    localStorage.setItem('selectedCompany', JSON.stringify(company));
                    window.location.href = 'company.html';
                }
            }
        }
    });
}

// Calculate and display summary statistics
function updateSummaryStats(companies = null) {
    const dataToUse = companies || allCompanies;
    
    if (dataToUse.length === 0) return;
    
    // Update total companies
    document.getElementById('total-companies').textContent = dataToUse.length;
    
    // Create EBITDA trend distribution histogram
    createTrendHistogram(dataToUse);
    
    // Create valuation distribution histogram
    createValuationHistogram(dataToUse);
}

function createTrendHistogram(companies) {
    const ctx = document.getElementById('trend-chart').getContext('2d');
    
    // Count companies in each trend category
    const counts = {
        'strong_negative': 0,
        'negative': 0,
        'positive': 0,
        'strong_positive': 0
    };
    
    companies.forEach(company => {
        const slope = company.ma_slope;
        if (slope !== null && slope !== undefined) {
            if (slope < -1) counts.strong_negative++;
            else if (slope < 0) counts.negative++;
            else if (slope > 1) counts.strong_positive++;
            else if (slope > 0) counts.positive++;
        }
    });
    
    // Clear existing chart
    if (window.trendChart) {
        window.trendChart.destroy();
    }
    
    window.trendChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Strong Neg', 'Negative', 'Positive', 'Strong Pos'],
            datasets: [{
                data: [counts.strong_negative, counts.negative, counts.positive, counts.strong_positive],
                backgroundColor: ['#ff0000', '#ff9999', '#99ff99', '#00ff00'],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: '#1a1a1a',
                    titleColor: '#ffffff',
                    bodyColor: '#cccccc',
                    callbacks: {
                        label: function(context) {
                            return `${context.parsed.y} companies`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    ticks: {
                        color: '#cccccc',
                        font: { size: 9 }
                    },
                    grid: { display: false }
                },
                y: {
                    beginAtZero: true,
                    ticks: {
                        color: '#cccccc',
                        font: { size: 9 },
                        stepSize: 1
                    },
                    grid: { color: '#333333' }
                }
            },
            onClick: (event, elements) => {
                if (elements.length > 0) {
                    const index = elements[0].index;
                    const filters = ['STRONG_NEGATIVE', 'NEGATIVE', 'POSITIVE', 'STRONG_POSITIVE'];
                    const slopeFilter = filters[index];
                    
                    // Update the slope filter
                    document.querySelectorAll('.slope-filter-btn').forEach(b => b.classList.remove('active'));
                    const targetBtn = document.querySelector(`[data-slope="${slopeFilter}"]`);
                    if (targetBtn) {
                        targetBtn.classList.add('active');
                        currentSlopeFilter = slopeFilter;
                        const filteredData = filterCompanies();
                        createPortfolioChart(filteredData);
                        updateSummaryStats(filteredData);
                    }
                }
            }
        }
    });
}

function createValuationHistogram(companies) {
    const ctx = document.getElementById('valuation-chart').getContext('2d');
    
    // Count companies in each valuation band
    const counts = {
        'discount': 0,
        'below_value': 0,
        'fair_value': 0,
        'above_value': 0,
        'premium': 0
    };
    
    companies.forEach(company => {
        if (company.valuation_band && counts.hasOwnProperty(company.valuation_band)) {
            counts[company.valuation_band]++;
        }
    });
    
    // Clear existing chart
    if (window.valuationChart) {
        window.valuationChart.destroy();
    }
    
    window.valuationChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Discount', 'Below Value', 'Fair Value', 'Above Value', 'Premium'],
            datasets: [{
                data: [counts.discount, counts.below_value, counts.fair_value, counts.above_value, counts.premium],
                backgroundColor: ['#00ff00', '#66ff66', '#ffff00', '#ff9900', '#ff0000'],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: '#1a1a1a',
                    titleColor: '#ffffff',
                    bodyColor: '#cccccc',
                    callbacks: {
                        label: function(context) {
                            return `${context.parsed.y} companies`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    ticks: {
                        color: '#cccccc',
                        font: { size: 9 }
                    },
                    grid: { display: false }
                },
                y: {
                    beginAtZero: true,
                    ticks: {
                        color: '#cccccc',
                        font: { size: 9 },
                        stepSize: 1
                    },
                    grid: { color: '#333333' }
                }
            },
            onClick: (event, elements) => {
                if (elements.length > 0) {
                    const index = elements[0].index;
                    const valuations = ['discount', 'below_value', 'fair_value', 'above_value', 'premium'];
                    const valuation = valuations[index];
                    
                    // Update the valuation filter
                    document.querySelectorAll('.valuation-btn').forEach(b => b.classList.remove('active'));
                    const targetBtn = document.querySelector(`[data-valuation="${valuation}"]`);
                    if (targetBtn) {
                        targetBtn.classList.add('active');
                        currentValuationFilter = valuation;
                        const filteredData = filterCompanies();
                        createPortfolioChart(filteredData);
                        updateSummaryStats(filteredData);
                    }
                }
            }
        }
    });
}

function displayTopTen() {
    // Score companies: positive EBITDA growth + discount/below value/fair value only
    const scored = allCompanies
        .filter(c => c.ebitda_growth && c.valuation_band && 
                     c.valuation_band !== 'premium' && c.valuation_band !== 'above_value')
        .map(c => {
            let score = c.ebitda_growth || 0;
            // Bonus for discount/below value
            if (c.valuation_band === 'discount') score += 20;
            else if (c.valuation_band === 'below_value') score += 10;
            else if (c.valuation_band === 'fair_value') score += 5;
            return { ...c, score };
        })
        .sort((a, b) => b.score - a.score)
        .slice(0, 10);
    
    const topTenGrid = document.getElementById('top-ten-grid');
    topTenGrid.innerHTML = '';
    
    scored.forEach((company, index) => {
        const card = document.createElement('div');
        card.className = 'top-ten-card';
        card.onclick = () => {
            localStorage.setItem('selectedCompany', JSON.stringify(company));
            window.location.href = 'company.html';
        };
        
        card.innerHTML = `
            <div class="rank">#${index + 1}</div>
            <h3>${company.symbol}</h3>
            <p class="company-name">${company.company_name}</p>
            <div class="top-metrics">
                <div class="metric">
                    <span class="label">EBITDA Growth:</span>
                    <span class="value positive">${company.ebitda_growth.toFixed(1)}%</span>
                </div>
                <div class="metric">
                    <span class="label">Valuation:</span>
                    <span class="badge ${company.valuation_band}">${company.valuation_band.replace('_', ' ')}</span>
                </div>
                <div class="metric">
                    <span class="label">Price:</span>
                    <span class="value">$${company.current_price.toFixed(2)}</span>
                </div>
            </div>
        `;
        
        topTenGrid.appendChild(card);
    });
}

// Initialize page
document.addEventListener('DOMContentLoaded', async function() {
    // Load data
    allCompanies = await loadPortfolioData();
    
    if (allCompanies.length > 0) {
        displayCompanies(allCompanies);
        createPortfolioChart();
        updateSummaryStats();
        updateFilterCounts();
        
        // Add event listeners for index filters
        document.querySelectorAll('.filter-btn:not(.valuation-btn):not(.slope-filter-btn)').forEach(btn => {
            btn.addEventListener('click', function() {
                document.querySelectorAll('.filter-btn:not(.valuation-btn):not(.slope-filter-btn)').forEach(b => b.classList.remove('active'));
                this.classList.add('active');
                currentFilter = this.dataset.filter;
                const filteredData = filterCompanies();
                
                // Update chart with filtered data
                createPortfolioChart(filteredData);
                updateSummaryStats(filteredData);
            });
        });
        
        // Add valuation filter listeners
        document.querySelectorAll('.valuation-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                document.querySelectorAll('.valuation-btn').forEach(b => b.classList.remove('active'));
                this.classList.add('active');
                currentValuationFilter = this.dataset.valuation;
                const filteredData = filterCompanies();
                
                // Update chart with filtered data
                createPortfolioChart(filteredData);
                updateSummaryStats(filteredData);
            });
        });
        
        // Add MA slope filter listeners
        document.querySelectorAll('.slope-filter-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                document.querySelectorAll('.slope-filter-btn').forEach(b => b.classList.remove('active'));
                this.classList.add('active');
                currentSlopeFilter = this.dataset.slope;
                const filteredData = filterCompanies();
                
                // Update chart with filtered data
                createPortfolioChart(filteredData);
                updateSummaryStats(filteredData);
            });
        });
        
        document.getElementById('search-input').addEventListener('input', function() {
            currentSearch = this.value;
            const filteredData = filterCompanies();
            createPortfolioChart(filteredData);
            updateSummaryStats(filteredData);
        });
        
        // Clear filters button
        document.getElementById('clear-filters-btn').addEventListener('click', function() {
            // Reset all filters
            currentFilter = 'ALL';
            currentValuationFilter = 'ALL';
            currentSlopeFilter = 'ALL';
            currentSearch = '';
            
            // Reset UI
            document.querySelectorAll('.filter-btn:not(.valuation-btn):not(.slope-filter-btn)').forEach(b => b.classList.remove('active'));
            document.querySelector('[data-filter="ALL"]').classList.add('active');
            
            document.querySelectorAll('.valuation-btn').forEach(b => b.classList.remove('active'));
            document.querySelector('[data-valuation="ALL"]').classList.add('active');
            
            document.querySelectorAll('.slope-filter-btn').forEach(b => b.classList.remove('active'));
            document.querySelector('[data-slope="ALL"]').classList.add('active');
            
            document.getElementById('search-input').value = '';
            
            // Refresh display
            const filteredData = filterCompanies();
            createPortfolioChart(filteredData);
            updateSummaryStats(filteredData);
        });
    } else {
        document.getElementById('portfolio-grid').innerHTML = '<p style="color: #cccccc; text-align: center;">No data available. Please check the data file.</p>';
    }
});