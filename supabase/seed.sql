-- Seed Data: Sample POIs for Vĩnh Khánh Food Street (Real Data)
-- Description: 12 specific POIs from the start to the end of Vĩnh Khánh street, District 4, HCMC
-- Created: 2026-01-26

-- ============================================
-- Clean existing data
-- ============================================
TRUNCATE TABLE pois RESTART IDENTITY CASCADE;

-- ============================================
-- Insert Real POIs
-- ============================================

-- 1. Cổng vào (Điểm khởi đầu tour)
INSERT INTO pois (
  lat, lng, radius, priority,
  name_vi, name_en,
  description_vi, description_en,
  signature_dish, fun_fact, estimated_hours
) VALUES (
  10.761905898335831, 106.70222716527056, 80, 10,
  'Cổng vào Phố Ẩm thực Vĩnh Khánh', 'Vinh Khanh Food Street Entrance',
  'Biển chào "Phố Ẩm thực Vĩnh Khánh" – nơi bắt đầu hành trình khám phá thiên đường hải sản sầm uất nhất Quận 4. Được Time Out bình chọn là một trong 10 đường phố thú vị nhất thế giới năm 2025.', 
  'The welcoming gate of "Vinh Khanh Food Street" - the start of your journey to explore District 4''s busiest seafood paradise. Ranked as one of the 10 coolest streets in the world for 2025 by Time Out.',
  'Hải sản tươi sống (Seafood)', 
  'Đây là điểm quét QR code để bắt đầu tour thuyết minh tự động.',
  '17:00-23:00'
);

-- 2. Ốc Vũ
INSERT INTO pois (
  lat, lng, radius, priority,
  name_vi, name_en,
  description_vi, description_en,
  signature_dish, fun_fact, estimated_hours
) VALUES (
  10.761518431027818, 106.70271542519974, 50, 7,
  'Ốc Vũ', 'Vu Snails',
  'Nằm tại 37 Vĩnh Khánh, quán thu hút đông đảo giới trẻ bởi thực đơn đa dạng và giá cả cực kỳ bình dân. Các món nướng tại đây luôn nóng hổi và đậm đà.', 
  'Located at 37 Vinh Khanh, this spot attracts many youngsters with its diverse menu and very affordable prices. The grilled dishes here are always hot and flavorful.',
  'Ốc xào bơ tỏi, Hải sản nướng',
  'Giá cực mềm, phù hợp cho học sinh sinh viên.',
  '15:00-00:00'
);

-- 3. Ốc Thảo
INSERT INTO pois (
  lat, lng, radius, priority,
  name_vi, name_en,
  description_vi, description_en,
  signature_dish, fun_fact, estimated_hours
) VALUES (
  10.761795162597451, 106.70239298897182, 50, 7,
  'Ốc Thảo', 'Thao Snails',
  'Địa chỉ 383 Vĩnh Khánh. Quán nổi tiếng với không gian rộng rãi, sạch sẽ và cách chế biến món ăn cầu kỳ, giữ được độ ngọt tự nhiên của hải sản.', 
  'Located at 383 Vinh Khanh. Famous for its spacious and clean area. The cooking techniques are meticulous, preserving the natural sweetness of the seafood.',
  'Ốc len xào dừa, Sò điệp nướng mỡ hành',
  'Thực đơn phong phú với hơn 30 loại ốc khác nhau.',
  '14:00-23:00'
);

-- 4. Ốc Sáu Nở
INSERT INTO pois (
  lat, lng, radius, priority,
  name_vi, name_en,
  description_vi, description_en,
  signature_dish, fun_fact, estimated_hours
) VALUES (
  10.761038078500885, 106.70290444809687, 50, 8,
  'Ốc Sáu Nở', 'Sau No Snails',
  'Tọa lạc tại khu vực 121-128 Vĩnh Khánh, đây là một trong những quán ốc vỉa hè đời đầu với không gian sôi động, đậm chất đường phố Sài Gòn.', 
  'Situated at 121-128 Vinh Khanh, this is one of the original sidewalk snail stalls with a vibrant atmosphere, quintessential of Saigon street style.',
  'Nghêu hấp sả, Ốc hương rang muối',
  'Tươi ngon và náo nhiệt là những từ khóa khi nhắc đến Sáu Nở.',
  '16:00-23:30'
);

