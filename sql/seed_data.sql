DELETE FROM Feedings;
DELETE FROM Animals;
DELETE FROM Diet_Components;
DELETE FROM Diets;
DELETE FROM Feed_Items;
DELETE FROM Species;
ALTER TABLE Animals AUTO_INCREMENT = 1;
ALTER TABLE Diets AUTO_INCREMENT = 1;
ALTER TABLE Feed_Items AUTO_INCREMENT = 1;
ALTER TABLE Species AUTO_INCREMENT = 1;

INSERT INTO Species (species_name, base_notes) VALUES
('Bos Taurus (Dairy Cow)', 'Requires high energy and protein for lactation, balanced with fiber.'),
('Sus Scrofa Domesticus (Pig)', 'Needs high-quality protein for lean growth and efficient feed conversion.'),
('Gallus Gallus Domesticus (Laying Hen)', 'Requires high calcium for shell quality and balanced energy.');

INSERT INTO Feed_Items (feed_name, manufacturer, cost_per_kg, calories_per_kg, protein_percentage, fat_percentage, fiber_percentage, calcium_mg_per_kg) VALUES
('Corn Silage', 'Farm Grown', 0.15, 2000.00, 8.00, 2.00, 35.00, 50.00),         -- Feed ID 1
('Alfalfa Hay (Dry)', 'Local Bales', 0.25, 1800.00, 18.00, 3.00, 30.00, 1200.00),  -- Feed ID 2
('Soybean Meal (48%)', 'AgriProtein Corp', 0.75, 3400.00, 48.00, 1.00, 3.00, 100.00), -- Feed ID 3
('Hog Grower Pellet', 'SwineFeeds', 0.40, 3500.00, 18.00, 5.00, 5.00, 800.00),   -- Feed ID 4
('Layer Crumble High Cal', 'PoultryGold', 0.55, 2900.00, 16.00, 4.00, 6.00, 40000.00); -- Feed ID 5

INSERT INTO Diets (diet_id, diet_name, total_ration_size_kg, ration_size_kg, feeding_frequency, notes) VALUES
(1, 'Lactating Dairy Cow TMR', 60.00, 30.00, 2, 'Total Mixed Ration, fed twice daily.'), -- Total 60kg
(2, 'Pig Grower (40kg - 80kg)', 2.50, 1.25, 2, 'Pellet diet for rapid growth phase.'), -- Total 2.5kg
(3, 'Laying Hen Maintenance', 0.12, 0.06, 2, 'Small, highly dense ration, high calcium.'); -- Total 0.12kg

-- Diet 1: Lactating Dairy Cow TMR (60.00 kg total)
-- 60% Corn Silage, 30% Alfalfa Hay, 10% Soybean Meal
INSERT INTO Diet_Components (diet_id, feed_id, percentage_in_diet) VALUES
(1, 1, 60.00),
(1, 2, 30.00),
(1, 3, 10.00);

-- Diet 2: Pig Grower (2.50 kg total)
-- 90% Hog Grower Pellet, 10% Soybean Meal (as protein boost)
INSERT INTO Diet_Components (diet_id, feed_id, percentage_in_diet) VALUES
(2, 4, 90.00),
(2, 3, 10.00);

-- Diet 3: Laying Hen Maintenance (0.12 kg total)
-- 100% Layer Crumble High Cal
INSERT INTO Diet_Components (diet_id, feed_id, percentage_in_diet) VALUES
(3, 5, 100.00);

INSERT INTO Animals (animal_name, birth_date, gender, weight_kg, species_id, current_diet_id) VALUES
('Bessie', '2022-04-15', 'Female', 650.00, 1, 1),      -- Species 1 (Cow), Diet 1
('Porky', '2024-05-01', 'Male', 55.20, 2, 2),       -- Species 2 (Pig), Diet 2
('Henrietta', '2023-08-20', 'Female', 1.80, 3, 3);   -- Species 3 (Chicken), Diet 3


-- Mock Data for Medical_Exams 🩺
-- Animal 101: Routine Checkup
INSERT INTO Medical_Exams (animal_id, exam_date, veterinarian, exam_notes, weight_kg, temperature_c) VALUES
(1, '2025-10-01 09:30:00', 'Dr. Alistair P.', 'Routine annual physical exam. Alert and responsive. Minor teeth wear noted.', 650.50, 38.50);

