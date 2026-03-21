# FlavorQuest System Specification

## 1. Mục tiêu tài liệu

Tài liệu này mô tả kiến trúc hệ thống, các module chính, mô hình dữ liệu, ràng buộc nghiệp vụ và các điểm tích hợp kỹ thuật của FlavorQuest. Nội dung được biên soạn theo codebase hiện tại để dùng cho báo cáo seminar, thuyết minh thiết kế hệ thống và làm đầu mối bàn giao kỹ thuật.

## 2. Kiến trúc tổng thể

FlavorQuest được xây dựng theo mô hình web application hiện đại trên nền Next.js App Router. Ứng dụng dùng Supabase làm nền tảng xác thực, cơ sở dữ liệu và realtime; PayOS cho thanh toán; các dịch vụ AI tương thích OpenAI cho dịch và chatbot; Azure OpenAI cho tổng hợp giọng nói; SMTP cho email nghiệp vụ.

### 2.1. Các lớp chính

| Lớp | Thành phần chính | Vai trò |
| --- | --- | --- |
| Presentation | `app/`, `components/` | Giao diện khách, owner, admin và các route API |
| Application | `lib/hooks/`, `lib/contexts/`, `lib/services/` | Điều phối trạng thái, nghiệp vụ phía ứng dụng, tích hợp dịch vụ |
| Data Access | `lib/supabase/`, `lib/server/` | Truy cập Supabase phía client và server |
| Persistence | Supabase Postgres, Storage, IndexedDB | Lưu dữ liệu hệ thống, media và cache cục bộ |
| Integration | PayOS, OpenAI-compatible API, Azure OpenAI, SMTP | Thanh toán, AI, TTS, email |

### 2.2. Đặc điểm triển khai

- Frontend và backend cùng nằm trong một dự án Next.js.
- Route API nội bộ triển khai trong `app/api`.
- Điều hướng bảo vệ theo vai trò nằm ở `proxy.ts`.
- Cấu trúc phù hợp với mô hình full-stack server-first, nhưng vẫn dùng client component khi cần tương tác thời gian thực.

## 3. Cấu trúc module

### 3.1. Khu vực route

| Khu vực | Đường dẫn chính | Vai trò |
| --- | --- | --- |
| Landing | `/` | Màn hình chào, chọn ngôn ngữ, dẫn vào đăng nhập hoặc tour |
| Login | `/login` | Xác thực email OTP cho khách và owner |
| Paywall | `/paywall` | Tạo giao dịch mở khóa quyền truy cập khách |
| Tour | `/tour`, `/tour/[poiId]`, `/tour/assistant`, `/tour/chat` | Trải nghiệm khách hàng |
| Owner | `/owner`, `/owner/chat` | Quản trị nội dung quán và xử lý đơn |
| Pending Owner | `/pending-owner` | Trạng thái chờ admin duyệt |
| Admin | `/admin/*` | Điều hành hệ thống |

### 3.2. Nhóm component

| Nhóm | Vai trò |
| --- | --- |
| `components/tour` | Bản đồ, danh sách POI, player, hành trình tour |
| `components/admin` | Dashboard và các bảng quản trị |
| `components/chat` | UI hỗ trợ hội thoại và thread |
| `components/layout` | Layout dùng chung theo không gian |
| `components/ui` | Thành phần nền như loading, card, modal, button |
| `components/splash` | Landing và trải nghiệm mở đầu |

### 3.3. Thư viện nghiệp vụ

| Thư mục | Vai trò |
| --- | --- |
| `lib/contexts` | Trạng thái xác thực, ngôn ngữ, app state |
| `lib/hooks` | Hook phục vụ dịch, tour, audio, dữ liệu |
| `lib/services` | Auth, chatbot, analytics, mailer, payment, PWA, translate, TTS |
| `lib/realtime` | Đồng bộ dữ liệu realtime từ Supabase |
| `lib/utils` | Tiện ích khoảng cách, định dạng, quyền hạn, xử lý dữ liệu |
| `lib/workers` | Tính toán nền cho geofence hoặc tác vụ tách luồng |

## 4. Phân quyền và điều hướng

`proxy.ts` là lớp kiểm soát truy cập quan trọng nhất ở tầng route. Hệ thống xác định hồ sơ truy cập từ bảng `users`, sau đó điều hướng theo quy tắc:

- Khách chưa đăng nhập không được vào `/tour`, `/owner`, `/admin`, `/paywall`.
- Khách đã đăng nhập nhưng chưa mở khóa bị chuyển về `/paywall` khi cố vào `/tour`.
- Pending owner chỉ ở được trong `/pending-owner`.
- Owner không được vào cổng admin.
- Admin vào cổng riêng `/admin` và bị chặn khỏi luồng khách thông thường.

Thiết kế này giúp đồng bộ hành vi giữa UI, business flow và phân quyền dữ liệu.

## 5. Mô hình dữ liệu cốt lõi

### 5.1. Bảng nghiệp vụ chính

| Bảng | Vai trò |
| --- | --- |
| `users` | Hồ sơ người dùng, vai trò, trạng thái truy cập khách, trạng thái owner request |
| `pois` | Điểm quan tâm, thông tin vị trí, nội dung đa ngôn ngữ, owner phụ trách |
| `tours` | Tuyến tham quan, gom nhóm nhiều POI |
| `dishes` | Thực đơn của từng POI |
| `preorder_orders` | Đơn đặt trước của khách |
| `preorder_order_items` | Chi tiết món trong đơn |
| `customer_access_payments` | Giao dịch mở khóa quyền truy cập |
| `notifications` | Thông báo theo người dùng |
| `support_threads` | Thread hỗ trợ theo cặp vai trò |
| `support_messages` | Tin nhắn trong thread hỗ trợ |
| `support_thread_reads` | Trạng thái đã đọc theo người dùng |
| `analytics_logs` | Nhật ký hành vi trong tour |
| `chat_conversations` | Lịch sử cuộc trò chuyện AI |
| `chat_messages` | Tin nhắn trong hội thoại AI |

### 5.2. Đặc điểm dữ liệu đáng chú ý

- `pois` dùng các trường `name_*`, `description_*`, `audio_url_*` để hỗ trợ sáu ngôn ngữ.
- `tours` lưu tập `poi_ids` dưới dạng mảng UUID, phù hợp với tuyến tour nhỏ và dễ quản trị.
- `users` chứa cả vai trò hệ thống lẫn trạng thái mở khóa khách hàng và owner request.
- `customer_access_payments` lưu thông tin từ PayOS để phục vụ đối soát.
- `analytics_logs` được thiết kế theo hướng giảm độ nhạy dữ liệu vị trí bằng cách log tọa độ làm tròn.

## 6. API nội bộ

### 6.1. Nhóm xác thực

| API | Vai trò |
| --- | --- |
| `/api/auth/email-otp/prepare` | Chuẩn bị gửi OTP |
| `/api/auth/email-otp/complete` | Xác minh OTP |
| `/api/auth/callback` | Xử lý callback xác thực |

### 6.2. Nhóm nghiệp vụ khách hàng

| API | Vai trò |
| --- | --- |
| `/api/pois`, `/api/pois/[id]` | Đọc và quản trị POI |
| `/api/tours`, `/api/tours/[id]` | Đọc và quản trị tour |
| `/api/dishes`, `/api/dishes/[id]` | Quản lý món ăn |
| `/api/orders`, `/api/orders/[id]` | Tạo và cập nhật đơn đặt trước |
| `/api/notifications` | Lấy và đánh dấu thông báo |

### 6.3. Nhóm thanh toán

| API | Vai trò |
| --- | --- |
| `/api/payments/customer-access/create` | Tạo giao dịch mở khóa |
| `/api/payments/customer-access/status` | Đồng bộ trạng thái thanh toán |
| `/api/payments/customer-access/history` | Lịch sử giao dịch |
| `/api/payments/customer-access/webhook` | Nhận webhook từ PayOS |

### 6.4. Nhóm AI và hỗ trợ

| API | Vai trò |
| --- | --- |
| `/api/chatbot` | Trợ lý AI |
| `/api/translate` | Dịch nội dung |
| `/api/tts/generate` | Sinh audio TTS |
| `/api/support/threads` | Tạo và lấy thread hỗ trợ |
| `/api/support/threads/[threadId]/messages` | Gửi và nhận tin nhắn |
| `/api/support/threads/[threadId]/read` | Cập nhật trạng thái đã đọc |

