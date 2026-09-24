# Auth Testing — Rio Sul

## Admin Login
- Login: Igor (case-insensitive)
- Password: 02578491
- Role: admin

## Existing Seller Login
- Login: vendedor
- Password: Vendedor@2026
- Role: vendedor

## API Contract
- POST `/api/auth/login` body: `{ "login": "Igor", "password": "02578491" }`
- GET `/api/auth/me` requires JWT cookie or Bearer token
- The legacy admin email is no longer accepted as a login identifier

## Curl Test
```
API=$(grep REACT_APP_BACKEND_URL /app/frontend/.env | cut -d '=' -f2)
curl -c cookies.txt -X POST "$API/api/auth/login" -H "Content-Type: application/json" -d '{"login":"Igor","password":"02578491"}'
curl -b cookies.txt "$API/api/auth/me"
```

## Rules
- All authenticated routes require JWT cookie or Bearer header.
- Admin has full access.
- Vendedor keeps the previous restrictions: deleting sales, editing product prices in catalog, managing users, and settings remain admin-only.
- Produção is available as a non-admin role in user management and does not receive admin-only access.
- Role checks are enforced in backend via `require_admin`.
