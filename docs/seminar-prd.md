# FlavorQuest PRD

## 1. Thông tin tài liệu

- Tên sản phẩm: FlavorQuest
- Loại tài liệu: Product Requirements Document
- Mục đích: Làm tài liệu đặc tả sản phẩm ở mức nghiệp vụ cho báo cáo seminar chuyên đề
- Phiên bản tham chiếu: Codebase tại ngày 21/03/2026
- Phạm vi: Không gian khách hàng, owner, admin và các tích hợp nền tảng liên quan

## 2. Tóm tắt sản phẩm

FlavorQuest là nền tảng khám phá ẩm thực đường phố tại khu Vĩnh Khánh, Quận 4, kết hợp bản đồ, nội dung thuyết minh âm thanh, thanh toán mở khóa, đặt món trước và trợ lý AI. Sản phẩm được triển khai dưới dạng Progressive Web App để người dùng có thể truy cập nhanh trên thiết bị di động và tiếp tục trải nghiệm ngay cả khi kết nối mạng không ổn định.

Giá trị cốt lõi của FlavorQuest nằm ở việc biến một tuyến phố ẩm thực thành hành trình số có dẫn dắt. Người dùng không chỉ xem danh sách quán ăn mà còn được dẫn đường, nghe giới thiệu theo vị trí thực tế, mở khóa nội dung, lưu lịch sử trải nghiệm và tương tác hỗ trợ trong cùng một ứng dụng.

## 3. Bài toán cần giải quyết

### 3.1. Bối cảnh

Phố ẩm thực Vĩnh Khánh có mật độ điểm ăn uống cao, trải nghiệm phong phú nhưng thiếu lớp hướng dẫn số thống nhất. Du khách thường gặp các vấn đề:

- Khó chọn lộ trình phù hợp khi lần đầu ghé khu vực.
- Không có nội dung giới thiệu nhất quán về quán, món đặc trưng và câu chuyện địa phương.
- Thiếu công cụ đặt món trước khi khu vực đông khách.
- Thiếu cầu nối trực tiếp giữa khách, chủ quán và ban vận hành.

### 3.2. Cơ hội

FlavorQuest khai thác đồng thời ba nhu cầu:

- Hướng dẫn tham quan ẩm thực theo ngữ cảnh vị trí.
- Hỗ trợ giao dịch và vận hành cho hệ sinh thái quán ăn.
- Thu thập dữ liệu hành vi để tối ưu nội dung và tuyến tour.

## 4. Mục tiêu sản phẩm

### 4.1. Mục tiêu chính

- Số hóa trải nghiệm tham quan phố ẩm thực thành một hành trình có dẫn dắt.
- Tạo nguồn thu từ cơ chế mở khóa nội dung cho khách hàng.
- Cung cấp dashboard vận hành cho owner và admin.
- Tạo nền tảng dữ liệu để phân tích hành vi người dùng và cải thiện tour.

### 4.2. Chỉ số thành công đề xuất

| Nhóm chỉ số | Mục tiêu đề xuất |
| --- | --- |
| Kích hoạt | Tỷ lệ người dùng đăng nhập thành công sau lần truy cập đầu >= 70% |
| Chuyển đổi | Tỷ lệ khách thanh toán mở khóa nội dung >= 25% |
| Tương tác | Số POI được nghe trung bình mỗi phiên >= 4 |
| Vận hành | Tỷ lệ đơn đặt trước được owner xác nhận >= 90% |
| Hài lòng | Tỷ lệ thread hỗ trợ được phản hồi trong ngày >= 95% |

## 5. Đối tượng sử dụng

### 5.1. Khách hàng

- Du khách muốn khám phá khu phố ẩm thực bằng điện thoại.
- Người dùng cần hướng dẫn bằng nhiều ngôn ngữ.
- Người muốn đặt món trước thay vì chờ tại quán.

### 5.2. Owner

- Chủ quán hoặc người phụ trách điểm bán được hệ thống gán vào một hoặc nhiều POI.
- Có nhu cầu cập nhật món ăn, theo dõi đơn đặt trước và tương tác hỗ trợ.

### 5.3. Admin

- Người vận hành hệ thống, quản lý POI, tour, người dùng, owner request, thanh toán và số liệu phân tích.

## 6. Phạm vi sản phẩm

### 6.1. Trong phạm vi

