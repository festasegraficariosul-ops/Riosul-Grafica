#!/usr/bin/env python3
"""
Backend Testing Script for Rio Sul - Employee Management and Permissions
Tests the fix for employee creation and role-based permissions
"""

import requests
import json
import sys
from typing import Dict, Optional, List

# Configuration
API_BASE = "https://import-hub-156.preview.emergentagent.com/api"

# Test credentials from /app/memory/test_credentials.md
ADMIN_LOGIN = "Igor"
ADMIN_PASSWORD = "02578491"

# Colors for output
GREEN = '\033[92m'
RED = '\033[91m'
YELLOW = '\033[93m'
BLUE = '\033[94m'
RESET = '\033[0m'

class TestSession:
    def __init__(self):
        self.session = requests.Session()
        self.admin_token = None
        self.vendedor_token = None
        self.producao_token = None
        self.test_users_created = []
        self.test_customers_created = []
        self.test_products_created = []
        self.test_sales_created = []
        self.test_vales_created = []
        
    def log(self, message: str, color: str = RESET):
        print(f"{color}{message}{RESET}")
        
    def log_success(self, message: str):
        self.log(f"✅ {message}", GREEN)
        
    def log_error(self, message: str):
        self.log(f"❌ {message}", RED)
        
    def log_info(self, message: str):
        self.log(f"ℹ️  {message}", BLUE)
        
    def log_warning(self, message: str):
        self.log(f"⚠️  {message}", YELLOW)

    def login(self, login: str, password: str) -> Optional[str]:
        """Login and return access token"""
        try:
            response = self.session.post(
                f"{API_BASE}/auth/login",
                json={"login": login, "password": password},
                timeout=10
            )
            if response.status_code == 200:
                data = response.json()
                return data.get("access_token")
            else:
                self.log_error(f"Login failed for {login}: {response.status_code} - {response.text}")
                return None
        except Exception as e:
            self.log_error(f"Login exception for {login}: {str(e)}")
            return None
    
    def make_request(self, method: str, endpoint: str, token: Optional[str] = None, 
                     json_data: Optional[Dict] = None, params: Optional[Dict] = None) -> requests.Response:
        """Make authenticated request"""
        headers = {}
        if token:
            headers["Authorization"] = f"Bearer {token}"
        
        url = f"{API_BASE}{endpoint}"
        
        # Use a fresh session without cookies to avoid cookie interference with Bearer tokens
        fresh_session = requests.Session()
        
        try:
            if method == "GET":
                return fresh_session.get(url, headers=headers, params=params, timeout=10)
            elif method == "POST":
                return fresh_session.post(url, headers=headers, json=json_data, timeout=10)
            elif method == "PUT":
                return fresh_session.put(url, headers=headers, json=json_data, timeout=10)
            elif method == "DELETE":
                return fresh_session.delete(url, headers=headers, timeout=10)
        except Exception as e:
            self.log_error(f"Request exception: {str(e)}")
            raise

def test_1_backend_starts(test: TestSession) -> bool:
    """Test 1: Backend starts without errors"""
    test.log_info("TEST 1: Backend starts without errors")
    try:
        response = requests.get(f"{API_BASE}/../docs", timeout=5)
        if response.status_code == 200:
            test.log_success("Backend is running and responding")
            return True
        else:
            test.log_error(f"Backend returned unexpected status: {response.status_code}")
            return False
    except Exception as e:
        test.log_error(f"Backend is not accessible: {str(e)}")
        return False

def test_2_admin_login(test: TestSession) -> bool:
    """Test 2: Admin login with Igor/02578491"""
    test.log_info("TEST 2: Admin login with Igor/02578491")
    
    token = test.login(ADMIN_LOGIN, ADMIN_PASSWORD)
    if not token:
        test.log_error("Admin login failed")
        return False
    
    test.admin_token = token
    
    # Verify admin role
    response = test.make_request("GET", "/auth/me", token)
    if response.status_code != 200:
        test.log_error(f"Failed to get user info: {response.status_code}")
        return False
    
    user_data = response.json()
    if user_data.get("role") != "admin":
        test.log_error(f"User role is not admin: {user_data.get('role')}")
        return False
    
    if user_data.get("login").lower() != ADMIN_LOGIN.lower():
        test.log_error(f"User login mismatch: {user_data.get('login')}")
        return False
    
    test.log_success(f"Admin login successful: {user_data.get('name')} (role: {user_data.get('role')})")
    return True

