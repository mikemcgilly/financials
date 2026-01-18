// Load stock data and populate UI
async function loadStockData() {
    try {
        const response = await fetch(`/api/stock/${symbol}`);
        const data = await response.json();
        
        // Update stock info
        document.getElementById('current-price').textContent = `$${data.current.current_price.toFixed(2)}`;
        document.getElementById('market-cap').textContent = formatMarketCap(data.current.market_cap);
        document.getElementById('pe-ratio').textContent = data.current.pe_ratio.toFixed(2);
        
        // Create stock price chart
        createStockChart(data.history);
    } catch (error) {
        console.error('Error loading stock data:', error);
    }
}

// Format market cap for display
function formatMarketCap(marketCap) {
    if (marketCap >= 1e12) return `$${(marketCap / 1e12).toFixed(2)}T`;
    if (marketCap >= 1e9) return `$${(marketCap / 1e9).toFixed(2)}B`;
    if (marketCap >= 1e6) return `$${(marketCap / 1e6).toFixed(2)}M`;
    return `$${marketCap.toLocaleString()}`;
}

// Create EBITDA trend chart with Bloomberg styling
function createEbitdaChart() {
    const ctx = document.getElementById('ebitdaChart').getContext('2d');
    
    // Use annual data and annualized quarterly data for comparison
    const annualData = (companyData.ebitda_data.annual_data || []).map(item => ({
        period: item.period,
        ebitda: item.ebitda / 1e6,
        type: 'Annual'
    }));
    
    const quarterlyAnnualized = (companyData.ebitda_data.quarterly_data || []).map(item => ({
        period: item.period + ' (Ann.)',
        ebitda: (item.ebitda * 4) / 1e6,  // Annualized
        type: 'Quarterly (Annualized)'
    }));
    
    const allData = [...annualData, ...quarterlyAnnualized];
    allData.sort((a, b) => a.period.localeCompare(b.period));
    
    const labels = allData.map(item => item.period);
    const ebitdaValues = allData.map(item => item.ebitda);
    const colors = allData.map(item => item.type === 'Annual' ? '#0066cc' : '#00cc66');
    
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'EBITDA (Millions)',
                data: ebitdaValues,
                backgroundColor: colors,
                borderColor: colors,
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
                    borderWidth: 1,
                    callbacks: {
                        afterLabel: function(context) {
                            const dataPoint = allData[context.dataIndex];
                            return dataPoint.type === 'Quarterly (Annualized)' ? 
                                'Note: Quarterly data annualized (×4)' : '';
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
                        text: 'EBITDA (Millions USD)',
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

// Create stock price chart with Bloomberg styling
function createStockChart(stockHistory) {
    const ctx = document.getElementById('stockChart').getContext('2d');
    
    const labels = stockHistory.map(item => item.date);
    const prices = stockHistory.map(item => item.price);
    
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Stock Price',
                data: prices,
                borderColor: '#ffcc00',
                backgroundColor: 'rgba(255, 204, 0, 0.1)',
                tension: 0.1,
                fill: true,
                pointRadius: 0,
                pointHoverRadius: 3
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
                        },
                        maxTicksLimit: 8
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
                        text: 'Price (USD)',
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
function populateDataTables() {
    // Annual data table
    const annualTableBody = document.querySelector('#annual-data tbody');
    (companyData.ebitda_data.annual_data || []).forEach(item => {
        const row = annualTableBody.insertRow();
        row.innerHTML = `
            <td>${item.period}</td>
            <td>$${(item.operating_income / 1e6).toFixed(2)}M</td>
            <td>$${(item.depreciation / 1e6).toFixed(2)}M</td>
            <td>$${(item.ebitda / 1e6).toFixed(2)}M</td>
        `;
    });
    
    // Quarterly data table with both quarterly and annualized figures
    const quarterlyTableBody = document.querySelector('#quarterly-data tbody');
    (companyData.ebitda_data.quarterly_data || []).forEach(item => {
        const row = quarterlyTableBody.insertRow();
        row.innerHTML = `
            <td>${item.period}</td>
            <td>$${(item.operating_income / 1e6).toFixed(2)}M</td>
            <td>$${(item.depreciation / 1e6).toFixed(2)}M</td>
            <td>$${(item.ebitda / 1e6).toFixed(2)}M</td>
            <td>$${(item.ebitda * 4 / 1e6).toFixed(2)}M</td>
        `;
    });
}

// Initialize page
document.addEventListener('DOMContentLoaded', function() {
    createEbitdaChart();
    populateDataTables();
    loadStockData();
});