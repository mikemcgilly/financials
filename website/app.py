from edgar import set_identity, Company
from datetime import date
import pandas as pd
import json

def check_data_availability():
    """Scans popular symbols for required EBITDA data availability (annual + quarterly)"""
    
    symbols = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'META', 'NVDA', 'JPM', 
               'JNJ', 'V', 'PG', 'UNH', 'HD', 'MA', 'DIS', 'ADBE', 'NFLX', 'CRM', 'INTC', 'AMD']
    
    set_identity("mikemcgilly@gmail.com")
    
    results = []
    
    for symbol in symbols:
        try:
            company = Company(symbol)
            
            # Check if facts are available
            if not company.facts:
                results.append({
                    'Symbol': symbol,
                    'Annual_Op_Income': 0,
                    'Annual_Depreciation': 0,
                    'Quarterly_Op_Income': 0,
                    'Quarterly_Depreciation': 0,
                    'Complete_Data': False
                })
                continue
            
            # Annual data - use periods parameter
            income_stmt_annual = company.income_statement(periods=4, annual=True, as_dataframe=True)
            cash_flow_annual = company.cash_flow(periods=4, annual=True, as_dataframe=True)
            
            # Quarterly data - use periods parameter  
            income_stmt_quarterly = company.income_statement(periods=8, annual=False, as_dataframe=True)
            cash_flow_quarterly = company.cash_flow(periods=8, annual=False, as_dataframe=True)
            
            # Count available data
            annual_op_count = 0
            annual_depr_count = 0
            quarterly_op_count = 0
            quarterly_depr_count = 0
            
            if income_stmt_annual is not None:
                op_income_annual = income_stmt_annual[income_stmt_annual['label'].str.contains('Operating Income', na=False)]
                if not op_income_annual.empty:
                    year_cols = [col for col in op_income_annual.columns if 'FY' in str(col)]
                    annual_op_count = op_income_annual[year_cols].notna().sum().sum()
            
            if cash_flow_annual is not None:
                depr_annual = cash_flow_annual[cash_flow_annual['label'].str.contains('Depreciation', na=False)]
                if not depr_annual.empty:
                    year_cols = [col for col in depr_annual.columns if 'FY' in str(col)]
                    annual_depr_count = depr_annual[year_cols].notna().sum().sum()
            
            if income_stmt_quarterly is not None:
                op_income_quarterly = income_stmt_quarterly[income_stmt_quarterly['label'].str.contains('Operating Income', na=False)]
                if not op_income_quarterly.empty:
                    quarter_cols = [col for col in op_income_quarterly.columns if 'Q' in str(col)]
                    quarterly_op_count = op_income_quarterly[quarter_cols].notna().sum().sum()
            
            if cash_flow_quarterly is not None:
                depr_quarterly = cash_flow_quarterly[cash_flow_quarterly['label'].str.contains('Depreciation', na=False)]
                if not depr_quarterly.empty:
                    quarter_cols = [col for col in depr_quarterly.columns if 'Q' in str(col)]
                    quarterly_depr_count = depr_quarterly[quarter_cols].notna().sum().sum()
            
            results.append({
                'Symbol': symbol,
                'Annual_Op_Income': annual_op_count,
                'Annual_Depreciation': annual_depr_count,
                'Quarterly_Op_Income': quarterly_op_count,
                'Quarterly_Depreciation': quarterly_depr_count,
                'Complete_Data': annual_op_count >= 2 and annual_depr_count >= 2
            })
            
        except Exception as e:
            print(f"Error checking {symbol}: {e}")
            results.append({
                'Symbol': symbol,
                'Annual_Op_Income': 0,
                'Annual_Depreciation': 0,
                'Quarterly_Op_Income': 0,
                'Quarterly_Depreciation': 0,
                'Complete_Data': False
            })
    
    df = pd.DataFrame(results)
    print(df.to_string(index=False))
    df.to_csv('quarterly_data_availability_report.csv', index=False)
    return df

