# Hướng Dẫn Setup Supabase Storage Buckets

## Mục Đích
Tạo 2 storage buckets để lưu trữ:
- **audio**: File âm thanh thuyết minh cho POIs (MP3, OGG)
- **images**: Hình ảnh POIs (WEBP, JPG, PNG)

## Các Bước Setup

### 1. Truy Cập Storage Dashboard
1. Mở Supabase Dashboard: https://supabase.com/dashboard/project/lvmtwqgvlgngnegoaxam
2. Chọn **Storage** trong menu bên trái
3. Click nút **"New bucket"**

---

### 2. Tạo Bucket "audio"

#### Cấu hình:
- **Name**: `audio`
- **Public bucket**: ✅ **BẬT** (cho phép truy cập public URLs)
- **File size limit**: `50 MB` (mỗi file audio tối đa 50MB)
- **Allowed MIME types**: 
  ```
  audio/mpeg
  audio/mp3
  audio/ogg
  audio/wav
  ```

#### Policies (sau khi tạo bucket):
1. Click vào bucket **"audio"**
2. Tab **Policies** → Click **"New Policy"**
3. Tạo policy **"Public Read Access"**:
   ```sql
   CREATE POLICY "Public Read Access"
   ON storage.objects FOR SELECT
   USING (bucket_id = 'audio');
   ```

4. Tạo policy **"Authenticated Upload"** (cho admin upload audio):
   ```sql
   CREATE POLICY "Authenticated Upload"
   ON storage.objects FOR INSERT
   TO authenticated
   WITH CHECK (bucket_id = 'audio');
   ```

5. Tạo policy **"Authenticated Update"**:
   ```sql
   CREATE POLICY "Authenticated Update"
   ON storage.objects FOR UPDATE
   TO authenticated
   USING (bucket_id = 'audio');
   ```

6. Tạo policy **"Authenticated Delete"**:
   ```sql
   CREATE POLICY "Authenticated Delete"
   ON storage.objects FOR DELETE
   TO authenticated
   USING (bucket_id = 'audio');
   ```

---

### 3. Tạo Bucket "images"

#### Cấu hình:
- **Name**: `images`
- **Public bucket**: ✅ **BẬT** (cho phép truy cập public URLs)
- **File size limit**: `10 MB` (mỗi ảnh tối đa 10MB)
- **Allowed MIME types**:
  ```
  image/webp
  image/jpeg
  image/png
  image/jpg
  ```

#### Policies (sau khi tạo bucket):
1. Click vào bucket **"images"**
2. Tab **Policies** → Click **"New Policy"**
3. Tạo policy **"Public Read Access"**:
   ```sql
   CREATE POLICY "Public Read Access"
   ON storage.objects FOR SELECT
   USING (bucket_id = 'images');
   ```

4. Tạo policy **"Authenticated Upload"**:
   ```sql
   CREATE POLICY "Authenticated Upload"
   ON storage.objects FOR INSERT
   TO authenticated
   WITH CHECK (bucket_id = 'images');
   ```

5. Tạo policy **"Authenticated Update"**:
   ```sql
   CREATE POLICY "Authenticated Update"
   ON storage.objects FOR UPDATE
   TO authenticated
   USING (bucket_id = 'images');
   ```

6. Tạo policy **"Authenticated Delete"**:
   ```sql
   CREATE POLICY "Authenticated Delete"
   ON storage.objects FOR DELETE
   TO authenticated
   USING (bucket_id = 'images');
   ```

---

## 4. Cấu Trúc Thư Mục Đề Xuất

### Audio Bucket:
```
audio/
├── pois/
│   ├── poi-{uuid}-vi.mp3
│   ├── poi-{uuid}-en.mp3
│   ├── poi-{uuid}-ja.mp3
│   ├── poi-{uuid}-fr.mp3
│   ├── poi-{uuid}-ko.mp3
│   └── poi-{uuid}-zh.mp3
└── system/
    ├── welcome-vi.mp3
    ├── welcome-en.mp3
    └── ...
```

