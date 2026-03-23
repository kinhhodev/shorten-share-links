# Dashboard quản lý link theo Project (phân tích + subtask Asana)

**Trạng thái triển khai (code):** Đã có `GET /api/links/projects`, lọc `project=__none__` cho link không chủ đề, dashboard FE (sidebar + `?project=`, tìm kiếm, phân trang, “Tạo link nhanh” + pre-fill từ `/?project=`).

**Ngữ cảnh:** User đã đăng nhập; mỗi link có `project` (nullable) + `code` + `long_url` + `is_active`. Redirect `/r/{project}/{code}` hoặc `/r/{code}`. API hiện có `GET /api/links?page&pageSize&project&q` — đã lọc theo `owner_user_id` và **có thể** lọc theo `project` (query).

**Mục tiêu UX:** Dashboard không còn “một bảng phẳng” mà **nhóm / lọc / điều hướng theo project** (chủ đề), giúp user quản lý tập link lớn theo từng dự án.

---

## 1. Phạm vi cần handle (không code trong bước này)

### 1.1 Dữ liệu & API
| Hạng mục | Ghi chú |
|----------|--------|
| **Nguồn sự thật** | `links.project` (text, nullable). Project **không** là bảng riêng — “danh sách project” = **distinct** `project` trên các link của user. |
| **Link không project** | `project IS NULL` — cần thống nhất nhãn UI (vd: “Không chủ đề” / “Gốc”) và vẫn hiển thị trong dashboard. |
| **Tổng hợp theo project** | Cần **số lượng link** (và có thể: active / inactive) **per project** để sidebar hoặc card — có thể cần endpoint mới `GET /api/links/projects` hoặc mở rộng response của list hiện tại. |
| **Danh sách link trong project** | Tái sử dụng / củng cố `GET /api/links?project=...&page&pageSize&q` — rà soát sort mặc định (vd: `created_at` desc), giới hạn page size. |
| **Thao tác trên link** | Disable/delete (nếu đã có API) — đảm bảo **chỉ** trong phạm vi owner; không đổi contract nếu không cần. |

### 1.2 Frontend (dashboard)
| Hạng mục | Ghi chú |
|----------|--------|
| **Cấu trúc màn hình** | Chọn một pattern: **sidebar project** + bảng link bên phải **hoặc** **accordion/collapse theo project** **hoặc** **tabs** — ưu tiên rõ ràng trên mobile. |
| **Chọn project** | State URL (vd: `?project=toeic-2026`) để share/bookmark tab project. |
| **Tìm kiếm** | `q` search trong project đang chọn (và/hoặc global — cần quyết định MVP). |
| **Tạo link nhanh** | Từ project đang chọn: pre-fill **project** vào form (hoặc modal) để giảm lỗi nhập. |
| **Empty state** | Chưa có project nào / project chưa có link / chưa có link toàn cục. |
| **Loading & lỗi** | Skeleton hoặc spinner; thông báo khi API fail. |

### 1.3 Phi chức năng
- **Performance:** Nếu nhiều project, tránh N+1 request — ưu tiên 1 call “summary projects” + 1 call “links theo filter”.
- **Bảo mật:** Chỉ dữ liệu của user đăng nhập (đã có qua cookie/JWT).
- **Không làm trong MVP** (ghi rõ để tránh scope creep): đổi tên project hàng loạt, xóa cả project một phát, phân quyền theo project, export CSV.

---

## 2. Subtask gợi ý cho Asana (mỗi task **< 8h**)

> Copy từng block vào Asana làm **Subtask** dưới task cha (vd: `[AI] Shorten Link Project` hoặc epic Dashboard).

---

### Subtask A — API: endpoint tổng hợp project theo user  
**Estimate:** 3h  
**Mô tả:**  
- Thêm `GET /api/links/projects` (hoặc tên tương đương), auth bắt buộc.  
- Trả về danh sách `project` distinct (bao gồm `null` → map thành key rõ ràng trong JSON), kèm `count` (tổng link), có thể `activeCount`.  
- Sort mặc định: theo tên project hoặc theo `max(created_at)` desc (cần chốt 1 quy tắc).  
- Viết test tối thiểu (unit/integration) hoặc checklist thủ công trong PR.

---

### Subtask B — API: rà soát & document `GET /api/links` theo project  
**Estimate:** 2h  
**Mô tả:**  
- Xác nhận filter `project`, `q`, `page`, `pageSize` hoạt động đúng với owner.  
- Chuẩn hóa response (nếu cần thêm field phục vụ UI).  
- Cập nhật README hoặc mô tả OpenAPI ngắn cho FE.

---

### Subtask C — FE: layout dashboard theo project (selector + vùng danh sách)  
**Estimate:** 6h  
**Mô tả:**  
- Gọi API summary projects + list links khi đổi project.  
- UI: sidebar hoặc dropdown project + bảng link bên phải (desktop); mobile: stack hoặc dropdown.  
- Đồng bộ query `?project=` với URL (React Router).  
- Hiển thị bucket “Không chủ đề” cho `project` null.

---

### Subtask D — FE: empty state, loading, lỗi API  
**Estimate:** 3h  
**Mô tả:**  
- Empty: chưa có link; chưa có link trong project; lỗi tải danh sách.  
- Loading skeleton hoặc spinner nhất quán với design system hiện tại.

---

### Subtask E — FE: tạo link nhanh từ đúng project (pre-fill)  
**Estimate:** 4h  
**Mô tả:**  
- Từ dashboard, nút “Tạo link” mở form (hoặc điều hướng home) với **project** đã điền sẵn theo project đang chọn.  
- Validate không ghi đè nhầm khi user đổi project trên URL.

---

### Subtask F — QA & regression (dashboard + redirect)  
**Estimate:** 3h  
**Mô tả:**  
- Kịch bản: nhiều project, link trùng code khác project, user chỉ thấy link của mình, redirect `/r/...` vẫn đúng.  
- Ghi lại kết quả hoặc checklist trong ticket.

---

## 3. Tổng estimate (tham khảo)

| Subtask | Giờ |
|---------|-----|
| A | 3 |
| B | 2 |
| C | 6 |
| D | 3 |
| E | 4 |
| F | 3 |
| **Tổng** | **~21h** (chia nhiều ngày / người; mỗi task vẫn < 8h) |

---

## 4. Rủi ro / cần chốt sớm

1. **Đổi tên “project” trên UI** (Tiếng Việt: “Chủ đề” / “Dự án”) — thống nhất 1 thuật ngữ.  
2. **Project null** — luôn hiển thị trong summary hay không.  
3. **Giới hạn số project** (pagination) nếu user có hàng trăm giá trị distinct — có thể defer sau MVP.

---

_File này chỉ dùng để lập kế hoạch và tạo task Asana; không thay thế tài liệu kỹ thuật chi tiết sau khi implement._
