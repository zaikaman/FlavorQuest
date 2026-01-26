# Feature Specification: FlavorQuest - Trải Nghiệm Thuyết Minh Âm Thanh Tự Động Cho Phố Ẩm Thực Vĩnh Khánh

**Feature Branch**: `main`  
**Created**: 26/01/2026  
**Status**: Draft  
**Input**: Xây dựng một trải nghiệm thuyết minh âm thanh tự động trên web có tên FlavorQuest dành cho phố ẩm thực Vĩnh Khánh (Quận 4, TP.HCM). Website giúp du khách và người dân địa phương khám phá con phố ẩm thực nổi tiếng này một cách sống động, tự động phát nội dung kể chuyện, lịch sử, món ngon đặc trưng và mẹo hay về các quán ăn gần nhất — mà không cần người dùng phải nhìn màn hình hay bấm phát thủ công.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Trải Nghiệm Tự Động Phát Thuyết Minh Theo Vị Trí (Priority: P1)

Du khách lần đầu đến phố Vĩnh Khánh quét mã QR tại cổng phố, mở website trên điện thoại, cho phép truy cập vị trí, bỏ điện thoại vào túi và bắt đầu đi bộ. Khi đến gần quán bánh xèo nổi tiếng, họ nghe thấy giọng nói thân thiện tự động phát qua loa điện thoại kể về lịch sử quán, món signature và lý do nên thử. Khi tiếp tục đi, họ đến gần quầy hải sản và lại nghe một đoạn thuyết minh mới về đặc sản hải sản tươi sống của khu vực. Toàn bộ hành trình diễn ra liền mạch mà không cần tương tác với màn hình.

**Why this priority**: Đây là giá trị cốt lõi của FlavorQuest - trải nghiệm "hands-free" giúp du khách khám phá phố ẩm thực mà không bị phân tâm bởi màn hình, tạo cảm giác như có hướng dẫn viên địa phương đồng hành.

**Independent Test**: Có thể kiểm tra hoàn toàn độc lập bằng cách mô phỏng một người dùng đi dọc tuyến đường từ điểm A đến điểm B qua ít nhất 3 điểm quan tâm, xác nhận rằng âm thanh tự động phát đúng lúc, đúng nội dung, không lặp lại và không phát khi người dùng dừng lại lâu.

**Acceptance Scenarios**:

1. **Given** người dùng đã mở website và cấp quyền truy cập vị trí, **When** họ di chuyển vào bán kính kích hoạt (15-20m) của một điểm quan tâm lần đầu tiên, **Then** hệ thống tự động phát đoạn thuyết minh âm thanh về điểm đó trong vòng 2-3 giây
2. **Given** người dùng đã nghe đoạn thuyết minh của một điểm quan tâm, **When** họ rời khỏi rồi quay lại điểm đó trong vòng 30 phút, **Then** hệ thống không phát lại đoạn thuyết minh đó (cooldown period)
3. **Given** một đoạn thuyết minh đang phát, **When** người dùng di chuyển đến gần điểm quan tâm khác, **Then** hệ thống đợi đoạn hiện tại phát xong mới phát đoạn mới (hoặc thêm vào hàng đợi)
4. **Given** người dùng đang ở chế độ tự động, **When** họ dừng lại ở một vị trí quá 5 phút, **Then** hệ thống tạm dừng theo dõi tự động để tiết kiệm pin và tránh phát nhầm
5. **Given** người dùng ở khu vực không có điểm quan tâm nào gần đó, **When** họ tiếp tục di chuyển, **Then** hệ thống im lặng và chờ đến khi họ đến gần điểm quan tâm tiếp theo

---

### User Story 2 - Trải Nghiệm Offline-First (Priority: P2)

Du khách đang có kết nối mạng tại khách sạn, mở website FlavorQuest lần đầu tiên và để hệ thống tải xuống tất cả nội dung (bản đồ, danh sách điểm quan tâm, file âm thanh, hình ảnh). Sau đó họ tắt dữ liệu di động để tiết kiệm data roaming, đến phố Vĩnh Khánh và vẫn sử dụng được đầy đủ tính năng thuyết minh tự động, xem bản đồ, ảnh món ăn mà không cần kết nối internet. Chỉ có GPS của điện thoại hoạt động để xác định vị trí.

**Why this priority**: Du khách nước ngoài thường hạn chế dùng data roaming, và mạng di động ở khu vực đông đúc có thể yếu hoặc chậm. Khả năng offline đảm bảo trải nghiệm mượt mà trong mọi tình huống.

