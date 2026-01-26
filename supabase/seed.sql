-- Seed Data: Sample POIs for Vĩnh Khánh Food Street
-- Description: 12 POIs representing famous food stalls on Vĩnh Khánh, Q4, HCMC
-- Created: 2026-01-26
-- Note: Coordinates are approximate. Audio URLs and images need to be uploaded separately.

-- ============================================
-- Insert Sample POIs
-- ============================================

-- 1. Bánh Xèo Bà Dưỡng (Famous crispy pancake)
INSERT INTO pois (
  lat, lng, radius, priority,
  name_vi, name_en,
  description_vi, description_en,
  signature_dish, fun_fact, estimated_hours
) VALUES (
  10.759, 106.705, 20, 9,
  'Bánh Xèo Bà Dưỡng', 'Ba Duong Crispy Pancake',
  'Bánh xèo giòn rụm, nhân tôm thịt đầy đặn, rau sống tươi ngon. Bí quyết là lửa to và chảo gang nóng.', 
  'Crispy Vietnamese pancake with shrimp, pork, and fresh vegetables. The secret is high heat and a hot cast iron pan.',
  'Bánh xèo tôm nhảy', 
  'Hơn 40 năm tuổi nghề, được Anthony Bourdain ghé thăm năm 2016',
  '15:00-22:00'
);

-- 2. Bánh Khọt Vĩnh Khánh (Mini savory pancakes)
INSERT INTO pois (
  lat, lng, radius, priority,
  name_vi, name_en,
  description_vi, description_en,
  signature_dish, fun_fact, estimated_hours
) VALUES (
  10.759, 106.706, 18, 8,
  'Bánh Khọt Vĩnh Khánh', 'Vinh Khanh Mini Pancakes',
  'Bánh khọt giòn tan với nhân tôm tươi, nước chấm chua ngọt đậm đà. Ăn kèm rau sống và bánh tráng.', 
  'Mini crispy pancakes with fresh shrimp, sweet and sour dipping sauce. Served with fresh vegetables and rice paper.',
  'Bánh khọt tôm',
  'Sử dụng khuôn gang chuyên dụng truyền thống, mỗi chiếc bánh phải chín đều',
  '14:00-21:00'
);

-- 3. Bánh Canh Cua 87 (Crab thick noodle soup)
INSERT INTO pois (
  lat, lng, radius, priority,
  name_vi, name_en,
  description_vi, description_en,
  signature_dish, fun_fact, estimated_hours
) VALUES (
  10.758, 106.705, 20, 8,
  'Bánh Canh Cua 87', 'Crab Noodle Soup 87',
  'Bánh canh sợi dai, nước dùng ngọt từ xương heo, cua đồng tươi. Ăn kèm rau thơm và chanh.', 
  'Thick tapioca noodles in sweet pork bone broth with fresh crab. Served with herbs and lime.',
  'Bánh canh cua đồng',
  'Nước dùng được ninh từ xương heo và cua suốt 6 tiếng',
  '06:00-22:00'
);

-- 4. Hủ Tiếu Nam Vang Mỹ Tho (Southern-style noodle soup)
INSERT INTO pois (
  lat, lng, radius, priority,
  name_vi, name_en,
  description_vi, description_en,
  signature_dish, fun_fact, estimated_hours
) VALUES (
  10.758, 106.706, 18, 7,
  'Hủ Tiếu Nam Vang Mỹ Tho', 'My Tho Phnom Penh Noodle',
  'Hủ tiếu Nam Vang nước trong, ngọt xương, nhiều hải sản. Ăn kèm giá đỗ và rau thơm.', 
  'Clear Phnom Penh-style noodle soup with seafood and sweet broth. Served with bean sprouts and herbs.',
  'Hủ tiếu Nam Vang đặc biệt',
  'Công thức gốc từ người Hoa ở Campuchia, truyền vào Việt Nam từ thập niên 1950',
  '05:00-14:00'
);

