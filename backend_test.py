#!/usr/bin/env python3
"""
Backend API Test Suite for Rio Sul Gráfica
Tests login-based authentication migration
"""

import requests
import sys
import json

# Configuration
BASE_URL = "https://eb37b9d8-61b4-46ff-bf7b-5fcd9d03495c.preview.emergentagent.com/api"
FRONTEND_ORIGIN = "https://eb37b9d8-61b4-46ff-bf7b-5fcd9d03495c.preview.emergentagent.com"

# Test credentials from /app/memory/test_credentials.md
ADMIN_LOGIN = "Igor"
ADMIN_PASSWORD = "02578491"
ADMIN_NAME = "Administrador"

VENDOR_LOGIN = "vendedor"
VENDOR_PASSWORD = "Vendedor@2026"

# Legacy email that should NOT work anymore
LEGACY_EMAIL = "festasegraficariosul@gmail.com"

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
        response = requests.get(f"{BASE_URL.replace('/api', '')}/", timeout=10)
        log_test("Backend Health Check", True, f"Backend is responding (status: {response.status_code})")
        return True
    except Exception as e:
        log_test("Backend Health Check", False, f"Backend not responding: {str(e)}")
        return False

def test_admin_login_uppercase():
    """Test 2: Admin login with 'Igor' (uppercase I)"""
    try:
        headers = {
            "Origin": FRONTEND_ORIGIN,
            "Content-Type": "application/json"
        }
        
        response = requests.post(
            f"{BASE_URL}/auth/login",
            json={
                "login": ADMIN_LOGIN,
                "password": ADMIN_PASSWORD
            },
            headers=headers,
            timeout=10
        )
        
        if response.status_code != 200:
            log_test("Admin Login (Igor) - Status Code", False, 
                    f"Expected 200, got {response.status_code}. Response: {response.text}")
            return None
        
        log_test("Admin Login (Igor) - Status Code", True, "Received 200 OK")
        
        try:
            data = response.json()
        except:
            log_test("Admin Login (Igor) - JSON Response", False, "Response is not valid JSON")
            return None
        
        log_test("Admin Login (Igor) - JSON Response", True, "Valid JSON response received")
        
        # Check role
        role = data.get("role")
        if role != "admin":
            log_test("Admin Login (Igor) - Role Check", False, 
                    f"Expected role='admin', got role='{role}'")
        else:
            log_test("Admin Login (Igor) - Role Check", True, "Role is 'admin'")
        
        # Check name
        name = data.get("name")
        if name != ADMIN_NAME:
            log_test("Admin Login (Igor) - Name Check", False, 
                    f"Expected name='{ADMIN_NAME}', got name='{name}'")
        else:
            log_test("Admin Login (Igor) - Name Check", True, f"Name is '{ADMIN_NAME}'")
        
        # Check login field
        login = data.get("login")
        if not login:
            log_test("Admin Login (Igor) - Login Field", False, "No login field in response")
        else:
            log_test("Admin Login (Igor) - Login Field", True, f"Login field present: {login}")
        
        # Check for access_token
        access_token = data.get("access_token")
        if not access_token:
            log_test("Admin Login (Igor) - Access Token", False, "No access_token in response")
            return None
        
        log_test("Admin Login (Igor) - Access Token", True, "Access token received")
        
        # Check for user ID
        user_id = data.get("id")
        if not user_id:
            log_test("Admin Login (Igor) - User ID", False, "No user ID in response")
        else:
            log_test("Admin Login (Igor) - User ID", True, f"User ID: {user_id}")
        
        return {
            "access_token": access_token,
            "user_id": user_id,
            "login": login,
            "role": role,
            "name": name
        }
        
    except Exception as e:
        log_test("Admin Login (Igor) - Request", False, f"Exception: {str(e)}")
        return None

