# Bảo mật — tổng quan triển khai

Tài liệu mô tả các lớp phòng thủ đã gắn vào repo (API + web). Có thể mở rộng thêm (WAF, IP reputation, v.v.) khi production.

---

## 1. Phishing / malware / URL độc hại (tạo link)

| Biện pháp | Chi tiết |
|-----------|-----------|
| **Chỉ `http://` / `https://`** | Chặn `javascript:`, `data:`, `file:`, … (`assertSafeLongUrl` — POST tạo link & PATCH đổi `longUrl`). |
| **Không userinfo trong URL** | Chặn `https://user:pass@host` (giảm lừa đảo / credential phishing). |
| **Chặn trỏ tới nội bộ** | Hostname `localhost`, RFC1918, link-local, `::1`, v.v. — tránh dùng dịch vụ rút gọn để quét nội bộ. |
| **Blocklist host** | Biến môi trường `BLOCKED_URL_HOSTS` (danh sách phân tách bằng dấu phẩy). |
| **Độ dài tối đa** | URL đích giới hạn (2048 ký tự). |

Redirect (`GET /r/...`) chỉ chuyển tới URL **http(s)** an toàn tối thiểu; cache Redis nếu chứa chuỗi không hợp lệ sẽ bị **xóa** và không redirect.

---

## 2. Abuse / spam (tạo link hàng loạt)

| Biện pháp | Chi tiết |
|-----------|-----------|
| **Rate limit** | `POST /api/links`: 30 req/phút (theo cấu hình route). |
| **reCAPTCHA v3** | Khi có `RECAPTCHA_SECRET_KEY` trên API: xác minh token với Google; so sánh **score** với `RECAPTCHA_MIN_SCORE` (mặc định 0.5). |
| **Ẩn danh vs đăng nhập** | Mặc định chỉ **bắt reCAPTCHA cho tạo link ẩn danh**; user đã login có thể bỏ qua trừ khi bật `RECAPTCHA_REQUIRE_FOR_AUTHENTICATED=true`. |

**Frontend:** đặt `VITE_RECAPTCHA_SITE_KEY` (public), gửi `recaptchaToken` trong body `POST /api/links` (action `create_link`). Nếu không cấu hình site key, FE không gửi token; khi server cũng không có secret thì không kiểm tra.

---

## 3. Open redirect abuse

- Chỉ lưu & redirect tới URL đã qua kiểm tra **scheme + host** như mục 1.
- Không cho redirect tới `javascript:` / `data:` kể cả khi dữ liệu cũ trong Redis (validate lại trước khi `302`).

---

## 4. Enumeration (dò mã / trạng thái link)

| Trước | Sau |
|-------|-----|
| Phân biệt `404` / `410` / thông điệp khác nhau | **`404`** + cùng payload JSON: `Link not found or unavailable` cho: không tồn tại, đã tắt, hết hạn (theo policy hiện tại). |

Lưu ý: timing hoặc cache vẫn có thể lộ thông tin trong kịch bản rất đặc biệt; có thể bổ sung delay cố định sau này nếu cần.

---

## 5. Biến môi trường (tham chiếu)

| Biến | Vai trò |
|------|---------|
| `RECAPTCHA_SECRET_KEY` | Secret server (Google reCAPTCHA v3). Trống = không verify. |
| `RECAPTCHA_MIN_SCORE` | Ngưỡng điểm (0–1), mặc định 0.5. |
| `RECAPTCHA_REQUIRE_FOR_AUTHENTICATED` | `true`/`1` = bắt token cả khi user đã đăng nhập. |
| `BLOCKED_URL_HOSTS` | Danh sách host cấm khi **tạo** link. |
| `VITE_RECAPTCHA_SITE_KEY` | Site key (public) trên frontend. |

---

## 6. XSS (Cross-site scripting) — input & hiển thị

| Rủi ro | Đánh giá & biện pháp |
|--------|----------------------|
| **Script trong `<input>` tự chạy trong trình duyệt** | HTML input **không** thực thi HTML/JS nhập vào; React **không** dùng `dangerouslySetInnerHTML` cho dữ liệu user. Chuỗi hiển thị trong JSX (`{value}`) được **escape** theo mặc định. |
| **Stored XSS qua `longUrl` / tên hiển thị** | Nội dung từ API render dạng **text**, không chèn HTML thô. Link dùng `<a href={url}>` — URL đã qua kiểm tra **chỉ http(s)** ở backend; tránh `javascript:` trong `href`. |
| **Clickjacking / MIME sniffing** | API gắn header: `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy` (xem `server.ts`). |

**Lưu ý:** Nếu sau này thêm rich text / `dangerouslySetInnerHTML` / render Markdown, cần **sanitize** (DOMPurify, v.v.).

---

## 7. SQL Injection

| Rủi ro | Đánh giá & biện pháp |
|--------|----------------------|
| **Chuỗi ghép thẳng vào SQL** | Truy vấn dùng **Drizzle ORM** với `eq`, `and`, tham số hóa; `ilike(links.code, '%' + q + '%')` truyền **giá trị qua driver** (không nối chuỗi SQL thủ công) — giảm nguy cơ SQLi so với raw string. |
| **Tham số route `:id`** | `GET /api/links/:id` dùng **`z.string().uuid()`** — từ chối input không phải UUID, tránh pattern lạ trong query. |
| **Tham số `q` (tìm kiếm)** | Giới hạn **tối đa 200 ký tự** (tránh payload quá dài / lạm dụng). Ký tự `%` / `_` trong `ILIKE` có nghĩa wildcard (hành vi tìm kiếm), **không** phải SQLi nếu driver vẫn bind tham số. |

**Khuyến nghị production:** WAF / RDS hardened, log truy vấn bất thường.

---

## 8. Việc cần làm sau (gợi ý)

- [ ] Xóa / làm mới **Redis cache** khi `PATCH`/`DELETE` link (tránh redirect sai sau khi đổi URL hoặc tắt link).
- [ ] Phân tích log reCAPTCHA (`action` / score) trong production.
- [ ] Tích hợp danh sách domain độc hại (Google Safe Browsing API hoặc nguồn uy tín) nếu cần mức độ cao hơn.
