// Load and display portfolio data
async function loadPortfolioData() {
    try {
        // Try to load the JSON data
        const response = await fetch('portfolio_ebitda_data.json');
        const portfolioData = await response.json();
        
        displaySummaryCards(portfolioData);
        displayPortfolioTable(portfolioData);
        createChart(portfolioData);
        
    } catch (error) {
        console.error('Error loading data:', error);
        displayErrorMessage();
    }
}

function displaySummaryCards(data) {
    const totalCompanies = data.length;
    const validGrowthRates = data.filter(company => company.ebitda_growth !== null);
    const avgGrowth = validGrowthRates.length > 0 
        ? (validGrowthRates.reduce((sum, company) => sum + company.ebitda_growth, 0) / validGrowthRates.length).toFixed(1)
        : 'N/A';
    
    const topPerformer = validGrowthRates.length > 0
        ? validGrowthRates.reduce((max, company) => 
            company.ebitda_growth > (max.ebitda_growth || -Infinity) ? company : max
          ).symbol
        : 'N/A';

    document.getElementById('total-companies').textContent = totalCompanies;
    document.getElementById('avg-growth').textContent = avgGrowth + '%';
    document.getElementById('top-performer').textContent = topPerformer;
}

function displayPortfolioTable(data) {
    const tbody = document.getElementById('portfolio-tbody');
    tbody.innerHTML = '';

    data.forEach(company => {
        const row = document.createElement('tr');
        
        const latestEbitda = company.latest_ebitda 
            ? formatCurrency(company.latest_ebitda)
            : 'N/A';
        
        const growth = company.ebitda_growth !== null 
            ? company.ebitda_growth.toFixed(1) + '%'
            : 'N/A';
        
        const growthClass = company.ebitda_growth > 0 ? 'positive' : 
                          company.ebitda_growth < 0 ? 'negative' : '';

        row.innerHTML = `
            <td><strong>${company.symbol}</strong></td>
            <td>${company.company_name}</td>
            <td>${latestEbitda}</td>
            <td class="${growthClass}">${growth}</td>
            <td>${company.data_quality}</td>
        `;
        
        tbody.appendChild(row);
    });
}

function createChart(data) {
    const canvas = document.getElementById('ebitda-chart');
    const ctx = canvas.getContext('2d');
    
    // Simple bar chart for EBITDA values
    const companies = data.slice(0, 10); // Show top 10 companies
    const labels = companies.map(c => c.symbol);
    const values = companies.map(c => c.latest_ebitda || 0);
    
    // Set canvas size
    canvas.width = 800;
    canvas.height = 400;
    
    // Chart dimensions
    const chartWidth = canvas.width - 100;
    const chartHeight = canvas.height - 100;
    const barWidth = chartWidth / labels.length;
    const maxValue = Math.max(...values);
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw bars
    ctx.fillStyle = '#667eea';
    values.forEach((value, index) => {
        const barHeight = (value / maxValue) * chartHeight;
        const x = 50 + index * barWidth;
        const y = canvas.height - 50 - barHeight;
        
        ctx.fillRect(x + 5, y, barWidth - 10, barHeight);
        
        // Draw labels
        ctx.fillStyle = '#333';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(labels[index], x + barWidth/2, canvas.height - 30);
        
        // Draw values
        ctx.fillText(formatCurrency(value, true), x + barWidth/2, y - 10);
        
        ctx.fillStyle = '#667eea';
    });
    
    // Draw title
    ctx.fillStyle = '#333';
    ctx.font = 'bold 16px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Latest EBITDA by Company', canvas.width/2, 30);
}

function formatCurrency(value, short = false) {
    if (value === null || value === undefined) return 'N/A';
    
    if (short) {
        if (Math.abs(value) >= 1e9) {
            return '$' + (value / 1e9).toFixed(1) + 'B';
        } else if (Math.abs(value) >= 1e6) {
            return '$' + (value / 1e6).toFixed(1) + 'M';
        } else if (Math.abs(value) >= 1e3) {
            return '$' + (value / 1e3).toFixed(1) + 'K';
        }
    }
    
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(value);
}

function displayErrorMessage() {
    const tbody = document.getElementById('portfolio-tbody');
    tbody.innerHTML = `
        <tr>
            <td colspan="5" style="text-align: center; padding: 40px; color: #666;">
                <strong>Unable to load data</strong><br>
                Make sure you're running: <code>python -m http.server 8000</code><br>
                Then visit: <code>http://localhost:8000</code>
            </td>
        </tr>
    `;
    
    document.getElementById('total-companies').textContent = '0';
    document.getElementById('avg-growth').textContent = 'N/A';
    document.getElementById('top-performer').textContent = 'N/A';
    
    // Show error in chart area too
    const canvas = document.getElementById('ebitda-chart');
    const ctx = canvas.getContext('2d');
    canvas.width = 800;
    canvas.height = 400;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#666';
    ctx.font = '16px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Data not available - check console for errors', canvas.width/2, canvas.height/2);
}

// Load data when page loads
document.addEventListener('DOMContentLoaded', loadPortfolioData);