-- 5. Ốc Oanh (quán huyền thoại)
INSERT INTO pois (
  lat, lng, radius, priority,
  name_vi, name_en,
  description_vi, description_en,
  signature_dish, fun_fact, estimated_hours
) VALUES (
  10.760848629826567, 106.7032957744219, 60, 9,
  'Ốc Oanh', 'Oanh Snails',
  'Quán lão làng với tuổi đời hơn 20 năm tại 534 Vĩnh Khánh. Nổi tiếng nhất với các món ốc sốt bơ tỏi và đặc biệt được vinh danh trong danh mục Bib Gourmand của Michelin.', 
  'A legendary spot with over 20 years of history at 534 Vinh Khanh. Most famous for its butter garlic sauce and specially honored in the Michelin Bib Gourmand list.',
  'Ốc hương xào bơ tỏi, Ốc bươu nướng phô mai',
  'Đứng đầu danh sách những quán phải thử khi đến Vĩnh Khánh.',
  '15:00-23:00'
);

-- 6. A Fat Hot Pot
INSERT INTO pois (
  lat, lng, radius, priority,
  name_vi, name_en,
  description_vi, description_en,
  signature_dish, fun_fact, estimated_hours
) VALUES (
  10.760806933075282, 106.70347875218654, 50, 6,
  'A Fat Hot Pot', 'A Fat Hot Pot',
  'Nằm tại 668 Vĩnh Khánh, quán chuyên về lẩu và nướng tự chọn. Không gian rộng thoáng, rất phù hợp cho những buổi tụ tập nhóm đông người.', 
  'Located at 668 Vinh Khanh, specialized in self-selected hot pot and BBQ. The spacious and airy environment makes it ideal for large group gatherings.',
  'Lẩu hải sản, Hào sữa nướng',
  'Phong cách buffet tại bàn rất được ưa chuộng.',
  '16:00-23:00'
);

-- 7. Chilli Lẩu Nướng Tự Chọn
INSERT INTO pois (
  lat, lng, radius, priority,
  name_vi, name_en,
  description_vi, description_en,
  signature_dish, fun_fact, estimated_hours
) VALUES (
  10.760794431975599, 106.7036590681073, 50, 6,
  'Chilli Lẩu Nướng Tự Chọn', 'Chilli BBQ & Hot Pot',
  'Địa chỉ 232 Vĩnh Khánh. Đây là điểm đến quen thuộc của giới trẻ với các món lẩu nướng đa dạng, từ hải sản đến thịt bò Mỹ cao cấp.', 
  'Address: 232 Vinh Khanh. A popular destination for youngsters, offering a variety of BBQ and hot pot dishes from seafood to premium US beef.',
  'Lẩu nướng hải sản, Bò Mỹ nướng',
  'Gia vị ướp đậm đà là đặc trưng riêng của Chilli.',
  '16:00-00:00'
);

-- 8. Alo Quán – Seafood & Beer
INSERT INTO pois (
  lat, lng, radius, priority,
  name_vi, name_en,
  description_vi, description_en,
  signature_dish, fun_fact, estimated_hours
) VALUES (
  10.761127163188009, 106.70475425408135, 50, 7,
  'Alo Quán – Seafood & Beer', 'Alo Quan - Seafood & Beer',
  'Tọa lạc tại 333 Vĩnh Khánh, Alo Quán mang phong cách hiện đại, chill, phù hợp cho những buổi nhậu đêm thoải mái bên gia đình và bạn bè.', 
  'Located at 333 Vinh Khanh, Alo Quan offers a modern, chill style, perfect for late-night drinking and relaxing with family and friends.',
  'Tôm sốt Thái, Nghêu hấp sả',
  'Không gian mở rất thoáng và view ngắm phố cực đẹp.',
  '15:00-01:00'
);

