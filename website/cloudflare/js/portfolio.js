// Global variables
let currentFilter = 'ALL';
let currentSearch = '';
let allCompanies = [];
let stockPrices = {};

// Load cached stock prices from a local JSON file (static snapshot)
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
            // Store company data for company page
            localStorage.setItem('selectedCompany', JSON.stringify(company));
            window.location.href = 'company.html';
        };
        
        const growthDisplay = company.ebitda_growth ? 
            `<div class="metric">
                <span class="label">Growth:</span>
                <span class="value">${company.ebitda_growth.toFixed(1)}%</span>
            </div>` : '';
        
        const indexBadges = company.indices ? 
            company.indices.map(index => `<span class="index-badge">${index}</span>`).join('') : '';
        
        const stockPrice = stockPrices[company.symbol];
        const priceDisplay = (stockPrice != null) ? 
            `<div class="metric">
                <span class="label">Stock Price:</span>
                <span class="value">$${stockPrice.toFixed(2)}</span>
            </div>` : 
            `<div class="metric">
                <span class="label">Stock Price:</span>
                <span class="value">N/A</span>
            </div>`;
        
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
        `;
        
        portfolioGrid.appendChild(card);
    });
    
    // Update total companies count
    document.getElementById('total-companies').textContent = companies.length;
    
    // Prices are loaded once on page init (static snapshot)
}

function updateFilterCounts() {
    const buttons = document.querySelectorAll('.filter-btn');
    buttons.forEach(btn => {
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
    
    // Calculate average growth
    const growthValues = dataToUse
        .filter(company => company.ebitda_growth !== null)
        .map(company => company.ebitda_growth);
    
    if (growthValues.length > 0) {
        const avgGrowth = growthValues.reduce((sum, growth) => sum + growth, 0) / growthValues.length;
        document.getElementById('avg-growth').textContent = `${avgGrowth.toFixed(1)}%`;
    }
    
    // Find top performer
    const topPerformer = dataToUse.reduce((top, company) => {
        return (company.ebitda_growth || 0) > (top.ebitda_growth || 0) ? company : top;
    });
    
    if (topPerformer.ebitda_growth) {
        document.getElementById('top-performer').textContent = `${topPerformer.symbol} (${topPerformer.ebitda_growth.toFixed(1)}%)`;
    }
}

// Preload stock price snapshot once (so we don't refetch on every filter/search)
async function preloadStockPrices() {
    const snapshot = await loadStockPriceSnapshot();
    if (!snapshot) return;

    // Store only the numeric price keyed by symbol (keeps rendering simple)
    Object.keys(snapshot).forEach(symbol => {
        const q = snapshot[symbol];
        if (q && q.current_price != null) {
            stockPrices[symbol] = Number(q.current_price);
        }
    });
}

// Initialize page
document.addEventListener('DOMContentLoaded', async function() {
    // Load data
    allCompanies = await loadPortfolioData();

    // Load stock prices snapshot (static)
    await preloadStockPrices();
    
    if (allCompanies.length > 0) {
        displayCompanies(allCompanies);
        createPortfolioChart();
        updateSummaryStats();
        updateFilterCounts();
        
        // Add event listeners
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                this.classList.add('active');
                currentFilter = this.dataset.filter;
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
    } else {
        document.getElementById('portfolio-grid').innerHTML = '<p style="color: #cccccc; text-align: center;">No data available. Please check the data file.</p>';
    }
});