import requests, json, io, csv, sys, time

BASE = "https://rio-vendas.preview.emergentagent.com/api"
ADMIN = ("festasegraficariosul@gmail.com", "RioSul@2026")
VEND = ("vendedor@riosul.com", "Vendedor@2026")

results = {"passed": [], "failed": []}

def log_ok(name, note=""): results["passed"].append(f"{name} {note}".strip()); print(f"PASS: {name} {note}")
def log_fail(name, evidence): results["failed"].append({"name": name, "evidence": evidence}); print(f"FAIL: {name} -> {evidence}")

def login(email, pw):
    r = requests.post(f"{BASE}/auth/login", json={"email": email, "password": pw}, timeout=15)
    return r

# ---- Auth ----
try:
    r = login(*ADMIN)
    assert r.status_code == 200, r.text
    admin_tok = r.json()["access_token"]
    admin_user = r.json()
    assert admin_user["role"] == "admin"
    log_ok("Admin login", f"role={admin_user['role']}")
except Exception as e:
    log_fail("Admin login", str(e)); sys.exit(1)

try:
    r = login(*VEND)
    assert r.status_code == 200, r.text
    vend_tok = r.json()["access_token"]
    vend_user = r.json()
    assert vend_user["role"] == "vendedor"
    log_ok("Vendedor login", f"role={vend_user['role']}")
except Exception as e:
    log_fail("Vendedor login", str(e))

A = {"Authorization": f"Bearer {admin_tok}"}
V = {"Authorization": f"Bearer {vend_tok}"}

# ---- /auth/me ----
try:
    r = requests.get(f"{BASE}/auth/me", headers=A, timeout=10)
    assert r.status_code == 200 and r.json()["role"] == "admin"
    log_ok("/auth/me admin")
except Exception as e:
    log_fail("/auth/me", str(e))

# ---- Seed lookups ----
for path, min_n in [("categories", 10), ("channels", 1), ("payment_methods", 1), ("units", 1)]:
    try:
        r = requests.get(f"{BASE}/{path}", headers=A, timeout=10)
        data = r.json()
        assert r.status_code == 200 and len(data) >= min_n, f"got {len(data)} items"
        log_ok(f"GET /{path}", f"count={len(data)}")
    except Exception as e:
        log_fail(f"GET /{path}", str(e))

# ---- Categories CRUD ----
try:
    r = requests.post(f"{BASE}/categories", headers=A, json={"name": "TEST_CAT", "order": 999}, timeout=10)
    cat = r.json(); assert r.status_code == 200 and cat.get("id")
    cid = cat["id"]
    r2 = requests.put(f"{BASE}/categories/{cid}", headers=A, json={"name": "TEST_CAT_2", "order": 999}, timeout=10)
    assert r2.status_code == 200
    r3 = requests.delete(f"{BASE}/categories/{cid}", headers=A, timeout=10)
    assert r3.status_code == 200
    log_ok("Categories CRUD")
except Exception as e:
    log_fail("Categories CRUD", str(e))

# ---- Products create (fixed w/ variations) ----
prod_fixed_id = None
try:
    cats = requests.get(f"{BASE}/categories", headers=A).json()
    cid = cats[0]["id"]
    body = {"name": "Cartao Visita TEST", "category_id": cid, "price": 25, "price_type": "fixed",
            "variations": [{"name": "4x4", "price": 25}, {"name": "5x5", "price": 35}]}
    r = requests.post(f"{BASE}/products", headers=A, json=body, timeout=10)
    p = r.json(); assert r.status_code == 200 and len(p["variations"]) == 2 and p["variations"][0].get("id")
    prod_fixed_id = p["id"]
    log_ok("Create product fixed w/ variations")
except Exception as e:
    log_fail("Create product fixed", str(e))

# ---- Products create per_m2 ----
prod_m2_id = None
try:
    cats = requests.get(f"{BASE}/categories", headers=A).json()
    cid = cats[0]["id"]
    body = {"name": "Banner TEST", "category_id": cid, "price_type": "per_m2",
            "m2_price": 100, "m2_min_price": 30}
    r = requests.post(f"{BASE}/products", headers=A, json=body, timeout=10)
    p = r.json(); assert r.status_code == 200 and p["m2_price"] == 100
    prod_m2_id = p["id"]
    log_ok("Create product per_m2")
except Exception as e:
    log_fail("Create product per_m2", str(e))

# ---- Vendedor cannot create product ----
try:
    r = requests.post(f"{BASE}/products", headers=V, json={"name": "X", "category_id": "z"}, timeout=10)
    assert r.status_code == 403, f"expected 403 got {r.status_code}"
    log_ok("Vendedor 403 on product create")
except Exception as e:
    log_fail("Vendedor product 403", str(e))