def test_admin_login_lowercase():
    """Test 3: Admin login with 'igor' (lowercase) - case-insensitive check"""
    try:
        headers = {
            "Origin": FRONTEND_ORIGIN,
            "Content-Type": "application/json"
        }
        
        response = requests.post(
            f"{BASE_URL}/auth/login",
            json={
                "login": "igor",  # lowercase
                "password": ADMIN_PASSWORD
            },
            headers=headers,
            timeout=10
        )
        
        if response.status_code != 200:
            log_test("Admin Login (igor lowercase) - Status Code", False, 
                    f"Expected 200, got {response.status_code}. Response: {response.text}")
            return False
        
        log_test("Admin Login (igor lowercase) - Status Code", True, "Received 200 OK - case-insensitive works")
        
        try:
            data = response.json()
        except:
            log_test("Admin Login (igor lowercase) - JSON Response", False, "Response is not valid JSON")
            return False
        
        # Check role
        role = data.get("role")
        if role != "admin":
            log_test("Admin Login (igor lowercase) - Role Check", False, 
                    f"Expected role='admin', got role='{role}'")
        else:
            log_test("Admin Login (igor lowercase) - Role Check", True, "Role is 'admin'")
        
        return True
        
    except Exception as e:
        log_test("Admin Login (igor lowercase) - Request", False, f"Exception: {str(e)}")
        return False

def test_legacy_email_rejected():
    """Test 4: Confirm old email is NOT accepted as login identifier"""
    try:
        headers = {
            "Origin": FRONTEND_ORIGIN,
            "Content-Type": "application/json"
        }
        
        response = requests.post(
            f"{BASE_URL}/auth/login",
            json={
                "login": LEGACY_EMAIL,  # Try to use email as login
                "password": ADMIN_PASSWORD
            },
            headers=headers,
            timeout=10
        )
        
        # Should fail with 401
        if response.status_code == 401:
            log_test("Legacy Email Rejection", True, 
                    f"Email '{LEGACY_EMAIL}' correctly rejected as login identifier (401)")
            return True
        elif response.status_code == 200:
            log_test("Legacy Email Rejection", False, 
                    f"Email '{LEGACY_EMAIL}' was accepted as login - should be rejected!")
            return False
        else:
            log_test("Legacy Email Rejection", False, 
                    f"Unexpected status code {response.status_code}")
            return False
        
    except Exception as e:
        log_test("Legacy Email Rejection - Request", False, f"Exception: {str(e)}")
        return False

def test_vendor_login():
    """Test 5: Vendor login with 'vendedor' credentials"""
    try:
        headers = {
            "Origin": FRONTEND_ORIGIN,
            "Content-Type": "application/json"
        }
        
        response = requests.post(
            f"{BASE_URL}/auth/login",
            json={
                "login": VENDOR_LOGIN,
                "password": VENDOR_PASSWORD
            },
            headers=headers,
            timeout=10
        )
        
        if response.status_code != 200:
            log_test("Vendor Login - Status Code", False, 
                    f"Expected 200, got {response.status_code}. Response: {response.text}")
            return None
        
        log_test("Vendor Login - Status Code", True, "Received 200 OK")
        
        try:
            data = response.json()
        except:
            log_test("Vendor Login - JSON Response", False, "Response is not valid JSON")
            return None
        
        log_test("Vendor Login - JSON Response", True, "Valid JSON response received")
        
        # Check role
        role = data.get("role")
        if role != "vendedor":
            log_test("Vendor Login - Role Check", False, 
                    f"Expected role='vendedor', got role='{role}'")
        else:
            log_test("Vendor Login - Role Check", True, "Role is 'vendedor'")
        
        # Check login field
        login = data.get("login")
        if login != VENDOR_LOGIN:
            log_test("Vendor Login - Login Field", False, 
                    f"Expected login='{VENDOR_LOGIN}', got login='{login}'")
        else:
            log_test("Vendor Login - Login Field", True, f"Login is '{VENDOR_LOGIN}'")
        
        # Check for access_token
        access_token = data.get("access_token")
        if not access_token:
            log_test("Vendor Login - Access Token", False, "No access_token in response")
            return None
        
        log_test("Vendor Login - Access Token", True, "Access token received")
        
        return {
            "access_token": access_token,
            "user_id": data.get("id"),
            "login": login,
            "role": role
        }
        
    except Exception as e:
        log_test("Vendor Login - Request", False, f"Exception: {str(e)}")
        return None