-- 5. Bánh Mì Chảo Bà Út (Sizzling bread bowl)
INSERT INTO pois (
  lat, lng, radius, priority,
  name_vi, name_en,
  description_vi, description_en,
  signature_dish, fun_fact, estimated_hours
) VALUES (
  10.757, 106.705, 20, 7,
  'Bánh Mì Chảo Bà Út', 'Ba Ut Sizzling Bread Bowl',
  'Bánh mì nướng giòn chứa đầy nhân thịt bò, trứng, pate và rau củ. Ăn nóng mới ngon.', 
  'Crispy toasted bread bowl filled with beef, eggs, pate, and vegetables. Best eaten hot.',
  'Bánh mì chảo bò',
  'Mỗi chiếc bánh mì được khoét lõi và nướng giòn trước khi cho nhân',
  '16:00-23:00'
);

-- 6. Chè Bà Thin (Traditional Vietnamese dessert)
INSERT INTO pois (
  lat, lng, radius, priority,
  name_vi, name_en,
  description_vi, description_en,
  signature_dish, fun_fact, estimated_hours
) VALUES (
  10.757, 106.706, 15, 6,
  'Chè Bà Thin', 'Ba Thin Sweet Soup',
  'Chè thập cẩm với nhiều loại đậu, thạch, trái cây và nước cốt dừa. Mát lạnh giải nhiệt.', 
  'Mixed sweet soup with various beans, jelly, fruits, and coconut milk. Refreshing and cooling.',
  'Chè thập cẩm',
  'Có hơn 10 loại nguyên liệu khác nhau trong mỗi tô chè',
  '07:00-22:00'
);

-- 7. Cơm Tấm Sườn Nướng (Broken rice with grilled pork)
INSERT INTO pois (
  lat, lng, radius, priority,
  name_vi, name_en,
  description_vi, description_en,
  signature_dish, fun_fact, estimated_hours
) VALUES (
  10.760, 106.705, 20, 7,
  'Cơm Tấm Sườn Nướng', 'Grilled Pork with Broken Rice',
  'Cơm tấm thơm mềm, sườn nướng thơm lừng, trứng ốp la và bì. Nước mắm ngọt đậm đà.', 
  'Fragrant broken rice with grilled pork chop, fried egg, and pork skin. Sweet fish sauce.',
  'Cơm tấm sườn bì chả',
  'Sườn được ướp gia vị đặc biệt ít nhất 12 tiếng trước khi nướng',
  '06:00-21:00'
);

-- 8. Bánh Tráng Nướng (Grilled rice paper pizza)
INSERT INTO pois (
  lat, lng, radius, priority,
  name_vi, name_en,
  description_vi, description_en,
  signature_dish, fun_fact, estimated_hours
) VALUES (
  10.760, 106.706, 15, 6,
  'Bánh Tráng Nướng', 'Grilled Rice Paper',
  'Bánh tráng nướng giòn với trứng, tôm khô, hành phi và sốt mayonnaise. Vị ngon lạ miệng.', 
  'Crispy grilled rice paper with eggs, dried shrimp, scallions, and mayonnaise. Unique and delicious.',
  'Bánh tráng nướng đặc biệt',
  'Được gọi là "pizza Việt Nam", món ăn này xuất phát từ Đà Lạt',
  '15:00-23:00'
);

-- 9. Bún Mắm Cô Ba (Fermented fish noodle soup)
INSERT INTO pois (
  lat, lng, radius, priority,
  name_vi, name_en,
  description_vi, description_en,
  signature_dish, fun_fact, estimated_hours
) VALUES (
  10.759, 106.707, 20, 7,
  'Bún Mắm Cô Ba', 'Co Ba Fermented Fish Noodle',
  'Bún mắm đậm đà với nhiều hải sản, thịt heo, và rau sống. Nước mắm pha chua ngọt độc đáo.', 
  'Rich fermented fish noodle soup with seafood, pork, and fresh vegetables. Unique sweet and sour broth.',
  'Bún mắm đặc biệt',
  'Nước mắm được pha chế bí truyền, cân bằng giữa mặn, ngọt, chua và cay',
  '10:00-20:00'
);

