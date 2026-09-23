from dotenv import load_dotenv
from pathlib import Path
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

import os, jwt, bcrypt, uuid, io, base64, secrets
from datetime import datetime, timezone, timedelta
from typing import Optional, List, Any, Dict
from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, Response, UploadFile, File, Query
from fastapi.responses import StreamingResponse
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, EmailStr
import requests
import pandas as pd

JWT_ALGO = "HS256"
JWT_SECRET = os.environ["JWT_SECRET"]

client = AsyncIOMotorClient(os.environ['MONGO_URL'])
db = client[os.environ['DB_NAME']]

app = FastAPI(title="Rio Sul API")
api = APIRouter(prefix="/api")

def hash_pw(p: str) -> str:
    return bcrypt.hashpw(p.encode(), bcrypt.gensalt()).decode()

def verify_pw(p: str, h: str) -> bool:
    try: return bcrypt.checkpw(p.encode(), h.encode())
    except: return False

def make_access(uid: str, email: str, role: str) -> str:
    return jwt.encode({"sub": uid, "email": email, "role": role, "type": "access",
                       "exp": datetime.now(timezone.utc) + timedelta(hours=12)}, JWT_SECRET, algorithm=JWT_ALGO)

def make_refresh(uid: str) -> str:
    return jwt.encode({"sub": uid, "type": "refresh",
                       "exp": datetime.now(timezone.utc) + timedelta(days=7)}, JWT_SECRET, algorithm=JWT_ALGO)

def new_id() -> str: return str(uuid.uuid4())
def now_iso() -> str: return datetime.now(timezone.utc).isoformat()

async def get_user(request: Request) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        ah = request.headers.get("Authorization", "")
        if ah.startswith("Bearer "): token = ah[7:]
    if not token: raise HTTPException(401, "Não autenticado")
    try:
        p = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGO])
        if p.get("type") != "access": raise HTTPException(401, "Token inválido")
        u = await db.users.find_one({"id": p["sub"]})
        if not u: raise HTTPException(401, "Usuário não encontrado")
        u.pop("_id", None); u.pop("password_hash", None)
        return u
    except jwt.ExpiredSignatureError: raise HTTPException(401, "Token expirado")
    except jwt.InvalidTokenError: raise HTTPException(401, "Token inválido")

async def require_admin(user=Depends(get_user)):
    if user.get("role") != "admin": raise HTTPException(403, "Apenas administradores")
    return user

# ---------- Startup ----------
@app.on_event("startup")
async def startup():
    await db.users.create_index("email", unique=True)
    await db.customers.create_index("phone")
    await db.sales.create_index("order_number")
    # seed admin
    email = os.environ["ADMIN_EMAIL"].lower()
    pw = os.environ["ADMIN_PASSWORD"]
    name = os.environ.get("ADMIN_NAME", "Admin")
    existing = await db.users.find_one({"email": email})
    if not existing:
        await db.users.insert_one({"id": new_id(), "email": email, "password_hash": hash_pw(pw),
                                   "name": name, "role": "admin", "active": True, "created_at": now_iso()})
    elif not verify_pw(pw, existing["password_hash"]):
        await db.users.update_one({"email": email}, {"$set": {"password_hash": hash_pw(pw), "role": "admin"}})
    # seed vendedor demo
    if not await db.users.find_one({"email": "vendedor@riosul.com"}):
        await db.users.insert_one({"id": new_id(), "email": "vendedor@riosul.com",
                                   "password_hash": hash_pw("Vendedor@2026"), "name": "Vendedor Demo",
                                   "role": "vendedor", "active": True, "created_at": now_iso()})
    # seed demo categories if empty
    if await db.categories.count_documents({}) == 0:
        demo = ["Adesivos","Impressões","Banners","Lonas","Canecas","Camisas","Cartões","Panfletos","Fotos","Outros"]
        for i, n in enumerate(demo):
            await db.categories.insert_one({"id": new_id(), "name": n, "order": i, "active": True, "created_at": now_iso()})
    # seed default channels
    if await db.channels.count_documents({}) == 0:
        for n in ["Loja","WhatsApp","Instagram","Shopee","Outro"]:
            await db.channels.insert_one({"id": new_id(), "name": n, "active": True})
    if await db.payment_methods.count_documents({}) == 0:
        for n in ["PIX","Dinheiro","Débito","Crédito","Link","Transferência","Outro"]:
            await db.payment_methods.insert_one({"id": new_id(), "name": n, "active": True})
    if await db.units.count_documents({}) == 0:
        for n in ["Unidade","Pacote","Folha","Metro","M²","Cento","Milheiro"]:
            await db.units.insert_one({"id": new_id(), "name": n, "active": True})
    if await db.settings.count_documents({}) == 0:
        await db.settings.insert_one({"id": "main", "company_name": "Rio Sul Festas & Gráfica",
                                      "phone": "", "whatsapp": "", "instagram": "@graficariosul",
                                      "address": "", "receipt_footer": "Obrigado pela preferência!"})