-- 9. Ốc Đào 2
INSERT INTO pois (
  lat, lng, radius, priority,
  name_vi, name_en,
  description_vi, description_en,
  signature_dish, fun_fact, estimated_hours
) VALUES (
  10.761347965170131, 106.70496784739889, 50, 8,
  'Ốc Đào 2', 'Dao Snails 2',
  'Chi nhánh nổi tiếng tại 232/123 Vĩnh Khánh. Ốc Đào nổi danh nhờ nước chấm đặc trưng và thực đơn phong phú với hơn 30 cách chế biến khác nhau.', 
  'A famous branch at 232/123 Vinh Khanh. Dao Snails is renowned for its signature dipping sauce and a rich menu with over 30 different cooking styles.',
  'Ốc sốt trứng muối, Ốc me',
  'Thương hiệu ốc top đầu Sài Gòn nay đã có mặt tại Vĩnh Khánh.',
  '12:00-22:00'
);

-- 10. Lãng Quán
INSERT INTO pois (
  lat, lng, radius, priority,
  name_vi, name_en,
  description_vi, description_en,
  signature_dish, fun_fact, estimated_hours
) VALUES (
  10.761149988188182, 106.70538401196282, 50, 6,
  'Lãng Quán', 'Lang Quan',
  'Nằm ở đoạn giữa phố (khu vực 500-600), Lãng Quán là lựa chọn tuyệt vời cho các nhóm nhậu với menu lẩu nướng và hải sản vô cùng đa dạng.', 
  'Located in the middle of the street (area 500-600), Lang Quan is a great choice for drinking groups with an extremely diverse BBQ and seafood menu.',
  'Lẩu hải sản nướng, Bạch tuộc nướng',
  'Giá cả ổn định và phục vụ nhanh nhẹn.',
  '16:00-00:00'
);

-- 11. Ớt Xiêm Quán
INSERT INTO pois (
  lat, lng, radius, priority,
  name_vi, name_en,
  description_vi, description_en,
  signature_dish, fun_fact, estimated_hours
) VALUES (
  10.761185236052697, 106.70570361039157, 50, 7,
  'Ớt Xiêm Quán', 'Ot Xiem Quan',
  'Nằm tại 568 Vĩnh Khánh, quán nổi bật với các món hải sản được chế biến cầu kỳ theo phong cách riêng, không chỉ giới hạn ở các món ốc.', 
  'Located at 568 Vinh Khanh, this place stands out with elaborately prepared seafood dishes in its own style, not just limited to snail dishes.',
  'Cá diêu hồng rang muối Hồng Kông, Tôm sú mù tạt',
  'Điểm đến cho những ai thích khám phá hương vị hải sản mới lạ.',
  '16:00-23:00'
);

-- 12. Bún Cá Châu Đốc Dì Tư
INSERT INTO pois (
  lat, lng, radius, priority,
  name_vi, name_en,
  description_vi, description_en,
  signature_dish, fun_fact, estimated_hours
) VALUES (
  10.761123552506971, 106.70660690985743, 40, 7,
  'Bún Cá Châu Đốc Dì Tư', 'Di Tu Chau Doc Fish Noodles',
  'Địa chỉ 320/79 Vĩnh Khánh. Quán mang hương vị bún cá miền Tây đặc trưng với nước dùng thanh ngọt từ cá và nghệ. Một sự thay đổi khẩu vị tuyệt vời sau các món nướng.', 
  'Address: 320/79 Vinh Khanh. The stall brings the typical Western fish noodle flavor with a clear, sweet broth made from fish and turmeric. A great change of pace after grilled dishes.',
  'Bún cá đặc biệt, Bún mực',
  'Có phục vụ cả buổi sáng sớm cho khách ghé phố.',
  '06:00-21:00'
);
