"""
Stock universe definitions for portfolio analysis
"""

# S&P 500 Top 30% (Top 150 by market cap)
SP500_TOP30 = [
    'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'META', 'TSLA', 'BRK.B', 'LLY', 'AVGO',
    'JPM', 'WMT', 'V', 'UNH', 'XOM', 'ORCL', 'MA', 'HD', 'PG', 'JNJ',
    'COST', 'ABBV', 'NFLX', 'CRM', 'BAC', 'CVX', 'AMD', 'KO', 'PEP', 'TMO',
    'ADBE', 'MRK', 'ACN', 'CSCO', 'LIN', 'ABT', 'DHR', 'VZ', 'TXN', 'QCOM',
    'PM', 'SPGI', 'INTU', 'CMCSA', 'NOW', 'RTX', 'CAT', 'UBER', 'GS', 'HON',
    'IBM', 'AMGN', 'LOW', 'NEE', 'AMAT', 'SYK', 'PFE', 'T', 'BKNG', 'AXP',
    'BLK', 'DE', 'MDT', 'ELV', 'GILD', 'TJX', 'VRTX', 'ADI', 'LRCX', 'AMT',
    'SCHW', 'MU', 'ADP', 'PANW', 'C', 'TMUS', 'SHW', 'EOG', 'BSX', 'KLAC',
    'ICE', 'PLD', 'SO', 'CME', 'ITW', 'DUK', 'ZTS', 'APH', 'MMC', 'EQIX',
    'AON', 'CL', 'SNPS', 'MSI', 'FCX', 'EMR', 'WM', 'CDNS', 'FI', 'MAR',
    'TGT', 'PSA', 'NXPI', 'ROP', 'ORLY', 'GM', 'APD', 'ADSK', 'SLB', 'PCAR',
    'KMB', 'MNST', 'ROST', 'PAYX', 'FAST', 'VRSK', 'EXC', 'CTSH', 'ODFL', 'A',
    'CTAS', 'MCHP', 'KR', 'DXCM', 'FTNT', 'EA', 'IDXX', 'LULU', 'EW', 'BIIB',
    'XEL', 'ANSS', 'ON', 'FANG', 'MPWR', 'ALGN', 'KEYS', 'IEX', 'ENPH', 'CDW',
    'SMCI', 'DECK', 'ZBRA', 'NTAP', 'SWKS', 'EPAM', 'VICI', 'JBHT', 'NDSN', 'POOL'
]

# NASDAQ 100 Top 30% (Top 30)
NASDAQ100_TOP30 = [
    'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'META', 'TSLA', 'AVGO', 'COST', 'NFLX',
    'AMD', 'QCOM', 'INTU', 'CMCSA', 'HON', 'AMGN', 'TXN', 'AMAT', 'ISRG', 'BKNG',
    'ADP', 'GILD', 'VRTX', 'ADI', 'LRCX', 'PANW', 'KLAC', 'SNPS', 'CDNS', 'ORLY'
]

# Dow Jones Industrial Average (All 30)
DOW_INDUSTRIALS = [
    'AAPL', 'MSFT', 'UNH', 'GS', 'HD', 'CAT', 'SHW', 'MCD', 'V', 'AXP',
    'BA', 'TRV', 'JPM', 'JNJ', 'WMT', 'PG', 'CVX', 'MRK', 'KO', 'CSCO',
    'IBM', 'DIS', 'MMM', 'DOW', 'NKE', 'CRM', 'HON', 'AMGN', 'VZ', 'INTC'
]

def get_all_stocks():
    """Get combined unique list of all stocks"""
    all_stocks = set(SP500_TOP30 + NASDAQ100_TOP30 + DOW_INDUSTRIALS)
    return sorted(list(all_stocks))

def get_stock_classifications():
    """Get stock classifications by index"""
    classifications = {}
    
    for symbol in get_all_stocks():
        indices = []
        if symbol in SP500_TOP30:
            indices.append('SP500_TOP30')
        if symbol in NASDAQ100_TOP30:
            indices.append('NASDAQ100_TOP30')
        if symbol in DOW_INDUSTRIALS:
            indices.append('DOW')
        
        classifications[symbol] = {
            'symbol': symbol,
            'indices': indices,
            'primary_index': indices[0] if indices else 'OTHER'
        }
    
    return classifications

def filter_by_index(index_name):
    """Filter stocks by specific index"""
    if index_name == 'SP500_TOP30':
        return SP500_TOP30
    elif index_name == 'NASDAQ100_TOP30':
        return NASDAQ100_TOP30
    elif index_name == 'DOW':
        return DOW_INDUSTRIALS
    else:
        return get_all_stocks()

if __name__ == '__main__':
    all_stocks = get_all_stocks()
    print(f"Total unique stocks: {len(all_stocks)}")
    print(f"S&P 500 Top 30%: {len(SP500_TOP30)}")
    print(f"NASDAQ 100 Top 30%: {len(NASDAQ100_TOP30)}")
    print(f"Dow Industrials: {len(DOW_INDUSTRIALS)}")
    
    classifications = get_stock_classifications()
    print(f"\nSample classifications:")
    for symbol in ['AAPL', 'GOOGL', 'CAT']:
        print(f"{symbol}: {classifications[symbol]['indices']}")