def test_3_create_vendedor_without_email(test: TestSession) -> bool:
    """Test 3: POST /api/users with login, password, name and role vendedor, WITHOUT email"""
    test.log_info("TEST 3: Create vendedor user without email (should NOT get DuplicateKeyError)")
    
    # Create unique test user
    import time
    timestamp = int(time.time())
    test_login = f"test_vendedor_{timestamp}"
    
    user_data = {
        "login": test_login,
        "password": "TestVendedor@2026",
        "name": "Test Vendedor User",
        "role": "vendedor",
        "active": True
        # NO email field
    }
    
    response = test.make_request("POST", "/users", test.admin_token, json_data=user_data)
    
    if response.status_code not in [200, 201]:
        test.log_error(f"Failed to create vendedor user: {response.status_code} - {response.text}")
        if "DuplicateKeyError" in response.text or "duplicate key" in response.text.lower():
            test.log_error("❌ CRITICAL: DuplicateKeyError on email field - the fix is NOT working!")
        return False
    
    created_user = response.json()
    test.test_users_created.append(created_user["id"])
    
    test.log_success(f"Vendedor user created successfully: {created_user['login']} (id: {created_user['id']})")
    
    # Verify user appears in GET /api/users
    response = test.make_request("GET", "/users", test.admin_token)
    if response.status_code != 200:
        test.log_error(f"Failed to get users list: {response.status_code}")
        return False
    
    users = response.json()
    found = False
    for user in users:
        if user["id"] == created_user["id"]:
            found = True
            test.log_success(f"User found in GET /api/users: {user['login']}")
            break
    
    if not found:
        test.log_error("Created user not found in users list")
        return False
    
    # Test login with the new vendedor user
    vendedor_token = test.login(test_login, "TestVendedor@2026")
    if not vendedor_token:
        test.log_error("Failed to login with newly created vendedor user")
        return False
    
    test.vendedor_token = vendedor_token
    test.log_success("Successfully logged in with new vendedor user")
    
    return True

def test_4_create_producao_without_email(test: TestSession) -> bool:
    """Test 4: Create producao user without email"""
    test.log_info("TEST 4: Create producao user without email")
    
    import time
    timestamp = int(time.time())
    test_login = f"test_producao_{timestamp}"
    
    user_data = {
        "login": test_login,
        "password": "TestProducao@2026",
        "name": "Test Producao User",
        "role": "producao",
        "active": True
        # NO email field
    }
    
    response = test.make_request("POST", "/users", test.admin_token, json_data=user_data)
    
    if response.status_code not in [200, 201]:
        test.log_error(f"Failed to create producao user: {response.status_code} - {response.text}")
        if "DuplicateKeyError" in response.text or "duplicate key" in response.text.lower():
            test.log_error("❌ CRITICAL: DuplicateKeyError on email field - the fix is NOT working!")
        return False
    
    created_user = response.json()
    test.test_users_created.append(created_user["id"])
    
    test.log_success(f"Producao user created successfully: {created_user['login']} (id: {created_user['id']})")
    
    # Test login with the new producao user
    producao_token = test.login(test_login, "TestProducao@2026")
    if not producao_token:
        test.log_error("Failed to login with newly created producao user")
        return False
    
    test.producao_token = producao_token
    test.log_success("Successfully logged in with new producao user")
    
    return True

