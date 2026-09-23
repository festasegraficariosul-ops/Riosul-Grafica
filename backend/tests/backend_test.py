"""Etapa 2 - Backend tests for Rio Sul Festas & Gráfica."""
import os
import io
import zipfile
import pytest
import requests
from reportlab.pdfgen import canvas as rlcanvas
from reportlab.lib.pagesizes import A4

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://rio-vendas.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

ADMIN_EMAIL = "festasegraficariosul@gmail.com"
ADMIN_PW = "RioSul@2026"
VEND_EMAIL = "vendedor@riosul.com"
VEND_PW = "Vendedor@2026"


# ---------- Fixtures ----------
@pytest.fixture(scope="session")
def admin_token():
    r = requests.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PW})
    assert r.status_code == 200, f"Admin login failed: {r.status_code} {r.text}"
    data = r.json()
    assert data["role"] == "admin"
    return data["access_token"]


@pytest.fixture(scope="session")
def vend_token():
    r = requests.post(f"{API}/auth/login", json={"email": VEND_EMAIL, "password": VEND_PW})
    assert r.status_code == 200, f"Vend login failed: {r.status_code} {r.text}"
    return r.json()["access_token"]


@pytest.fixture
def admin_h(admin_token):
    return {"Authorization": f"Bearer {admin_token}"}


@pytest.fixture
def vend_h(vend_token):
    return {"Authorization": f"Bearer {vend_token}"}


def _make_pdf_bytes(text: str) -> bytes:
    buf = io.BytesIO()
    c = rlcanvas.Canvas(buf, pagesize=A4)
    y = 800
    for line in text.split("\n"):
        c.drawString(50, y, line)
        y -= 20
    c.showPage()
    c.save()
    return buf.getvalue()


# ---------- Auth ----------
class TestAuth:
    def test_admin_login(self, admin_token):
        assert admin_token

    def test_vend_login(self, vend_token):
        assert vend_token

    def test_me(self, admin_h):
        r = requests.get(f"{API}/auth/me", headers=admin_h)
        assert r.status_code == 200
        assert r.json()["role"] == "admin"


# ---------- Catalog seed ----------
class TestCatalog:
    def test_categories_real_seed(self, admin_h):
        r = requests.get(f"{API}/categories", headers=admin_h)
        assert r.status_code == 200
        cats = r.json()
        names = {c["name"] for c in cats}
        expected = {"Impressões", "Impressão Solvente", "Adesivos", "Banners", "Canecas",
                    "Camisas", "Cartões de Visita", "Panfletos", "Fotos", "Molduras",
                    "Azulejos", "Cardápios", "Apostilas", "Cavalete", "Combos", "Gravação a Laser"}
        missing = expected - names
        assert not missing, f"Missing categories: {missing}"

    def test_products_seeded(self, admin_h):
        r = requests.get(f"{API}/products", headers=admin_h)
        assert r.status_code == 200
        prods = r.json()
        assert len(prods) >= 40, f"Only {len(prods)} products"

        by_name = {p["name"]: p for p in prods}
        # fixed
        p = by_name.get("Impressão Preto e Branco")
        assert p and p["price"] == 2 and p["price_type"] == "fixed"
        # per_m2
        p = by_name.get("Banner")
        assert p and p["price_type"] == "per_m2" and p["m2_price"] == 40 and p["m2_min_price"] == 30
        # variations
        p = by_name.get("Adesivo 4x4 cm (Redondo ou Quadrado)")
        assert p and len(p["variations"]) == 4
        # tiered
        p = by_name.get("Apostila (preço por folha)")
        assert p and p["price_type"] == "tiered" and len(p["tiers"]) > 0
        # starting price
        p = by_name.get("Squeeze Alumínio")
        assert p and p["is_starting_price"] is True

    def test_product_has_new_fields(self, admin_h):
        r = requests.get(f"{API}/products", headers=admin_h)
        p = r.json()[0]
        for k in ("image_url", "favorite", "is_starting_price"):
            assert k in p, f"Missing field {k}"

    def test_product_favorite_toggle(self, admin_h):
        r = requests.get(f"{API}/products", headers=admin_h)
        pid = r.json()[0]["id"]
        r = requests.put(f"{API}/products/{pid}/favorite", json={"favorite": True}, headers=admin_h)
        assert r.status_code == 200
        # verify
        r = requests.get(f"{API}/products", headers=admin_h)
        prod = next(p for p in r.json() if p["id"] == pid)
        assert prod["favorite"] is True
        # revert
        requests.put(f"{API}/products/{pid}/favorite", json={"favorite": False}, headers=admin_h)