**Independent Test**: Có thể kiểm tra bằng cách tải website khi có mạng, sau đó bật chế độ máy bay (chỉ bật GPS), và xác nhận tất cả tính năng chính (thuyết minh tự động, xem bản đồ, danh sách điểm, phát âm thanh) vẫn hoạt động bình thường.

**Acceptance Scenarios**:

1. **Given** người dùng truy cập website lần đầu tiên với kết nối internet, **When** họ mở trang và đợi quá trình tải hoàn tất, **Then** tất cả dữ liệu cần thiết (âm thanh, ảnh, bản đồ, metadata) được lưu trữ cục bộ và hiển thị thông báo "Sẵn sàng sử dụng offline"
2. **Given** người dùng đã tải nội dung offline, **When** họ mất kết nối internet và mở lại website, **Then** website vẫn tải đầy đủ tính năng từ cache và hiển thị chế độ offline
3. **Given** người dùng đang ở chế độ offline, **When** họ di chuyển đến các điểm quan tâm, **Then** thuyết minh âm thanh vẫn tự động phát như bình thường
4. **Given** người dùng đang ở chế độ offline, **When** họ xem bản đồ tương tác hoặc danh sách điểm quan tâm, **Then** tất cả dữ liệu và hình ảnh hiển thị đầy đủ từ cache
5. **Given** có phiên bản nội dung mới trên server, **When** người dùng mở website với kết nối internet, **Then** hệ thống tự động cập nhật nội dung mới ở background mà không làm gián đoạn trải nghiệm hiện tại

---

### User Story 3 - Duyệt Thủ Công và Điều Khiển (Priority: P2)

Người dùng muốn kiểm soát nhiều hơn, họ mở website và chuyển sang chế độ duyệt thủ công. Họ xem bản đồ tương tác hiển thị tất cả các điểm quan tâm, chọn một quán ăn cụ thể để xem thông tin chi tiết (ảnh món ăn, giờ mở cửa ước tính, mô tả văn bản), và bấm nút phát để nghe đoạn thuyết minh. Họ cũng có thể tạm dừng chế độ tự động, điều chỉnh âm lượng, thay đổi ngôn ngữ giao diện và thuyết minh, hoặc xem lại danh sách các điểm đã ghé thăm.

**Why this priority**: Không phải ai cũng muốn trải nghiệm hoàn toàn tự động. Một số người thích xem trước thông tin, lựa chọn điểm đến hoặc điều chỉnh cài đặt theo sở thích cá nhân.

**Independent Test**: Có thể kiểm tra bằng cách tắt chế độ tự động, mở giao diện duyệt thủ công, thực hiện các thao tác (xem bản đồ, chọn điểm, phát âm thanh, đổi ngôn ngữ, xem lịch sử) và xác nhận từng tính năng hoạt động độc lập mà không cần chế độ tự động.

**Acceptance Scenarios**:

1. **Given** người dùng đang ở chế độ tự động, **When** họ chạm vào màn hình hoặc bấm nút menu, **Then** giao diện hiển thị bản đồ tương tác với tất cả các điểm quan tâm được đánh dấu rõ ràng
2. **Given** người dùng đang xem bản đồ, **When** họ chạm vào một điểm quan tâm, **Then** màn hình hiển thị thông tin chi tiết (tên, ảnh món ăn, mô tả ngắn, ước tính thời gian hoạt động) và nút phát thuyết minh
3. **Given** người dùng đang xem chi tiết một điểm, **When** họ bấm nút phát, **Then** đoạn thuyết minh âm thanh của điểm đó phát ngay lập tức
4. **Given** người dùng đang ở giao diện chính, **When** họ mở menu cài đặt, **Then** họ có thể điều chỉnh độ nhạy vị trí (bán kính kích hoạt), bật/tắt chế độ tự động, thay đổi ngôn ngữ (Việt, Anh, Nhật, Pháp, Hàn, Trung), và điều chỉnh âm lượng
5. **Given** người dùng đã ghé qua một số điểm trong hành trình, **When** họ mở phần lịch sử, **Then** danh sách các điểm đã ghé thăm hiển thị với thời gian và khả năng phát lại thuyết minh

---

### User Story 4 - Hỗ Trợ Đa Ngôn Ngữ (Priority: P3)

