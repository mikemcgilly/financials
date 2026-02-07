from edgar import set_identity, Company
from datetime import datetime
import json
import pandas as pd
from stock_universe import get_all_stocks, get_stock_classifications

def get_current_periods():
    """Generate current expected periods"""
    now = datetime.now()
    current_quarter = (now.month - 1) // 3 + 1
    current_year = now.year
    
    quarters = []
    quarter = current_quarter
    year = current_year
    
    # Generate 8 quarters back from current
    for _ in range(8):
        quarters.append(f"Q{quarter} {year}")
        quarter -= 1
        if quarter == 0:
            quarter = 4
            year -= 1
    
    # Generate 4 fiscal years
    years = [f"FY {current_year - i}" for i in range(4)]
    
    return quarters, years

import math
import numpy as np

def sanitize_for_json(obj):
    """Replace NaN/Inf with None for valid JSON"""
    if isinstance(obj, dict):
        return {k: sanitize_for_json(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [sanitize_for_json(v) for v in obj]
    if isinstance(obj, (float, np.floating)):
        if math.isnan(float(obj)) or math.isinf(float(obj)):
            return None
        return float(obj)
    return obj

def generate_portfolio_data():
    """Generate portfolio data with current periods"""
    set_identity("mikemcgilly@gmail.com")
    
    # Get all stocks from universe
    symbols = get_all_stocks()
    portfolio_data = []
    classifications = get_stock_classifications()
    expected_quarters, expected_years = get_current_periods()
    
    for symbol in symbols:
        try:
            company = Company(symbol.upper())
            
            # Get financial data
            income_annual = company.income_statement(periods=4, annual=True, as_dataframe=True)
            cash_annual = company.cash_flow(periods=4, annual=True, as_dataframe=True)
            income_quarterly = company.income_statement(periods=8, annual=False, as_dataframe=True)
            cash_quarterly = company.cash_flow(periods=8, annual=False, as_dataframe=True)
            
            # Check if we have the required data
            if income_annual is None or cash_annual is None:
                print(f"Skipping {symbol} - missing annual data")
                continue
                
            if income_quarterly is None or cash_quarterly is None:
                print(f"Skipping {symbol} - missing quarterly data")
                continue
            
            company_data = {
                'symbol': symbol.upper(),
                'company_name': company.name,
                'annual_data': [],
                'quarterly_data': [],
                'latest_ebitda': None,
                'ebitda_growth': None,
                'data_quality': 'complete',
                'indices': classifications.get(symbol.upper(), {}).get('indices', []),
                'primary_index': classifications.get(symbol.upper(), {}).get('primary_index', 'OTHER')
            }
            
            # Process annual data
            if income_annual is not None and cash_annual is not None:
                # Try multiple variations of operating income labels
                op_income = income_annual[income_annual['label'].str.contains('Operating Income|Income from Operations|Operating Profit|Net Interest Income|Insurance Revenue', case=False, na=False)]
                # Try multiple variations of depreciation labels
                depreciation = cash_annual[cash_annual['label'].str.contains('Depreciation|Amortization', case=False, na=False)]
                
                # For financial companies without depreciation, use 0
                if not op_income.empty:
                    year_cols = sorted([col for col in op_income.columns if 'FY' in str(col)], reverse=True)
                    
                    for year in year_cols:
                        if not op_income[year].isna().all():
                            op_val = float(op_income[year].iloc[0])
                            
                            # Try to get depreciation, use 0 if not available (for financial companies)
                            depr_val = 0.0
                            if not depreciation.empty and year in depreciation.columns:
                                if not depreciation[year].isna().all():
                                    depr_val = float(depreciation[year].iloc[0])
                            
                            company_data['annual_data'].append({
                                'period': year,
                                'operating_income': op_val,
                                'depreciation': depr_val,
                                'ebitda': op_val + depr_val,
                                'period_type': 'annual'
                            })
            
            # Process quarterly data
            if income_quarterly is not None and cash_quarterly is not None:
                # Try multiple variations of operating income labels
                op_income = income_quarterly[income_quarterly['label'].str.contains('Operating Income|Income from Operations|Operating Profit|Net Interest Income|Insurance Revenue', case=False, na=False)]
                # Try multiple variations of depreciation labels
                depreciation = cash_quarterly[cash_quarterly['label'].str.contains('Depreciation|Amortization', case=False, na=False)]
                
                # For financial companies without depreciation, use 0
                if not op_income.empty:
                    quarter_cols = sorted([col for col in op_income.columns if 'Q' in str(col)], reverse=True)
                    
                    for period in quarter_cols:
                        if not op_income[period].isna().all():
                            op_val = float(op_income[period].iloc[0])
                            
                            # Try to get depreciation, use 0 if not available (for financial companies)
                            depr_val = 0.0
                            if not depreciation.empty and period in depreciation.columns:
                                if not depreciation[period].isna().all():
                                    depr_val = float(depreciation[period].iloc[0])
                            
                            ebitda_val = op_val + depr_val
                            company_data['quarterly_data'].append({
                                'period': period,
                                'operating_income': op_val,
                                'depreciation': depr_val,
                                'ebitda': ebitda_val,
                                'ebitda_annualized': ebitda_val * 4,
                                'period_type': 'quarterly'
                            })
            
            # Calculate Q4 from annual data (Q4 = FY - Q1 - Q2 - Q3)
            for annual in company_data['annual_data']:
                fy_year = annual['period'].replace('FY ', '')
                q4_period = f"Q4 {fy_year}"
                
                # Check if Q4 already exists
                if any(q['period'] == q4_period for q in company_data['quarterly_data']):
                    continue
                
                # Find Q1, Q2, Q3 for this year
                quarters = [q for q in company_data['quarterly_data'] if fy_year in q['period']]
                if len(quarters) == 3:  # Have all three quarters
                    q_sum_op = sum(q['operating_income'] for q in quarters)
                    q_sum_depr = sum(q['depreciation'] for q in quarters)
                    q_sum_ebitda = sum(q['ebitda'] for q in quarters)
                    
                    q4_op = annual['operating_income'] - q_sum_op
                    q4_depr = annual['depreciation'] - q_sum_depr
                    q4_ebitda = annual['ebitda'] - q_sum_ebitda
                    
                    company_data['quarterly_data'].append({
                        'period': q4_period,
                        'operating_income': q4_op,
                        'depreciation': q4_depr,
                        'ebitda': q4_ebitda,
                        'ebitda_annualized': q4_ebitda * 4,
                        'period_type': 'quarterly'
                    })
            
            # Calculate latest EBITDA and growth
            all_periods = company_data['annual_data'] + company_data['quarterly_data']
            if not all_periods:
                print(f"Skipping {symbol} - no valid periods found")
                continue
                
            all_periods.sort(key=lambda x: x['period'], reverse=True)
            company_data['latest_ebitda'] = all_periods[0]['ebitda']
            
            # Calculate growth using annual data only for consistency
            if len(company_data['annual_data']) >= 2:
                annual_sorted = sorted(company_data['annual_data'], key=lambda x: x['period'], reverse=True)
                latest_annual = annual_sorted[0]['ebitda']
                previous_annual = annual_sorted[1]['ebitda']
                if previous_annual != 0:
                    company_data['ebitda_growth'] = ((latest_annual - previous_annual) / abs(previous_annual)) * 100
            
            # Calculate 2-period moving average slope
            company_data['ma_slope'] = None
            if len(company_data['annual_data']) >= 3:
                # Sort by year
                annual_sorted = sorted(company_data['annual_data'], key=lambda x: x['period'])
                
                # Calculate moving averages
                moving_avgs = []
                for i in range(1, len(annual_sorted)):
                    if annual_sorted[i-1]['ebitda'] is not None and annual_sorted[i]['ebitda'] is not None:
                        ma = (annual_sorted[i-1]['ebitda'] + annual_sorted[i]['ebitda']) / 2
                        moving_avgs.append(ma)
                
                # Calculate slope of moving average (last MA - first MA) / number of periods
                if len(moving_avgs) >= 2:
                    slope = (moving_avgs[-1] - moving_avgs[0]) / (len(moving_avgs) - 1)
                    # Normalize slope to billions for readability
                    company_data['ma_slope'] = slope / 1e9
            
            portfolio_data.append(company_data)
            print(f"Processed {symbol}")
            
        except Exception as e:
            print(f"Error processing {symbol}: {e}")
    
    # Add valuation metrics from stock data
    print("\nAdding valuation metrics...")
    try:
        with open('cloudflare/data/stock_ohlc.json', 'r') as f:
            ohlc_data = json.load(f)
        
        for company in portfolio_data:
            symbol = company['symbol']
            if symbol in ohlc_data and ohlc_data[symbol]:
                # Get latest price data with bands
                latest = ohlc_data[symbol][-1]
                if 'ma252' in latest and latest['ma252'] is not None:
                    price = latest['close']
                    ma = latest['ma252']
                    std = latest.get('std252', 0)
                    
                    # Determine valuation band
                    if std and std > 0:
                        z_score = (price - ma) / std
                        if z_score > 2:
                            valuation = 'premium'
                        elif z_score > 1:
                            valuation = 'above_value'
                        elif z_score > -1:
                            valuation = 'fair_value'
                        elif z_score > -2:
                            valuation = 'below_value'
                        else:
                            valuation = 'discount'
                    else:
                        valuation = 'unknown'
                    
                    company['valuation_band'] = valuation
                    company['current_price'] = price
                    company['ma252'] = ma
    except Exception as e:
        print(f"Could not add valuation metrics: {e}")
    
    return portfolio_data

if __name__ == '__main__':
    print("Generating portfolio data with current periods...")
    data = generate_portfolio_data()
    
    data = sanitize_for_json(data)
    
    # Save to cloudflare data folder
    output_path = 'cloudflare/data/portfolio_ebitda_data.json'
    with open(output_path, 'w') as f:
        json.dump(data, f, indent=2, allow_nan=False)
    
    print(f"Generated {output_path} with {len(data)} companies")
    current_quarter = (datetime.now().month-1)//3+1
    print(f"Data includes periods up to {datetime.now().year} Q{current_quarter}")