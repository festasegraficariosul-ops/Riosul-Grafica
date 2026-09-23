#!/usr/bin/env python3
"""
Backend API Test Suite for Rio Sul Gráfica
Tests admin restoration flow as requested
"""

import requests
import sys
import json

# Configuration
BASE_URL = "https://eb37b9d8-61b4-46ff-bf7b-5fcd9d03495c.preview.emergentagent.com/api"
FRONTEND_ORIGIN = "https://eb37b9d8-61b4-46ff-bf7b-5fcd9d03495c.preview.emergentagent.com"
ADMIN_EMAIL = "festasegraficariosul@gmail.com"
ADMIN_PASSWORD = "02578491"

# Test results
results = {
    "passed": [],
    "failed": [],
    "total": 0
}

def log_test(name, passed, details=""):
    """Log test result"""
    results["total"] += 1
    if passed:
        results["passed"].append(name)
        print(f"✅ PASS: {name}")
        if details:
            print(f"   {details}")
    else:
        results["failed"].append(name)
        print(f"❌ FAIL: {name}")
        if details:
            print(f"   {details}")

def test_backend_health():
    """Test 1: Confirm backend is responding"""
    try:
        # Try to hit a public endpoint or just check if server responds
        response = requests.get(f"{BASE_URL.replace('/api', '')}/", timeout=10)
        # Any response (even 404) means server is up
        log_test("Backend Health Check", True, f"Backend is responding (status: {response.status_code})")
        return True
    except Exception as e:
        log_test("Backend Health Check", False, f"Backend not responding: {str(e)}")
        return False

def test_cors_preflight():
    """Test 2: CORS preflight for POST /api/auth/login"""
    try:
        # Send OPTIONS request with Origin header (simulating browser preflight)
        headers = {
            "Origin": FRONTEND_ORIGIN,
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "content-type"
        }
        
        response = requests.options(
            f"{BASE_URL}/auth/login",
            headers=headers,
            timeout=10
        )
        
        # Check status code (should be 200 for successful preflight)
        if response.status_code != 200:
            log_test("CORS Preflight - Status Code", False, 
                    f"Expected 200, got {response.status_code}")
            return False
        
        log_test("CORS Preflight - Status Code", True, "Received 200 OK")
        
        # Check Access-Control-Allow-Origin header
        allow_origin = response.headers.get("Access-Control-Allow-Origin")
        if not allow_origin:
            log_test("CORS Preflight - Allow-Origin Header", False, 
                    "Access-Control-Allow-Origin header not present")
            return False
        
        if allow_origin != FRONTEND_ORIGIN:
            log_test("CORS Preflight - Allow-Origin Value", False, 
                    f"Expected '{FRONTEND_ORIGIN}', got '{allow_origin}'")
        else:
            log_test("CORS Preflight - Allow-Origin Value", True, 
                    f"Correct origin: {allow_origin}")
        
        # Check Access-Control-Allow-Credentials header
        allow_credentials = response.headers.get("Access-Control-Allow-Credentials")
        if not allow_credentials:
            log_test("CORS Preflight - Allow-Credentials Header", False, 
                    "Access-Control-Allow-Credentials header not present")
        elif allow_credentials.lower() != "true":
            log_test("CORS Preflight - Allow-Credentials Value", False, 
                    f"Expected 'true', got '{allow_credentials}'")
        else:
            log_test("CORS Preflight - Allow-Credentials Value", True, 
                    "Credentials enabled: true")
        
        # Check Access-Control-Allow-Methods
        allow_methods = response.headers.get("Access-Control-Allow-Methods")
        if allow_methods:
            log_test("CORS Preflight - Allow-Methods Header", True, 
                    f"Methods: {allow_methods}")
        else:
            log_test("CORS Preflight - Allow-Methods Header", False, 
                    "Access-Control-Allow-Methods header not present")
        
        # Check Access-Control-Allow-Headers
        allow_headers = response.headers.get("Access-Control-Allow-Headers")
        if allow_headers:
            log_test("CORS Preflight - Allow-Headers Header", True, 
                    f"Headers: {allow_headers}")
        else:
            log_test("CORS Preflight - Allow-Headers Header", False, 
                    "Access-Control-Allow-Headers header not present")
        
        return True
        
    except Exception as e:
        log_test("CORS Preflight - Request", False, f"Exception: {str(e)}")
        return False

