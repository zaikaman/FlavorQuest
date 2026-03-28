# Nghiên cứu: Khác biệt giữa các mức hỗ trợ thiết bị và tối ưu pin

Cập nhật: 28/03/2026

## 1. Kết luận nhanh

- FlavorQuest vẫn có 4 lựa chọn cấu hình trải nghiệm: `system`, `light`, `balanced`, `full`.
- `batterySaverMode` hiện không còn chỉ hạ profile. Nó vẫn hạ tier hiệu dụng 1 nấc, đồng thời làm geolocation bớt tốn pin hơn và tắt auto-sync nền.
- Runtime tour hiện đã đổi sang một chiến lược preload thống nhất: khi dataset hiện tại sẵn sàng, app preload toàn bộ audio của ngôn ngữ đang dùng và toàn bộ ảnh của các POI đang active, không còn phụ thuộc tier `light/balanced/full`.
- Nearby preload và audio warmup không còn được dùng trong flow tour hiện tại.
- Hệ thống chưa preload toàn bộ audio của mọi ngôn ngữ cùng lúc. Việc preload audio là theo ngôn ngữ đang active tại thời điểm đó.

## 2. Các mức hỗ trợ thiết bị đang có

### 2.1. Cơ chế nhận diện tự động (`system`)

Chế độ `system` suy ra tier từ các tín hiệu thiết bị và môi trường:

- CPU (`hardwareConcurrency`)
- RAM (`deviceMemory`)
- Chất lượng mạng (`effectiveType`)
- Cờ tiết kiệm dữ liệu mạng (`saveData`)
- Tùy chọn giảm chuyển động của hệ điều hành (`prefers-reduced-motion`)
- Màn hình, touch device, pixel ratio
- Benchmark ngắn để hiệu chỉnh tier

Quy đổi tier hiện tại:

- Điểm <= 0: `light`
- Điểm từ 1 đến 4: `balanced`
- Điểm >= 5: `full`

### 2.2. Bốn lựa chọn cấu hình trải nghiệm

- `system`: tự nhận diện theo thiết bị và ngữ cảnh
- `light`: ưu tiên nhẹ máy, ít hiệu ứng
- `balanced`: cân bằng giữa trải nghiệm và độ ổn định
- `full`: ưu tiên bản đồ giàu chi tiết hơn và tương tác phong phú hơn

### 2.3. So sánh chi tiết profile tài nguyên đã khai báo

| Thuộc tính | light | balanced | full |
| --- | --- | --- | --- |
| Map zoom mặc định | 14 | 16 | 18 |
| Fly animation | Tắt | Bật | Bật |
| Vòng accuracy GPS | Tắt | Bật | Bật |
| Hiệu ứng pulse vị trí người dùng | Tắt | Bật | Bật |
| Nhãn POI | Tắt | Bật | Bật |
| Nhãn POI trên mobile | Tắt | Tắt | Bật |
| Halo POI lân cận | Tắt | Tắt | Bật |
| Focus POI đã chọn | Tắt | Tắt | Bật |
| Biến thể thẻ chi tiết | compact | compact | rich |

Lưu ý: trong `DEVICE_RESOURCE_PROFILES` vẫn còn các field liên quan tới preload như `autoPreloadAudio`, `nearbyPreloadRadius`, `backgroundPreload`, `audioWarmupCount`. Tuy nhiên flow tour hiện tại không còn dùng chúng để quyết định preload runtime nữa.

## 3. Bật tối ưu pin vs không bật

### 3.1. Logic chuyển tier

Nếu `batterySaverMode = true`:

- `full` -> `balanced`
- `balanced` -> `light`
- `light` -> `light`

Nếu `batterySaverMode = false`:

- Tier giữ nguyên theo lựa chọn người dùng hoặc theo `system`.

Ngoài ra, nếu người dùng chọn tay `light`/`balanced`/`full`, hệ thống vẫn có safety cap để không ép thiết bị yếu chạy cấu hình quá cao.

### 3.2. Tác động runtime hiện tại của battery saver

Khi bật tối ưu pin, app đang đổi hành vi ở 3 nhóm chính:

1. Profile hiển thị bị hạ 1 nấc
- map zoom mặc định, fly animation, accuracy ring, user pulse, nhãn POI, halo POI, focusSelectedPOI và variant của detail card sẽ đi theo tier hiệu dụng mới.

2. Geolocation bớt tốn pin hơn
- Khi settings đã load xong và `batterySaverMode` bật, tour page truyền geolocation options theo hướng tiết kiệm hơn:
  - `enableHighAccuracy: false`
  - `timeout: 20000`
  - `maximumAge: 15000`
- Khi không bật battery saver, geolocation quay lại mode mạnh hơn:
  - `enableHighAccuracy: true`
  - `timeout: 10000`
  - `maximumAge: 0`

