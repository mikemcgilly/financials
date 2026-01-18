import yfinance as yf
from datetime import datetime, timedelta

def get_stock_data(symbol):
    """Get current stock price and basic info"""
    try:
        ticker = yf.Ticker(symbol)
        info = ticker.info
        return {
            'symbol': symbol,
            'current_price': info.get('currentPrice', 0),
            'company_name': info.get('longName', symbol),
            'market_cap': info.get('marketCap', 0),
            'pe_ratio': info.get('trailingPE', 0)
        }
    except:
        return {'symbol': symbol, 'current_price': 0, 'company_name': symbol, 'market_cap': 0, 'pe_ratio': 0}

def get_stock_history(symbol, period='6mo'):
    """Get historical stock prices"""
    try:
        ticker = yf.Ticker(symbol)
        hist = ticker.history(period=period)
        return [{
            'date': date.strftime('%Y-%m-%d'),
            'price': round(row['Close'], 2)
        } for date, row in hist.iterrows()]
    except:
        return []