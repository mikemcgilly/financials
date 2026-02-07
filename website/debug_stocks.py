from edgar import set_identity, Company
import pandas as pd

set_identity("mikemcgilly@gmail.com")

symbols = ['GS', 'JPM', 'CVX', 'BRK.B', 'BAC', 'AXP']

for symbol in symbols:
    print(f"\n{'='*60}")
    print(f"Testing {symbol}")
    print('='*60)
    
    try:
        company = Company(symbol.upper())
        print(f"Company Name: {company.name}")
        
        # Test annual data
        income_annual = company.income_statement(periods=4, annual=True, as_dataframe=True)
        cash_annual = company.cash_flow(periods=4, annual=True, as_dataframe=True)
        
        print(f"\nAnnual Income Statement: {'YES' if income_annual is not None else 'NO'}")
        if income_annual is not None:
            print(f"  Columns: {list(income_annual.columns)}")
            print(f"  Labels: {income_annual['label'].tolist()[:10]}")
            
            # Check for operating income
            op_income = income_annual[income_annual['label'].str.contains('Operating Income|Income from Operations|Operating Profit', case=False, na=False)]
            
            # If no operating income found, try pre-tax income (common for financial companies)
            if op_income.empty:
                op_income = income_annual[income_annual['label'].str.contains('Income.*from Continuing Operations before.*Tax', case=False, na=False, regex=True)]
            
            # If still empty, try total revenue (for financial companies)
            if op_income.empty:
                op_income = income_annual[income_annual['label'].str.contains('^Total Revenue$', case=False, na=False, regex=True)]
            
            print(f"  Operating Income rows found: {len(op_income)}")
            if not op_income.empty:
                print(f"    Label: {op_income['label'].iloc[0]}")
                year_cols = [col for col in op_income.columns if 'FY' in str(col)]
                print(f"    Year columns: {year_cols}")
        
        print(f"\nAnnual Cash Flow: {'YES' if cash_annual is not None else 'NO'}")
        if cash_annual is not None:
            print(f"  Columns: {list(cash_annual.columns)}")
            print(f"  Labels: {cash_annual['label'].tolist()[:10]}")
            
            # Check for depreciation
            depreciation = cash_annual[cash_annual['label'].str.contains('Depreciation|Amortization', case=False, na=False)]
            print(f"  Depreciation rows found: {len(depreciation)}")
            if not depreciation.empty:
                print(f"    Label: {depreciation['label'].iloc[0]}")
        
        # Test quarterly data
        income_quarterly = company.income_statement(periods=8, annual=False, as_dataframe=True)
        cash_quarterly = company.cash_flow(periods=8, annual=False, as_dataframe=True)
        
        print(f"\nQuarterly Income Statement: {'YES' if income_quarterly is not None else 'NO'}")
        if income_quarterly is not None:
            print(f"  Columns: {list(income_quarterly.columns)}")
            
        print(f"\nQuarterly Cash Flow: {'YES' if cash_quarterly is not None else 'NO'}")
        if cash_quarterly is not None:
            print(f"  Columns: {list(cash_quarterly.columns)}")
            
    except Exception as e:
        print(f"ERROR: {e}")
