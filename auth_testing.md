# Auth Testing — Rio Sul

## Admin Login
- Email: festasegraficariosul@gmail.com
- Password: RioSul@2026

## Curl Test
```
API=$(grep REACT_APP_BACKEND_URL /app/frontend/.env | cut -d '=' -f2)
curl -c cookies.txt -X POST "$API/api/auth/login" -H "Content-Type: application/json" -d '{"email":"festasegraficariosul@gmail.com","password":"RioSul@2026"}'
curl -b cookies.txt "$API/api/auth/me"
```

## Rules
- All authenticated routes require JWT cookie or Bearer header.
- Admin has full access. Vendedor is restricted from: deleting sales, editing product prices in catalog, managing users, settings.
- Role checks enforced in backend via require_admin dependency.
