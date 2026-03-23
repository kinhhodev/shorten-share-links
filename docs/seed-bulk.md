# Seed bulk (1000 users × 1000 links)

## Mục đích

Tạo dữ liệu mẫu lớn để đo hiệu năng / dashboard:

- **1000** user — email dạng `bulk-seed-{0..999}@seed.local`
- Mỗi user **1000** link → **1.000.000** dòng trong `links`
- `long_url` cố định: `https://google.com`
- `project`: `NULL` (link gốc `/r/{code}`)
- `code` duy nhất theo user: `s{userIndex 4 số}x{linkIndex 4 số}` (vd `s0000x0000`)

Mật khẩu (hash bcrypt) giống nhau cho mọi user seed: `BulkSeed_Password_ChangeMe_1!` (chỉ dùng môi trường test).

## Chạy

```bash
cd backend/api
SEED_BULK_CONFIRM=1 npm run db:seed:bulk
```

Biến `SEED_BULK_CONFIRM=1` là **bắt buộc** để tránh chạy nhầm.

## Yêu cầu

- Postgres đã chạy, `DATABASE_URL` trong `.env` (thường ở root repo, xem `backend/api/src/env.ts`).
- Đã `npm run db:migrate`.

## Lưu ý

- **Thời gian / dung lượng:** ~1M insert có thể mất vài phút và tốn dung lượng đĩa/WAL.
- **Chạy lại:** trùng `email` → lỗi unique. Cần xóa user/link seed trước hoặc dùng DB mới.
- **Production:** không chạy script này trên DB thật.
