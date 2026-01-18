from edgar import set_identity, Company
from stock_service import get_stock_data, get_stock_history
import json

def get_company_complete_data(symbol):
    """Get combined EBITDA and stock data for a company"""
    set_identity("mikemcgilly@gmail.com")
    
    try:
        # Get EBITDA data
        company = Company(symbol)
        ebitda_data = get_single_company_ebitda(symbol)
        
        # Get stock data
        stock_data = get_stock_data(symbol)
        stock_history = get_stock_history(symbol)
        
        return {
            'symbol': symbol,
            'company_name': ebitda_data.get('company_name', stock_data.get('company_name', symbol)),
            'ebitda_data': ebitda_data,
            'stock_data': stock_data,
            'stock_history': stock_history
        }
    except Exception as e:
        return {'error': str(e), 'symbol': symbol}

def get_single_company_ebitda(symbol):
    """Get EBITDA data for a single company"""
    try:
        company = Company(symbol)
        set_identity("mikemcgilly@gmail.com")
        
        # Get financial data
        income_stmt_annual = company.income_statement(periods=4, annual=True, as_dataframe=True)
        cash_flow_annual = company.cash_flow(periods=4, annual=True, as_dataframe=True)
        income_stmt_quarterly = company.income_statement(periods=8, annual=False, as_dataframe=True)
        cash_flow_quarterly = company.cash_flow(periods=8, annual=False, as_dataframe=True)
        
        company_data = {
            'symbol': symbol,
            'company_name': company.name,
            'annual_data': [],
            'quarterly_data': [],
            'quarterly_annualized': []
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
                        
                        # Quarterly actual data
                        company_data['quarterly_data'].append({
                            'period': period,
                            'operating_income': float(op_income),
                            'depreciation': float(depreciation),
                            'ebitda': float(ebitda),
                            'period_type': 'quarterly'
                        })
                        
                        # Annualized quarterly data
                        company_data['quarterly_annualized'].append({
                            'period': period + ' (Annualized)',
                            'operating_income': float(op_income * 4),
                            'depreciation': float(depreciation * 4),
                            'ebitda': float(ebitda * 4),
                            'period_type': 'quarterly_annualized'
                        })
        
        return company_data
    except Exception as e:
        return {'error': str(e), 'symbol': symbol}