def test_admin_login():
    """Test 3: Admin login with restored credentials"""
    try:
        # Include Origin header to simulate real browser request
        headers = {
            "Origin": FRONTEND_ORIGIN,
            "Content-Type": "application/json"
        }
        
        response = requests.post(
            f"{BASE_URL}/auth/login",
            json={
                "email": ADMIN_EMAIL,
                "password": ADMIN_PASSWORD
            },
            headers=headers,
            timeout=10
        )
        
        # Check status code
        if response.status_code != 200:
            log_test("Admin Login - Status Code", False, 
                    f"Expected 200, got {response.status_code}. Response: {response.text}")
            return None
        
        log_test("Admin Login - Status Code", True, "Received 200 OK")
        
        # Check CORS headers on actual POST request
        allow_origin = response.headers.get("Access-Control-Allow-Origin")
        if allow_origin == FRONTEND_ORIGIN:
            log_test("Admin Login - CORS Allow-Origin", True, f"Correct origin: {allow_origin}")
        else:
            log_test("Admin Login - CORS Allow-Origin", False, 
                    f"Expected '{FRONTEND_ORIGIN}', got '{allow_origin}'")
        
        allow_credentials = response.headers.get("Access-Control-Allow-Credentials")
        if allow_credentials and allow_credentials.lower() == "true":
            log_test("Admin Login - CORS Allow-Credentials", True, "Credentials enabled")
        else:
            log_test("Admin Login - CORS Allow-Credentials", False, 
                    f"Expected 'true', got '{allow_credentials}'")
        
        # Parse response
        try:
            data = response.json()
        except:
            log_test("Admin Login - JSON Response", False, "Response is not valid JSON")
            return None
        
        log_test("Admin Login - JSON Response", True, "Valid JSON response received")
        
        # Check role
        role = data.get("role")
        if role != "admin":
            log_test("Admin Login - Role Check", False, 
                    f"Expected role='admin', got role='{role}'")
        else:
            log_test("Admin Login - Role Check", True, "Role is 'admin'")
        
        # Check identity (email)
        email = data.get("email")
        if email != ADMIN_EMAIL:
            log_test("Admin Login - Email Identity", False, 
                    f"Expected email='{ADMIN_EMAIL}', got email='{email}'")
        else:
            log_test("Admin Login - Email Identity", True, f"Email matches: {email}")
        
        # Check for access_token
        access_token = data.get("access_token")
        if not access_token:
            log_test("Admin Login - Access Token", False, "No access_token in response")
            return None
        
        log_test("Admin Login - Access Token", True, "Access token received")
        
        # Check for user ID
        user_id = data.get("id")
        if not user_id:
            log_test("Admin Login - User ID", False, "No user ID in response")
        else:
            log_test("Admin Login - User ID", True, f"User ID: {user_id}")
        
        # Check for name
        name = data.get("name")
        if not name:
            log_test("Admin Login - User Name", False, "No name in response")
        else:
            log_test("Admin Login - User Name", True, f"Name: {name}")
        
        return {
            "access_token": access_token,
            "cookies": response.cookies,
            "user_id": user_id,
            "email": email,
            "role": role,
            "name": name
        }
        
    except Exception as e:
        log_test("Admin Login - Request", False, f"Exception: {str(e)}")
        return None

def test_auth_me(auth_data):
    """Test 4: Validate GET /api/auth/me with token"""
    if not auth_data:
        log_test("Auth Me - Skipped", False, "No auth data from login")
        return False
    
    try:
        # Test with Bearer token in Authorization header
        headers = {
            "Authorization": f"Bearer {auth_data['access_token']}"
        }
        
        response = requests.get(
            f"{BASE_URL}/auth/me",
            headers=headers,
            timeout=10
        )
        
        if response.status_code != 200:
            log_test("Auth Me - Status Code", False, 
                    f"Expected 200, got {response.status_code}. Response: {response.text}")
            return False
        
        log_test("Auth Me - Status Code", True, "Received 200 OK")
        
        try:
            data = response.json()
        except:
            log_test("Auth Me - JSON Response", False, "Response is not valid JSON")
            return False
        
        log_test("Auth Me - JSON Response", True, "Valid JSON response received")
        
        # Verify the data matches login response
        if data.get("email") != auth_data["email"]:
            log_test("Auth Me - Email Match", False, 
                    f"Email mismatch: expected '{auth_data['email']}', got '{data.get('email')}'")
        else:
            log_test("Auth Me - Email Match", True, "Email matches login response")
        
        if data.get("role") != "admin":
            log_test("Auth Me - Role Check", False, 
                    f"Expected role='admin', got role='{data.get('role')}'")
        else:
            log_test("Auth Me - Role Check", True, "Role is 'admin'")
        
        if data.get("id") != auth_data["user_id"]:
            log_test("Auth Me - User ID Match", False, 
                    f"User ID mismatch: expected '{auth_data['user_id']}', got '{data.get('id')}'")
        else:
            log_test("Auth Me - User ID Match", True, "User ID matches login response")
        
        return True
        
    except Exception as e:
        log_test("Auth Me - Request", False, f"Exception: {str(e)}")
        return False