def test_5_vendedor_permissions(test: TestSession) -> bool:
    """Test 5: Verify vendedor can access allowed endpoints"""
    test.log_info("TEST 5: Verify vendedor permissions")
    
    if not test.vendedor_token:
        test.log_error("No vendedor token available")
        return False
    
    all_passed = True
    
    # Test GET /api/customers (should work)
    response = test.make_request("GET", "/customers", test.vendedor_token)
    if response.status_code == 200:
        test.log_success("Vendedor can GET /api/customers")
    else:
        test.log_error(f"Vendedor cannot GET /api/customers: {response.status_code}")
        all_passed = False
    
    # Test POST /api/customers (should work)
    import time
    timestamp = int(time.time())
    customer_data = {
        "name": f"Test Customer {timestamp}",
        "phone": f"5199{timestamp % 100000000}",
        "notes": "Test customer for vendedor"
    }
    response = test.make_request("POST", "/customers", test.vendedor_token, json_data=customer_data)
    if response.status_code in [200, 201]:
        test.log_success("Vendedor can POST /api/customers")
        customer = response.json()
        test.test_customers_created.append(customer["id"])
    else:
        test.log_error(f"Vendedor cannot POST /api/customers: {response.status_code}")
        all_passed = False
    
    # Test GET /api/products (should work)
    response = test.make_request("GET", "/products", test.vendedor_token)
    if response.status_code == 200:
        test.log_success("Vendedor can GET /api/products")
    else:
        test.log_error(f"Vendedor cannot GET /api/products: {response.status_code}")
        all_passed = False
    
    # Test POST /api/products (should work with require_staff)
    response = test.make_request("GET", "/categories", test.vendedor_token)
    if response.status_code == 200:
        categories = response.json()
        if categories:
            product_data = {
                "name": f"Test Product Vendedor {timestamp}",
                "category_id": categories[0]["id"],
                "description": "Test product",
                "price": 10.0,
                "price_type": "fixed",
                "unit": "Unidade",
                "active": True,
                "order": 0,
                "variations": [],
                "tiers": []
            }
            response = test.make_request("POST", "/products", test.vendedor_token, json_data=product_data)
            if response.status_code in [200, 201]:
                test.log_success("Vendedor can POST /api/products")
                product = response.json()
                test.test_products_created.append(product["id"])
            else:
                test.log_error(f"Vendedor cannot POST /api/products: {response.status_code}")
                all_passed = False
    
    # Test GET /api/sales (should work)
    response = test.make_request("GET", "/sales", test.vendedor_token)
    if response.status_code == 200:
        test.log_success("Vendedor can GET /api/sales")
    else:
        test.log_error(f"Vendedor cannot GET /api/sales: {response.status_code}")
        all_passed = False
    
    # Test GET /api/vales (should work - own vales only)
    response = test.make_request("GET", "/vales", test.vendedor_token)
    if response.status_code == 200:
        test.log_success("Vendedor can GET /api/vales")
    else:
        test.log_error(f"Vendedor cannot GET /api/vales: {response.status_code}")
        all_passed = False
    
    # Test POST /api/vales (should work for own user)
    # First get vendedor user_id
    response = test.make_request("GET", "/auth/me", test.vendedor_token)
    if response.status_code == 200:
        vendedor_user = response.json()
        vale_data = {
            "user_id": vendedor_user["id"],
            "amount": 50.0,
            "notes": "Test vale for vendedor"
        }
        response = test.make_request("POST", "/vales", test.vendedor_token, json_data=vale_data)
        if response.status_code in [200, 201]:
            test.log_success("Vendedor can POST /api/vales for own user")
            vale = response.json()
            test.test_vales_created.append(vale["id"])
        else:
            test.log_error(f"Vendedor cannot POST /api/vales: {response.status_code}")
            all_passed = False
    
    # Test PUT /api/vales (should work for own user)
    response = test.make_request("GET", "/vales", test.vendedor_token)
    if response.status_code == 200:
        vales = response.json()
        if vales:
            test.log_success("Vendedor can access own vales")
    
    return all_passed

