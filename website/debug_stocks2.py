from edgar import set_identity, Company

set_identity("mikemcgilly@gmail.com")

symbols = ['GS', 'JPM', 'CVX']

for symbol in symbols:
    print(f"\n{'='*60}")
    print(f"{symbol} - Income Statement Labels")
    print('='*60)
    
    try:
        company = Company(symbol.upper())
        income_annual = company.income_statement(periods=4, annual=True, as_dataframe=True)
        
        if income_annual is not None:
            print("\nAll labels in income statement:")
            for label in income_annual['label'].tolist():
                print(f"  - {label}")
                
    except Exception as e:
        print(f"ERROR: {e}")