# ---------- Customers ----------
class TestCustomers:
    def test_create_customer_no_instagram(self, admin_h):
        r = requests.post(f"{API}/customers",
                          json={"name": "TEST_Cust1", "phone": "+5511999998888"}, headers=admin_h)
        assert r.status_code == 200
        d = r.json()
        assert d["name"] == "TEST_Cust1"
        assert "instagram" not in d

    def test_customer_in_rejects_instagram(self, admin_h):
        # Since Pydantic ignores unknown fields (default), sending instagram should not error
        # but stored doc must not have it.
        r = requests.post(f"{API}/customers",
                          json={"name": "TEST_NoIG", "phone": "+551188887777", "instagram": "@x"}, headers=admin_h)
        assert r.status_code == 200
        assert "instagram" not in r.json()


# ---------- Sales ----------
@pytest.fixture(scope="module")
def sample_sale_id(admin_h_module):
    r = requests.post(f"{API}/sales", json={
        "customer_name": "TEST_AutoCust", "customer_phone": "+551166665555",
        "items": [{"product_id": "x", "product_name": "P1", "quantity": 1, "unit_price": 10, "subtotal": 10}],
        "total": 10, "paid": 0, "payments": []
    }, headers=admin_h_module)
    assert r.status_code == 200
    return r.json()["id"]


@pytest.fixture(scope="module")
def admin_h_module():
    r = requests.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PW})
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


class TestSales:
    def test_sale_auto_creates_customer(self, admin_h_module):
        r = requests.post(f"{API}/sales", json={
            "customer_name": "TEST_Auto1", "customer_phone": "+551133332222",
            "items": [{"product_id": "x", "product_name": "P1", "quantity": 1, "unit_price": 10, "subtotal": 10}],
            "total": 10
        }, headers=admin_h_module)
        assert r.status_code == 200
        sale = r.json()
        assert sale["customer_id"], "customer_id should be auto-filled"

        # Second sale same phone => same customer (not duplicated)
        r2 = requests.post(f"{API}/sales", json={
            "customer_name": "TEST_Auto1", "customer_phone": "+551133332222",
            "items": [{"product_id": "x", "product_name": "P1", "quantity": 1, "unit_price": 10, "subtotal": 10}],
            "total": 10
        }, headers=admin_h_module)
        assert r2.json()["customer_id"] == sale["customer_id"]

    def test_sale_put_preserves_order_number(self, admin_h_module, sample_sale_id):
        r = requests.get(f"{API}/sales/{sample_sale_id}", headers=admin_h_module)
        original = r.json()
        onum = original["order_number"]
        # update
        upd = {
            "customer_name": "TEST_Updated", "customer_phone": original.get("customer_phone", ""),
            "items": original["items"], "total": 15, "paid": 0, "payments": [],
            "channel": "Loja", "status": "PEDIDO RECEBIDO"
        }
        r = requests.put(f"{API}/sales/{sample_sale_id}", json=upd, headers=admin_h_module)
        assert r.status_code == 200
        u = r.json()
        assert u["id"] == sample_sale_id
        assert u["order_number"] == onum
        assert u["customer_name"] == "TEST_Updated"
        assert u["total"] == 15

    def test_sale_duplicate(self, admin_h_module, sample_sale_id):
        r = requests.post(f"{API}/sales/{sample_sale_id}/duplicate", headers=admin_h_module)
        assert r.status_code == 200
        d = r.json()
        assert d["id"] != sample_sale_id
        assert d["status"] == "PEDIDO RECEBIDO"
        assert d["paid"] == 0
        assert d["payments"] == []
        # order_number must differ
        orig = requests.get(f"{API}/sales/{sample_sale_id}", headers=admin_h_module).json()
        assert d["order_number"] != orig["order_number"]


# ---------- Uploads & Attachments ----------
class TestUploads:
    def test_upload_and_serve(self, admin_h):
        # 1x1 PNG
        png = (b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01"
               b"\x08\x02\x00\x00\x00\x90wS\xde\x00\x00\x00\x0cIDATx\x9cc\xf8\xff\xff?"
               b"\x00\x05\xfe\x02\xfe\xa7V\xbd\xfa\x00\x00\x00\x00IEND\xaeB`\x82")
        r = requests.post(f"{API}/uploads",
                          files={"file": ("t.png", png, "image/png")}, headers=admin_h)
        assert r.status_code == 200, r.text
        url = r.json()["url"]
        assert url.startswith("/api/uploads/")
        # serve
        r2 = requests.get(f"{BASE_URL}{url}")
        assert r2.status_code == 200
        assert r2.headers["content-type"].startswith("image/")

    def test_sale_attachments(self, admin_h_module, sample_sale_id):
        url = "/api/uploads/fake.png"
        r = requests.post(f"{API}/sales/{sample_sale_id}/attachments",
                          json={"url": url}, headers=admin_h_module)
        assert r.status_code == 200
        s = requests.get(f"{API}/sales/{sample_sale_id}", headers=admin_h_module).json()
        assert url in s.get("attachments", [])
        # remove
        r = requests.delete(f"{API}/sales/{sample_sale_id}/attachments?url={url}", headers=admin_h_module)
        assert r.status_code == 200
        s = requests.get(f"{API}/sales/{sample_sale_id}", headers=admin_h_module).json()
        assert url not in s.get("attachments", [])