def test_6_producao_permissions(test: TestSession) -> bool:
    """Test 6: Verify producao can access allowed endpoints"""
    test.log_info("TEST 6: Verify producao permissions")
    
    if not test.producao_token:
        test.log_error("No producao token available")
        return False
    
    all_passed = True
    
    # Test GET /api/customers (should work)
    response = test.make_request("GET", "/customers", test.producao_token)
    if response.status_code == 200:
        test.log_success("Producao can GET /api/customers")
    else:
        test.log_error(f"Producao cannot GET /api/customers: {response.status_code}")
        all_passed = False
    
    # Test POST /api/customers (should work)
    import time
    timestamp = int(time.time())
    customer_data = {
        "name": f"Test Customer Producao {timestamp}",
        "phone": f"5198{timestamp % 100000000}",
        "notes": "Test customer for producao"
    }
    response = test.make_request("POST", "/customers", test.producao_token, json_data=customer_data)
    if response.status_code in [200, 201]:
        test.log_success("Producao can POST /api/customers")
        customer = response.json()
        test.test_customers_created.append(customer["id"])
    else:
        test.log_error(f"Producao cannot POST /api/customers: {response.status_code}")
        all_passed = False
    
    # Test GET /api/products (should work)
    response = test.make_request("GET", "/products", test.producao_token)
    if response.status_code == 200:
        test.log_success("Producao can GET /api/products")
    else:
        test.log_error(f"Producao cannot GET /api/products: {response.status_code}")
        all_passed = False
    
    # Test POST /api/products (should work with require_staff)
    response = test.make_request("GET", "/categories", test.producao_token)
    if response.status_code == 200:
        categories = response.json()
        if categories:
            product_data = {
                "name": f"Test Product Producao {timestamp}",
                "category_id": categories[0]["id"],
                "description": "Test product",
                "price": 15.0,
                "price_type": "fixed",
                "unit": "Unidade",
                "active": True,
                "order": 0,
                "variations": [],
                "tiers": []
            }
            response = test.make_request("POST", "/products", test.producao_token, json_data=product_data)
            if response.status_code in [200, 201]:
                test.log_success("Producao can POST /api/products")
                product = response.json()
                test.test_products_created.append(product["id"])
            else:
                test.log_error(f"Producao cannot POST /api/products: {response.status_code}")
                all_passed = False
    
    # Test GET /api/sales (should work)
    response = test.make_request("GET", "/sales", test.producao_token)
    if response.status_code == 200:
        test.log_success("Producao can GET /api/sales")
    else:
        test.log_error(f"Producao cannot GET /api/sales: {response.status_code}")
        all_passed = False
    
    # Test GET /api/vales (should work - own vales only)
    response = test.make_request("GET", "/vales", test.producao_token)
    if response.status_code == 200:
        test.log_success("Producao can GET /api/vales")
    else:
        test.log_error(f"Producao cannot GET /api/vales: {response.status_code}")
        all_passed = False
    
    # Test POST /api/vales (should work for own user)
    response = test.make_request("GET", "/auth/me", test.producao_token)
    if response.status_code == 200:
        producao_user = response.json()
        vale_data = {
            "user_id": producao_user["id"],
            "amount": 75.0,
            "notes": "Test vale for producao"
        }
        response = test.make_request("POST", "/vales", test.producao_token, json_data=vale_data)
        if response.status_code in [200, 201]:
            test.log_success("Producao can POST /api/vales for own user")
            vale = response.json()
            test.test_vales_created.append(vale["id"])
        else:
            test.log_error(f"Producao cannot POST /api/vales: {response.status_code}")
            all_passed = False
    
    return all_passed

