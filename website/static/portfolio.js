// Global variables
let currentFilter = 'ALL';
let currentSlopeFilter = 'ALL';
let currentSearch = '';
let allCompanies = [];

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
}

function displayCompanies(companies) {
    const portfolioGrid = document.querySelector('.portfolio-grid');
    portfolioGrid.innerHTML = '';
    
    companies.forEach(company => {
        const card = document.createElement('div');
        card.className = 'company-card';
        card.onclick = () => window.location.href = `/company/${company.symbol}`;
        
        const growthDisplay = company.ebitda_growth ? 
            `<div class="metric">
                <span class="label">Growth:</span>
                <span class="value">${company.ebitda_growth.toFixed(1)}%</span>
            </div>` : '';
        
        const indexBadges = company.indices ? 
            company.indices.map(index => `<span class="index-badge">${index}</span>`).join('') : '';
        
        card.innerHTML = `
            <h3>${company.company_name}</h3>
            <div class="symbol">${company.symbol}</div>
            <div class="index-badges">${indexBadges}</div>
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
                    const symbol = topCompanies[index].symbol;
                    window.location.href = `/company/${symbol}`;
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

// Get filtered data based on current filters
function getFilteredData() {
    let filtered = allCompanies;
    
    if (currentFilter !== 'ALL') {
        filtered = filtered.filter(company => 
            company.primary_index === currentFilter || 
            (company.indices && company.indices.includes(currentFilter))
        );
    }
    
    if (currentSlopeFilter !== 'ALL') {
        filtered = filtered.filter(company => {
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
    
    return filtered;
}

// Initialize page
document.addEventListener('DOMContentLoaded', function() {
    allCompanies = portfolioData;
    
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
                filterCompanies();
                
                // Update chart with filtered data
                const filteredData = getFilteredData();
                createPortfolioChart(filteredData);
                updateSummaryStats(filteredData);
            });
        });
        
        document.querySelectorAll('.slope-filter-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                document.querySelectorAll('.slope-filter-btn').forEach(b => b.classList.remove('active'));
                this.classList.add('active');
                currentSlopeFilter = this.dataset.slope;
                filterCompanies();
                
                // Update chart with filtered data
                const filteredData = getFilteredData();
                createPortfolioChart(filteredData);
                updateSummaryStats(filteredData);
            });
        });
        
        document.getElementById('search-input').addEventListener('input', function() {
            currentSearch = this.value;
            filterCompanies();
        });
    }
});