# Nghiên cứu: Khác biệt giữa các mức hỗ trợ thiết bị và tối ưu pin

Cập nhật: 26/03/2026

## 1. Kết luận nhanh

- FlavorQuest hiện có 4 mức cấu hình trải nghiệm theo thiết bị: `system`, `light`, `balanced`, `full`.
- Khi bật tối ưu pin (`batterySaverMode = true`), hệ thống hạ cấu hình xuống 1 nấc (trừ khi đã ở `light`).
- Khác biệt rõ nhất giữa bật và không bật là ở chuyển động bản đồ, vòng chính xác GPS, hiệu ứng vị trí người dùng và bán kính preload audio.
- Cần lưu ý: một số tối ưu pin đã được thiết kế trong code nhưng chưa được nối hoàn toàn vào runtime (chi tiết ở mục 5).

## 2. Các loại hỗ trợ thiết bị đang có

## 2.1. Cơ chế nhận diện tự động (`system`)

Chế độ `system` chấm điểm thiết bị rồi suy ra tier (`light`/`balanced`/`full`) dựa trên:

- CPU (`hardwareConcurrency`)
- RAM (`deviceMemory`)
- Chất lượng mạng (`effectiveType`: `slow-2g`, `2g`, `3g`, `4g`)
- Cờ tiết kiệm dữ liệu mạng (`saveData`)
- Tùy chọn giảm chuyển động của hệ điều hành (`prefers-reduced-motion`)
- Kích thước màn hình, mật độ điểm ảnh và đặc tính touch device
- Bổ sung benchmark ngắn để hiệu chỉnh lại tier theo độ trễ thực tế

Quy đổi tier hiện tại:

- Điểm <= 1: `light`
- Điểm từ 2 đến 4: `balanced`
- Điểm >= 5: `full`

## 2.2. Bốn lựa chọn cấu hình trải nghiệm

- `system`: tự nhận diện theo thiết bị/mạng/ngữ cảnh
- `light`: ưu tiên nhẹ máy và pin
- `balanced`: cân bằng trải nghiệm và tiêu thụ tài nguyên
- `full`: ưu tiên mượt, giàu hiệu ứng và preload rộng

## 2.3. So sánh chi tiết tài nguyên theo tier

| Thuộc tính | light | balanced | full |
| --- | --- | --- | --- |
| Map zoom mặc định | 15 | 16 | 17 |
| Fly animation | Tắt | Bật | Bật |
| Vòng accuracy GPS | Tắt | Bật | Bật |
| Hiệu ứng pulse vị trí user | Tắt | Bật | Bật |
| Auto preload audio (cấu hình) | Tắt | Bật | Bật |
| Bán kính preload lân cận | 220m | 500m | 900m |

## 3. Bật tối ưu pin vs không bật

## 3.1. Logic chuyển tier

Nếu `batterySaverMode = true`:

- `full` -> `balanced`
- `balanced` -> `light`
- `light` -> `light` (không hạ thêm)

Nếu `batterySaverMode = false`:

- Tier giữ nguyên theo lựa chọn người dùng hoặc theo `system`.

## 3.2. Bảng so sánh nhanh

| Trạng thái | Tier áp dụng | Tác động chính |
| --- | --- | --- |
| Không bật tối ưu pin | Bằng tier yêu cầu | Giữ nguyên mức chuyển động/chi tiết/preload |
| Bật tối ưu pin | Hạ 1 nấc (nếu có thể) | Giảm animation map, giảm hiệu ứng hiển thị GPS, giảm phạm vi preload |

## 3.3. Tác động thực tế đang chạy trong app

Khi tier bị hạ do tối ưu pin, các phần sau đã phản ứng trực tiếp:

- `preferredZoom` của bản đồ
- `enableFlyAnimation` khi căn giữa vị trí user
- `showAccuracyRing`
- `showUserPulse`
- `preloadRadius` dùng cho preload audio gần user

Ngoài ra, warmup audio còn phụ thuộc thêm trạng thái mạng:

- Nếu `saveData = true` hoặc mạng `2g`/`slow-2g`, warmup bị bỏ qua để tiết kiệm tài nguyên.

## 4. “Hỗ trợ thiết bị” theo nền tảng trình duyệt

| Hạng mục | Điều kiện hỗ trợ | Ghi chú |
| --- | --- | --- |
| PWA cốt lõi | Có `serviceWorker` + `PushManager` | Dùng cho install/offline nền tảng web app |
| Prompt cài app (A2HS) | Có `BeforeInstallPromptEvent` | Tùy trình duyệt, không phải máy nào cũng hiện prompt |
| Background Sync | Có `sync` trong `ServiceWorkerRegistration.prototype` | Không có thì fallback đồng bộ khi online |
| Battery Status API | Chrome/Edge/Firefox hỗ trợ tốt | Safari/iOS Safari không hỗ trợ |

## 5. Khoảng cách giữa thiết kế và triển khai hiện tại

Đây là phần quan trọng để hiểu vì sao “bật tối ưu pin” có hiệu quả đến mức nào trong thực tế:

- Thuộc tính `autoPreloadAudio` có trong profile tier, nhưng luồng gọi `usePOIManager` ở tour page đang truyền cứng `autoPreloadAudio: true`.
- Bộ công cụ Battery API (`BatteryManager`, `applyBatteryOptimization`) đã có đầy đủ, nhưng chưa thấy được nối để tự động đổi hành vi runtime theo % pin hiện tại.
- Vì vậy, hiện tại lợi ích pin chủ yếu đến từ việc hạ tier (map + hiệu ứng + preload radius), chưa phải là bộ tối ưu pin toàn phần theo mức pin thật.

## 6. Tóm tắt trả lời câu hỏi

"Điểm khác nhau khi sử dụng các loại hỗ trợ thiết bị là gì?"

- Khác nhau ở mức độ tải tài nguyên: hiệu ứng bản đồ, thông tin hiển thị vị trí và phạm vi preload audio.
- `light` bảo thủ nhất, `full` giàu trải nghiệm nhất, `balanced` là mức trung gian.
- `system` tự chọn một trong ba mức trên theo điều kiện thiết bị/mạng/người dùng.

"Tối ưu pin nếu bật vs không bật khác gì nhau?"

- Bật: profile hoạt động bị hạ 1 nấc (trừ khi đã `light`), giảm tải tài nguyên để tiết kiệm pin.
- Không bật: dùng nguyên profile đã chọn/được nhận diện, ưu tiên trải nghiệm hơn.
- Mức tiết kiệm hiện tại là thật nhưng chưa tận dụng hết vì chưa nối tự động theo phần trăm pin thực tế.

## 7. Nguồn đọc code

- `lib/services/device-performance.ts`
- `lib/types.ts`
- `app/tour/page.tsx`
- `components/layout/SettingsPanel.tsx`
- `components/tour/InteractiveMap.tsx`
- `lib/hooks/usePOIManager.ts`
- `lib/services/audio-preloader.ts`
- `lib/utils/battery.ts`
- `lib/services/pwa.ts`
- `public/sw.js`
- `lib/hooks/useOfflineSync.ts`
- `lib/services/analytics.ts`