# ---- Customer create + phone search ----
cust_id = None
try:
    phone = f"5199{int(time.time()) % 1000000}"
    r = requests.post(f"{BASE}/customers", headers=V, json={"name": "Cliente TEST", "phone": phone}, timeout=10)
    c = r.json(); assert r.status_code == 200 and c.get("id")
    cust_id = c["id"]
    r2 = requests.get(f"{BASE}/customers", headers=V, params={"q": phone}, timeout=10)
    assert r2.status_code == 200 and any(x["id"] == cust_id for x in r2.json())
    log_ok("Customer create + search")
except Exception as e:
    log_fail("Customer create/search", str(e))

# ---- Sale create by vendedor with custom unit_price ----
sale_id = None
try:
    catalog_price = 25
    custom_price = 20
    items = [{"product_id": prod_fixed_id, "variation_id": None, "product_name": "Cartao Visita TEST",
              "variation_name": "4x4", "quantity": 2, "catalog_price": catalog_price,
              "unit_price": custom_price, "subtotal": 40}]
    body = {"customer_id": cust_id, "customer_name": "Cliente TEST", "items": items,
            "total": 40, "paid": 10, "payments": [{"method": "PIX", "amount": 10}],
            "channel": "Loja"}
    r = requests.post(f"{BASE}/sales", headers=V, json=body, timeout=10)
    s = r.json()
    assert r.status_code == 200, r.text
    assert s.get("order_number") and s["seller_name"] == vend_user["name"]
    assert s["items"][0]["unit_price"] == custom_price != s["items"][0]["catalog_price"]
    assert s["balance"] == 30
    sale_id = s["id"]
    log_ok("Sale create", f"order={s['order_number']} bal={s['balance']}")
except Exception as e:
    log_fail("Sale create", str(e))

# ---- GET /sales scope ----
try:
    r_v = requests.get(f"{BASE}/sales", headers=V, timeout=10).json()
    assert all(x.get("seller_id") == vend_user["id"] for x in r_v)
    r_a = requests.get(f"{BASE}/sales", headers=A, timeout=10).json()
    assert len(r_a) >= len(r_v)
    log_ok("Sales scope by role", f"vend={len(r_v)} admin={len(r_a)}")
except Exception as e:
    log_fail("Sales scope", str(e))

# ---- Product price change doesn't affect old sale ----
try:
    body = {"name": "Cartao Visita TEST", "category_id": cats[0]["id"], "price": 999, "price_type": "fixed",
            "variations": [{"name": "4x4", "price": 999}, {"name": "5x5", "price": 999}]}
    r = requests.put(f"{BASE}/products/{prod_fixed_id}", headers=A, json=body, timeout=10)
    assert r.status_code == 200 and r.json()["price"] == 999
    s = requests.get(f"{BASE}/sales/{sale_id}", headers=A, timeout=10).json()
    assert s["items"][0]["unit_price"] == 20, f"unit_price changed: {s['items'][0]['unit_price']}"
    log_ok("Old sale unit_price preserved after product price change")
except Exception as e:
    log_fail("Sale price immutability", str(e))

# ---- Status change + payment ----
try:
    r = requests.put(f"{BASE}/sales/{sale_id}/status", headers=V, json={"status": "EM PRODUCAO"}, timeout=10)
    assert r.status_code == 200
    r2 = requests.post(f"{BASE}/sales/{sale_id}/payment", headers=V, json={"method": "DINHEIRO", "amount": 30}, timeout=10)
    j = r2.json(); assert r2.status_code == 200 and j["balance"] == 0
    log_ok("Status change + payment recalc")
except Exception as e:
    log_fail("Status/payment", str(e))

# ---- DELETE sale: vendedor 403, admin OK ----
try:
    r = requests.delete(f"{BASE}/sales/{sale_id}", headers=V, timeout=10)
    assert r.status_code == 403
    r2 = requests.delete(f"{BASE}/sales/{sale_id}", headers=A, timeout=10)
    assert r2.status_code == 200
    s = requests.get(f"{BASE}/sales/{sale_id}", headers=A, timeout=10).json()
    assert s.get("cancelled") is True
    log_ok("Sale delete: 403 vendedor, admin cancels")
except Exception as e:
    log_fail("Sale delete", str(e))

# ---- Dashboard ----
try:
    r = requests.get(f"{BASE}/dashboard", headers=A, timeout=10)
    j = r.json(); assert r.status_code == 200
    for k in ["vendas_hoje", "faturamento", "ticket_medio", "by_seller", "by_channel", "daily"]:
        assert k in j, f"missing {k}"
    log_ok("Dashboard keys OK")
except Exception as e:
    log_fail("Dashboard", str(e))

# ---- Cash closure ----
try:
    from datetime import datetime, timezone
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    r = requests.get(f"{BASE}/cash/closure", headers=A, params={"date": today}, timeout=10)
    j = r.json()
    for k in ["by_method", "total_sold", "total_received", "count"]:
        assert k in j
    log_ok("Cash closure keys OK")
