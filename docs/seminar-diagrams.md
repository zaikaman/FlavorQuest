# FlavorQuest Diagrams

Tài liệu này tập hợp các sơ đồ Mermaid để đưa trực tiếp vào báo cáo seminar, slide thuyết trình hoặc tài liệu thiết kế. Các sơ đồ bám theo kiến trúc và luồng nghiệp vụ trong codebase hiện tại.

## 1. Sơ đồ ngữ cảnh hệ thống

```mermaid
flowchart LR
  customer["Khách hàng"] --> app["FlavorQuest PWA"]
  owner["Owner"] --> app
  admin["Admin"] --> app

  app --> supabase["Supabase Auth + Postgres + Storage + Realtime"]
  app --> ai["OpenAI-compatible API"]
  app --> tts["Azure OpenAI TTS"]
  app --> smtp["SMTP Mail Server"]
```

## 2. Sơ đồ thành phần mức cao

```mermaid
flowchart TB
  subgraph Frontend["Next.js App Router"]
    customer["Tour Workspace"]
    owner["Owner Workspace"]
    admin["Admin Workspace"]
    api["Route Handlers /app/api"]
    guard["proxy.ts Access Guard"]
    pwa["PWA + Service Worker + IndexedDB"]
  end

  landing --> guard
  customer --> guard
  owner --> guard
  admin --> guard

  customer --> api
  owner --> api
  admin --> api
  customer --> pwa

  api --> supabase["Supabase"]
  api --> llm["OpenAI-compatible API"]
  api --> azure["Azure OpenAI TTS"]
  api --> mail["SMTP"]
```

## 3. Sơ đồ trạng thái truy cập người dùng

```mermaid
stateDiagram-v2
  [*] --> Guest
  Guest --> LoggedInCustomer: OTP thành công
  Guest --> PendingOwner: OTP owner và chờ duyệt
  Guest --> Admin: Đăng nhập cổng admin

  LoggedInCustomer --> TourAccess: Đã có quyền truy cập

  PendingOwner --> OwnerAccess: Admin duyệt
  PendingOwner --> Guest: Bị từ chối hoặc đăng xuất

  TourAccess --> Guest: Đăng xuất
  OwnerAccess --> Guest: Đăng xuất
  Admin --> Guest: Đăng xuất
```

## 4. Sơ đồ tuần tự mở khóa và vào tour

```mermaid
sequenceDiagram
  autonumber
  actor User as Khách hàng
  participant UI as FlavorQuest UI
  participant Auth as Supabase Auth
  participant API as Payment API
  participant DB as Supabase DB

  User->>UI: Nhập email và nhận OTP
  UI->>Auth: Gửi yêu cầu xác thực OTP
  Auth-->>UI: Phiên đăng nhập hợp lệ
  DB-->>UI: Chưa có quyền truy cập
  User->>UI: Chọn mở khóa nội dung
  UI->>API: POST create customer access payment
  API->>DB: Lưu giao dịch PENDING
  API-->>UI: Trả link thanh toán
  API->>DB: Cập nhật payment = PAID và user access = true
  UI->>API: Poll trạng thái thanh toán
  API->>DB: Đọc payment + user access
  DB-->>API: Đã mở khóa
  API-->>UI: hasAccess = true
  UI-->>User: Điều hướng vào /tour
```

## 5. Sơ đồ hoạt động xử lý đơn đặt trước

```mermaid
flowchart TD
  A["Khách chọn món tại POI"] --> B["Tạo preorder order"]
  B --> C["Lưu chi tiết món và tổng tiền"]
  C --> D["Thông báo tới owner"]
  D --> E{"Owner phản hồi?"}
  E -->|Xác nhận| F["Đơn chuyển sang confirmed / preparing"]
  E -->|Từ chối| G["Đơn chuyển sang cancelled"]
  F --> H{"Loại đơn"}
  H -->|Pickup| I["Khách đến nhận món"]
  H -->|Delivery| J["Chuẩn bị giao hàng"]
  I --> K["Đơn hoàn tất"]
  J --> K
```

## 6. Sơ đồ dữ liệu cốt lõi

```mermaid
erDiagram
  USERS ||--o{ POIS : manages
  USERS ||--o{ PREORDER_ORDERS : places
  USERS ||--o{ SUPPORT_THREADS : opens
  USERS ||--o{ SUPPORT_MESSAGES : sends
  USERS ||--o{ CHAT_CONVERSATIONS : owns
  USERS ||--o{ NOTIFICATIONS : receives

  POIS ||--o{ DISHES : contains
  POIS ||--o{ PREORDER_ORDERS : receives
  POIS ||--o{ SUPPORT_THREADS : relates_to
  POIS ||--o{ ANALYTICS_LOGS : generates

  PREORDER_ORDERS ||--o{ PREORDER_ORDER_ITEMS : includes
  DISHES ||--o{ PREORDER_ORDER_ITEMS : referenced_by

  SUPPORT_THREADS ||--o{ SUPPORT_MESSAGES : contains
  SUPPORT_THREADS ||--o{ SUPPORT_THREAD_READS : tracks

  CHAT_CONVERSATIONS ||--o{ CHAT_MESSAGES : contains

  USERS {
    uuid id PK
    text email
    text role
    text owner_request_status
  }
  POIS {
    uuid id PK
    uuid owner_id FK
    float lat
    float lng
    text name_vi
    text name_en
  }
  TOURS {
    uuid id PK
    uuid created_by FK
    uuid[] poi_ids
    text name_vi
    boolean is_active
  }
  DISHES {
    uuid id PK
    uuid poi_id FK
    text name
    numeric price
  }
  PREORDER_ORDERS {
    uuid id PK
    uuid poi_id FK
    uuid customer_id FK
    text status
    numeric total_amount
  }
  PREORDER_ORDER_ITEMS {
    uuid id PK
    uuid order_id FK
    uuid dish_id FK
    int quantity
  }
    uuid id PK
    uuid user_id FK
    bigint order_code
    text status
    int amount
  }
  SUPPORT_THREADS {
    uuid id PK
    uuid customer_id FK
    uuid owner_id FK
    uuid poi_id FK
    text thread_type
  }
  SUPPORT_MESSAGES {
    uuid id PK
    uuid thread_id FK
    uuid sender_id FK
    text content
  }
  CHAT_CONVERSATIONS {
    uuid id PK
    uuid user_id FK
    text workspace_role
  }
  CHAT_MESSAGES {
    uuid id PK
    uuid conversation_id FK
    text role
    text content
  }
  NOTIFICATIONS {
    uuid id PK
    uuid user_id FK
    uuid order_id FK
    text type
  }
  ANALYTICS_LOGS {
    uuid id PK
    uuid poi_id FK
    uuid session_id
    text event_type
  }
```

Ghi chú: bảng `tours` tham chiếu POI theo `poi_ids` dạng mảng UUID, nên quan hệ với `pois` là quan hệ logic ở tầng ứng dụng thay vì khóa ngoại trực tiếp trong schema hiện tại.

