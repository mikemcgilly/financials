#!/usr/bin/env python3
"""
Simple HTTP server to serve the static site locally.
Run this script and open http://localhost:8000 in your browser.
"""

import http.server
import socketserver
import os
import webbrowser

PORT = 8000

# Change to the directory containing the HTML files
os.chdir(os.path.dirname(os.path.abspath(__file__)))

Handler = http.server.SimpleHTTPRequestHandler

with socketserver.TCPServer(("", PORT), Handler) as httpd:
    print(f"Serving at http://localhost:{PORT}")
    print("Press Ctrl+C to stop the server")
    
    # Automatically open the browser
    webbrowser.open(f'http://localhost:{PORT}')
    
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nServer stopped.")