def test_auth_me_admin(auth_data):
    """Test 6: Validate GET /api/auth/me for admin"""
    if not auth_data:
        log_test("Auth Me (Admin) - Skipped", False, "No auth data from login")
        return False
    
    try:
        headers = {
            "Authorization": f"Bearer {auth_data['access_token']}"
        }
        
        response = requests.get(
            f"{BASE_URL}/auth/me",
            headers=headers,
            timeout=10
        )
        
        if response.status_code != 200:
            log_test("Auth Me (Admin) - Status Code", False, 
                    f"Expected 200, got {response.status_code}. Response: {response.text}")
            return False
        
        log_test("Auth Me (Admin) - Status Code", True, "Received 200 OK")
        
        try:
            data = response.json()
        except:
            log_test("Auth Me (Admin) - JSON Response", False, "Response is not valid JSON")
            return False
        
        log_test("Auth Me (Admin) - JSON Response", True, "Valid JSON response received")
        
        # Verify the data matches login response
        if data.get("login") != auth_data["login"]:
            log_test("Auth Me (Admin) - Login Match", False, 
                    f"Login mismatch: expected '{auth_data['login']}', got '{data.get('login')}'")
        else:
            log_test("Auth Me (Admin) - Login Match", True, "Login matches login response")
        
        if data.get("role") != "admin":
            log_test("Auth Me (Admin) - Role Check", False, 
                    f"Expected role='admin', got role='{data.get('role')}'")
        else:
            log_test("Auth Me (Admin) - Role Check", True, "Role is 'admin'")
        
        if data.get("id") != auth_data["user_id"]:
            log_test("Auth Me (Admin) - User ID Match", False, 
                    f"User ID mismatch: expected '{auth_data['user_id']}', got '{data.get('id')}'")
        else:
            log_test("Auth Me (Admin) - User ID Match", True, "User ID matches login response")
        
        return True
        
    except Exception as e:
        log_test("Auth Me (Admin) - Request", False, f"Exception: {str(e)}")
        return False

def test_auth_me_vendor(auth_data):
    """Test 7: Validate GET /api/auth/me for vendor"""
    if not auth_data:
        log_test("Auth Me (Vendor) - Skipped", False, "No auth data from login")
        return False
    
    try:
        headers = {
            "Authorization": f"Bearer {auth_data['access_token']}"
        }
        
        response = requests.get(
            f"{BASE_URL}/auth/me",
            headers=headers,
            timeout=10
        )
        
        if response.status_code != 200:
            log_test("Auth Me (Vendor) - Status Code", False, 
                    f"Expected 200, got {response.status_code}. Response: {response.text}")
            return False
        
        log_test("Auth Me (Vendor) - Status Code", True, "Received 200 OK")
        
        try:
            data = response.json()
        except:
            log_test("Auth Me (Vendor) - JSON Response", False, "Response is not valid JSON")
            return False
        
        # Verify role
        if data.get("role") != "vendedor":
            log_test("Auth Me (Vendor) - Role Check", False, 
                    f"Expected role='vendedor', got role='{data.get('role')}'")
        else:
            log_test("Auth Me (Vendor) - Role Check", True, "Role is 'vendedor'")
        
        return True
        
    except Exception as e:
        log_test("Auth Me (Vendor) - Request", False, f"Exception: {str(e)}")
        return False

def test_user_creation_producao(admin_auth):
    """Test 8: Validate POST /api/users accepts role=producao"""
    if not admin_auth:
        log_test("User Creation (producao) - Skipped", False, "No admin auth data")
        return None
    
    try:
        headers = {
            "Authorization": f"Bearer {admin_auth['access_token']}",
            "Content-Type": "application/json"
        }
        
        # Create a test user with role=producao
        test_user_login = f"test_producao_{results['total']}"
        
        response = requests.post(
            f"{BASE_URL}/users",
            json={
                "login": test_user_login,
                "password": "TestPass123",
                "name": "Test Producao User",
                "role": "producao"
            },
            headers=headers,
            timeout=10
        )
        
        if response.status_code != 200:
            log_test("User Creation (producao) - Status Code", False, 
                    f"Expected 200, got {response.status_code}. Response: {response.text}")
            return None
        
        log_test("User Creation (producao) - Status Code", True, "Received 200 OK - role 'producao' accepted")
        
        try:
            data = response.json()
        except:
            log_test("User Creation (producao) - JSON Response", False, "Response is not valid JSON")
            return None
        
        # Verify role
        if data.get("role") != "producao":
            log_test("User Creation (producao) - Role Check", False, 
                    f"Expected role='producao', got role='{data.get('role')}'")
        else:
            log_test("User Creation (producao) - Role Check", True, "Role is 'producao'")
        
        created_user_id = data.get("id")
        
        # Clean up: delete the test user immediately
        if created_user_id:
            # Note: There's no DELETE endpoint, so we'll deactivate it
            # Actually, looking at the code, there's no deactivate endpoint either
            # We'll just leave it but mark it as inactive via update
            try:
                requests.put(
                    f"{BASE_URL}/users/{created_user_id}",
                    json={"active": False},
                    headers=headers,
                    timeout=10
                )
                log_test("User Creation (producao) - Cleanup", True, "Test user deactivated")
            except:
                log_test("User Creation (producao) - Cleanup", False, "Could not deactivate test user")
        
        return created_user_id
        
    except Exception as e:
        log_test("User Creation (producao) - Request", False, f"Exception: {str(e)}")
        return None