def test_no_duplicate_users(auth_data):
    """Test 5: Check that admin user is not duplicated (optional)"""
    if not auth_data:
        log_test("No Duplicate Users - Skipped", False, "No auth data from login")
        return False
    
    try:
        # Use the admin token to list all users
        headers = {
            "Authorization": f"Bearer {auth_data['access_token']}"
        }
        
        response = requests.get(
            f"{BASE_URL}/users",
            headers=headers,
            timeout=10
        )
        
        if response.status_code != 200:
            log_test("No Duplicate Users - API Access", False, 
                    f"Could not access /users endpoint: {response.status_code}")
            return False
        
        log_test("No Duplicate Users - API Access", True, "Successfully accessed /users endpoint")
        
        try:
            users = response.json()
        except:
            log_test("No Duplicate Users - JSON Response", False, "Response is not valid JSON")
            return False
        
        # Count admin users with the same email
        admin_users = [u for u in users if u.get("email") == ADMIN_EMAIL]
        
        if len(admin_users) == 0:
            log_test("No Duplicate Users - Admin Exists", False, 
                    f"No admin user found with email {ADMIN_EMAIL}")
            return False
        elif len(admin_users) > 1:
            log_test("No Duplicate Users - No Duplicates", False, 
                    f"Found {len(admin_users)} users with email {ADMIN_EMAIL} (duplicates exist)")
            return False
        else:
            log_test("No Duplicate Users - No Duplicates", True, 
                    f"Exactly 1 admin user found with email {ADMIN_EMAIL}")
            
            # Verify it's the same user we logged in as
            admin_user = admin_users[0]
            if admin_user.get("id") != auth_data["user_id"]:
                log_test("No Duplicate Users - User ID Match", False, 
                        f"Admin user ID mismatch: expected '{auth_data['user_id']}', got '{admin_user.get('id')}'")
            else:
                log_test("No Duplicate Users - User ID Match", True, 
                        "Admin user ID matches logged-in user")
            
            return True
        
    except Exception as e:
        log_test("No Duplicate Users - Request", False, f"Exception: {str(e)}")
        return False

def main():
    """Run all tests"""
    print("=" * 80)
    print("BACKEND TEST SUITE - CORS Fix & Admin Login Validation")
    print("=" * 80)
    print(f"Base URL: {BASE_URL}")
    print(f"Frontend Origin: {FRONTEND_ORIGIN}")
    print(f"Admin Email: {ADMIN_EMAIL}")
    print("=" * 80)
    print()
    
    # Test 1: Backend health
    print("TEST 1: Backend Health Check")
    print("-" * 80)
    backend_ok = test_backend_health()
    print()
    
    if not backend_ok:
        print("⚠️  Backend is not responding. Stopping tests.")
        print_summary()
        sys.exit(1)
    
    # Test 2: CORS preflight
    print("TEST 2: CORS Preflight (OPTIONS /api/auth/login)")
    print("-" * 80)
    test_cors_preflight()
    print()
    
    # Test 3: Admin login
    print("TEST 3: Admin Login with CORS Headers")
    print("-" * 80)
    auth_data = test_admin_login()
    print()
    
    # Test 4: Auth me
    print("TEST 4: Authenticated User Info (/auth/me)")
    print("-" * 80)
    test_auth_me(auth_data)
    print()
    
    # Test 5: No duplicate users
    print("TEST 5: No Duplicate Admin Users")
    print("-" * 80)
    test_no_duplicate_users(auth_data)
    print()
    
    # Summary
    print_summary()
    
    # Exit with appropriate code
    if results["failed"]:
        sys.exit(1)
    else:
        sys.exit(0)

def print_summary():
    """Print test summary"""
    print("=" * 80)
    print("TEST SUMMARY")
    print("=" * 80)
    print(f"Total Tests: {results['total']}")
    print(f"Passed: {len(results['passed'])}")
    print(f"Failed: {len(results['failed'])}")
    print()
    
    if results["failed"]:
        print("❌ FAILED TESTS:")
        for test in results["failed"]:
            print(f"   - {test}")
        print()
    
    if results["passed"]:
        print("✅ PASSED TESTS:")
        for test in results["passed"]:
            print(f"   - {test}")
        print()
    
    if not results["failed"]:
        print("🎉 ALL TESTS PASSED!")
    else:
        print("⚠️  SOME TESTS FAILED")
    print("=" * 80)

if __name__ == "__main__":
    main()