# ---------- Auth ----------
class LoginIn(BaseModel):
    email: EmailStr
    password: str

def set_cookies(resp: Response, access: str, refresh: str):
    resp.set_cookie("access_token", access, httponly=True, secure=True, samesite="none", max_age=43200, path="/")
    resp.set_cookie("refresh_token", refresh, httponly=True, secure=True, samesite="none", max_age=604800, path="/")

@api.post("/auth/login")
async def login(body: LoginIn, response: Response):
    u = await db.users.find_one({"email": body.email.lower()})
    if not u or not u.get("active", True) or not verify_pw(body.password, u["password_hash"]):
        raise HTTPException(401, "Credenciais inválidas")
    access = make_access(u["id"], u["email"], u["role"])
    refresh = make_refresh(u["id"])
    set_cookies(response, access, refresh)
    return {"id": u["id"], "email": u["email"], "name": u["name"], "role": u["role"], "access_token": access}

@api.post("/auth/logout")
async def logout(response: Response, user=Depends(get_user)):
    response.delete_cookie("access_token", path="/")
    response.delete_cookie("refresh_token", path="/")
    return {"ok": True}

@api.get("/auth/me")
async def me(user=Depends(get_user)):
    return user

@api.post("/auth/refresh")
async def refresh(request: Request, response: Response):
    tok = request.cookies.get("refresh_token")
    if not tok: raise HTTPException(401, "Sem token")
    try:
        p = jwt.decode(tok, JWT_SECRET, algorithms=[JWT_ALGO])
        if p.get("type") != "refresh": raise HTTPException(401)
        u = await db.users.find_one({"id": p["sub"]})
        if not u: raise HTTPException(401)
        access = make_access(u["id"], u["email"], u["role"])
        response.set_cookie("access_token", access, httponly=True, secure=True, samesite="none", max_age=43200, path="/")
        return {"ok": True}
    except jwt.InvalidTokenError: raise HTTPException(401)

# ---------- CRUD helper ----------
async def clean(doc):
    if doc: doc.pop("_id", None); doc.pop("password_hash", None)
    return doc

# ---------- Users / Employees ----------
class UserIn(BaseModel):
    email: EmailStr
    password: str
    name: str
    role: str = "vendedor"
    active: bool = True

@api.get("/users")
async def list_users(user=Depends(require_admin)):
    docs = await db.users.find({}, {"password_hash": 0, "_id": 0}).to_list(1000)
    return docs

@api.post("/users")
async def create_user(body: UserIn, user=Depends(require_admin)):
    if await db.users.find_one({"email": body.email.lower()}):
        raise HTTPException(400, "Email já cadastrado")
    d = {"id": new_id(), "email": body.email.lower(), "password_hash": hash_pw(body.password),
         "name": body.name, "role": body.role, "active": body.active, "created_at": now_iso()}
    await db.users.insert_one(d)
    d.pop("password_hash"); d.pop("_id", None)
    return d

