from edgar import set_identity, Company
from datetime import date
import pandas as pd
import json
import time
from stock_universe import get_all_stocks, get_stock_classifications

def check_data_availability(symbols=None, batch_size=10):
    """Scans stocks for required EBITDA data availability with batch processing"""
    
    if symbols is None:
        symbols = get_all_stocks()
    
    set_identity("mikemcgilly@gmail.com")
    
    results = []
    total_symbols = len(symbols)
    
    print(f"Checking data availability for {total_symbols} stocks...")
    
    for i, symbol in enumerate(symbols):
        try:
            print(f"Processing {symbol} ({i+1}/{total_symbols})")
            
            company = Company(symbol)
            
            # Check if facts are available
            if not company.facts:
                results.append({
                    'Symbol': symbol,
                    'Annual_Op_Income': 0,
                    'Annual_Depreciation': 0,
                    'Quarterly_Op_Income': 0,
                    'Quarterly_Depreciation': 0,
                    'Complete_Data': False,
                    'Error': 'No facts available'
                })
                continue
            
            # Annual data
            income_stmt_annual = company.income_statement(periods=4, annual=True, as_dataframe=True)
            cash_flow_annual = company.cash_flow(periods=4, annual=True, as_dataframe=True)
            
            # Quarterly data
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
                'Complete_Data': annual_op_count >= 2 and annual_depr_count >= 2,
                'Error': None
            })
            
            # Rate limiting - pause every batch_size requests
            if (i + 1) % batch_size == 0:
                print(f"Completed batch {(i + 1) // batch_size}, pausing...")
                time.sleep(2)
                
        except Exception as e:
            print(f"Error checking {symbol}: {e}")
            results.append({
                'Symbol': symbol,
                'Annual_Op_Income': 0,
                'Annual_Depreciation': 0,
                'Quarterly_Op_Income': 0,
                'Quarterly_Depreciation': 0,
                'Complete_Data': False,
                'Error': str(e)
            })
    
    # Create comprehensive report
    df = pd.DataFrame(results)
    
    # Add index classifications
    classifications = get_stock_classifications()
    df['Primary_Index'] = df['Symbol'].map(lambda x: classifications.get(x, {}).get('primary_index', 'OTHER'))
    df['All_Indices'] = df['Symbol'].map(lambda x: ','.join(classifications.get(x, {}).get('indices', [])))
    
    # Summary statistics
    total_stocks = len(df)
    complete_data = len(df[df['Complete_Data'] == True])
    by_index = df.groupby('Primary_Index')['Complete_Data'].agg(['count', 'sum']).reset_index()
    by_index.columns = ['Index', 'Total', 'Complete']
    by_index['Percentage'] = (by_index['Complete'] / by_index['Total'] * 100).round(1)
    
    print(f"\n=== DATA AVAILABILITY SUMMARY ===")
    print(f"Total stocks analyzed: {total_stocks}")
    print(f"Stocks with complete data: {complete_data} ({complete_data/total_stocks*100:.1f}%)")
    print(f"\nBy Index:")
    print(by_index.to_string(index=False))
    
    # Save detailed report
    df.to_csv('stock_data_availability_report.csv', index=False)
    by_index.to_csv('availability_summary_by_index.csv', index=False)
    
    print(f"\nReports saved:")
    print(f"- stock_data_availability_report.csv")
    print(f"- availability_summary_by_index.csv")
    
    return df

def get_ebitda_combined(ticker=None, batch_size=5):
    """Returns EBITDA for companies using both annual and quarterly data with batch processing"""
    
    if ticker is None:
        # Get stocks with complete data from availability check
        try:
            availability_df = pd.read_csv('stock_data_availability_report.csv')
            ticker = availability_df[availability_df['Complete_Data'] == True]['Symbol'].tolist()
            print(f"Using {len(ticker)} stocks with complete data from availability report")
        except FileNotFoundError:
            print("No availability report found, using sample stocks")
            ticker = ['AAPL', 'MSFT', 'GOOGL']
    
    portfolio_data = []
    total_stocks = len(ticker)
    classifications = get_stock_classifications()
    
    print(f"Processing EBITDA data for {total_stocks} stocks...")
    
    for idx, i in enumerate(ticker):
        try:
            print(f"Processing {i} ({idx+1}/{total_stocks})")
            
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
                'data_quality': 'complete',
                'indices': classifications.get(i.upper(), {}).get('indices', []),
                'primary_index': classifications.get(i.upper(), {}).get('primary_index', 'OTHER')
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
                            
                            # Store quarterly data with annualized flag for portfolio calculations
                            company_data['quarterly_data'].append({
                                'period': period,
                                'operating_income': float(op_income),
                                'depreciation': float(depreciation),
                                'ebitda': float(ebitda),
                                'ebitda_annualized': float(ebitda * 4),  # Annualized for comparison
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
            
            # Rate limiting
            if (idx + 1) % batch_size == 0:
                print(f"Completed batch {(idx + 1) // batch_size}, pausing...")
                time.sleep(2)
                
        except Exception as e:
            print(f"Error processing {i}: {e}")
    
    # Save web-ready JSON with index information
    with open('portfolio_ebitda_data.json', 'w') as f:
        json.dump(portfolio_data, f, indent=2)
    
    # Create summary by index
    summary_by_index = {}
    for company in portfolio_data:
        primary_index = company['primary_index']
        if primary_index not in summary_by_index:
            summary_by_index[primary_index] = {
                'count': 0,
                'total_ebitda': 0,
                'avg_growth': 0,
                'companies': []
            }
        
        summary_by_index[primary_index]['count'] += 1
        summary_by_index[primary_index]['total_ebitda'] += company['latest_ebitda'] or 0
        summary_by_index[primary_index]['companies'].append(company['symbol'])
        
        if company['ebitda_growth']:
            summary_by_index[primary_index]['avg_growth'] += company['ebitda_growth']
    
    # Calculate averages
    for index_data in summary_by_index.values():
        if index_data['count'] > 0:
            index_data['avg_growth'] = index_data['avg_growth'] / index_data['count']
    
    with open('portfolio_summary_by_index.json', 'w') as f:
        json.dump(summary_by_index, f, indent=2)
    
    print(f"\nGenerated portfolio data for {len(portfolio_data)} companies")
    print(f"Summary by index saved to portfolio_summary_by_index.json")
    
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