def test_7_vendedor_producao_restrictions(test: TestSession) -> bool:
    """Test 7: Verify vendedor/producao CANNOT access admin-only endpoints"""
    test.log_info("TEST 7: Verify vendedor/producao restrictions")
    
    all_passed = True
    
    # Test vendedor restrictions
    if test.vendedor_token:
        # Should NOT access /api/users
        response = test.make_request("GET", "/users", test.vendedor_token)
        if response.status_code == 403:
            test.log_success("Vendedor correctly blocked from GET /api/users (403)")
        else:
            test.log_error(f"Vendedor should be blocked from /api/users but got: {response.status_code}")
            all_passed = False
        
        # Should NOT POST /api/categories
        category_data = {"name": "Test Category", "order": 999, "active": True}
        response = test.make_request("POST", "/categories", test.vendedor_token, json_data=category_data)
        if response.status_code == 403:
            test.log_success("Vendedor correctly blocked from POST /api/categories (403)")
        else:
            test.log_error(f"Vendedor should be blocked from POST /api/categories but got: {response.status_code}")
            all_passed = False
        
        # Should NOT access /api/reports/sales
        response = test.make_request("GET", "/reports/sales", test.vendedor_token)
        if response.status_code == 403:
            test.log_success("Vendedor correctly blocked from GET /api/reports/sales (403)")
        else:
            test.log_error(f"Vendedor should be blocked from /api/reports/sales but got: {response.status_code}")
            all_passed = False
        
        # Should NOT DELETE /api/vales (admin only)
        if test.test_vales_created:
            response = test.make_request("DELETE", f"/vales/{test.test_vales_created[0]}", test.vendedor_token)
            if response.status_code == 403:
                test.log_success("Vendedor correctly blocked from DELETE /api/vales (403)")
            else:
                test.log_error(f"Vendedor should be blocked from DELETE /api/vales but got: {response.status_code}")
                all_passed = False
    
    # Test producao restrictions
    if test.producao_token:
        # Should NOT access /api/users
        response = test.make_request("GET", "/users", test.producao_token)
        if response.status_code == 403:
            test.log_success("Producao correctly blocked from GET /api/users (403)")
        else:
            test.log_error(f"Producao should be blocked from /api/users but got: {response.status_code}")
            all_passed = False
        
        # Should NOT POST /api/categories
        category_data = {"name": "Test Category Producao", "order": 999, "active": True}
        response = test.make_request("POST", "/categories", test.producao_token, json_data=category_data)
        if response.status_code == 403:
            test.log_success("Producao correctly blocked from POST /api/categories (403)")
        else:
            test.log_error(f"Producao should be blocked from POST /api/categories but got: {response.status_code}")
            all_passed = False
        
        # Should NOT access /api/reports/sales
        response = test.make_request("GET", "/reports/sales", test.producao_token)
        if response.status_code == 403:
            test.log_success("Producao correctly blocked from GET /api/reports/sales (403)")
        else:
            test.log_error(f"Producao should be blocked from /api/reports/sales but got: {response.status_code}")
            all_passed = False
    
    return all_passed

def test_8_admin_full_access(test: TestSession) -> bool:
    """Test 8: Verify admin continues accessing everything"""
    test.log_info("TEST 8: Verify admin full access")
    
    if not test.admin_token:
        test.log_error("No admin token available")
        return False
    
    all_passed = True
    
    # Test admin can access /api/users
    response = test.make_request("GET", "/users", test.admin_token)
    if response.status_code == 200:
        test.log_success("Admin can GET /api/users")
    else:
        test.log_error(f"Admin cannot GET /api/users: {response.status_code}")
        all_passed = False
    
    # Test admin can POST /api/categories
    import time
    timestamp = int(time.time())
    category_data = {"name": f"Test Category Admin {timestamp}", "order": 999, "active": True}
    response = test.make_request("POST", "/categories", test.admin_token, json_data=category_data)
    if response.status_code in [200, 201]:
        test.log_success("Admin can POST /api/categories")
    else:
        test.log_error(f"Admin cannot POST /api/categories: {response.status_code}")
        all_passed = False
    
    # Test admin can access /api/reports/sales
    response = test.make_request("GET", "/reports/sales", test.admin_token)
    if response.status_code == 200:
        test.log_success("Admin can GET /api/reports/sales")
    else:
        test.log_error(f"Admin cannot GET /api/reports/sales: {response.status_code}")
        all_passed = False
    
    # Test admin can access /api/reports/top-products
    response = test.make_request("GET", "/reports/top-products", test.admin_token)
    if response.status_code == 200:
        test.log_success("Admin can GET /api/reports/top-products")
    else:
        test.log_error(f"Admin cannot GET /api/reports/top-products: {response.status_code}")
        all_passed = False
    
    # Test admin can DELETE /api/vales
    if test.test_vales_created:
        for vale_id in test.test_vales_created:
            response = test.make_request("DELETE", f"/vales/{vale_id}", test.admin_token)
            if response.status_code == 200:
                test.log_success(f"Admin can DELETE /api/vales/{vale_id}")
            else:
                test.log_error(f"Admin cannot DELETE /api/vales: {response.status_code}")
                all_passed = False
        test.test_vales_created.clear()
    
    # Test admin can access all customer/product/sales endpoints
    response = test.make_request("GET", "/customers", test.admin_token)
    if response.status_code == 200:
        test.log_success("Admin can GET /api/customers")
    else:
        test.log_error(f"Admin cannot GET /api/customers: {response.status_code}")
        all_passed = False
    
    response = test.make_request("GET", "/products", test.admin_token)
    if response.status_code == 200:
        test.log_success("Admin can GET /api/products")
    else:
        test.log_error(f"Admin cannot GET /api/products: {response.status_code}")
        all_passed = False
    
    response = test.make_request("GET", "/sales", test.admin_token)
    if response.status_code == 200:
        test.log_success("Admin can GET /api/sales")
    else:
        test.log_error(f"Admin cannot GET /api/sales: {response.status_code}")
        all_passed = False
    
    return all_passed