Du khách Nhật Bản không biết tiếng Việt hoặc tiếng Anh đến phố Vĩnh Khánh, quét mã QR và mở website. Họ chọn ngôn ngữ Nhật trong menu cài đặt. Toàn bộ giao diện, nội dung văn bản và thuyết minh âm thanh chuyển sang tiếng Nhật. Khi họ đi dọc phố, các đoạn thuyết minh tự động phát bằng tiếng Nhật với giọng đọc tự nhiên. Tương tự với du khách Hàn Quốc, Pháp, Trung Quốc, hoặc người Việt địa phương.

**Why this priority**: Phố Vĩnh Khánh thu hút du khách quốc tế đa dạng. Hỗ trợ đa ngôn ngữ giúp mở rộng đối tượng sử dụng và tạo trải nghiệm cá nhân hóa cho từng nhóm khách.

**Independent Test**: Có thể kiểm tra bằng cách thay đổi ngôn ngữ trong cài đặt (lần lượt Việt, Anh, Nhật, Pháp, Hàn, Trung) và xác nhận rằng giao diện, nội dung văn bản và file âm thanh đều chuyển đổi chính xác sang ngôn ngữ đã chọn.

**Acceptance Scenarios**:

1. **Given** người dùng mở website lần đầu, **When** họ vào cài đặt, **Then** họ thấy danh sách ngôn ngữ (Tiếng Việt, English, 日本語, Français, 한국어, 中文) để lựa chọn
2. **Given** người dùng chọn một ngôn ngữ cụ thể, **When** họ áp dụng thay đổi, **Then** toàn bộ giao diện (menu, nút bấm, nhãn) chuyển sang ngôn ngữ đã chọn
3. **Given** người dùng đã chọn ngôn ngữ Nhật, **When** thuyết minh tự động phát tại một điểm quan tâm, **Then** nội dung âm thanh phát bằng tiếng Nhật với giọng đọc tự nhiên
4. **Given** người dùng đang xem thông tin chi tiết một điểm, **When** họ đọc mô tả văn bản, **Then** nội dung hiển thị bằng ngôn ngữ hiện tại (ví dụ: tiếng Hàn nếu đã chọn Korean)
5. **Given** người dùng thay đổi ngôn ngữ giữa chừng, **When** họ đang ở chế độ tự động và di chuyển đến điểm mới, **Then** thuyết minh phát bằng ngôn ngữ mới đã chọn

---

### Edge Cases