### Images Bucket:
```
images/
├── pois/
│   ├── poi-{uuid}-thumb.webp (thumbnail 400x300)
│   ├── poi-{uuid}-full.webp (full size 1200x900)
│   └── ...
├── icons/
│   ├── marker-default.png
│   ├── marker-active.png
│   └── ...
└── placeholders/
    └── poi-placeholder.webp
```

---

## 5. Kiểm Tra Setup Thành Công

### Test Upload (qua Dashboard):
1. Vào bucket **"audio"** → Click **"Upload file"**
2. Upload một file MP3 test (ví dụ: `test-audio.mp3`)
3. Verify file hiển thị trong bucket
4. Click file → Copy **Public URL**
5. Paste URL vào browser, verify audio có thể play

### Test Upload (qua Dashboard) cho Images:
1. Vào bucket **"images"** → Click **"Upload file"**
2. Upload một ảnh test (ví dụ: `test-image.webp`)
3. Verify ảnh hiển thị trong bucket
4. Click ảnh → Copy **Public URL**
5. Paste URL vào browser, verify ảnh load được

---

## 6. Format Public URLs

Sau khi upload, public URLs sẽ có format:
```
https://lvmtwqgvlgngnegoaxam.supabase.co/storage/v1/object/public/audio/{path}/{filename}
https://lvmtwqgvlgngnegoaxam.supabase.co/storage/v1/object/public/images/{path}/{filename}
```

**Ví dụ**:
```
https://lvmtwqgvlgngnegoaxam.supabase.co/storage/v1/object/public/audio/pois/poi-123-vi.mp3
https://lvmtwqgvlgngnegoaxam.supabase.co/storage/v1/object/public/images/pois/poi-123-full.webp
```

---

## 7. Cập Nhật POI Audio URLs

Sau khi upload audio files, cập nhật POI records trong database:

```sql
-- Ví dụ: Update audio URLs cho POI
UPDATE pois 
SET 
  audio_url_vi = 'https://lvmtwqgvlgngnegoaxam.supabase.co/storage/v1/object/public/audio/pois/poi-{uuid}-vi.mp3',
  audio_url_en = 'https://lvmtwqgvlgngnegoaxam.supabase.co/storage/v1/object/public/audio/pois/poi-{uuid}-en.mp3',
  audio_url_ja = 'https://lvmtwqgvlgngnegoaxam.supabase.co/storage/v1/object/public/audio/pois/poi-{uuid}-ja.mp3',
  audio_url_fr = 'https://lvmtwqgvlgngnegoaxam.supabase.co/storage/v1/object/public/audio/pois/poi-{uuid}-fr.mp3',
  audio_url_ko = 'https://lvmtwqgvlgngnegoaxam.supabase.co/storage/v1/object/public/audio/pois/poi-{uuid}-ko.mp3',
  audio_url_zh = 'https://lvmtwqgvlgngnegoaxam.supabase.co/storage/v1/object/public/audio/pois/poi-{uuid}-zh.mp3',
  image_url = 'https://lvmtwqgvlgngnegoaxam.supabase.co/storage/v1/object/public/images/pois/poi-{uuid}-full.webp'
WHERE name_vi = 'Bánh Xèo Bà Dưỡng';
```

---

## Troubleshooting

### Lỗi "Access denied"
- Verify bucket được set **Public**
- Kiểm tra policies đã tạo đúng
- Thử delete policies cũ và tạo lại

### Lỗi "File too large"
- Tăng **File size limit** trong bucket settings
- Audio: khuyên dùng ≤ 50MB
- Images: khuyên dùng ≤ 10MB

### Lỗi "MIME type not allowed"
- Thêm MIME type vào **Allowed MIME types** trong bucket settings
- Audio: `audio/mpeg`, `audio/mp3`, `audio/ogg`
- Images: `image/webp`, `image/jpeg`, `image/png`

---

## Next Steps

Sau khi setup storage buckets:
1. ✅ **T018 Complete**: Storage buckets đã sẵn sàng
2. 🔄 **T019**: Generate database types từ schema
3. 🔄 **T020-T026**: Implement core services (Supabase client, IndexedDB, utilities)