def cleanup_test_data(test: TestSession):
    """Clean up test data created during testing"""
    test.log_info("CLEANUP: Removing test data")
    
    # Deactivate test users
    for user_id in test.test_users_created:
        response = test.make_request("PUT", f"/users/{user_id}", test.admin_token, 
                                    json_data={"active": False})
        if response.status_code == 200:
            test.log_success(f"Deactivated test user: {user_id}")
        else:
            test.log_warning(f"Failed to deactivate user {user_id}: {response.status_code}")
    
    # Note: We don't delete customers, products, or sales as they might be referenced
    # Just deactivate the test users which is sufficient for cleanup
    
    test.log_success("Cleanup completed")

def main():
    """Main test execution"""
    test = TestSession()
    
    print("\n" + "="*80)
    print("BACKEND TESTING - Employee Management and Permissions Fix")
    print("="*80 + "\n")
    
    results = {}
    
    # Run tests in sequence
    tests = [
        ("Backend Starts", test_1_backend_starts),
        ("Admin Login", test_2_admin_login),
        ("Create Vendedor Without Email", test_3_create_vendedor_without_email),
        ("Create Producao Without Email", test_4_create_producao_without_email),
        ("Vendedor Permissions", test_5_vendedor_permissions),
        ("Producao Permissions", test_6_producao_permissions),
        ("Vendedor/Producao Restrictions", test_7_vendedor_producao_restrictions),
        ("Admin Full Access", test_8_admin_full_access),
    ]
    
    for test_name, test_func in tests:
        print(f"\n{'─'*80}")
        try:
            results[test_name] = test_func(test)
        except Exception as e:
            test.log_error(f"Test '{test_name}' raised exception: {str(e)}")
            results[test_name] = False
        print(f"{'─'*80}\n")
    
    # Cleanup
    print(f"\n{'─'*80}")
    try:
        cleanup_test_data(test)
    except Exception as e:
        test.log_warning(f"Cleanup raised exception: {str(e)}")
    print(f"{'─'*80}\n")
    
    # Summary
    print("\n" + "="*80)
    print("TEST SUMMARY")
    print("="*80 + "\n")
    
    passed = sum(1 for v in results.values() if v)
    total = len(results)
    
    for test_name, result in results.items():
        status = f"{GREEN}✅ PASSED{RESET}" if result else f"{RED}❌ FAILED{RESET}"
        print(f"{test_name:.<50} {status}")
    
    print(f"\n{'─'*80}")
    print(f"Total: {passed}/{total} tests passed")
    print(f"{'─'*80}\n")
    
    if passed == total:
        print(f"{GREEN}🎉 ALL TESTS PASSED! Employee management and permissions fix is working correctly.{RESET}\n")
        return 0
    else:
        print(f"{RED}⚠️  SOME TESTS FAILED. Please review the errors above.{RESET}\n")
        return 1

if __name__ == "__main__":
    sys.exit(main())
