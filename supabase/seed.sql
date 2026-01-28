-- Seed Data: Sample POIs for Vĩnh Khánh Food Street (Real Data)
-- Description: 12 specific POIs from the start to the end of Vĩnh Khánh street, District 4, HCMC
-- Created: 2026-01-27
-- Context: Premium content enriched with research data (Time Out 2025, Michelin Guide, Local Reviews)

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
  'Cổng chào Phố Ẩm thực Vĩnh Khánh', 'Vinh Khanh Food Street Entrance',
  'Chào mừng bạn đến với Phố Ẩm thực Vĩnh Khánh – "thiên đường không ngủ" của Quận 4. Ngay khi bước qua cổng chào này, bạn sẽ cảm nhận được ngay nhịp sống hối hả, rực rỡ và đầy mê hoặc của Sài Gòn về đêm. Được tạp chí danh tiếng Time Out vinh danh là một trong những đường phố thú vị nhất thế giới năm 2025, Vĩnh Khánh không chỉ là nơi để ăn, mà là một sân khấu văn hóa sống động. Dưới ánh đèn neon chớp nháy và làn khói bếp thơm lừng mùi bơ tỏi, hành phi, hàng chục quán ốc, lẩu, nướng đang chờ đợi bạn khám phá. Hãy hít một hơi thật sâu, để mùi hương của biển cả và than hoa dẫn lối bạn vào cuộc hành trình vị giác đầy kịch tính này.', 
  'Welcome to Vinh Khanh Food Street – District 4s "sleepless paradise". As soon as you step through this gateway, you will feel the hustle, vibrancy, and enchanting rhythm of Saigon by night. Honored by Time Out magazine as one of the worlds coolest streets in 2025, Vinh Khanh is not just a place to eat, but a living cultural stage. Under flashing neon lights and amid the fragrant smoke of garlic butter and fried shallots, dozens of snail, hotpot, and BBQ stalls await. Take a deep breath, and let the scent of the ocean and charcoal guide you on this dramatic culinary journey.',
  'Không khí lễ hội đường phố (Street Festival Atmosphere)', 
  'Được Time Out bình chọn là một trong những con phố thú vị nhất thế giới năm 2025.',
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
  'Ngay tại số 37 Vĩnh Khánh là Ốc Vũ, một cái tên được ví như "biểu tượng bình dân" của con phố này với hơn một thập kỷ đỏ lửa. Không hào nhoáng, cầu kỳ, Ốc Vũ chinh phục thực khách bằng sự chân thành trong từng món ăn. Nổi tiếng với nguồn hải sản tươi rói được tuyển chọn mỗi sáng từ chợ đầu mối Bình Điền, quán sở hữu thực đơn khổng lồ với hơn 50 món biến tấu. Điều khiến người ta nhớ mãi về Ốc Vũ chính là thứ nước chấm sốt me "thần thánh" – chua thanh, cay nhẹ, quện chặt vào từng con ốc, tạo nên một bản giao hưởng vị giác khó quên. Đây là điểm đến lý tưởng để bạn cảm nhận không khí nhậu đúng chất Sài Gòn: ồn ào, náo nhiệt và cực kỳ sảng khoái.', 
  'Located at 37 Vinh Khanh is Vu Snails, often hailed as the "affordable icon" of this street with over a decade of history. Without pomp or circumstance, Vu Snails wins diners over with sincerity in every dish. Famous for fresh seafood selected every morning from Binh Dien wholesale market, the shop boasts a massive menu with over 50 variations. What makes people remember Vu Snails is their "divine" tamarind dipping sauce – tangy, slightly spicy, clinging to every snail, creating an unforgettable symphony of flavors. This is the ideal spot to experience the true Saigon drinking atmosphere: loud, bustling, and incredibly refreshing.',
  'Ốc hương rang muối ớt, Sò điệp nướng mỡ hành',
  'Nước sốt me tại đây được xem là bí truyền, tạo nên thương hiệu riêng biệt.',
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
  'Bước đến số 383, bạn sẽ tìm thấy Ốc Thảo – một nốt trầm tinh tế giữa bản nhạc rock sôi động của Vĩnh Khánh. Khác với vẻ xô bồ thường thấy, Ốc Thảo chú trọng vào không gian rộng rãi, thoáng đãng và sạch sẽ, mang đến cảm giác thư thái hơn cho thực khách. Triết lý ẩm thực tại đây là tôn vinh vị ngọt tự nhiên của nguyên liệu. Món "Ốc len xào dừa" ở đây được đánh giá là cực phẩm với phần nước cốt dừa béo ngậy, đậm đà nhưng không hề gây ngán, hay món "Sò điệp nướng mỡ hành" với từng thớ thịt sò trắng ngần, mọng nước, thơm lừng mùi hành phi giòn rụm. Ốc Thảo là lựa chọn hoàn hảo cho những ai muốn thưởng thức hải sản ngon trong một không gian chỉn chu hơn.', 
  'Arriving at number 383, you will find Thao Snails – a subtle note amidst the rock anthem of Vinh Khanh. Unlike the usual hustle, Thao Snails focuses on a spacious, airy, and clean space, offering a more relaxed vibe. The culinary philosophy here honors the natural sweetness of ingredients. The "Mud creeper snails in coconut milk" is considered a masterpiece with rich, creamy coconut sauce that never cloys, or the "Grilled scallops with scallion oil" featuring plump, juicy scallop meat fragrant with crispy fried shallots. Thao Snails is the perfect choice for those seeking great seafood in a more polished setting.',
  'Ốc len xào dừa, Mì xào ốc giác',
  'Quán nổi tiếng với cách chế biến giữ trọn độ ngọt tự nhiên của hải sản.',
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
  'Tọa lạc tại khu vực 128 Vĩnh Khánh, Ốc Sáu Nở là hiện thân của văn hóa ốc vỉa hè Sài Gòn nguyên bản. Những chiếc bàn nhựa thấp, tiếng cười nói rôm rả, tiếng vỏ ốc lách cách tạo nên một bầu không khí không thể trộn lẫn. Sáu Nở nổi tiếng với các món ốc được tẩm ướp đậm đà, "bắt mồi" cực đỉnh. Đặc biệt, món Ốc hương sốt trứng muối ở đây là một huyền thoại: sốt trứng muối vàng ươm, béo bùi, mặn ngọt hài hòa, chấm kèm một mẩu bánh mì giòn tan thì không còn gì bằng. Đến Sáu Nở không chỉ để ăn, mà là để hòa mình vào dòng chảy văn hóa đường phố đầy sức sống.', 
  'Located at 128 Vinh Khanh, Sau No Snails embodies the original Saigon sidewalk snail culture. Low plastic tables, roaring laughter, and the clatter of snail shells create an unmistakable atmosphere. Sau No is famous for intensely marinated dishes that are perfect for drinking. Especially, the "Salted egg yolk sweet snails" here is legendary: golden, rich, savory-sweet sauce that pairs perfectly with a piece of crispy bread. Coming to Sau No is not just about eating, but immersing yourself in the vibrant flow of street culture.',
  'Ốc hương sốt trứng muối, Nghêu hấp sả',
  'Một trong những quán vỉa hè đời đầu, giữ trọn vẹn hồn cốt của phố ốc.',
  '16:00-02:30'
);