# ---------- PDF ----------
class TestPDF:
    def test_pdf_note(self, admin_h_module, sample_sale_id):
        r = requests.get(f"{API}/sales/{sample_sale_id}/pdf/note", headers=admin_h_module)
        assert r.status_code == 200
        assert r.headers["content-type"] == "application/pdf"
        assert r.content[:4] == b"%PDF"

    def test_pdf_production(self, admin_h_module, sample_sale_id):
        r = requests.get(f"{API}/sales/{sample_sale_id}/pdf/production", headers=admin_h_module)
        assert r.status_code == 200
        assert r.content[:4] == b"%PDF"


# ---------- Price Tables ----------
class TestPriceTables:
    def test_crud(self, admin_h, vend_h):
        # POST admin
        r = requests.post(f"{API}/price-tables",
                          json={"title": "TEST_Table", "image_url": "/api/uploads/x.png"},
                          headers=admin_h)
        assert r.status_code == 200
        tid = r.json()["id"]
        # vendedor POST forbidden
        r = requests.post(f"{API}/price-tables", json={"title": "X"}, headers=vend_h)
        assert r.status_code == 403
        # GET list
        r = requests.get(f"{API}/price-tables", headers=admin_h)
        assert any(t["id"] == tid for t in r.json())
        # PUT
        r = requests.put(f"{API}/price-tables/{tid}",
                         json={"title": "TEST_Table2", "image_url": ""}, headers=admin_h)
        assert r.status_code == 200
        assert r.json()["title"] == "TEST_Table2"
        # vendedor PUT forbidden
        r = requests.put(f"{API}/price-tables/{tid}", json={"title": "X"}, headers=vend_h)
        assert r.status_code == 403
        # DELETE vendedor forbidden
        r = requests.delete(f"{API}/price-tables/{tid}", headers=vend_h)
        assert r.status_code == 403
        # admin DELETE
        r = requests.delete(f"{API}/price-tables/{tid}", headers=admin_h)
        assert r.status_code == 200


# ---------- Shopee Import ----------
def _make_shopee_zip(entries):
    """entries: list of (filename, bytes)"""
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w") as zf:
        for name, data in entries:
            zf.writestr(name, data)
    return buf.getvalue()