def get_ebitda_combined(ticker=["AAPL"]):
    """Returns EBITDA for a given company using both annual and quarterly data"""
    
    portfolio_data = []
    
    for i in ticker:
        try:
            company = Company(i.upper())
            set_identity("mikemcgilly@gmail.com")

            # Get annual data
            income_stmt_annual = company.income_statement(periods=4, annual=True, as_dataframe=True)
            cash_flow_annual = company.cash_flow(periods=4, annual=True, as_dataframe=True)
            
            # Get quarterly data
            income_stmt_quarterly = company.income_statement(periods=8, annual=False, as_dataframe=True)
            cash_flow_quarterly = company.cash_flow(periods=8, annual=False, as_dataframe=True)

            company_data = {
                'symbol': i.upper(),
                'company_name': company.name,
                'annual_data': [],
                'quarterly_data': [],
                'latest_ebitda': None,
                'ebitda_growth': None,
                'data_quality': 'complete'
            }
            
            # Process annual data
            if income_stmt_annual is not None and cash_flow_annual is not None:
                op_income_annual = income_stmt_annual[income_stmt_annual['label'].str.contains('Operating Income', na=False)]
                depr_annual = cash_flow_annual[cash_flow_annual['label'].str.contains('Depreciation', na=False)]
                
                if not op_income_annual.empty and not depr_annual.empty:
                    year_cols = sorted([col for col in op_income_annual.columns if 'FY' in str(col) and col in depr_annual.columns], reverse=True)
                    for year in year_cols:
                        if not op_income_annual[year].isna().all() and not depr_annual[year].isna().all():
                            op_income = op_income_annual[year].iloc[0]
                            depreciation = depr_annual[year].iloc[0]
                            ebitda = op_income + depreciation
                            
                            company_data['annual_data'].append({
                                'period': year,
                                'operating_income': float(op_income),
                                'depreciation': float(depreciation),
                                'ebitda': float(ebitda),
                                'period_type': 'annual'
                            })
            
            # Process quarterly data
            if income_stmt_quarterly is not None and cash_flow_quarterly is not None:
                op_income_quarterly = income_stmt_quarterly[income_stmt_quarterly['label'].str.contains('Operating Income', na=False)]
                depr_quarterly = cash_flow_quarterly[cash_flow_quarterly['label'].str.contains('Depreciation', na=False)]
                
                if not op_income_quarterly.empty and not depr_quarterly.empty:
                    quarter_cols = sorted([col for col in op_income_quarterly.columns if 'Q' in str(col) and col in depr_quarterly.columns], reverse=True)
                    for period in quarter_cols:
                        if not op_income_quarterly[period].isna().all() and not depr_quarterly[period].isna().all():
                            op_income = op_income_quarterly[period].iloc[0]
                            depreciation = depr_quarterly[period].iloc[0]
                            ebitda = op_income + depreciation
                            
                            company_data['quarterly_data'].append({
                                'period': period,
                                'operating_income': float(op_income),
                                'depreciation': float(depreciation),
                                'ebitda': float(ebitda),
                                'period_type': 'quarterly'
                            })
            
            # Calculate metrics for portfolio display
            all_periods = company_data['annual_data'] + company_data['quarterly_data']
            if all_periods:
                # Sort by most recent
                all_periods.sort(key=lambda x: x['period'], reverse=True)
                company_data['latest_ebitda'] = all_periods[0]['ebitda']
                
                # Calculate growth if we have multiple periods
                if len(all_periods) >= 2:
                    latest = all_periods[0]['ebitda']
                    previous = all_periods[1]['ebitda']
                    if previous != 0:
                        company_data['ebitda_growth'] = ((latest - previous) / abs(previous)) * 100
                
                portfolio_data.append(company_data)
                print(f"Successfully processed {i} - {len(all_periods)} periods")
            else:
                print(f"No matching periods found for {i}")
            
        except Exception as e:
            print(f"Error processing {i}: {e}")
    
    # Save web-ready JSON
    with open('portfolio_ebitda_data.json', 'w') as f:
        json.dump(portfolio_data, f, indent=2)
    
    # Create summary CSV for quick analysis
    summary_data = []
    for company in portfolio_data:
        summary_data.append({
            'Symbol': company['symbol'],
            'Company': company['company_name'],
            'Latest_EBITDA': company['latest_ebitda'],
            'EBITDA_Growth_%': company['ebitda_growth'],
            'Annual_Periods': len(company['annual_data']),
            'Quarterly_Periods': len(company['quarterly_data'])
        })
    
    summary_df = pd.DataFrame(summary_data)
    summary_df.to_csv('portfolio_summary.csv', index=False)
    
    # Create detailed CSV table for visual comparison
    detailed_rows = []
    for company in portfolio_data:
        for period_data in company['annual_data'] + company['quarterly_data']:
            detailed_rows.append({
                'Symbol': company['symbol'],
                'Company': company['company_name'],
                'Period': period_data['period'],
                'Type': period_data['period_type'],
                'Operating_Income': period_data['operating_income'],
                'Depreciation': period_data['depreciation'],
                'EBITDA': period_data['ebitda']
            })
    
    detailed_df = pd.DataFrame(detailed_rows)
    detailed_df.to_csv('ebitda_detailed_table.csv', index=False)
    
    # Create pivot table for side-by-side comparison
    if detailed_rows:
        pivot_df = detailed_df.pivot_table(
            index=['Symbol', 'Company'], 
            columns='Period', 
            values='EBITDA', 
            fill_value=None
        )
        pivot_df.to_csv('ebitda_comparison_table.csv')
    
    print(f"\nGenerated portfolio data for {len(portfolio_data)} companies")
    return portfolio_data

if __name__ == '__main__':
    # First check data availability
    print("Checking data availability...")
    availability_df = check_data_availability()
    
    # Filter symbols with complete data
    complete_symbols = availability_df[availability_df['Complete_Data'] == True]['Symbol'].tolist()
    print(f"\nSymbols with complete data: {complete_symbols}")
    
    if complete_symbols:
        print("\nProcessing symbols with complete data...")
        portfolio_data = get_ebitda_combined(complete_symbols)
    else:
        print("No symbols have complete data - trying with relaxed criteria...")
        # Try with any symbols that have some data
        partial_symbols = availability_df[availability_df['Annual_Op_Income'] > 0]['Symbol'].tolist()[:5]
        if partial_symbols:
            print(f"Processing symbols with partial data: {partial_symbols}")
            portfolio_data = get_ebitda_combined(partial_symbols)
    
    print("\nFiles generated:")
    print("- portfolio_ebitda_data.json (web-ready JSON)")
    print("- portfolio_summary.csv (quick overview)")
    print("- ebitda_detailed_table.csv (all periods, all companies)")
    print("- ebitda_comparison_table.csv (side-by-side pivot table)")
    print("- quarterly_data_availability_report.csv (data availability)")