- Đăng nhập email OTP.
- Phân quyền khách hàng, pending owner, owner, admin.
- Paywall mở khóa quyền truy cập khu tour.
- Trải nghiệm tour với bản đồ, danh sách POI, chi tiết POI, lịch sử nghe và trạng thái offline.
- Trợ lý AI theo ngữ cảnh không gian làm việc.
- Hệ thống chat hỗ trợ giữa khách, owner và admin.
- Dashboard owner quản lý món ăn và đơn đặt trước.
- Dashboard admin quản lý POI, tour, user, owner request, thanh toán và analytics.
- Hỗ trợ đa ngôn ngữ cho trải nghiệm khách hàng.

### 6.2. Ngoài phạm vi hiện tại

- Ứng dụng mobile native riêng cho iOS hoặc Android.
- Điều phối shipper thời gian thực.
- Hệ thống khuyến mãi hoặc tích điểm thành viên.
- Chấm điểm, đánh giá công khai giữa khách hàng và quán.
- Tối ưu tuyến đường bằng dữ liệu giao thông thời gian thực.

## 7. Giá trị nổi bật

- Tour số theo vị trí thực tế thay vì danh sách địa điểm tĩnh.
- Nội dung âm thanh và bản đồ nằm trong cùng một luồng trải nghiệm.
- Mô hình kinh doanh rõ ràng nhờ mở khóa nội dung qua PayOS.
- Khả năng phục vụ đồng thời ba vai trò khách hàng, owner và admin trên cùng một nền tảng.
- Dữ liệu hành vi và hỗ trợ khách hàng được tập trung về một hệ thống.

## 8. Hành trình người dùng chính

### 8.1. Hành trình khách hàng

1. Mở landing page và chọn ngôn ngữ.
2. Đăng nhập bằng email OTP.
3. Nếu chưa có quyền truy cập, vào paywall để tạo giao dịch PayOS.
4. Sau khi thanh toán thành công, truy cập khu tour.
5. Xem bản đồ, chọn POI hoặc để hệ thống gợi ý theo ngữ cảnh.
6. Nghe nội dung thuyết minh, xem chi tiết món và thông tin quán.
7. Đặt món trước hoặc mở chat hỗ trợ khi cần.

### 8.2. Hành trình owner

1. Đăng nhập loại tài khoản owner.
2. Nếu chưa được duyệt, vào trạng thái pending owner.
3. Sau khi được duyệt, vào dashboard owner.
4. Quản lý món ăn theo POI được gán.
5. Xử lý đơn đặt trước và trao đổi trong khu chat hỗ trợ.

### 8.3. Hành trình admin

1. Đăng nhập cổng admin.
2. Xem dashboard tổng quan.
3. Quản lý POI, tour, người dùng, yêu cầu lên owner.
4. Theo dõi thanh toán và analytics.
5. Hỗ trợ owner hoặc khách thông qua hệ thống chat.

## 9. Yêu cầu chức năng

### 9.1. Đăng nhập và phân quyền

- Hệ thống phải hỗ trợ đăng nhập email OTP cho khách hàng và owner.
- Hệ thống phải tách cổng admin khỏi luồng đăng nhập thường.
- Hệ thống phải điều hướng tự động theo vai trò và trạng thái truy cập.
- Hệ thống phải chặn truy cập trái phép vào các khu vực `/tour`, `/owner`, `/admin`.

### 9.2. Paywall và thanh toán

- Hệ thống phải cho phép tạo giao dịch mở khóa quyền truy cập khách hàng.
- Hệ thống phải kiểm tra trạng thái thanh toán và cập nhật quyền truy cập khi thanh toán thành công.
- Hệ thống phải lưu lịch sử giao dịch để đối soát và hỗ trợ vận hành.

### 9.3. Trải nghiệm tour khách hàng

- Hệ thống phải hiển thị bản đồ các POI trong khu vực Vĩnh Khánh.
- Hệ thống phải hỗ trợ xem danh sách và chi tiết từng POI.
- Hệ thống phải hiển thị nội dung đa ngôn ngữ cho tên, mô tả và audio của POI.
- Hệ thống phải lưu lịch sử nghe và trạng thái trải nghiệm cơ bản.
- Hệ thống phải hỗ trợ hoạt động trong điều kiện mạng chập chờn thông qua PWA và cache cục bộ.

