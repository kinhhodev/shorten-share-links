# shorten-share-links

Source đã được **tách riêng**:
- **FE**: React + Tailwind (`frontend/web`)
- **BE**: Fastify + Drizzle + Postgres + Redis (`backend/api`)

## Trùng alias (theo owner)
Unique trên DB là **`(project, code, owner_user_id)`** (cùng `project` + `code` nhưng **user khác** vẫn được tạo). Trùng **cùng một** user (hoặc cùng ẩn danh) → API thử `alias`, `alias-1`, `alias-2`, … (tối đa 100 lần). Migration `0003` dùng **`NULLS NOT DISTINCT`** (PostgreSQL **15+**; Docker image hiện tại: 16).

**Xóa mềm chủ đề (Thùng rác):** migration `0004` thêm `deleted_at`, `trash_batch_id`. Unique chỉ áp dụng khi **`deleted_at IS NULL`** — có thể tạo link mới trùng mã với bản đã xóa mềm; **khôi phục** từ Thùng rác nếu trùng sẽ nhận `409 CONFLICT`.

## Routing (khuyến nghị để nhanh + tránh xung đột SPA)
- **API**: `http://localhost:3001/api/*`
- **Redirect**: `http://localhost:3001/r/*` (cache-first, rất nhanh)
- **Web app**: `http://localhost:5173/*`

Bạn có thể deploy cùng 1 domain theo dạng path-based reverse proxy:
- `/api/*` → API
- `/r/*` → API redirect
- `/*` → Web (SPA)

## Troubleshooting: JWT / cookie (`Authorization token is invalid`, `signature is invalid`)

1. **Đổi `JWT_SECRET` hoặc sửa `.env`:** đăng xuất và đăng nhập lại (cookie cũ ký bằng secret cũ sẽ hỏng). Xóa cookie site `localhost` nếu cần.
2. **Dòng trống / ký tự thừa trong secret:** `JWT_SECRET` / `COOKIE_SECRET` đã được trim trong code; kiểm tra file `.env` không có nhầm dấu nháy hoặc `#` cắt mất phần sau.
3. **Header `Authorization: Bearer` lạ:** trình duyệt/extension có thể gửi Bearer sai — API giờ **chỉ tin cookie** `ssl_token` khi verify (`onlyCookie: true`).

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

### (Tuỳ chọn) Seed dữ liệu lớn để test hiệu năng
Tạo **1000 user** (email `bulk-seed-0@seed.local` …) và **1.000.000 link** trỏ `https://google.com` (mỗi user 1000 link, `project` null).

```bash
cd backend/api
SEED_BULK_CONFIRM=1 npm run db:seed:bulk
```

Cần biến `DATABASE_URL` trong `.env` (root repo). **Chỉ chạy trên DB dev**; chạy lại sẽ trùng email và lỗi. Chi tiết: [`docs/seed-bulk.md`](docs/seed-bulk.md).

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

## Bảo mật (reCAPTCHA, URL, enumeration)
- Chi tiết: [`docs/security.md`](docs/security.md)
- **reCAPTCHA v3:** thêm `RECAPTCHA_SECRET_KEY` (API) và `VITE_RECAPTCHA_SITE_KEY` (web). Trước khi có key, hệ thống vẫn chạy (chỉ tắt bước verify).

## Kiểm thử backend
- **Unit test (không cần Postgres):** `cd backend/api && npm test`
- **Manual testcase (checklist + curl):** xem [`docs/backend-manual-testcases.md`](docs/backend-manual-testcases.md)

## API nhanh (tóm tắt)
- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/me`
- `POST /api/links` (anonymous hoặc login)
- `GET /api/links` (login) — query: `page`, `pageSize`, `q` (tìm trong code/long URL), `project` (slug chủ đề hoặc `__none__` để chỉ link **không** có project)
- `GET /api/links/projects` (login) — tổng hợp theo từng `project` (kể cả `null`), kèm `total` và `activeCount`
- `PATCH /api/links/:id` (login)
- `DELETE /api/links/:id` (login)
- `GET /r/:code`
- `GET /r/:project/:code`