class UserUpd(BaseModel):
    name: Optional[str] = None
    role: Optional[str] = None
    active: Optional[bool] = None
    password: Optional[str] = None

@api.put("/users/{uid}")
async def update_user(uid: str, body: UserUpd, user=Depends(require_admin)):
    upd = {k: v for k, v in body.model_dump().items() if v is not None and k != "password"}
    if body.password: upd["password_hash"] = hash_pw(body.password)
    await db.users.update_one({"id": uid}, {"$set": upd})
    d = await db.users.find_one({"id": uid}, {"password_hash": 0, "_id": 0})
    return d

# ---------- Categories ----------
class CatIn(BaseModel):
    name: str
    order: int = 0
    active: bool = True

@api.get("/categories")
async def cats(user=Depends(get_user)):
    return await db.categories.find({}, {"_id": 0}).sort("order", 1).to_list(500)

@api.post("/categories")
async def cat_create(body: CatIn, user=Depends(require_admin)):
    d = {"id": new_id(), **body.model_dump(), "created_at": now_iso()}
    await db.categories.insert_one(d); d.pop("_id", None); return d

@api.put("/categories/{cid}")
async def cat_upd(cid: str, body: CatIn, user=Depends(require_admin)):
    await db.categories.update_one({"id": cid}, {"$set": body.model_dump()})
    return await db.categories.find_one({"id": cid}, {"_id": 0})

@api.delete("/categories/{cid}")
async def cat_del(cid: str, user=Depends(require_admin)):
    await db.categories.update_one({"id": cid}, {"$set": {"active": False}})
    return {"ok": True}

# ---------- Simple lookups (channels, payment methods, units) ----------
class NameIn(BaseModel):
    name: str
    active: bool = True

def crud_lookup(coll):
    @api.get(f"/{coll}")
    async def _list(user=Depends(get_user)):
        return await db[coll].find({}, {"_id": 0}).to_list(500)
    @api.post(f"/{coll}")
    async def _create(body: NameIn, user=Depends(require_admin)):
        d = {"id": new_id(), **body.model_dump()}; await db[coll].insert_one(d); d.pop("_id", None); return d
    @api.delete(f"/{coll}/{{cid}}")
    async def _del(cid: str, user=Depends(require_admin)):
        await db[coll].update_one({"id": cid}, {"$set": {"active": False}}); return {"ok": True}

crud_lookup("channels")
crud_lookup("payment_methods")
crud_lookup("units")

# ---------- Products ----------
class Variation(BaseModel):
    id: Optional[str] = None
    name: str
    price: float = 0
    active: bool = True

class ProductIn(BaseModel):
    name: str
    category_id: str
    description: Optional[str] = ""
    price: float = 0
    price_type: str = "fixed"  # fixed | variable | per_m2 | tiered
    unit: str = "Unidade"
    sku: Optional[str] = ""
    active: bool = True
    order: int = 0
    variations: List[Variation] = []
    tiers: List[Dict[str, Any]] = []  # [{min_qty, max_qty, price}]
    m2_min_price: Optional[float] = 0
    m2_price: Optional[float] = 0

@api.get("/products")
async def prods(user=Depends(get_user)):
    return await db.products.find({}, {"_id": 0}).sort("order", 1).to_list(2000)

@api.post("/products")
async def prod_create(body: ProductIn, user=Depends(require_admin)):
    d = body.model_dump()
    d["id"] = new_id()
    for v in d.get("variations", []):
        if not v.get("id"): v["id"] = new_id()
    d["created_at"] = now_iso()
    await db.products.insert_one(d); d.pop("_id", None); return d

@api.put("/products/{pid}")
async def prod_upd(pid: str, body: ProductIn, user=Depends(require_admin)):
    d = body.model_dump()
    for v in d.get("variations", []):
        if not v.get("id"): v["id"] = new_id()
    await db.products.update_one({"id": pid}, {"$set": d})
    return await db.products.find_one({"id": pid}, {"_id": 0})

