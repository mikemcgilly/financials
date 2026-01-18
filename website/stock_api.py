from flask import Flask, jsonify, request
from flask_cors import CORS
from stock_service import get_stock_data
import json

app = Flask(__name__)
CORS(app)

@app.route('/api/stock/<symbol>')
def get_stock_price(symbol):
    """Get current stock price for a symbol"""
    try:
        data = get_stock_data(symbol)
        return jsonify(data)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/stocks/batch', methods=['POST'])
def get_batch_stock_prices():
    """Get stock prices for multiple symbols"""
    try:
        symbols = request.json.get('symbols', [])
        results = {}
        for symbol in symbols:
            results[symbol] = get_stock_data(symbol)
        return jsonify(results)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5001)