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
                op_income = income_annual[income_annual['label'].str.contains('Operating Income', na=False)]
                depreciation = cash_annual[cash_annual['label'].str.contains('Depreciation', na=False)]
                
                if not op_income.empty and not depreciation.empty:
                    year_cols = sorted([col for col in op_income.columns if 'FY' in str(col) and col in depreciation.columns], reverse=True)
                    for year in year_cols:
                        if not op_income[year].isna().all() and not depreciation[year].isna().all():
                            op_val = float(op_income[year].iloc[0])
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
                op_income = income_quarterly[income_quarterly['label'].str.contains('Operating Income', na=False)]
                depreciation = cash_quarterly[cash_quarterly['label'].str.contains('Depreciation', na=False)]
                
                if not op_income.empty and not depreciation.empty:
                    quarter_cols = sorted([col for col in op_income.columns if 'Q' in str(col) and col in depreciation.columns], reverse=True)
                    for period in quarter_cols:
                        if not op_income[period].isna().all() and not depreciation[period].isna().all():
                            op_val = float(op_income[period].iloc[0])
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
            
            if len(all_periods) >= 2:
                latest = all_periods[0]['ebitda']
                previous = all_periods[1]['ebitda']
                if previous != 0:
                    company_data['ebitda_growth'] = ((latest - previous) / abs(previous)) * 100
            
            portfolio_data.append(company_data)
            print(f"Processed {symbol}")
            
        except Exception as e:
            print(f"Error processing {symbol}: {e}")
    
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