@api.delete("/products/{pid}")
async def prod_del(pid: str, user=Depends(require_admin)):
    await db.products.update_one({"id": pid}, {"$set": {"active": False}}); return {"ok": True}

# ---------- Products import CSV/XLSX ----------
@api.post("/products/import/preview")
async def import_preview(file: UploadFile = File(...), user=Depends(require_admin)):
    content = await file.read()
    try:
        if file.filename.lower().endswith(".csv"):
            df = pd.read_csv(io.BytesIO(content))
        else:
            df = pd.read_excel(io.BytesIO(content))
    except Exception as e:
        raise HTTPException(400, f"Erro ao ler arquivo: {e}")
    df.columns = [c.strip().lower() for c in df.columns]
    required = ["categoria", "produto", "preco"]
    missing = [c for c in required if c not in df.columns]
    if missing: raise HTTPException(400, f"Colunas faltando: {missing}")
    rows, errors = [], []
    for i, r in df.iterrows():
        try:
            rows.append({
                "categoria": str(r.get("categoria", "")).strip(),
                "produto": str(r.get("produto", "")).strip(),
                "variacao": str(r.get("variacao", "") or "").strip(),
                "preco": float(r.get("preco", 0) or 0),
                "unidade": str(r.get("unidade", "Unidade") or "Unidade").strip(),
                "tipo_preco": str(r.get("tipo_preco", "fixed") or "fixed").strip().lower(),
                "ativo": bool(r.get("ativo", True)),
            })
        except Exception as e:
            errors.append({"line": int(i) + 2, "error": str(e)})
    return {"rows": rows, "errors": errors, "count": len(rows)}

@api.post("/products/import/confirm")
async def import_confirm(payload: Dict[str, Any], user=Depends(require_admin)):
    rows = payload.get("rows", [])
    created, updated = 0, 0
    for r in rows:
        cat = await db.categories.find_one({"name": r["categoria"]})
        if not cat:
            cat = {"id": new_id(), "name": r["categoria"], "order": 999, "active": True, "created_at": now_iso()}
            await db.categories.insert_one(cat)
        existing = await db.products.find_one({"name": r["produto"], "category_id": cat["id"]})
        if existing:
            if r["variacao"]:
                variations = existing.get("variations", [])
                if not any(v["name"] == r["variacao"] for v in variations):
                    variations.append({"id": new_id(), "name": r["variacao"], "price": r["preco"], "active": True})
                    await db.products.update_one({"id": existing["id"]}, {"$set": {"variations": variations}})
                    updated += 1
        else:
            doc = {"id": new_id(), "name": r["produto"], "category_id": cat["id"], "description": "",
                   "price": r["preco"], "price_type": r["tipo_preco"], "unit": r["unidade"], "sku": "",
                   "active": r["ativo"], "order": 0, "variations": [], "tiers": [], "m2_min_price": 0, "m2_price": 0,
                   "created_at": now_iso()}
            if r["variacao"]:
                doc["variations"] = [{"id": new_id(), "name": r["variacao"], "price": r["preco"], "active": True}]
            await db.products.insert_one(doc)
            created += 1
    return {"created": created, "updated": updated}

# ---------- Customers ----------
class CustomerIn(BaseModel):
    name: str
    phone: str = ""
    instagram: str = ""
    notes: str = ""

@api.get("/customers")
async def cust_list(q: Optional[str] = None, user=Depends(get_user)):
    query = {}
    if q:
        query = {"$or": [{"name": {"$regex": q, "$options": "i"}}, {"phone": {"$regex": q, "$options": "i"}}]}
    return await db.customers.find(query, {"_id": 0}).sort("name", 1).to_list(500)

