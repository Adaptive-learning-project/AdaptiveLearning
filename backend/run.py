#!/usr/bin/env python
"""
Backend starter script
"""
import uvicorn
import os

if __name__ == "__main__":
    print("Starting Adaptive Learning Backend...")
    print("Listening on http://0.0.0.0:5000")
    print("Press Ctrl+C to stop")
    
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=5000,
        reload=True,
        log_level="info"
    )
