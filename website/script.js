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
        
        const maSlope = company.ma_slope !== null && company.ma_slope !== undefined
            ? company.ma_slope.toFixed(2)
            : 'N/A';
        
        const growthClass = company.ebitda_growth > 0 ? 'positive' : 
                          company.ebitda_growth < 0 ? 'negative' : '';
        
        const slopeClass = company.ma_slope > 0 ? 'positive' : 
                          company.ma_slope < 0 ? 'negative' : '';

        row.innerHTML = `
            <td><strong>${company.symbol}</strong></td>
            <td>${company.company_name}</td>
            <td>${latestEbitda}</td>
            <td class="${growthClass}">${growth}</td>
            <td class="${slopeClass}">${maSlope}</td>
            <td>${company.data_quality}</td>
        `;
        
        tbody.appendChild(row);
    });
}

function createChart(data) {
    const canvas = document.getElementById('ebitda-chart');
    const ctx = canvas.getContext('2d');
    
    // Get first company with annual data for histogram
    const company = data.find(c => c.annual_data && c.annual_data.length > 0);
    if (!company) {
        ctx.fillStyle = '#666';
        ctx.font = '16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('No annual data available', canvas.width/2, canvas.height/2);
        return;
    }
    
    // Sort annual data by year
    const annualData = [...company.annual_data].sort((a, b) => {
        const yearA = parseInt(a.period.replace('FY ', ''));
        const yearB = parseInt(b.period.replace('FY ', ''));
        return yearA - yearB;
    });
    
    const labels = annualData.map(d => d.period);
    const values = annualData.map(d => d.ebitda || 0);
    
    // Calculate 2-period moving average
    const movingAvg = [];
    for (let i = 0; i < values.length; i++) {
        if (i === 0) {
            movingAvg.push(null);
        } else {
            movingAvg.push((values[i-1] + values[i]) / 2);
        }
    }
    
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
    
    // Draw moving average line
    ctx.strokeStyle = '#f56565';
    ctx.lineWidth = 3;
    ctx.beginPath();
    
    let firstPoint = true;
    movingAvg.forEach((ma, index) => {
        if (ma !== null) {
            const x = 50 + index * barWidth + barWidth / 2;
            const y = canvas.height - 50 - (ma / maxValue) * chartHeight;
            
            if (firstPoint) {
                ctx.moveTo(x, y);
                firstPoint = false;
            } else {
                ctx.lineTo(x, y);
            }
            
            // Draw point
            ctx.fillStyle = '#f56565';
            ctx.beginPath();
            ctx.arc(x, y, 4, 0, 2 * Math.PI);
            ctx.fill();
        }
    });
    
    ctx.stroke();
    
    // Draw title
    ctx.fillStyle = '#333';
    ctx.font = 'bold 16px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(`Yearly EBITDA - ${company.symbol}`, canvas.width/2, 30);
    
    // Draw legend
    ctx.font = '12px Arial';
    ctx.fillStyle = '#667eea';
    ctx.fillRect(canvas.width - 180, 50, 15, 15);
    ctx.fillStyle = '#333';
    ctx.textAlign = 'left';
    ctx.fillText('EBITDA', canvas.width - 160, 62);
    
    ctx.strokeStyle = '#f56565';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(canvas.width - 180, 80);
    ctx.lineTo(canvas.width - 165, 80);
    ctx.stroke();
    ctx.fillStyle = '#333';
    ctx.fillText('2-Period MA', canvas.width - 160, 85);
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