- **Người dùng đứng yên ở giữa hai điểm quan tâm gần nhau**: Hệ thống ưu tiên điểm gần nhất hoặc điểm chưa được thăm trong lượt này. Nếu cả hai cách đều bằng nhau, chọn điểm có độ ưu tiên cao hơn (ví dụ: quán nổi tiếng hơn).
- **Người dùng di chuyển quá nhanh (đi xe máy hoặc ô tô)**: Hệ thống phát hiện tốc độ di chuyển cao (>15 km/h) và tạm dừng phát thuyết minh tự động, hiển thị thông báo khuyến nghị đi bộ để có trải nghiệm tốt nhất.
- **Định vị GPS không chính xác hoặc drift**: Hệ thống sử dụng bộ lọc để giảm nhiễu (ví dụ: chỉ kích hoạt khi người dùng ở trong bán kính liên tục trong 3-5 giây), tránh phát nhầm khi tín hiệu GPS nhảy lung tung.
- **Pin điện thoại yếu (<20%)**: Hệ thống hiển thị cảnh báo và đề xuất chuyển sang chế độ tiết kiệm pin (giảm tần suất cập nhật vị trí, tắt bản đồ nền).
- **Người dùng mở nhiều tab hoặc chuyển sang app khác**: Hệ thống tiếp tục theo dõi vị trí và phát thuyết minh ở background (nếu trình duyệt cho phép), hoặc tạm dừng và tiếp tục khi người dùng quay lại tab.
- **Người dùng từ chối quyền truy cập vị trí**: Hệ thống hiển thị thông báo rõ ràng rằng tính năng tự động không khả dụng, nhưng vẫn cho phép duyệt thủ công bản đồ và danh sách điểm.
- **Nội dung âm thanh hoặc hình ảnh bị lỗi/thiếu**: Hệ thống hiển thị nội dung văn bản thay thế và ghi log lỗi để báo cáo, không làm gián đoạn trải nghiệm chính.
- **Người dùng ở ngoài khu vực phố Vĩnh Khánh**: Hệ thống hiển thị thông báo "Bạn đang ở ngoài khu vực phố ẩm thực Vĩnh Khánh" và cung cấp bản đồ chỉ đường đến điểm bắt đầu.
- **Trình duyệt không hỗ trợ các tính năng cần thiết (geolocation, audio, service worker)**: Hệ thống phát hiện và hiển thị thông báo yêu cầu sử dụng trình duyệt hiện đại (Chrome, Safari, Firefox phiên bản mới).

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: Hệ thống PHẢI hiển thị mã QR tại cổng phố Vĩnh Khánh để người dùng quét và truy cập website ngay trên trình duyệt di động mà không cần cài đặt ứng dụng
- **FR-002**: Hệ thống PHẢI yêu cầu quyền truy cập vị trí (geolocation) khi người dùng mở website lần đầu và giải thích rõ mục đích sử dụng
- **FR-003**: Hệ thống PHẢI theo dõi vị trí người dùng theo thời gian thực với độ chính xác trong bán kính 10-15 mét
- **FR-004**: Hệ thống PHẢI tự động phát đoạn thuyết minh âm thanh (30-90 giây) khi người dùng di chuyển vào bán kính kích hoạt (15-20m) của một điểm quan tâm lần đầu tiên
- **FR-005**: Hệ thống PHẢI ngăn không cho phát lại cùng một đoạn thuyết minh trong vòng 30 phút kể từ lần phát trước (cooldown period)
- **FR-006**: Hệ thống PHẢI đợi đoạn thuyết minh hiện tại phát xong trước khi phát đoạn mới, hoặc thêm vào hàng đợi nếu có nhiều điểm gần nhau
- **FR-007**: Hệ thống PHẢI tạm dừng theo dõi tự động khi người dùng dừng lại ở một vị trí quá 5 phút để tiết kiệm pin
- **FR-008**: Hệ thống PHẢI lưu trữ toàn bộ dữ liệu cần thiết (bản đồ, danh sách điểm quan tâm, file âm thanh, hình ảnh) để sử dụng offline sau lần tải đầu tiên
- **FR-009**: Hệ thống PHẢI hoạt động đầy đủ ở chế độ offline (không cần kết nối internet) sau khi đã tải nội dung lần đầu
- **FR-010**: Hệ thống PHẢI tự động cập nhật nội dung mới từ server khi có kết nối internet mà không làm gián đoạn trải nghiệm người dùng
- **FR-011**: Hệ thống PHẢI cung cấp bản đồ tương tác hiển thị tất cả các điểm quan tâm với vị trí chính xác
- **FR-012**: Người dùng PHẢI có thể chuyển đổi giữa chế độ tự động và chế độ duyệt thủ công bất cứ lúc nào
- **FR-013**: Người dùng PHẢI có thể chọn một điểm quan tâm trên bản đồ hoặc danh sách để xem thông tin chi tiết (ảnh món ăn, mô tả, ước tính giờ hoạt động)
- **FR-014**: Người dùng PHẢI có thể phát bất kỳ đoạn thuyết minh nào theo ý muốn từ giao diện chi tiết điểm quan tâm
- **FR-015**: Hệ thống PHẢI hỗ trợ 6 ngôn ngữ: Tiếng Việt, English, 日本語 (Nhật), Français (Pháp), 한국어 (Hàn), 中文 (Trung)
- **FR-016**: Người dùng PHẢI có thể thay đổi ngôn ngữ giao diện và thuyết minh âm thanh trong menu cài đặt
- **FR-017**: Hệ thống PHẢI tự động chuyển đổi toàn bộ giao diện, nội dung văn bản và file âm thanh sang ngôn ngữ đã chọn
- **FR-018**: Hệ thống PHẢI cung cấp các tùy chọn cài đặt: điều chỉnh độ nhạy vị trí (bán kính kích hoạt), bật/tắt chế độ tự động, điều chỉnh âm lượng
- **FR-019**: Hệ thống PHẢI lưu lịch sử các điểm quan tâm đã ghé thăm với thời gian và cho phép người dùng xem lại
- **FR-020**: Hệ thống PHẢI phát hiện khi người dùng di chuyển quá nhanh (>15 km/h) và tạm dừng phát thuyết minh tự động với thông báo khuyến nghị
- **FR-021**: Hệ thống PHẢI sử dụng bộ lọc nhiễu GPS để tránh phát thuyết minh nhầm khi tín hiệu định vị không ổn định
- **FR-022**: Hệ thống PHẢI hiển thị cảnh báo pin yếu (<20%) và đề xuất chế độ tiết kiệm pin
- **FR-023**: Hệ thống PHẢI tiếp tục hoạt động ở background (nếu trình duyệt cho phép) khi người dùng chuyển sang tab hoặc app khác
- **FR-024**: Hệ thống PHẢI xử lý gracefully khi người dùng từ chối quyền truy cập vị trí (cho phép duyệt thủ công nhưng vô hiệu hóa tự động)
- **FR-025**: Hệ thống PHẢI hiển thị nội dung văn bản thay thế khi file âm thanh hoặc hình ảnh bị lỗi/thiếu
- **FR-026**: Hệ thống PHẢI phát hiện khi người dùng ở ngoài khu vực phố Vĩnh Khánh và hiển thị bản đồ chỉ đường
- **FR-027**: Hệ thống PHẢI phát hiện các tính năng trình duyệt cần thiết (geolocation, audio, service worker) và hiển thị thông báo nếu không hỗ trợ

