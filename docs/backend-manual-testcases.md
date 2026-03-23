# Backend — test tự động & manual testcase

Tài liệu này mô tả **test tự động** (Node built-in test runner) và **checklist chạy tay** cho API (`backend/api`). Dùng khi regression sau khi đổi auth, links, redirect, hoặc DB.

---

## 0. Bảo mật (tùy chọn)

Xem [`security.md`](security.md): reCAPTCHA v3, kiểm tra URL đích, redirect thống nhất `404`, blocklist host. Khi chưa cấu hình `RECAPTCHA_SECRET_KEY` / `VITE_RECAPTCHA_SITE_KEY`, các bước liên quan reCAPTCHA có thể bỏ qua.

---

## 1. Chuẩn bị môi trường

| Bước | Mô tả |
|------|--------|
| 1 | Postgres + Redis chạy (vd `docker compose up -d` từ root repo). |
| 2 | Copy `backend/api/.env.example` → `.env`, chỉnh `DATABASE_URL`, `JWT_SECRET`, `COOKIE_SECRET`, … |
| 3 | Migrate: `cd backend/api && npm run db:migrate` |
| 4 | Chạy API: `cd backend/api && npm run dev` (mặc định thường là `http://localhost:3001`). |

**Giả định base URL API:** `http://localhost:3001` (thay nếu khác).

---

## 2. Test tự động (unit — không cần DB)

Các file trong `backend/api/src/__tests__/`:

| File | Nội dung |
|------|-----------|
| `code.test.ts` | Sinh `randomCode`, `codeForCustomAliasAttempt` (alias + hậu tố `-1`, …). |
| `schemas.test.ts` | Zod: `CreateLinkBodySchema`, `LinkProjectsResponseSchema`, … |

### Cách chạy

```bash
cd backend/api
npm test
```

Kỳ vọng: **tất cả test pass** (exit code 0). Không cần Postgres/Redis cho các test này.

---

## 3. Manual testcase (checklist)

Thực hiện **sau khi API đã chạy** và DB đã migrate. Có thể dùng **curl** + file cookie, **Postman**, hoặc **DevTools** trên web app (Network) — quan trọng là **cookie/session** cho các route cần đăng nhập.

### 3.1 Health & CORS

- [ ] `GET http://localhost:3001/health` → `200`, body dạng `{ "ok": true }`.

### 3.2 Đăng ký / đăng nhập / session

- [ ] `POST /api/auth/register` với body hợp lệ (`fullName`, `email`, `phone`, `password`, `confirmPassword`) → tạo user (hoặc lỗi rõ ràng nếu email trùng).
- [ ] `POST /api/auth/login` với email/password đúng → `Set-Cookie` (vd `ssl_token` hoặc tên cookie theo code).
- [ ] `GET /api/me` **không cookie** → `401` hoặc lỗi auth tương ứng.
- [ ] `GET /api/me` **có cookie sau login** → `200`, trả `id`, `email`, …
- [ ] `POST /api/auth/logout` → xóa/invalid session; `GET /api/me` sau đó → không còn user.

### 3.3 Tạo link (POST `/api/links`)

- [ ] **Ẩn danh** (không gửi cookie): `POST` body `{ "longUrl": "https://example.com" }` → `201/200`, có `shortUrl`, `code`, có thể `ownerUserId: -1` hoặc tương đương theo contract.
- [ ] **Đã login**: cùng request → link gắn `owner_user_id`; response có thể khác (user thật).
- [ ] Có `project` (slug hợp lệ) + optional `customAlias` → short URL dạng `/r/{project}/{code}` hoặc theo `BASE_URL` env.
- [ ] Body `longUrl` không phải URL → `4xx` + message lỗi.

### 3.4 Dashboard list — `GET /api/links` (bắt buộc đăng nhập)

- [ ] Không cookie → `401`.
- [ ] Có cookie: `GET /api/links?page=1&pageSize=20` → `items[]`, `page`, `pageSize`, `total`; mỗi item có `id`, `project`, `code`, `longUrl`, …
- [ ] `project=<slug>` chỉ trả link đúng project (cùng user).
- [ ] `project=__none__` chỉ trả link có `project IS NULL`.
- [ ] `q=` tìm trong `code` hoặc `long_url` (ILIKE).
- [ ] `page=2` khi `total > pageSize` → trang khác trang 1.

### 3.5 Tổng hợp project — `GET /api/links/projects` (bắt buộc đăng nhập)

- [ ] Không cookie → `401`.
- [ ] Có cookie: trả `{ "items": [ { "project": null | string, "total": number, "activeCount": number }, ... ] }`.
- [ ] User chỉ thấy bucket của **chính mình** (không lẫn user khác).

### 3.6 Xóa / cập nhật link (nếu còn dùng)

- [ ] `DELETE /api/links/:id` với `id` của user khác hoặc không tồn tại → `404`.
- [ ] `DELETE` với `id` của chính user → `200` / `{ ok: true }`, sau đó `GET /api/links` không còn link đó.

### 3.7 Redirect (Redis/DB — tùy triển khai)

- [ ] Tạo link rồi mở trình duyệt hoặc `GET` (follow redirect) tới `GET /r/{code}` hoặc `{BASE_URL}/r/{project}/{code}` → redirect tới `long_url` (hoặc `410`/`404` nếu đã xóa / tắt — theo code hiện tại).

---

## 4. Gợi ý curl (cookie jar)

Lưu cookie sau login:

```bash
BASE=http://localhost:3001

# Đăng nhập (điều chỉnh body JSON cho đúng schema)
curl -s -c /tmp/ssl-cookies.txt -H "Content-Type: application/json" \
  -d '{"email":"you@example.com","password":"yourpassword"}' \
  "$BASE/api/auth/login"

# Me
curl -s -b /tmp/ssl-cookies.txt "$BASE/api/me"

# Danh sách link
curl -s -b /tmp/ssl-cookies.txt "$BASE/api/links?page=1&pageSize=20"

# Tổng hợp project
curl -s -b /tmp/ssl-cookies.txt "$BASE/api/links/projects"
```

*(Đường dẫn field register/login có thể khác một chút — xem `backend/api/src/routes/auth.ts`.)*

---

## 5. Tóm tắt

| Loại | Lệnh / cách |
|------|-------------|
| **Unit test (không DB)** | `cd backend/api && npm test` |
| **Manual** | API chạy + checklist mục 3 + curl/Postman/browser |

Nếu có thêm **integration test** (supertest + DB thật) sau này, có thể bổ sung script `npm run test:integration` và mô tả riêng.