@api.post("/customers")
async def cust_create(body: CustomerIn, user=Depends(get_user)):
    if body.phone:
        ex = await db.customers.find_one({"phone": body.phone})
        if ex: return {k: v for k, v in ex.items() if k != "_id"}
    d = {"id": new_id(), **body.model_dump(), "created_at": now_iso()}
    await db.customers.insert_one(d); d.pop("_id", None); return d

@api.put("/customers/{cid}")
async def cust_upd(cid: str, body: CustomerIn, user=Depends(get_user)):
    await db.customers.update_one({"id": cid}, {"$set": body.model_dump()})
    return await db.customers.find_one({"id": cid}, {"_id": 0})

@api.get("/customers/{cid}")
async def cust_get(cid: str, user=Depends(get_user)):
    c = await db.customers.find_one({"id": cid}, {"_id": 0})
    if not c: raise HTTPException(404)
    sales = await db.sales.find({"customer_id": cid}, {"_id": 0}).sort("created_at", -1).to_list(500)
    total = sum(s.get("total", 0) for s in sales)
    pending = sum(s.get("balance", 0) for s in sales)
    return {"customer": c, "sales": sales, "total_spent": total, "pending": pending, "orders_count": len(sales)}

# ---------- Sales ----------
class SaleItem(BaseModel):
    product_id: str
    variation_id: Optional[str] = None
    product_name: str
    variation_name: Optional[str] = ""
    quantity: float = 1
    catalog_price: float = 0
    unit_price: float = 0
    discount: float = 0
    subtotal: float = 0
    m2_data: Optional[Dict[str, Any]] = None
    notes: Optional[str] = ""

class Payment(BaseModel):
    method: str
    amount: float

class SaleIn(BaseModel):
    customer_id: Optional[str] = None
    customer_name: str = ""
    customer_phone: str = ""
    items: List[SaleItem]
    discount: float = 0
    surcharge: float = 0
    total: float
    paid: float = 0
    payments: List[Payment] = []
    channel: str = "Loja"
    status: str = "PEDIDO RECEBIDO"
    delivery_date: Optional[str] = None
    notes: str = ""

async def next_order_number():
    counter = await db.counters.find_one_and_update(
        {"id": "order"}, {"$inc": {"seq": 1}}, upsert=True, return_document=True)
    if not counter: return 1
    return counter.get("seq", 1)

@api.post("/sales")
async def sale_create(body: SaleIn, user=Depends(get_user)):
    now = datetime.now(timezone.utc)
    order_no = await next_order_number()
    balance = round(body.total - body.paid, 2)
    d = body.model_dump()
    d.update({
        "id": new_id(),
        "order_number": order_no,
        "seller_id": user["id"],
        "seller_name": user["name"],
        "balance": balance,
        "created_at": now.isoformat(),
        "day": now.day, "month": now.month, "year": now.year,
        "weekday": now.strftime("%A"),
        "cancelled": False,
    })
    await db.sales.insert_one(d); d.pop("_id", None)
    await db.audit_logs.insert_one({"id": new_id(), "user_id": user["id"], "user_name": user["name"],
                                    "action": "sale_create", "sale_id": d["id"], "at": now.isoformat()})
    return d

@api.get("/sales")
async def sale_list(user=Depends(get_user), start: Optional[str] = None, end: Optional[str] = None,
                    seller_id: Optional[str] = None, status: Optional[str] = None, q: Optional[str] = None):
    query = {}
    if user["role"] == "vendedor":
        query["seller_id"] = user["id"]
    if seller_id: query["seller_id"] = seller_id
    if status: query["status"] = status
    if start or end:
        rng = {}
        if start: rng["$gte"] = start
        if end: rng["$lte"] = end + "T23:59:59"
        query["created_at"] = rng
    if q:
        query["$or"] = [{"customer_name": {"$regex": q, "$options": "i"}},
                        {"customer_phone": {"$regex": q, "$options": "i"}}]
    return await db.sales.find(query, {"_id": 0}).sort("created_at", -1).to_list(2000)

