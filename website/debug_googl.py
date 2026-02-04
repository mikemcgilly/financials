from edgar import set_identity, Company

set_identity("mikemcgilly@gmail.com")
company = Company('GOOGL')

print("GOOGL Quarterly Income Statement Columns:")
income_quarterly = company.income_statement(periods=8, annual=False, as_dataframe=True)
if income_quarterly is not None:
    quarter_cols = [col for col in income_quarterly.columns if 'Q' in str(col)]
    print(sorted(quarter_cols, reverse=True))
else:
    print("No quarterly income data")

print("\nGOOGL Quarterly Cash Flow Columns:")
cash_quarterly = company.cash_flow(periods=8, annual=False, as_dataframe=True)
if cash_quarterly is not None:
    quarter_cols = [col for col in cash_quarterly.columns if 'Q' in str(col)]
    print(sorted(quarter_cols, reverse=True))
else:
    print("No quarterly cash flow data")