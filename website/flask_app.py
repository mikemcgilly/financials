from flask import Flask, render_template, jsonify
from data_service import get_company_complete_data, get_single_company_ebitda
from stock_service import get_stock_data, get_stock_history
import json

app = Flask(__name__)

@app.route('/')
def portfolio():
    """Portfolio overview page"""
    try:
        with open('portfolio_ebitda_data.json', 'r') as f:
            portfolio_data = json.load(f)
    except FileNotFoundError:
        portfolio_data = []
    return render_template('index.html', portfolio_data=portfolio_data)

@app.route('/company/<symbol>')
def company_detail(symbol):
    """Individual company detail page"""
    company_data = get_company_complete_data(symbol.upper())
    return render_template('company.html', company_data=company_data)

@app.route('/api/company/<symbol>')
def api_company_data(symbol):
    """API endpoint for company EBITDA data"""
    return jsonify(get_single_company_ebitda(symbol.upper()))

@app.route('/api/stock/<symbol>')
def api_stock_data(symbol):
    """API endpoint for stock data"""
    stock_data = get_stock_data(symbol.upper())
    stock_history = get_stock_history(symbol.upper())
    return jsonify({
        'current': stock_data,
        'history': stock_history
    })

if __name__ == '__main__':
    app.run(debug=True)