@api.get("/sales/{sid}")
async def sale_get(sid: str, user=Depends(get_user)):
    s = await db.sales.find_one({"id": sid}, {"_id": 0})
    if not s: raise HTTPException(404)
    if user["role"] == "vendedor" and s.get("seller_id") != user["id"]:
        raise HTTPException(403, "Sem permissão")
    return s

@api.put("/sales/{sid}")
async def sale_upd(sid: str, body: SaleIn, user=Depends(get_user)):
    s = await db.sales.find_one({"id": sid})
    if not s: raise HTTPException(404)
    if user["role"] == "vendedor" and s.get("seller_id") != user["id"]:
        raise HTTPException(403)
    d = body.model_dump()
    d["balance"] = round(body.total - body.paid, 2)
    await db.sales.update_one({"id": sid}, {"$set": d})
    await db.audit_logs.insert_one({"id": new_id(), "user_id": user["id"], "user_name": user["name"],
                                    "action": "sale_update", "sale_id": sid, "at": now_iso()})
    return await db.sales.find_one({"id": sid}, {"_id": 0})

@api.put("/sales/{sid}/status")
async def sale_status(sid: str, payload: Dict[str, Any], user=Depends(get_user)):
    await db.sales.update_one({"id": sid}, {"$set": {"status": payload["status"]}})
    await db.audit_logs.insert_one({"id": new_id(), "user_id": user["id"], "action": "status_change",
                                    "sale_id": sid, "status": payload["status"], "at": now_iso()})
    return {"ok": True}

@api.post("/sales/{sid}/payment")
async def sale_pay(sid: str, body: Payment, user=Depends(get_user)):
    s = await db.sales.find_one({"id": sid})
    if not s: raise HTTPException(404)
    payments = s.get("payments", []) + [{"method": body.method, "amount": body.amount, "at": now_iso()}]
    paid = round(s.get("paid", 0) + body.amount, 2)
    balance = round(s["total"] - paid, 2)
    await db.sales.update_one({"id": sid}, {"$set": {"payments": payments, "paid": paid, "balance": balance}})
    return {"ok": True, "paid": paid, "balance": balance}

@api.delete("/sales/{sid}")
async def sale_cancel(sid: str, user=Depends(require_admin)):
    await db.sales.update_one({"id": sid}, {"$set": {"cancelled": True, "status": "CANCELADO"}})
    await db.audit_logs.insert_one({"id": new_id(), "user_id": user["id"], "action": "sale_cancel",
                                    "sale_id": sid, "at": now_iso()})
    return {"ok": True}

# ---------- Dashboard ----------
@api.get("/dashboard")
async def dashboard(user=Depends(get_user), start: Optional[str] = None, end: Optional[str] = None):
    now = datetime.now(timezone.utc)
    today = now.strftime("%Y-%m-%d")
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0).isoformat()
    q = {"cancelled": {"$ne": True}}
    if user["role"] == "vendedor": q["seller_id"] = user["id"]

    async def sum_sales(match):
        docs = await db.sales.find({**q, **match}, {"_id": 0}).to_list(5000)
        return docs

    today_sales = await sum_sales({"created_at": {"$gte": today}})
    month_sales = await sum_sales({"created_at": {"$gte": month_start}})
    all_open = await sum_sales({"status": {"$nin": ["ENTREGUE", "CANCELADO"]}})
    ready = await sum_sales({"status": "PRONTO"})
    in_production = await sum_sales({"status": {"$in": ["EM PRODUÇÃO","ARTE APROVADA","ARTE EM CRIAÇÃO"]}})

    def sum_total(arr): return round(sum(s.get("total", 0) for s in arr), 2)
    def sum_balance(arr): return round(sum(s.get("balance", 0) for s in arr), 2)

    late = [s for s in all_open if s.get("delivery_date") and s["delivery_date"] < today]

    # sellers ranking (admin only, else own)
    users = await db.users.find({}, {"_id": 0, "password_hash": 0}).to_list(200)
    by_seller = {}
    for s in month_sales:
        k = s.get("seller_id")
        by_seller.setdefault(k, {"seller_name": s.get("seller_name"), "count": 0, "total": 0})
        by_seller[k]["count"] += 1
        by_seller[k]["total"] += s.get("total", 0)

    by_channel = {}
    for s in month_sales:
        k = s.get("channel", "Outro")
        by_channel[k] = by_channel.get(k, 0) + s.get("total", 0)

    # sales by day (last 14 days)
    daily = {}
    for s in month_sales:
        d = s.get("created_at", "")[:10]
        daily[d] = daily.get(d, 0) + s.get("total", 0)

    return {
        "vendas_hoje": len(today_sales),
        "faturamento_hoje": sum_total(today_sales),
        "faturamento_mes": sum_total(month_sales),
        "pedidos_hoje": len(today_sales),
        "ticket_medio": round(sum_total(today_sales) / len(today_sales), 2) if today_sales else 0,
        "valores_a_receber": sum_balance(all_open),
        "pedidos_producao": len(in_production),
        "pedidos_prontos": len(ready),
        "pedidos_atrasados": len(late),
        "by_seller": list(by_seller.values()),
        "by_channel": [{"name": k, "total": round(v, 2)} for k, v in by_channel.items()],
        "daily": [{"date": k, "total": round(v, 2)} for k, v in sorted(daily.items())],
    }