except Exception as e:
    log_fail("Cash closure", str(e))

# ---- Vales: admin creates, vendedor cannot ----
try:
    r_forbid = requests.post(f"{BASE}/vales", headers=V, json={"user_id": vend_user["id"], "amount": 50}, timeout=10)
    assert r_forbid.status_code == 403
    r = requests.post(f"{BASE}/vales", headers=A, json={"user_id": vend_user["id"], "amount": 50, "notes": "test"}, timeout=10)
    assert r.status_code == 200 and r.json()["user_name"]
    vid = r.json()["id"]
    lst = requests.get(f"{BASE}/vales", headers=A, params={"user_id": vend_user["id"]}, timeout=10).json()
    assert any(v["id"] == vid for v in lst)
    requests.delete(f"{BASE}/vales/{vid}", headers=A, timeout=10)
    log_ok("Vales admin-only + list")
except Exception as e:
    log_fail("Vales", str(e))

# ---- CSV import preview + confirm ----
try:
    csv_data = "categoria,produto,variacao,preco,unidade,tipo_preco,ativo\n"
    csv_data += "TEST_IMPORT,ProdImp1,4x4,10,Unidade,fixed,True\n"
    csv_data += "TEST_IMPORT,ProdImp1,5x5,15,Unidade,fixed,True\n"
    csv_data += "TEST_IMPORT,ProdImp2,,20,Unidade,fixed,True\n"
    files = {"file": ("test.csv", csv_data, "text/csv")}
    r = requests.post(f"{BASE}/products/import/preview", headers=A, files=files, timeout=15)
    j = r.json(); assert r.status_code == 200 and j["count"] == 3, r.text
    r2 = requests.post(f"{BASE}/products/import/confirm", headers=A, json={"rows": j["rows"]}, timeout=15)
    j2 = r2.json(); assert r2.status_code == 200 and (j2["created"] + j2["updated"]) >= 2
    prods = requests.get(f"{BASE}/products", headers=A, timeout=10).json()
    prod1 = [p for p in prods if p["name"] == "ProdImp1"]
    assert prod1 and len(prod1[0]["variations"]) == 2, "variations not grouped"
    log_ok("Import CSV preview+confirm+group variations", f"created={j2['created']} updated={j2['updated']}")
except Exception as e:
    log_fail("Import CSV", str(e))

# ---- Labelary ZPL preview ----
try:
    zpl = "^XA^FO50,50^ADN,36,20^FDTeste^FS^XZ"
    r = requests.post(f"{BASE}/labels/zpl-preview", headers=A, json={"zpl": zpl}, timeout=45)
    assert r.status_code == 200 and len(r.json().get("png_base64", "")) > 100
    log_ok("Labelary zpl-preview")
except Exception as e:
    log_fail("zpl-preview", str(e))

try:
    r = requests.post(f"{BASE}/labels/zpl-to-pdf", headers=A, json={"zpl": zpl}, timeout=45)
    assert r.status_code == 200 and r.headers.get("content-type", "").startswith("application/pdf")
    assert r.content[:4] == b"%PDF"
    log_ok("Labelary zpl-to-pdf")
except Exception as e:
    log_fail("zpl-to-pdf", str(e))

# ---- Reports ----
for gb in ["day", "seller", "channel", "month"]:
    try:
        r = requests.get(f"{BASE}/reports/sales", headers=A, params={"group_by": gb}, timeout=10)
        assert r.status_code == 200 and isinstance(r.json(), list)
        log_ok(f"Reports sales group_by={gb}", f"n={len(r.json())}")
    except Exception as e:
        log_fail(f"Reports sales {gb}", str(e))

try:
    r = requests.get(f"{BASE}/reports/top-products", headers=A, timeout=10)
    assert r.status_code == 200 and isinstance(r.json(), list)
    log_ok("Reports top-products")
except Exception as e:
    log_fail("Reports top-products", str(e))

# ---- Settings ----
try:
    r = requests.get(f"{BASE}/settings", headers=A, timeout=10)
    assert r.status_code == 200 and r.json().get("company_name")
    r2 = requests.put(f"{BASE}/settings", headers=A, json={"company_name": "Rio Sul Festas & Gráfica", "phone": "51999999999"}, timeout=10)
    assert r2.status_code == 200 and r2.json()["phone"] == "51999999999"
    r3 = requests.put(f"{BASE}/settings", headers=V, json={"phone": "0"}, timeout=10)
    assert r3.status_code == 403
    log_ok("Settings GET/PUT + admin-only")
except Exception as e:
    log_fail("Settings", str(e))

print("\n=== SUMMARY ===")
print(f"Passed: {len(results['passed'])}")
print(f"Failed: {len(results['failed'])}")
for f in results['failed']:
    print(f"  - {f['name']}: {f['evidence'][:200]}")