class TestShopee:
    def test_import_zip_rejects_non_zip(self, admin_h):
        r = requests.post(f"{API}/shopee/import",
                          files={"file": ("fake.zip", b"NOT A ZIP", "application/zip")},
                          headers=admin_h)
        assert r.status_code == 400

    def test_import_rejects_non_zip_extension(self, admin_h):
        r = requests.post(f"{API}/shopee/import",
                          files={"file": ("test.txt", b"PK\x03\x04...", "application/zip")},
                          headers=admin_h)
        assert r.status_code == 400

    def test_import_two_pdfs(self, admin_h):
        pdf1 = _make_pdf_bytes("Nº do Pedido: 123456\nDestinatário: MARIA SILVA")
        pdf2 = _make_pdf_bytes("Nº do Pedido: 654321\nDestinatário: JOAO SANTOS")
        zip_bytes = _make_shopee_zip([("order1.pdf", pdf1), ("order2.pdf", pdf2)])
        r = requests.post(f"{API}/shopee/import",
                          files={"file": ("orders.zip", zip_bytes, "application/zip")},
                          headers=admin_h)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["imported"] >= 1
        # At least one order should have extracted name/order#
        got_name = any(o.get("customer_name") for o in data["orders"])
        got_num = any(o.get("order_number") and not o["order_number"].startswith("S-") for o in data["orders"])
        assert got_name, f"No customer_name extracted: {data['orders']}"
        assert got_num, f"No order_number extracted: {data['orders']}"
        # Save first identified order id for further tests
        pytest.shopee_test_ids = [o["id"] for o in data["orders"]]
        pytest.shopee_test_zip = zip_bytes

    def test_import_duplicate_detection(self, admin_h):
        # Reimport same zip
        zip_bytes = getattr(pytest, "shopee_test_zip", None)
        if not zip_bytes:
            pytest.skip("previous import missing")
        r = requests.post(f"{API}/shopee/import",
                          files={"file": ("orders.zip", zip_bytes, "application/zip")},
                          headers=admin_h)
        assert r.status_code == 200
        data = r.json()
        assert len(data["duplicates"]) >= 1, f"expected duplicates, got {data}"

    def test_shopee_list_and_filter(self, admin_h):
        r = requests.get(f"{API}/shopee/orders", headers=admin_h)
        assert r.status_code == 200
        assert isinstance(r.json(), list)
        r = requests.get(f"{API}/shopee/orders?status=AGUARDANDO IMAGEM", headers=admin_h)
        assert r.status_code == 200
        for o in r.json():
            assert o["status"] == "AGUARDANDO IMAGEM"
        r = requests.get(f"{API}/shopee/orders?q=MARIA", headers=admin_h)
        assert r.status_code == 200

    def test_shopee_update(self, admin_h):
        oids = getattr(pytest, "shopee_test_ids", [])
        if not oids:
            pytest.skip("no imported orders")
        oid = oids[0]
        r = requests.put(f"{API}/shopee/orders/{oid}",
                         json={"customer_name": "TEST_UPDATED", "status": "PRONTO PARA PRODUÇÃO",
                               "notes": "abc", "order_number": "999999"},
                         headers=admin_h)
        assert r.status_code == 200
        d = r.json()
        assert d["customer_name"] == "TEST_UPDATED"
        assert d["status"] == "PRONTO PARA PRODUÇÃO"

    def test_shopee_add_image(self, admin_h):
        oids = getattr(pytest, "shopee_test_ids", [])
        if not oids:
            pytest.skip("no imported orders")
        oid = oids[0]
        r = requests.post(f"{API}/shopee/orders/{oid}/images",
                         json={"url": "/api/uploads/img1.png"}, headers=admin_h)
        assert r.status_code == 200
        d = requests.get(f"{API}/shopee/orders/{oid}", headers=admin_h).json()
        assert "/api/uploads/img1.png" in d["images"]

    def test_ficha_pdf(self, admin_h):
        oids = getattr(pytest, "shopee_test_ids", [])
        if not oids:
            pytest.skip("no imported orders")
        r = requests.get(f"{API}/shopee/orders/{oids[0]}/ficha", headers=admin_h)
        assert r.status_code == 200
        assert r.content[:4] == b"%PDF"

    def test_batch_pdf(self, admin_h):
        oids = getattr(pytest, "shopee_test_ids", [])
        if len(oids) < 1:
            pytest.skip("no imported orders")
        r = requests.post(f"{API}/shopee/batch-pdf",
                         json={"ids": oids[:2], "mode": "both"}, headers=admin_h)
        assert r.status_code == 200
        assert r.content[:4] == b"%PDF"

    def test_shopee_delete_admin_only(self, admin_h, vend_h):
        oids = getattr(pytest, "shopee_test_ids", [])
        if not oids:
            pytest.skip("no imported orders")
        oid = oids[-1]
        r = requests.delete(f"{API}/shopee/orders/{oid}", headers=vend_h)
        assert r.status_code == 403
        r = requests.delete(f"{API}/shopee/orders/{oid}", headers=admin_h)
        assert r.status_code == 200


# ---------- Legacy endpoints ----------
class TestLegacy:
    def test_dashboard(self, admin_h):
        r = requests.get(f"{API}/dashboard", headers=admin_h)
        assert r.status_code == 200
        for k in ("faturamento_hoje", "faturamento_mes", "vendas_hoje"):
            assert k in r.json()

    def test_cash_closure(self, admin_h):
        r = requests.get(f"{API}/cash/closure", headers=admin_h)
        assert r.status_code == 200
        assert "by_method" in r.json()

    def test_reports_sales(self, admin_h):
        r = requests.get(f"{API}/reports/sales?group_by=day", headers=admin_h)
        assert r.status_code == 200

    def test_vales(self, admin_h):
        r = requests.get(f"{API}/vales", headers=admin_h)
        assert r.status_code == 200

    def test_users(self, admin_h):
        r = requests.get(f"{API}/users", headers=admin_h)
        assert r.status_code == 200


# ---------- RBAC ----------
class TestRBAC:
    def test_vend_403_product_create(self, vend_h):
        r = requests.post(f"{API}/products",
                          json={"name": "X", "category_id": "y"}, headers=vend_h)
        assert r.status_code == 403

    def test_vend_403_vales(self, vend_h):
        r = requests.post(f"{API}/vales", json={"user_id": "x", "amount": 10}, headers=vend_h)
        assert r.status_code == 403

    def test_vend_403_price_tables(self, vend_h):
        r = requests.post(f"{API}/price-tables", json={"title": "x"}, headers=vend_h)
        assert r.status_code == 403