# ---------- Cash Closure ----------
@api.get("/cash/closure")
async def closure(date: Optional[str] = None, seller_id: Optional[str] = None, user=Depends(get_user)):
    if not date: date = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    q = {"created_at": {"$gte": date, "$lte": date + "T23:59:59"}, "cancelled": {"$ne": True}}
    if seller_id: q["seller_id"] = seller_id
    sales = await db.sales.find(q, {"_id": 0}).to_list(5000)
    by_method = {}
    total_sold = 0; total_received = 0; total_pending = 0
    for s in sales:
        total_sold += s.get("total", 0)
        total_received += s.get("paid", 0)
        total_pending += s.get("balance", 0)
        for p in s.get("payments", []):
            by_method[p["method"]] = by_method.get(p["method"], 0) + p["amount"]
    return {
        "date": date,
        "by_method": [{"method": k, "total": round(v, 2)} for k, v in by_method.items()],
        "total_sold": round(total_sold, 2),
        "total_received": round(total_received, 2),
        "total_pending": round(total_pending, 2),
        "count": len(sales),
        "ticket_medio": round(total_sold / len(sales), 2) if sales else 0,
    }

# ---------- Vales ----------
class ValeIn(BaseModel):
    user_id: str
    amount: float
    date: Optional[str] = None
    notes: str = ""

@api.get("/vales")
async def vales_list(user_id: Optional[str] = None, user=Depends(get_user)):
    q = {}
    if user["role"] == "vendedor": q["user_id"] = user["id"]
    elif user_id: q["user_id"] = user_id
    return await db.vales.find(q, {"_id": 0}).sort("date", -1).to_list(1000)

@api.post("/vales")
async def vales_create(body: ValeIn, user=Depends(require_admin)):
    d = body.model_dump()
    if not d.get("date"): d["date"] = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    d["id"] = new_id(); d["created_at"] = now_iso()
    u = await db.users.find_one({"id": body.user_id})
    d["user_name"] = u["name"] if u else ""
    await db.vales.insert_one(d); d.pop("_id", None); return d

@api.delete("/vales/{vid}")
async def vales_del(vid: str, user=Depends(require_admin)):
    await db.vales.delete_one({"id": vid}); return {"ok": True}

