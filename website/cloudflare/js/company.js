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

// Format market cap for display
function formatMarketCap(marketCap) {
    if (marketCap >= 1e12) return `$${(marketCap / 1e12).toFixed(2)}T`;
    if (marketCap >= 1e9) return `$${(marketCap / 1e9).toFixed(2)}B`;
    if (marketCap >= 1e6) return `$${(marketCap / 1e6).toFixed(2)}M`;
    return `$${marketCap.toLocaleString()}`;
}

// Create EBITDA trend chart with Bloomberg styling
function createEbitdaChart(companyData) {
    const ctx = document.getElementById('ebitdaChart').getContext('2d');
    
    // Use annual data and annualized quarterly data for comparison
    const annualData = (companyData.annual_data || []).map(item => ({
        period: item.period,
        ebitda: item.ebitda / 1e6,
        type: 'Annual'
    }));
    
    const quarterlyAnnualized = (companyData.quarterly_data || []).map(item => ({
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

// Create placeholder stock chart
function createStockChart() {
    const ctx = document.getElementById('stockChart').getContext('2d');
    
    // Create sample data for demonstration
    const labels = ['6M Ago', '5M Ago', '4M Ago', '3M Ago', '2M Ago', '1M Ago', 'Now'];
    const samplePrices = [100, 105, 98, 110, 115, 108, 112]; // Sample data
    
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Stock Price (Sample)',
                data: samplePrices,
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
    
    // Quarterly data table with both quarterly and annualized figures
    const quarterlyTableBody = document.querySelector('#quarterly-data tbody');
    (companyData.quarterly_data || []).forEach(item => {
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
    const companyData = loadCompanyData();
    
    if (!companyData) {
        return; // Will redirect to index
    }
    
    // Update page title and header
    document.getElementById('page-title').textContent = `${companyData.company_name} - Financial Analysis`;
    document.getElementById('company-header').textContent = `${companyData.company_name} (${companyData.symbol})`;
    
    // Create charts
    createEbitdaChart(companyData);
    createStockChart(); // Placeholder chart
    
    // Populate tables
    populateDataTables(companyData);
    
    // Note: Stock data would be fetched from API in a real implementation
    // For static version, we show placeholder text
});