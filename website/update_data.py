import os
import json
from datetime import datetime, timedelta
from generate_portfolio_data import generate_portfolio_data

def needs_update():
    """Check if data needs updating"""
    data_file = 'cloudflare/data/portfolio_ebitda_data.json'
    
    # Check if file exists and age
    if not os.path.exists(data_file):
        return True, "File doesn't exist"
    
    # Check file age (update weekly)
    file_time = datetime.fromtimestamp(os.path.getmtime(data_file))
    if datetime.now() - file_time > timedelta(days=7):
        return True, f"File is {(datetime.now() - file_time).days} days old"
    
    # Check if we're in a new quarter
    now = datetime.now()
    current_quarter = f"Q{(now.month-1)//3+1} {now.year}"
    
    try:
        with open(data_file, 'r') as f:
            data = json.load(f)
        
        # Check if any company has current quarter data
        has_current = False
        for company in data:
            for period in company.get('quarterly_data', []):
                if period['period'] == current_quarter:
                    has_current = True
                    break
            if has_current:
                break
        
        if not has_current:
            return True, f"Missing current quarter {current_quarter}"
            
    except Exception as e:
        return True, f"Error reading file: {e}"
    
    return False, "Data is current"

def update_data():
    """Update the portfolio data"""
    should_update, reason = needs_update()
    
    if should_update:
        print(f"Updating data: {reason}")
        data = generate_portfolio_data()
        print(f"Updated with {len(data)} companies")
        return True
    else:
        print(f"No update needed: {reason}")
        return False

if __name__ == '__main__':
    update_data()