-- Animal 102: Sick Visit
INSERT INTO Medical_Exams (animal_id, exam_date, veterinarian, exam_notes, weight_kg, temperature_c) VALUES
(2, '2025-10-15 14:00:00', 'Dr. Evelyn Reed', 'Presenting with lethargy and decreased appetite. Elevated temperature. Blood drawn for lab work.', 420.10, 39.80);

-- Animal 103: Follow-up/Vaccination
INSERT INTO Medical_Exams (animal_id, exam_date, veterinarian, exam_notes, weight_kg, temperature_c) VALUES
(3, '2025-09-20 11:00:00', 'Dr. Alistair P.', 'Booster vaccinations administered (Rabies, Distemper). Healthy weight gain.', 75.20, 37.90);

-- Animal 101: Follow-up for teeth wear
INSERT INTO Medical_Exams (animal_id, exam_date, veterinarian, exam_notes, weight_kg, temperature_c) VALUES
(1, '2025-10-22 10:00:00', 'Dr. Alistair P.', 'Minor dental float performed. Post-procedure check good.', 649.90, 38.30);


-- Mock Data for Diagnostic_Results 🔬

-- Results linked to Exam ID 2 (Animal 102 - Sick Visit)
INSERT INTO Diagnostic_Results (exam_id, animal_id, test_name, test_date, result_value, units, reference_range, notes) VALUES
(2, 2, 'Complete Blood Count (CBC)', '2025-10-15 16:30:00', 'High WBC, Low RBC', NULL, 'WBC 5-10, RBC 3-5', 'Indicates a possible infection or inflammation.'),
(2, 2, 'Blood Glucose', '2025-10-15 16:30:00', '85', 'mg/dL', '70-110', 'Within normal limits.');

-- Standalone result (imported lab work for Animal 103)
INSERT INTO Diagnostic_Results (exam_id, animal_id, test_name, test_date, result_value, units, reference_range, notes) VALUES
(NULL, 3, 'Fecal Parasite Screen', '2025-10-10 10:00:00', 'Negative', NULL, 'Negative', 'No parasites or eggs detected.');

-- Standalone result for Animal 101 (Genetic marker test)
INSERT INTO Diagnostic_Results (exam_id, animal_id, test_name, test_date, result_value, units, reference_range, notes) VALUES
(NULL, 1, 'Genetic Marker X', '2025-09-15 08:00:00', 'Positive', NULL, 'Negative', 'Carrier for Genetic Marker X.');

-- Switch to the 'map' database for creating and inserting data
USE map;

-- Clear existing data
DELETE FROM Alerts;
DELETE FROM Locations;
ALTER TABLE Locations AUTO_INCREMENT = 1;
ALTER TABLE Alerts AUTO_INCREMENT = 1;

-- Mock Data for Locations 📍 (Updated with recent timestamps for live tracking)
-- Using NOW() and recent intervals to ensure live tracking works

-- Animal 1 (Bessie - Dairy Cow): Recent movement pattern
INSERT INTO Locations (animal_id, location_timestamp, latitude, longitude, speed, location_status) VALUES
(1, DATE_SUB(NOW(), INTERVAL 45 MINUTE), 34.0522350, -118.2436830, 0.8, 'normal'),  -- 45 min ago - grazing
(1, DATE_SUB(NOW(), INTERVAL 30 MINUTE), 34.0522400, -118.2436900, 1.2, 'normal'),  -- 30 min ago - moving
(1, DATE_SUB(NOW(), INTERVAL 15 MINUTE), 34.0522450, -118.2436950, 0.5, 'normal'),  -- 15 min ago - slow
(1, DATE_SUB(NOW(), INTERVAL 5 MINUTE), 34.0522500, -118.2437000, 0.0, 'inactive'), -- 5 min ago - resting
(1, NOW(), 34.0522500, -118.2437000, 0.2, 'normal');                                -- Current - slight movement