-- 5. Ốc Oanh (Michelin Bib Gourmand)
INSERT INTO pois (
  lat, lng, radius, priority,
  name_vi, name_en,
  description_vi, description_en,
  signature_dish, fun_fact, estimated_hours
) VALUES (
  10.760848629826567, 106.7032957744219, 60, 9,
  'Ốc Oanh', 'Oanh Snails',
  'Đây chính là "ngôi sao sáng nhất" của bầu trời Vĩnh Khánh – Ốc Oanh, quán ốc vinh dự được Michelin Guide trao tặng danh hiệu Bib Gourmand năm 2024. Với lịch sử hơn 20 năm, từ một gánh hàng rong nhỏ bé vươn lên thành thương hiệu quốc tế, Ốc Oanh là minh chứng cho sức hấp dẫn của ẩm thực Việt. Món ăn làm nên tên tuổi của quán là "Ốc hương xào bơ tỏi": những con ốc to, chắc thịt ngập trong sốt bơ tỏi vàng óng, thơm nức mũi, chấm cùng bánh mì là sự kết hợp hoàn hảo. Dù giá cả có phần nhỉnh hơn mặt bằng chung, nhưng chất lượng thượng hạng và danh tiếng Michelin khiến nơi đây luôn tấp nập du khách trong và ngoài nước xếp hàng chờ đợi.', 
  'This is the "brightest star" of the Vinh Khanh sky – Oanh Snails, the snail shop honored with the Michelin Bib Gourmand title in 2024. With over 20 years of history, rising from a small street stall to an international brand, Oanh Snails is a testament to the allure of Vietnamese cuisine. The dish that made their name is "Sweet snails stir-fried with garlic butter": large, firm snails submerged in golden, aromatic garlic butter sauce, perfectly paired with bread. Although prices are slightly higher than average, the premium quality and Michelin reputation keep domestic and international tourists lining up.',
  'Ốc hương xào bơ tỏi, Càng ghẹ rang muối',
  'Địa điểm duy nhất trên phố được Michelin vinh danh Bib Gourmand 2024.',
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
  'Tại số 668 Vĩnh Khánh, A Fat Hot Pot mở ra một cánh cửa thời gian, đưa bạn lạc vào không gian Hong Kong những năm 80-90 đầy hoài niệm. Với decor mang đậm chất điện ảnh TVB, những bảng hiệu neon rực rỡ và nhạc Hoa xưa cũ, quán tạo nên một trải nghiệm thị giác thú vị. Nhưng "ngôi sao" thực sự nằm ở nồi lẩu. A Fat nổi tiếng với Lẩu Trường Thọ xanh độc đáo và Lẩu Collagen trứ danh – nước dùng thanh ngọt, bổ dưỡng, được ninh kỹ từ xương. Mô hình lẩu tự chọn với quầy sốt pha chế theo sở thích giúp bạn làm chủ bữa tiệc vị giác của mình. Một nốt chấm phá hiện đại và phong cách giữa lòng phố ốc truyền thống.', 
  'At 668 Vinh Khanh, A Fat Hot Pot opens a time portal, transporting you to the nostalgic atmosphere of 1980s-90s Hong Kong. With TVB-cinema style decor, vibrant neon signs, and old Chinese music, the shop creates an exciting visual experience. But the real "star" lies in the hot pot. A Fat is famous for its unique Green Longevity Hot Pot and renowned Collagen Hot Pot – offering clear, nutritious broth slow-cooked from bones. The self-service model with a DIY sauce station lets you master your flavor feast. A modern, stylish accent in the heart of the traditional snail street.',
  'Lẩu Trường Thọ (xanh), Lẩu Collagen',
  'Không gian check-in đậm chất Hong Kong retro cực chất.',
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
  'Chilli tại 232 Vĩnh Khánh là thiên đường dành cho giới trẻ và những tín đồ mê đồ nướng tự chọn. Quán mang đến sự phóng khoáng, tự do với mô hình buffet tại bàn hoặc gọi món linh hoạt. Thực đơn ở đây là một cuộc diễu hành của protein: từ bò Mỹ cuộn nấm, ba chỉ heo sốt BBQ đến các loại hải sản tươi rói. Đừng bỏ qua món "Lẩu Hàu Kimchi" trứ danh – sự kết hợp táo bạo giữa vị chua cay nồng nàn của kim chi Hàn Quốc và vị ngọt béo, mọng nước của hàu sữa Việt Nam. Một địa điểm lý tưởng để tụ tập nhóm bạn, "nhậu" tới bến với chi phí cực kỳ hợp lý.', 
  'Chilli at 232 Vinh Khanh is a paradise for youngsters and fans of DIY BBQ. The place offers a sense of freedom with its flexible table buffet or a la carte model. The menu is a parade of protein: from mushroom-wrapped US beef, pork belly with BBQ sauce to fresh seafood. Dont miss the famous "Kimchi Oyster Hotpot" – a bold combination of the spicy-sour kick of Korean kimchi and the rich, juicy sweetness of Vietnamese milk oysters. An ideal spot for group gatherings to drink to your heart''s content at a very reasonable cost.',
  'Lẩu hàu Kimchi, Sụn gà trứng muối',
  'Điểm hẹn yêu thích của giới trẻ nhờ giá "hạt dẻ" và món ăn bắt trend.',
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
  'Tọa lạc tại 333 Vĩnh Khánh, Alo Quán mang đến một làn gió hiện đại và "chill" hơn cho con phố. Không gian mở thoáng đãng, thiết kế trẻ trung, nơi đây phù hợp cho những cuộc vui xuyên đêm. Thực đơn của Alo Quán là sự giao thoa thú vị giữa ẩm thực Việt và Thái. Món "Tôm sốt Thái" ở đây được đánh giá cực cao với vị chua cay xé lưỡi, tôm tươi giòn sần sật, đánh thức mọi giác quan. Hay món "Nghêu hấp sả" thanh tao, giải nhiệt cực tốt sau vài ly bia lạnh. Alo Quán là định nghĩa hoàn hảo cho văn hóa "nhậu văn minh" và sành điệu của giới trẻ Sài Thành.', 
  'Located at 333 Vinh Khanh, Alo Quan brings a modern, "chiller" breeze to the street. With open, airy space and youthful design, it fits perfectly for all-night parties. Alo Quan''s menu is an interesting intersection of Vietnamese and Thai cuisine. The "Thai-style raw shrimp" here is highly rated with its tongue-searing sour-spicy taste and crunchy fresh shrimp, awakening every sense. Or the elegant "Lemongrass steamed clams", perfect for cooling down after a few cold beers. Alo Quan perfectly defines the "civilized" and stylish drinking culture of Saigon youth.',
  'Tôm sống sốt Thái, Bạch tuộc nướng',
  'Không gian mở rất thoáng, lý tưởng để ngắm nhìn phố phường về đêm.',
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
  'Là chi nhánh của thương hiệu Ốc Đào lừng danh Sài Gòn, tọa lạc tại hẻm 232 nhưng mặt tiền hướng ra Vĩnh Khánh, quán là điểm dừng chân của những thực khách sành ăn. Ốc Đào 2 kế thừa trọn vẹn tinh hoa của người chị cả, đặc biệt là nghệ thuật chế biến gia vị đỉnh cao. Món "Răng mực xào bơ tỏi" ở đây là một tuyệt phẩm: những viên răng mực giòn sần sật, ngập trong sốt bơ tỏi thơm lừng, ăn kèm bánh mì nóng giòn là "quên lối về". Hay "Ốc móng tay xào me" với vị chua thanh tinh tế, không gắt, làm nổi bật vị ngọt của ốc. Đến Ốc Đào 2 là đến để thưởng thức sự tinh tế trong từng loại nước sốt.', 
  'A branch of the famous Dao Snails brand in Saigon, located in alley 232 but facing Vinh Khanh, this shop is a stop for gourmet diners. Dao Snails 2 inherits all the essence of the original, especially the mastery of seasoning. The "Stir-fried squid teeth with garlic butter" here is a masterpiece: crunchy squid teeth submerged in aromatic garlic butter sauce, served with hot crispy bread, makes you "forget the way home". Or the "Razor clams with tamarind" with a refined, subtle sourness that highlights the sweetness of the clam. Visiting Dao Snails 2 is visiting to savor the sophistication in every sauce.',
  'Răng mực xào bơ tỏi, Ốc móng tay xào me',
  'Nổi tiếng với các loại sốt xào ốc đậm đà, chuẩn vị Sài Gòn xưa.',
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
  'Nằm ở đoạn giữa phố, Lãng Quán nổi bật với quy mô "khủng" khi sở hữu hai mặt bằng đối diện nhau, lúc nào cũng tấp nập khách ra vào. Đây là "đại bản doanh" của những buổi tiệc tùng đông đúc. Thực đơn của Lãng Quán trải dài từ rừng xuống biển, nhưng "best-seller" phải kể đến "Giò heo muối chiên giòn" – lớp da giòn rụm, thịt bên trong mềm mọng, chấm cùng tương ớt xí muội chua ngọt. Bên cạnh đó, các món nướng tại bàn và lẩu hải sản cũng là thế mạnh nhờ độ tươi ngon và tẩm ướp vừa miệng. Lãng Quán là minh chứng cho sự hào sảng và hiếu khách của người dân Quận 4.', 
  'Located in the middle of the street, Lang Quan stands out with its "massive" scale, occupying two facing premises, always bustling with customers. This is the "headquarters" for crowded parties. Lang Quan''s menu spans from the forest to the sea, but the "best-seller" must be the "Deep-fried salted pork hock" – crispy skin, juicy meat inside, dipped in sweet and sour plum chili sauce. Besides, table-side BBQ and seafood hotpots are also strengths thanks to freshness and balanced seasoning. Lang Quan is a testament to the generosity and hospitality of District 4 people.',
  'Giò heo muối chiên giòn, Lẩu hải sản',
  'Quán mở xuyên đêm đến 4 giờ sáng, cứu cánh cho những "cú đêm".',
  '16:00-04:00'
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
  'Tại số 568 Vĩnh Khánh, Ớt Xiêm Quán mang đến một trải nghiệm vị giác bùng nổ đúng như tên gọi. Quán chuyên trị các món nướng và đặc sản với phong cách chế biến đậm đà, cay nồng kích thích. Món "Ếch nướng muối ớt" là ngôi sao sáng: thịt ếch chắc nịch, da giòn, thấm đẫm muối ớt cay xè, ăn vào là xuýt xoa nhưng không thể dừng lại. Ngoài ra, "Chẳng dừng nướng" (phần thịt heo quý hiếm) cũng là món mồi bén được dân nhậu săn đón. Không gian vỉa hè thoáng mát, gió sông thổi vào lồng lộng, Ớt Xiêm Quán là nơi lý tưởng để "cụng ly" và thưởng thức những món mồi độc đáo, lạ miệng.', 
  'At 568 Vinh Khanh, Ot Xiem Quan offers an explosive taste experience just like its name (Bird''s Eye Chili). The shop specializes in grilled dishes and specialties with intense, spicy preparation styles that stimulate the senses. The "Grilled frog with chili salt" is the bright star: firm meat, crispy skin, soaked in fiery chili salt, making you hiss with heat but unable to stop. In addition, "Grilled pork jowl/diaphragm" (a rare cut of pork) is also a top snack sought after by drinkers. With airy sidewalk space and river breeze blowing in, Ot Xiem Quan is the ideal place to "clink glasses" and enjoy unique, exotic snacks.',
  'Ếch nướng muối ớt, Chẳng dừng nướng',
  'Chuyên các món "mồi độc lạ" và hương vị cay nồng kích thích.',
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
  'Nằm lặng lẽ tại 320/79 (hoặc đoạn cuối phố), Bún Cá Dì Tư là nốt kết thanh bình cho hành trình ẩm thực Vĩnh Khánh. Mang trọn vẹn hương vị miền Tây Nam Bộ lên Sài Gòn, tô bún cá ở đây vàng ươm màu nghệ, nước dùng thanh ngọt nấu từ cá lóc đồng và ngải bún, không hề tanh mà thơm dịu. Đặc biệt không thể thiếu bông điên điển - loài hoa đặc trưng của mùa nước nổi, tạo nên vị nhẫn nhẹ, giòn giòn thú vị. Sau một buổi tối "oanh tạc" với các món nướng nhiều dầu mỡ, một tô bún cá thanh đạm, nóng hổi của Dì Tư chính là liều thuốc giải ngấy tuyệt vời nhất, làm ấm lòng những thực khách về khuya.', 
  'Quietly located at 320/79 (or the end of the street), Di Tu Fish Noodles is a peaceful finale to the Vinh Khanh culinary journey. Bringing the full flavor of the Southwestern Mekong Delta to Saigon, the fish noodle bowl here is golden with turmeric, featuring a clear, sweet broth cooked from snakehead fish and fingerroot, mild and fragrant without fishiness. Especially indispensable is "Sesbania sesban" (River hemp flower) - the signature flower of the flooding season, adding a delightful slight bitterness and crunch. After a night of "bombarding" greasy grilled dishes, a light, steaming bowl of Di Tu''s fish noodles is the best antidote, warming the hearts of late-night diners.',
  'Bún cá Châu Đốc, Đầu cá lóc',
  'Món ăn giải ngấy hoàn hảo sau khi thưởng thức hải sản nướng.',
  '06:00-21:00'
);
