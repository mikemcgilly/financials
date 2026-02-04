from edgar import set_identity, Company

def check_available_periods(symbol):
    set_identity("mikemcgilly@gmail.com")
    company = Company(symbol)
    
    # Get quarterly data
    income_quarterly = company.income_statement(periods=8, annual=False, as_dataframe=True)
    
    if income_quarterly is not None:
        quarter_cols = [col for col in income_quarterly.columns if 'Q' in str(col)]
        print(f"{symbol} available quarterly periods:")
        for period in sorted(quarter_cols, reverse=True):
            print(f"  {period}")
    else:
        print(f"No quarterly data found for {symbol}")

if __name__ == '__main__':
    check_available_periods('GOOGL')