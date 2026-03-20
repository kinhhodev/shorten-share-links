# shorten-share-links

Source đã được **tách riêng**:
- **FE**: React + Tailwind (`frontend/web`)
- **BE**: Fastify + Drizzle + Postgres + Redis (`backend/api`)

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

Lưu ý: nếu `JWT_SECRET`/`COOKIE_SECRET` có ký tự `#` thì hãy **bọc trong dấu nháy** (vd `JWT_SECRET="abc#def..."`) hoặc dùng chuỗi chỉ gồm chữ/số để tránh bị dotenv cắt mất phần sau `#`.

## Chạy local
### 1) Postgres/Redis (Docker Compose)

```bash
docker compose up -d
```

DB mặc định:
- Postgres: `localhost:5432` (db `ssl`, user/pass `postgres/postgres`)
- Redis: `localhost:6379`

### 2) Migrate DB
```bash
cd backend/api
npm run db:migrate
```

### 3) Run dev
Chạy riêng từng service:

```bash
cd backend/api
npm run dev
```

```bash
cd frontend/web
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