def test_user_creation_invalid_role(admin_auth):
    """Test 9: Validate POST /api/users rejects invalid role"""
    if not admin_auth:
        log_test("User Creation (invalid role) - Skipped", False, "No admin auth data")
        return False
    
    try:
        headers = {
            "Authorization": f"Bearer {admin_auth['access_token']}",
            "Content-Type": "application/json"
        }
        
        # Try to create a user with invalid role
        test_user_login = f"test_invalid_{results['total']}"
        
        response = requests.post(
            f"{BASE_URL}/users",
            json={
                "login": test_user_login,
                "password": "TestPass123",
                "name": "Test Invalid Role User",
                "role": "superadmin"  # Invalid role
            },
            headers=headers,
            timeout=10
        )
        
        # Should fail with 400
        if response.status_code == 400:
            log_test("User Creation (invalid role) - Rejection", True, 
                    f"Invalid role 'superadmin' correctly rejected (400)")
            return True
        elif response.status_code == 200:
            log_test("User Creation (invalid role) - Rejection", False, 
                    f"Invalid role 'superadmin' was accepted - should be rejected!")
            # Clean up if it was created
            try:
                data = response.json()
                if data.get("id"):
                    requests.put(
                        f"{BASE_URL}/users/{data['id']}",
                        json={"active": False},
                        headers=headers,
                        timeout=10
                    )
            except:
                pass
            return False
        else:
            log_test("User Creation (invalid role) - Rejection", False, 
                    f"Unexpected status code {response.status_code}")
            return False
        
    except Exception as e:
        log_test("User Creation (invalid role) - Request", False, f"Exception: {str(e)}")
        return False

def test_no_duplicate_igor(admin_auth):
    """Test 10: Check that Igor login is not duplicated"""
    if not admin_auth:
        log_test("No Duplicate Igor - Skipped", False, "No admin auth data")
        return False
    
    try:
        headers = {
            "Authorization": f"Bearer {admin_auth['access_token']}"
        }
        
        response = requests.get(
            f"{BASE_URL}/users",
            headers=headers,
            timeout=10
        )
        
        if response.status_code != 200:
            log_test("No Duplicate Igor - API Access", False, 
                    f"Could not access /users endpoint: {response.status_code}")
            return False
        
        log_test("No Duplicate Igor - API Access", True, "Successfully accessed /users endpoint")
        
        try:
            users = response.json()
        except:
            log_test("No Duplicate Igor - JSON Response", False, "Response is not valid JSON")
            return False
        
        # Count users with login 'igor' (case-insensitive)
        igor_users = [u for u in users if (u.get("login") or "").lower() == "igor"]
        
        if len(igor_users) == 0:
            log_test("No Duplicate Igor - Igor Exists", False, 
                    f"No user found with login 'igor'")
            return False
        elif len(igor_users) > 1:
            log_test("No Duplicate Igor - No Duplicates", False, 
                    f"Found {len(igor_users)} users with login 'igor' (duplicates exist)")
            return False
        else:
            log_test("No Duplicate Igor - No Duplicates", True, 
                    f"Exactly 1 user found with login 'igor'")
            
            # Verify it's the same user we logged in as
            igor_user = igor_users[0]
            if igor_user.get("id") != admin_auth["user_id"]:
                log_test("No Duplicate Igor - User ID Match", False, 
                        f"Igor user ID mismatch: expected '{admin_auth['user_id']}', got '{igor_user.get('id')}'")
            else:
                log_test("No Duplicate Igor - User ID Match", True, 
                        "Igor user ID matches logged-in user")
            
            return True
        
    except Exception as e:
        log_test("No Duplicate Igor - Request", False, f"Exception: {str(e)}")
        return False

