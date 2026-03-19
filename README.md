# shorten-share-links

Monorepo rút gọn link với:
- **FE**: React + Tailwind (`apps/web`)
- **BE**: Fastify + Drizzle + Postgres + Redis (`apps/api`)

## Routing (khuyến nghị để nhanh + tránh xung đột SPA)
- **API**: `http://localhost:3001/api/*`
- **Redirect**: `http://localhost:3001/r/*` (cache-first, rất nhanh)
- **Web app**: `http://localhost:5173/*`

Bạn có thể deploy cùng 1 domain theo dạng path-based reverse proxy:
- `/api/*` → API
- `/r/*` → API redirect
- `/*` → Web (SPA)

## Yêu cầu
- Node.js (hiện repo đang chạy tốt với **Node 21.x**)
- Postgres + Redis (local hoặc Docker)

## Cấu hình môi trường
Copy `.env.example` thành `.env` (hoặc export env vars tương đương) cho API:

```bash
cp .env.example .env
```

## Chạy local
### 1) Postgres/Redis
Tạo DB `ssl` và đảm bảo `DATABASE_URL` đúng.

### 2) Migrate DB
```bash
cd apps/api
npm run db:migrate
```

### 3) Run dev
Từ root:
```bash
npm run dev
```

## API nhanh (tóm tắt)
- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/me`
- `POST /api/links` (anonymous hoặc login)
- `GET /api/links` (login)
- `PATCH /api/links/:id` (login)
- `DELETE /api/links/:id` (login)
- `GET /r/:code`
- `GET /r/:project/:code`

# shorten-share-links
Create Shorten Link from long link and share to everyone