### 6.5. Nhóm quản trị và vận hành

| API | Vai trò |
| --- | --- |
| `/api/users` | Quản lý user |
| `/api/users/me` | Lấy hồ sơ hiện tại |
| `/api/users/owner-requests` | Xử lý yêu cầu lên owner |
| `/api/users/owners` | Quản lý owner |
| `/api/analytics/batch` | Ghi log hành vi |
| `/api/analytics/summary` | Tổng hợp analytics |
| `/api/upload` | Tải media cho vận hành |

## 7. Tích hợp bên ngoài

### 7.1. Supabase

- Auth: xác thực người dùng bằng OTP.
- Postgres: lưu dữ liệu nghiệp vụ.
- Storage: lưu audio và hình ảnh.
- Realtime: cập nhật dashboard và trạng thái chat khi cần.

### 7.2. PayOS

- Tạo link thanh toán mở khóa quyền truy cập.
- Nhận webhook để đồng bộ trạng thái giao dịch.
- Lưu `order_code`, `payment_link_id`, `status`, `raw_payment_data` để đối soát.

### 7.3. AI và TTS

- API tương thích OpenAI dùng cho chatbot và dịch nội dung.
- Azure OpenAI TTS dùng cho sinh audio khi cần.

### 7.4. SMTP

- Gửi email nghiệp vụ như thông báo đơn mới hoặc hỗ trợ.

## 8. Hỗ trợ offline và PWA

- Ứng dụng được đóng gói dưới dạng PWA.
- Service worker trong `public/sw.js` phục vụ cache tài nguyên tĩnh, ảnh, audio và một phần dữ liệu.
- IndexedDB qua `idb-keyval` dùng lưu POI, cài đặt, lịch sử, analytics queue và trạng thái preload.
- Thiết kế này nhằm duy trì trải nghiệm tốt hơn trong bối cảnh di chuyển ngoài đường phố và mạng di động không ổn định.

## 9. Quy tắc nghiệp vụ tiêu biểu

### 9.1. Truy cập tour

- Người dùng chỉ vào được `/tour` khi đã đăng nhập và `customer_access_granted = true`.

### 9.2. Owner workflow

- Người dùng owner mới phải đi qua trạng thái `pending-owner`.
- Chỉ admin mới có quyền duyệt hoặc từ chối yêu cầu owner.

### 9.3. Đơn đặt trước

- Mỗi đơn gắn với một POI và một khách hàng.
- Đơn có vòng đời trạng thái: `pending`, `confirmed`, `preparing`, `ready`, `delivering`, `delivered`, `cancelled`.
- Hệ thống hỗ trợ cả `pickup` và `delivery`.

### 9.4. Nội dung đa ngôn ngữ

- Nội dung khách hàng được ưu tiên lấy theo ngôn ngữ hiện tại.
- Nếu thiếu dữ liệu bản địa hóa, hệ thống dùng fallback phù hợp thay vì để trống.

## 10. Bảo mật và quản trị truy cập

- Xác thực dựa trên Supabase Auth.
- Bảo vệ route ở tầng Next.js qua `proxy.ts`.
- Bảo vệ dữ liệu ở tầng Postgres thông qua cấu trúc role và chính sách truy cập.
- Dữ liệu thanh toán và lịch sử hỗ trợ được lưu để phục vụ kiểm tra sau sự cố.

## 11. Ràng buộc kỹ thuật

- Yêu cầu Node.js 20 trở lên trong môi trường phát triển.
- Cần cấu hình đầy đủ biến môi trường cho Supabase, PayOS, SMTP, AI và TTS.
- Geolocation cần ngữ cảnh an toàn như `localhost` hoặc HTTPS.
- Chất lượng trải nghiệm audio phụ thuộc vào media và kết nối mạng thực tế.

## 12. Đề xuất dùng trong báo cáo seminar

- Dùng [PRD](./seminar-prd.md) cho phần giới thiệu bài toán, mục tiêu và phạm vi.
- Dùng [Bộ sơ đồ Mermaid](./seminar-diagrams.md) cho phần phân tích thiết kế.
- Dùng tài liệu này cho phần kiến trúc, đặc tả hệ thống và mô hình dữ liệu.