### Key Entities

- **Điểm Quan Tâm (Point of Interest)**: Đại diện cho một quán ăn, quầy hàng, hoặc địa điểm nổi bật trên phố Vĩnh Khánh. Bao gồm: tên (đa ngôn ngữ), vị trí GPS (latitude, longitude), bán kính kích hoạt, mô tả ngắn (đa ngôn ngữ), món signature, câu chuyện thú vị, ước tính giờ hoạt động, độ ưu tiên, danh sách file âm thanh thuyết minh (theo ngôn ngữ), danh sách hình ảnh món ăn
- **Thuyết Minh Âm Thanh**: File âm thanh gắn với một điểm quan tâm cụ thể và một ngôn ngữ. Bao gồm: ngôn ngữ, URL file âm thanh, thời lượng (giây), nội dung văn bản transcript (để hiển thị khi lỗi hoặc cho người khiếm thính)
- **Lịch Sử Ghé Thăm**: Ghi lại các điểm quan tâm mà người dùng đã ghé thăm trong một phiên. Bao gồm: ID điểm quan tâm, thời gian ghé thăm, trạng thái đã phát thuyết minh (có/không), thời gian cooldown còn lại
- **Cài Đặt Người Dùng**: Lưu trữ các tùy chọn cá nhân hóa của người dùng. Bao gồm: ngôn ngữ đã chọn, bán kính kích hoạt (mét), trạng thái chế độ tự động (bật/tắt), mức âm lượng, trạng thái chế độ tiết kiệm pin
- **Phiên Sử Dụng (Session)**: Đại diện cho một lần người dùng sử dụng website. Bao gồm: thời gian bắt đầu, thời gian kết thúc, danh sách điểm đã ghé thăm, tổng thời gian sử dụng, chế độ (tự động/thủ công)
- **Bản Đồ**: Dữ liệu bản đồ khu vực phố Vĩnh Khánh để hiển thị offline. Bao gồm: phạm vi tọa độ, tiles bản đồ nền, lớp đường phố, lớp điểm quan tâm

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Người dùng có thể bắt đầu trải nghiệm (quét QR, mở website, cấp quyền vị trí, nghe thuyết minh đầu tiên) trong vòng dưới 60 giây
- **SC-002**: Thuyết minh âm thanh tự động phát trong vòng 2-3 giây kể từ khi người dùng vào bán kính kích hoạt của điểm quan tâm
- **SC-003**: Hệ thống hoạt động ổn định ở chế độ offline với ít nhất 50 điểm quan tâm, 6 ngôn ngữ, và 3-5 giờ sử dụng liên tục mà không gặp lỗi nghiêm trọng
- **SC-004**: 90% người dùng lần đầu có thể sử dụng tính năng tự động phát thuyết minh mà không cần hướng dẫn thêm
- **SC-005**: Độ chính xác vị trí đạt 10-15 mét trong điều kiện GPS tốt, và hệ thống lọc nhiễu hiệu quả để tránh phát nhầm trong 95% trường hợp
- **SC-006**: Thời gian tải xuống nội dung offline lần đầu không quá 3 phút với kết nối 4G bình thường (10 Mbps)
- **SC-007**: Mức tiêu thụ pin không vượt quá 15% sau 1 giờ sử dụng liên tục ở chế độ tự động (với màn hình tắt)
- **SC-008**: 85% người dùng hoàn thành hành trình khám phá ít nhất 5 điểm quan tâm trong một lần ghé thăm
- **SC-009**: Thời gian phản hồi khi chuyển đổi ngôn ngữ hoặc phát thủ công một đoạn thuyết minh không quá 1 giây
- **SC-010**: Hệ thống hỗ trợ ít nhất 200 người dùng đồng thời truy cập và tải nội dung offline mà không bị quá tải