### 9.4. Trợ lý AI và hỗ trợ

- Hệ thống phải cung cấp chatbot AI cho khách hàng trong không gian tour.
- Hệ thống phải lưu lịch sử hội thoại theo không gian làm việc.
- Hệ thống phải hỗ trợ thread chat giữa khách, owner và admin theo đúng ngữ cảnh nghiệp vụ.

### 9.5. Đặt món trước

- Khách hàng phải có thể tạo đơn đặt trước từ POI có món ăn khả dụng.
- Owner phải có thể xem và cập nhật trạng thái đơn.
- Hệ thống phải ghi nhận chi tiết món, số lượng, tổng tiền và thời gian nhận.

### 9.6. Dashboard owner

- Owner phải chỉ nhìn thấy POI được gán.
- Owner phải thêm, sửa logic nghiệp vụ liên quan đến thực đơn của quán.
- Owner phải theo dõi đơn đặt trước và nhận thông báo liên quan.

### 9.7. Dashboard admin

- Admin phải quản lý POI, tour và người dùng.
- Admin phải duyệt hoặc từ chối yêu cầu owner.
- Admin phải xem thanh toán mở khóa và chỉ số analytics.
- Admin phải có công cụ chat hỗ trợ vận hành.

## 10. Yêu cầu phi chức năng

### 10.1. Hiệu năng

- Landing page và trang đăng nhập phải tải tốt trên di động.
- Hệ thống cần tối ưu cho mạng di động không ổn định.
- Các tác vụ đọc dữ liệu chính phải phản hồi ở mức chấp nhận được cho trải nghiệm thời gian thực.

### 10.2. Khả dụng

- Hệ thống cần hoạt động như PWA và hỗ trợ cài lên màn hình chính.
- Dữ liệu thiết yếu của tour cần có khả năng cache để tiếp tục sử dụng tạm thời khi offline.

### 10.3. Bảo mật

- Dữ liệu người dùng và vai trò phải được quản lý bởi Supabase Auth và chính sách phân quyền.
- Cổng admin phải tách riêng và có kiểm tra quyền truy cập chặt.
- Các API thanh toán phải có cơ chế đối chiếu trạng thái và webhook.

### 10.4. Đa ngôn ngữ

- Hệ thống khách hàng phải hỗ trợ sáu ngôn ngữ: `vi`, `en`, `ja`, `fr`, `ko`, `zh`.
- Nội dung POI và tour cần có khả năng fallback khi chưa đủ bản dịch.

### 10.5. Khả năng mở rộng

- Thiết kế phải cho phép thêm POI, thêm tour và mở rộng địa bàn trong tương lai.
- Kiến trúc phải tách lớp giao diện, dịch vụ, dữ liệu và tích hợp bên ngoài.

## 11. Giả định và ràng buộc

- Khu vực thí điểm là phố ẩm thực Vĩnh Khánh, Quận 4, TP.HCM.
- Người dùng chính truy cập bằng điện thoại thông minh.
- Mở khóa nội dung khách hàng phụ thuộc vào PayOS.
- Một phần tính năng AI và TTS phụ thuộc vào dịch vụ ngoài thông qua API tương thích OpenAI và Azure OpenAI.
- Dữ liệu không gian và nội dung POI được quản trị tập trung qua admin.

## 12. Rủi ro nghiệp vụ

- Tỷ lệ rớt ở bước thanh toán có thể làm giảm chuyển đổi.
- Chất lượng nội dung đa ngôn ngữ và audio không đồng đều sẽ ảnh hưởng trải nghiệm.
- Nếu dữ liệu POI không được cập nhật thường xuyên, độ tin cậy của tour sẽ giảm.
- Owner phản hồi chậm sẽ làm giảm hiệu quả của luồng đặt món trước và hỗ trợ.

## 13. Hướng phát triển tiếp theo

- Thêm đánh giá trải nghiệm sau tour.
- Gợi ý tuyến tham quan cá nhân hóa theo sở thích món ăn.
- Thêm gói nội dung theo chủ đề hoặc theo thời lượng.
- Mở rộng sang các tuyến phố ẩm thực khác ngoài Vĩnh Khánh.

## 14. Tài liệu liên quan

- [Đặc tả hệ thống](./seminar-system-spec.md)
- [Bộ sơ đồ Mermaid](./seminar-diagrams.md)