-- 10. Ốc Xào Bơ Tỏi (Snails stir-fried with butter and garlic)
INSERT INTO pois (
  lat, lng, radius, priority,
  name_vi, name_en,
  description_vi, description_en,
  signature_dish, fun_fact, estimated_hours
) VALUES (
  10.758, 106.707, 18, 6,
  'Ốc Xào Bơ Tỏi', 'Butter Garlic Snails',
  'Ốc tươi xào với bơ, tỏi, sả và ớt. Thơm ngon, ăn kèm bánh mì nướng.', 
  'Fresh snails stir-fried with butter, garlic, lemongrass, and chili. Served with toasted bread.',
  'Ốc hương xào bơ tỏi',
  'Có hơn 20 loại ốc khác nhau để lựa chọn',
  '16:00-23:30'
);

-- 11. Gỏi Cuốn Tôm Thịt (Fresh spring rolls)
INSERT INTO pois (
  lat, lng, radius, priority,
  name_vi, name_en,
  description_vi, description_en,
  signature_dish, fun_fact, estimated_hours
) VALUES (
  10.757, 106.707, 15, 5,
  'Gỏi Cuốn Tôm Thịt', 'Fresh Shrimp Spring Rolls',
  'Gỏi cuốn tươi mát với tôm, thịt, bún và rau sống. Nước chấm đậm đà.', 
  'Fresh spring rolls with shrimp, pork, vermicelli, and vegetables. Rich peanut dipping sauce.',
  'Gỏi cuốn đặc biệt',
  'Cuốn tươi theo yêu cầu, đảm bảo độ tươi ngon tối đa',
  '10:00-21:00'
);

-- 12. Cà Phê Sữa Đá (Vietnamese iced coffee)
INSERT INTO pois (
  lat, lng, radius, priority,
  name_vi, name_en,
  description_vi, description_en,
  signature_dish, fun_fact, estimated_hours
) VALUES (
  10.760, 106.707, 15, 5,
  'Cà Phê Vỉa Hè', 'Sidewalk Coffee',
  'Cà phê phin truyền thống, đậm đà với sữa đặc ngọt. Ngồi vỉa hè ngắm người qua lại.', 
  'Traditional Vietnamese drip coffee, strong and sweet with condensed milk. Enjoy on the sidewalk.',
  'Cà phê sữa đá',
  'Cà phê được pha từ hạt robusta Việt Nam rang truyền thống',
  '06:00-22:00'
);

-- ============================================
-- Verify Insert
-- ============================================

-- Check total POIs inserted
SELECT COUNT(*) as total_pois FROM pois;

-- Check POI names
SELECT id, name_vi, name_en, priority, estimated_hours 
FROM pois 
ORDER BY priority DESC, name_vi;

-- Check coordinates are within Vĩnh Khánh bounds
SELECT 
  name_vi,
  lat,
  lng,
  CASE 
    WHEN lat BETWEEN 10.750 AND 10.765 AND lng BETWEEN 106.690 AND 106.710 
    THEN 'OK' 
    ELSE 'OUT OF BOUNDS' 
  END as location_status
FROM pois;

-- ============================================
-- Notes
-- ============================================

-- Audio URLs and image URLs need to be added after:
-- 1. Recording/generating audio narrations for each POI in 6 languages
-- 2. Taking/uploading photos for each POI
-- 3. Uploading to Supabase Storage buckets
-- 4. Running UPDATE queries to add URLs:

-- Example UPDATE query (run after uploading audio/images):
-- UPDATE pois SET 
--   audio_url_vi = 'https://....supabase.co/storage/v1/object/public/audio/poi-1-vi.mp3',
--   audio_url_en = 'https://....supabase.co/storage/v1/object/public/audio/poi-1-en.mp3',
--   image_url = 'https://....supabase.co/storage/v1/object/public/images/poi-1.webp'
-- WHERE name_vi = 'Bánh Xèo Bà Dưỡng';
