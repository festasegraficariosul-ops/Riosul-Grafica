#!/usr/bin/env python3
"""
Direct Backend CORS Test - Tests localhost:8001 to verify backend CORS configuration
"""

import requests
import sys

BACKEND_URL = "http://localhost:8001/api"
FRONTEND_ORIGIN = "https://eb37b9d8-61b4-46ff-bf7b-5fcd9d03495c.preview.emergentagent.com"
ADMIN_EMAIL = "festasegraficariosul@gmail.com"
ADMIN_PASSWORD = "02578491"

print("=" * 80)
print("DIRECT BACKEND CORS TEST (localhost:8001)")
print("=" * 80)
print(f"Testing: {BACKEND_URL}")
print(f"Origin: {FRONTEND_ORIGIN}")
print("=" * 80)
print()

# Test 1: OPTIONS preflight
print("TEST 1: OPTIONS Preflight Request")
print("-" * 80)
try:
    headers = {
        "Origin": FRONTEND_ORIGIN,
        "Access-Control-Request-Method": "POST",
        "Access-Control-Request-Headers": "content-type"
    }
    
    response = requests.options(
        f"{BACKEND_URL}/auth/login",
        headers=headers,
        timeout=10
    )
    
    print(f"Status Code: {response.status_code}")
    print(f"Access-Control-Allow-Origin: {response.headers.get('Access-Control-Allow-Origin')}")
    print(f"Access-Control-Allow-Credentials: {response.headers.get('Access-Control-Allow-Credentials')}")
    print(f"Access-Control-Allow-Methods: {response.headers.get('Access-Control-Allow-Methods')}")
    print(f"Access-Control-Allow-Headers: {response.headers.get('Access-Control-Allow-Headers')}")
    
    if response.status_code == 200:
        print("✅ OPTIONS preflight: PASS")
    else:
        print(f"❌ OPTIONS preflight: FAIL (status {response.status_code})")
        
    if response.headers.get('Access-Control-Allow-Origin') == FRONTEND_ORIGIN:
        print("✅ Allow-Origin header: CORRECT")
    else:
        print(f"❌ Allow-Origin header: INCORRECT or MISSING")
        
    if response.headers.get('Access-Control-Allow-Credentials') == 'true':
        print("✅ Allow-Credentials header: CORRECT")
    else:
        print(f"❌ Allow-Credentials header: INCORRECT")
        
except Exception as e:
    print(f"❌ Exception: {e}")

print()

# Test 2: POST login with Origin header
print("TEST 2: POST Login Request with Origin Header")
print("-" * 80)
try:
    headers = {
        "Origin": FRONTEND_ORIGIN,
        "Content-Type": "application/json"
    }
    
    response = requests.post(
        f"{BACKEND_URL}/auth/login",
        json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        },
        headers=headers,
        timeout=10
    )
    
    print(f"Status Code: {response.status_code}")
    print(f"Access-Control-Allow-Origin: {response.headers.get('Access-Control-Allow-Origin')}")
    print(f"Access-Control-Allow-Credentials: {response.headers.get('Access-Control-Allow-Credentials')}")
    
    if response.status_code == 200:
        print("✅ POST login: PASS")
        data = response.json()
        print(f"   Role: {data.get('role')}")
        print(f"   Email: {data.get('email')}")
    else:
        print(f"❌ POST login: FAIL (status {response.status_code})")
        
    if response.headers.get('Access-Control-Allow-Origin') == FRONTEND_ORIGIN:
        print("✅ Allow-Origin header on POST: CORRECT")
    else:
        print(f"❌ Allow-Origin header on POST: INCORRECT or MISSING")
        
except Exception as e:
    print(f"❌ Exception: {e}")

print()
print("=" * 80)
print("CONCLUSION:")
print("If all tests above pass, the backend CORS configuration is correct.")
print("If public URL tests fail but these pass, the issue is with the ingress/proxy.")
print("=" * 80)
