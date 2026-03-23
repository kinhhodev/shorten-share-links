# Subtask để dán vào Asana (dưới task **[AI] Shorten Link Project**)

**Tiêu đề gợi ý:** `[BE] Trùng alias trong cùng project — tự sinh hậu tố -1, -2, …`

**Mô tả:**

- **Vấn đề:** Nhiều request (đặc biệt ẩn danh) cùng **tên chủ đề (project)** + **tên rút gọn (alias)** gây xung đột unique `(project, code)` → trước đây trả 409 hoặc không retry đúng.
- **Mong muốn:** Khi alias đã tồn tại, tự động thử lần lượt `alias`, `alias-1`, `alias-2`, … (slug hợp lệ, độ dài ≤ 64).
- **Phạm vi:** API `POST /api/links` khi có `customAlias`; giữ hành vi random code khi không nhập alias.
- **NFR:** Giới hạn số lần thử (ví dụ 100); truncate base nếu cần để `base-N` không vượt 64 ký tự.
- **QA:** Hai request cùng project + alias → hai short link khác code (`…/alias` và `…/alias-1`).

**Trạng thái code:** Đã implement trong repo (xem `backend/api/src/links/customAliasCode.ts`, `routes/links.ts`).