3. Auto-sync nền bị tắt
- `useOfflineSync` chỉ auto sync khi `autoSync = true`.
- Ở tour page, `autoSync` hiện được truyền thành `settingsReady && !isBatterySaverEnabled`.
- Vì vậy khi bật battery saver, app không tự sync khi online lại và cũng không đăng ký background sync mới ở nhánh offline.

### 3.3. Những gì battery saver không còn làm trong flow tour

Sau khi runtime preload được đơn giản hóa:

- battery saver không còn dùng để cắt nearby preload
- battery saver không còn dùng để cắt audio warmup
- battery saver không còn dùng để quyết định full preload hay không

Lý do là flow tour hiện đã preload thống nhất cho dataset hiện tại, bất kể tier.

## 4. Chiến lược preload hiện tại của tour

### 4.1. App đang preload cái gì

Khi danh sách POI active của tour hiện tại sẵn sàng, app sẽ:

- preload toàn bộ audio của ngôn ngữ đang dùng cho các POI đang active
- preload toàn bộ ảnh của các POI đang active

Điều này được thực hiện qua `preloadAllAssets()` trong `usePOIManager`.

### 4.2. App preload vào lúc nào

Flow hiện tại dùng một `activePreloadKey` theo dạng:

- `language`
- `selectedTourId`
- danh sách `POI id` đang active

Khi một trong các thành phần này đổi, preload ref bị reset và effect sẽ chạy preload lại cho dataset mới.

Thực tế nghĩa là:

- vào app bằng tiếng Việt: preload audio tiếng Việt + ảnh
- đổi sang tiếng Anh: preload audio tiếng Anh + ảnh
- đổi tour khác: preload lại theo tập POI của tour đó

### 4.3. App không preload gì

Hiện tại app không làm các việc sau trong flow tour:

- không preload nearby theo vị trí người dùng nữa
- không warmup audio bằng `<link rel="preload">` nữa
- không preload toàn bộ audio của tất cả ngôn ngữ cùng lúc

### 4.4. Hệ quả thực tế

Ưu điểm:

- logic preload dễ hiểu hơn
- không còn chồng chéo giữa full preload, nearby preload và warmup
- khi đổi ngôn ngữ, app sẽ preload đúng audio của ngôn ngữ mới

Đánh đổi:

- lần đầu vào tour sẽ tốn băng thông và thời gian tải nền nhiều hơn trước, kể cả ở `light`
- nếu user chỉ nghe một vài điểm gần mình, app vẫn preload toàn bộ dataset active
- bộ nhớ cache audio sẽ tăng dần khi user đổi qua nhiều ngôn ngữ khác nhau

## 5. Khoảng cách giữa thiết kế và triển khai hiện tại

Đây là điểm quan trọng nhất để đọc code đúng:

- `DEVICE_RESOURCE_PROFILES` vẫn còn các field preload cũ, nhưng runtime tour hiện không còn dùng chúng để quyết định chiến lược preload.
- Bộ công cụ Battery API trong `lib/utils/battery.ts` vẫn tồn tại, nhưng chưa thấy được nối để app tự động đổi hành vi theo phần trăm pin thật của thiết bị.
- Vì vậy, “tối ưu pin” hiện là một mode runtime dựa trên setting người dùng, chưa phải tối ưu tự động theo pin thực.

## 6. Tóm tắt trả lời câu hỏi

"Khác nhau giữa các hồ sơ thiết bị là gì?"

- Khác nhau chủ yếu ở mức hiển thị và chuyển động của bản đồ cùng detail card.
- `light` là mức bảo thủ nhất, `full` là mức giàu chi tiết nhất, `balanced` là điểm giữa.
- `system` tự chọn một trong ba mức đó.

"Bật tiết kiệm pin khác gì không bật?"

- Bật: profile hiệu dụng bị hạ 1 nấc nếu có thể, GPS chạy nhẹ hơn và auto-sync nền bị tắt.
- Không bật: dùng nguyên profile đã chọn hoặc profile hệ thống nhận diện, GPS dùng cấu hình mạnh hơn và sync nền được phép chạy.

"Preload hiện tại hoạt động ra sao?"

- App preload theo nhu cầu của dataset đang active và ngôn ngữ hiện tại.
- Không còn nearby preload hay warmup trong flow tour.
- Chuyển ngôn ngữ thì mới preload thêm audio của ngôn ngữ mới.

## 7. Nguồn đọc code

- `lib/services/device-performance.ts`
- `lib/types.ts`
- `app/tour/page.tsx`
- `lib/hooks/usePOIManager.ts`
- `lib/services/audio-preloader.ts`
- `lib/hooks/useGeolocation.ts`
- `lib/hooks/useOfflineSync.ts`
- `lib/utils/battery.ts`
- `public/sw.js`