# ---------- ZPL to PDF via Labelary ----------
@api.post("/labels/zpl-to-pdf")
async def zpl_to_pdf(payload: Dict[str, Any], user=Depends(get_user)):
    zpl = payload.get("zpl", "")
    if not zpl.strip(): raise HTTPException(400, "ZPL vazio")
    labels = [l.strip() for l in zpl.split("^XZ") if l.strip()]
    labels = [l + "^XZ" for l in labels]
    try:
        r = requests.post("http://api.labelary.com/v1/printers/8dpmm/labels/4x6/",
                          headers={"Accept": "application/pdf"},
                          files={"file": ("labels.zpl", "\n".join(labels))},
                          timeout=30)
        if r.status_code != 200:
            raise HTTPException(400, f"Labelary erro: {r.text}")
        return StreamingResponse(io.BytesIO(r.content), media_type="application/pdf",
                                 headers={"Content-Disposition": "attachment; filename=etiquetas.pdf"})
    except requests.RequestException as e:
        raise HTTPException(500, f"Falha ao gerar PDF: {e}")

@api.post("/labels/zpl-preview")
async def zpl_preview(payload: Dict[str, Any], user=Depends(get_user)):
    zpl = payload.get("zpl", "")
    if not zpl.strip(): raise HTTPException(400, "ZPL vazio")
    try:
        r = requests.post("http://api.labelary.com/v1/printers/8dpmm/labels/4x6/0/",
                          headers={"Accept": "image/png"},
                          files={"file": ("l.zpl", zpl)}, timeout=30)
        if r.status_code != 200: raise HTTPException(400, f"Erro: {r.text[:200]}")
        return {"png_base64": base64.b64encode(r.content).decode()}
    except requests.RequestException as e:
        raise HTTPException(500, str(e))

# ---------- Reports ----------
@api.get("/reports/sales")
async def report_sales(start: Optional[str] = None, end: Optional[str] = None,
                       group_by: str = "day", user=Depends(require_admin)):
    q = {"cancelled": {"$ne": True}}
    if start or end:
        rng = {}
        if start: rng["$gte"] = start
        if end: rng["$lte"] = end + "T23:59:59"
        q["created_at"] = rng
    sales = await db.sales.find(q, {"_id": 0}).to_list(10000)
    groups = {}
    for s in sales:
        if group_by == "day": k = s.get("created_at", "")[:10]
        elif group_by == "seller": k = s.get("seller_name", "")
        elif group_by == "channel": k = s.get("channel", "")
        elif group_by == "month": k = s.get("created_at", "")[:7]
        else: k = "all"
        groups.setdefault(k, {"count": 0, "total": 0, "paid": 0, "balance": 0})
        groups[k]["count"] += 1
        groups[k]["total"] += s.get("total", 0)
        groups[k]["paid"] += s.get("paid", 0)
        groups[k]["balance"] += s.get("balance", 0)
    return [{"key": k, **{kk: round(vv, 2) for kk, vv in v.items()}} for k, v in sorted(groups.items())]

@api.get("/reports/top-products")
async def report_top(user=Depends(require_admin)):
    sales = await db.sales.find({"cancelled": {"$ne": True}}, {"_id": 0}).to_list(10000)
    counts = {}
    for s in sales:
        for it in s.get("items", []):
            k = it.get("product_name", "")
            counts.setdefault(k, {"count": 0, "total": 0})
            counts[k]["count"] += it.get("quantity", 0)
            counts[k]["total"] += it.get("subtotal", 0)
    result = [{"name": k, **{kk: round(vv, 2) for kk, vv in v.items()}} for k, v in counts.items()]
    result.sort(key=lambda x: x["total"], reverse=True)
    return result[:50]

# ---------- Settings ----------
@api.get("/settings")
async def settings_get(user=Depends(get_user)):
    s = await db.settings.find_one({"id": "main"}, {"_id": 0}) or {}
    return s

@api.put("/settings")
async def settings_upd(body: Dict[str, Any], user=Depends(require_admin)):
    body.pop("_id", None); body["id"] = "main"
    await db.settings.update_one({"id": "main"}, {"$set": body}, upsert=True)
    return await db.settings.find_one({"id": "main"}, {"_id": 0})

# mount
app.include_router(api)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_origin_regex=".*",
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def _shutdown(): client.close()