-- Animal 2 (Porky - Pig): Active movement pattern
INSERT INTO Locations (animal_id, location_timestamp, latitude, longitude, speed, location_status) VALUES
(2, DATE_SUB(NOW(), INTERVAL 60 MINUTE), 34.0530000, -118.2440000, 2.5, 'normal'),   -- 1 hour ago
(2, DATE_SUB(NOW(), INTERVAL 40 MINUTE), 34.0532000, -118.2442000, 5.2, 'normal'),   -- 40 min ago
(2, DATE_SUB(NOW(), INTERVAL 25 MINUTE), 34.0535000, -118.2445000, 8.1, 'normal'),   -- 25 min ago
(2, DATE_SUB(NOW(), INTERVAL 10 MINUTE), 34.0538000, -118.2448000, 15.5, 'running'), -- 10 min ago - running
(2, NOW(), 34.0540000, -118.2450000, 3.2, 'normal');                                 -- Current - slowing down

-- Animal 3 (Henrietta - Chicken): Small area movement
INSERT INTO Locations (animal_id, location_timestamp, latitude, longitude, speed, location_status) VALUES
(3, DATE_SUB(NOW(), INTERVAL 50 MINUTE), 34.0510000, -118.2420000, 0.3, 'normal'),   -- 50 min ago
(3, DATE_SUB(NOW(), INTERVAL 35 MINUTE), 34.0510050, -118.2420050, 0.8, 'normal'),   -- 35 min ago
(3, DATE_SUB(NOW(), INTERVAL 20 MINUTE), 34.0510020, -118.2420020, 0.1, 'inactive'), -- 20 min ago
(3, DATE_SUB(NOW(), INTERVAL 8 MINUTE), 34.0510030, -118.2420030, 0.0, 'abnormal'),  -- 8 min ago - stuck?
(3, NOW(), 34.0510040, -118.2420040, 0.4, 'normal');                                 -- Current - recovered

-- Mock Data for Alerts 🚨 (Updated with recent timestamps)
-- Alert for Animal 2's running behavior
INSERT INTO Alerts (animal_id, alert_time, behavior_type, location_id, is_resolved, notes) VALUES
(2, DATE_SUB(NOW(), INTERVAL 10 MINUTE), 'High Speed Run', 9, FALSE, 'Pig detected running at high speed. Monitor for stress indicators.'),
(1, DATE_SUB(NOW(), INTERVAL 5 MINUTE), 'Prolonged Inactivity', 4, TRUE, 'Cow was inactive but resumed normal movement. Alert auto-resolved.'),
(3, DATE_SUB(NOW(), INTERVAL 8 MINUTE), 'Abnormal Status', 14, FALSE, 'Chicken showing abnormal GPS readings. Check for equipment malfunction.');

-- Additional recent locations for better tracking simulation
-- More data points for Animal 1 (every 2-3 minutes for the last hour)
INSERT INTO Locations (animal_id, location_timestamp, latitude, longitude, speed, location_status) VALUES
(1, DATE_SUB(NOW(), INTERVAL 62 MINUTE), 34.0522300, -118.2436800, 1.1, 'normal'),
(1, DATE_SUB(NOW(), INTERVAL 58 MINUTE), 34.0522320, -118.2436820, 0.9, 'normal'),
(1, DATE_SUB(NOW(), INTERVAL 52 MINUTE), 34.0522340, -118.2436840, 1.3, 'normal');

-- More data points for Animal 2 (frequent updates)
INSERT INTO Locations (animal_id, location_timestamp, latitude, longitude, speed, location_status) VALUES
(2, DATE_SUB(NOW(), INTERVAL 65 MINUTE), 34.0529000, -118.2439000, 2.1, 'normal'),
(2, DATE_SUB(NOW(), INTERVAL 55 MINUTE), 34.0530500, -118.2440500, 3.8, 'normal'),
(2, DATE_SUB(NOW(), INTERVAL 45 MINUTE), 34.0533000, -118.2443000, 4.2, 'normal');

-- More data points for Animal 3 (small movements)
INSERT INTO Locations (animal_id, location_timestamp, latitude, longitude, speed, location_status) VALUES
(3, DATE_SUB(NOW(), INTERVAL 55 MINUTE), 34.0509980, -118.2419980, 0.2, 'normal'),
(3, DATE_SUB(NOW(), INTERVAL 45 MINUTE), 34.0510010, -118.2420010, 0.5, 'normal'),
(3, DATE_SUB(NOW(), INTERVAL 30 MINUTE), 34.0510035, -118.2420035, 0.3, 'normal');