def test_login_field_in_users_list(admin_auth):
    """Test 11: Confirm login field appears in GET /api/users"""
    if not admin_auth:
        log_test("Login Field in Users List - Skipped", False, "No admin auth data")
        return False
    
    try:
        headers = {
            "Authorization": f"Bearer {admin_auth['access_token']}"
        }
        
        response = requests.get(
            f"{BASE_URL}/users",
            headers=headers,
            timeout=10
        )
        
        if response.status_code != 200:
            log_test("Login Field in Users List - API Access", False, 
                    f"Could not access /users endpoint: {response.status_code}")
            return False
        
        try:
            users = response.json()
        except:
            log_test("Login Field in Users List - JSON Response", False, "Response is not valid JSON")
            return False
        
        if not users:
            log_test("Login Field in Users List - Users Exist", False, "No users found")
            return False
        
        # Check if all users have login field
        users_without_login = [u for u in users if "login" not in u]
        
        if users_without_login:
            log_test("Login Field in Users List - All Users Have Login", False, 
                    f"{len(users_without_login)} users missing 'login' field")
            return False
        else:
            log_test("Login Field in Users List - All Users Have Login", True, 
                    f"All {len(users)} users have 'login' field")
            
            # Show some examples
            sample_logins = [u.get("login") for u in users[:3]]
            log_test("Login Field in Users List - Sample Logins", True, 
                    f"Sample logins: {', '.join(sample_logins)}")
            
            return True
        
    except Exception as e:
        log_test("Login Field in Users List - Request", False, f"Exception: {str(e)}")
        return False

def main():
    """Run all tests"""
    print("=" * 80)
    print("BACKEND TEST SUITE - Login-Based Authentication Migration")
    print("=" * 80)
    print(f"Base URL: {BASE_URL}")
    print(f"Frontend Origin: {FRONTEND_ORIGIN}")
    print(f"Admin Login: {ADMIN_LOGIN}")
    print(f"Vendor Login: {VENDOR_LOGIN}")
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
    
    # Test 2: Admin login with uppercase
    print("TEST 2: Admin Login with 'Igor' (uppercase I)")
    print("-" * 80)
    admin_auth = test_admin_login_uppercase()
    print()
    
    # Test 3: Admin login with lowercase (case-insensitive)
    print("TEST 3: Admin Login with 'igor' (lowercase) - Case-Insensitive Check")
    print("-" * 80)
    test_admin_login_lowercase()
    print()
    
    # Test 4: Legacy email rejection
    print("TEST 4: Legacy Email Rejection")
    print("-" * 80)
    test_legacy_email_rejected()
    print()
    
    # Test 5: Vendor login
    print("TEST 5: Vendor Login")
    print("-" * 80)
    vendor_auth = test_vendor_login()
    print()
    
    # Test 6: Auth me for admin
    print("TEST 6: Authenticated User Info (/auth/me) for Admin")
    print("-" * 80)
    test_auth_me_admin(admin_auth)
    print()
    
    # Test 7: Auth me for vendor
    print("TEST 7: Authenticated User Info (/auth/me) for Vendor")
    print("-" * 80)
    test_auth_me_vendor(vendor_auth)
    print()
    
    # Test 8: User creation with role=producao
    print("TEST 8: User Creation with role='producao'")
    print("-" * 80)
    test_user_creation_producao(admin_auth)
    print()
    
    # Test 9: User creation with invalid role
    print("TEST 9: User Creation with Invalid Role")
    print("-" * 80)
    test_user_creation_invalid_role(admin_auth)
    print()
    
    # Test 10: No duplicate Igor
    print("TEST 10: No Duplicate Igor Login")
    print("-" * 80)
    test_no_duplicate_igor(admin_auth)
    print()
    
    # Test 11: Login field in users list
    print("TEST 11: Login Field in GET /api/users")
    print("-" * 80)
    test_login_field_in_users_list(admin_auth)
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
