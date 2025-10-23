const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const router = express.Router();

/**
 * Creates and returns the Express router configured with all animal-related API endpoints.
 * @param {object} connection - The MySQL connection instance.
 * @returns {object} The configured Express router.
 */
module.exports = (connection) => {
    
    // Configure multer for file uploads
    const storage = multer.diskStorage({
        destination: (req, file, cb) => {
            const uploadDir = path.join(__dirname, '..', 'uploads', 'medical');
            // Ensure directory exists
            if (!fs.existsSync(uploadDir)) {
                fs.mkdirSync(uploadDir, { recursive: true });
            }
            cb(null, uploadDir);
        },
        filename: (req, file, cb) => {
            // Generate unique filename: timestamp-originalname
            const timestamp = Date.now();
            const ext = path.extname(file.originalname);
            const basename = path.basename(file.originalname, ext);
            cb(null, `${timestamp}-${basename}${ext}`);
        }
    });

    const upload = multer({
        storage,
        limits: {
            fileSize: 10 * 1024 * 1024 // 10MB limit
        },
        fileFilter: (req, file, cb) => {
            // Allow common medical file types
            const allowedTypes = [
                'image/jpeg', 'image/png', 'image/gif', 'image/bmp',
                'application/pdf',
                'text/plain', 'text/csv',
                'application/msword',
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
            ];
            
            if (allowedTypes.includes(file.mimetype)) {
                cb(null, true);
            } else {
                cb(new Error('File type not allowed. Supported: images, PDF, text, Word documents'));
            }
        }
    });
    
    // Simple utility function to promisify MySQL queries
    const query = (sql, args) => {
        return new Promise((resolve, reject) => {
            connection.query(sql, args, (err, rows) => {
                if (err) return reject(err);
                resolve(rows);
            });
        });
    };

    // GET /api/species
    router.get('/species', (req, res) => {
        const sql = "SELECT species_id, species_name FROM Species ORDER BY species_name ASC";
        
        connection.query(sql, (err, results) => {
            if (err) {
                console.error('Database Error in /api/species:', err);
                return res.status(500).json({ error: 'Database error fetching species' });
            }
            res.json(results);
        });
    });

    // POST add species
    router.post('/species/add', (req, res) => {
        const { species_name, base_notes } = req.body;

        if (!species_name || species_name.trim() === '') {
            return res.status(400).json({ message: 'Species Name is required to add a new species.' });
        }

        const sql = `
            INSERT INTO Species (species_name, base_notes)
            VALUES (?, ?)
        `;

        // base_notes is optional, so we use null if empty
        connection.query(sql, [species_name, base_notes || null], (err, result) => {
            if (err) {
                console.error('Database Error inserting new species:', err);
                // Check for duplicate entry error (assuming species_name is unique)
                if (err.code === 'ER_DUP_ENTRY') {
                     // *** UPDATED ERROR MESSAGE FOR DUPLICATE ***
                     return res.status(409).json({ message: `Species name **'${species_name}'** already exists. Please select it from the list or use a different name.` });
                }
                return res.status(500).json({ message: 'Failed to add species due to a server error.' });
            }

            // Return the newly created ID to the client
            res.status(201).json({ 
                message: 'Species added successfully!', 
                insertId: result.insertId,
                species_name: species_name
            });
        });
    });

    // GET /api/diets
    router.get('/diets', (req, res) => {
        const sql = "SELECT diet_id, diet_name FROM Diets ORDER BY diet_name ASC";
        connection.query(sql, (err, results) => {
            if (err) {
                console.error('Database Error in /api/diets:', err);
                return res.status(500).json({ error: 'Database error fetching diets' });
            }
            res.json(results);
        });
    });

    // POST /api/diets/add
    router.post('/diets/add', async (req, res) => {
        const { diet_name, total_ration_size_kg, ration_size_kg, feeding_frequency, notes, components } = req.body;

        // Basic validation for required fields
        if (!diet_name || !total_ration_size_kg || !ration_size_kg || !feeding_frequency) {
            return res.status(400).json({ message: 'Missing required diet fields (name, total ration, serving size, or frequency).' });
        }
        
        // Transaction start (simplified, assuming auto-commit if no explicit transaction)
        
        try {
            // --- 1. INSERT INTO DIETS ---
            const insertDietQuery = `
                INSERT INTO Diets (diet_name, total_ration_size_kg, ration_size_kg, feeding_frequency, notes) 
                VALUES (?, ?, ?, ?, ?)
            `;
            const dietValues = [
                diet_name, 
                parseFloat(total_ration_size_kg), 
                parseFloat(ration_size_kg), 
                parseInt(feeding_frequency), 
                notes
            ];
            const dietResult = await query(insertDietQuery, dietValues);
            const new_diet_id = dietResult.insertId;

            // --- 2. INSERT INTO DIET_COMPONENTS ---
            const componentInsertPromises = components.map(c => {
                const insertComponentQuery = `
                    INSERT INTO Diet_Components (diet_id, feed_id, percentage_in_diet) 
                    VALUES (?, ?, ?)
                `;
                return query(insertComponentQuery, [new_diet_id, c.feed_id, c.percentage_in_diet]);
            });

            await Promise.all(componentInsertPromises);

            // Success response
            res.status(201).json({ 
                insertId: new_diet_id, 
                diet_name: diet_name,
                message: 'Diet added successfully with components.' 
            });

        } catch (err) {
            console.error('Database Transaction Error in /api/diets/add:', err);
            // Handle duplicate entry during diet insert
            if (err.code === 'ER_DUP_ENTRY') {
                // *** UPDATED ERROR MESSAGE FOR DUPLICATE ***
                return res.status(409).json({ message: `Diet name **'${diet_name}'** already exists. Please select it from the list or use a different name.` });
            }
            return res.status(500).json({ message: 'Database error inserting new diet or components.' });
        }
    });
    
    // GET /api/feeditems
    router.get('/feeditems', (req, res) => {
        const sql = "SELECT feed_id, feed_name FROM Feed_Items ORDER BY feed_name ASC";
        connection.query(sql, (err, results) => {
            if (err) {
                console.error('Database Error in /api/feeditems:', err);
                return res.status(500).json({ error: 'Database error fetching feed items.' });
            }
            res.json(results);
        });
    });

    // GET /api/feeditems/details
    router.get('/feeditems/details', async (req, res) => {
        try {
            // First, get all feed items with their details
            const feedItemsQuery = `
                SELECT 
                    feed_id, feed_name, manufacturer, cost_per_kg,
                    calories_per_kg, protein_percentage, fat_percentage,
                    fiber_percentage, calcium_mg_per_kg
                FROM Feed_Items
                ORDER BY feed_name ASC
            `;
            
            const feedItems = await query(feedItemsQuery);
            
            // For each feed item, get its diet usage
            const feedItemsWithDiets = await Promise.all(feedItems.map(async (feed) => {
                const dietUsageQuery = `
                    SELECT 
                        d.diet_name,
                        dc.percentage_in_diet as percentage
                    FROM Diet_Components dc
                    JOIN Diets d ON d.diet_id = dc.diet_id
                    WHERE dc.feed_id = ?
                `;
                
                const diets = await query(dietUsageQuery, [feed.feed_id]);
                return { ...feed, diets };
            }));
            
            res.json(feedItemsWithDiets);
            
        } catch (err) {
            console.error('Database Error in /api/feeditems/details:', err);
            res.status(500).json({ error: 'Database error fetching feed item details.' });
        }
    });

    // POST /api/feeditems/add
    router.post('/feeditems/add', async (req, res) => {
        const { 
            feed_name, manufacturer, cost_per_kg, calories_per_kg, 
            protein_percentage, fat_percentage, fiber_percentage, calcium_mg_per_kg 
        } = req.body;
        
        // Validation check for mandatory fields
        if (!feed_name || cost_per_kg === undefined || cost_per_kg === null || isNaN(cost_per_kg)) {
            return res.status(400).json({ message: 'Feed Item Name and Cost per kg are mandatory.' });
        }

        // Validation check for DECIMAL(6, 2) constraint (Max 9999.99)
        const parsedCost = parseFloat(cost_per_kg);
        if (parsedCost > 9999.99) {
            return res.status(400).json({ message: 'Cost per kg cannot exceed 9999.99 (database limit).' });
        }


        const sql = `
            INSERT INTO Feed_Items (
                feed_name, manufacturer, cost_per_kg, calories_per_kg, 
                protein_percentage, fat_percentage, fiber_percentage, calcium_mg_per_kg
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const values = [
            feed_name,
            manufacturer,
            parsedCost, // Use the parsed and validated cost
            calories_per_kg ? parseFloat(calories_per_kg) : null,
            protein_percentage ? parseFloat(protein_percentage) : null,
            fat_percentage ? parseFloat(fat_percentage) : null,
            fiber_percentage ? parseFloat(fiber_percentage) : null,
            calcium_mg_per_kg ? parseFloat(calcium_mg_per_kg) : null,
        ];
        
        try {
            const feedResult = await query(sql, values);
            
            // Check to ensure the ID was created successfully
            if (feedResult.insertId === undefined || feedResult.insertId === null) {
                 throw new Error("Insert failed to return a valid ID.");
            }

            // Success response
            res.status(201).json({ 
                message: 'Feed Item added successfully!', 
                insertId: feedResult.insertId,
                feed_name: feed_name 
            });
        } catch (err) {
            console.error('Database Error inserting new feed item:', err);
            
            // Handle duplicate entry error (UNIQUE constraint)
            if (err.code === 'ER_DUP_ENTRY') {
                // *** UPDATED ERROR MESSAGE FOR DUPLICATE ***
                return res.status(409).json({ message: `Feed Item name **'${feed_name}'** already exists. Please use a different name.` });
            }

            // Handle out of range errors
            if (err.code === 'ER_WARN_DATA_OUT_OF_RANGE') {
                return res.status(400).json({ message: 'Data value is out of range for one or more nutritional fields.' });
            }
            
            return res.status(500).json({ message: 'Failed to add feed item due to a server error.' });
        }
    });

    // POST /api/animals
    router.post('/animals', (req, res) => {
        const { animal_name, birth_date, gender, weight_kg, species_id, current_diet_id } = req.body;

        // Basic validation
        if (!animal_name || !gender || !weight_kg || !species_id) {
            return res.status(400).json({ message: 'Missing required fields: Animal Name/ID, Gender, Weight (kg), and Species are mandatory.' });
        }

        // Prepare the SQL INSERT query
        const sql = `
            INSERT INTO Animals (animal_name, birth_date, gender, weight_kg, species_id, current_diet_id)
            VALUES (?, ?, ?, ?, ?, ?)
        `;

        // Prepare values array for safe parameterized query execution
        const values = [
            animal_name,
            birth_date || null, // Allow null if not provided
            gender,
            weight_kg,
            species_id,
            current_diet_id || null // Allow null if not provided
        ];

        connection.query(sql, values, (err, result) => {
            if (err) {
                console.error('Database Error inserting new animal:', err);
                // Check for specific errors, e.g., foreign key constraint violation
                if (err.code === 'ER_NO_REFERENCED_ROW_2') {
                    return res.status(400).json({ message: 'Invalid Species ID or Diet ID provided.' });
                }
                return res.status(500).json({ message: 'Failed to add animal due to a server error.' });
            }

            res.status(201).json({ 
                message: 'Animal added successfully!', 
                animal_id: result.insertId,
                animal_name: animal_name
            });
        });
    });

    // GET /api/animals/:id - Fetch a single animal profile for editing
    router.get('/animals/:id', async (req, res) => {
        const { id } = req.params;

        try {
            // Fetch birth_date as YYYY-MM-DD which is required for HTML date input
            const querySql = `
                SELECT 
                    animal_id, animal_name, DATE_FORMAT(birth_date, '%Y-%m-%d') as birth_date, 
                    gender, weight_kg, species_id, current_diet_id 
                FROM Animals 
                WHERE animal_id = ?
            `;
            
            const results = await query(querySql, [id]);

            if (results.length === 0) {
                return res.status(404).json({ message: `Animal with ID ${id} not found.` });
            }

            res.json(results[0]);
        } catch (err) {
            console.error('Database Error in GET /api/animals/:id:', err);
            res.status(500).json({ message: 'Database error fetching animal data.' });
        }
    });

    // PUT /api/animals/:id - Update an existing animal profile
    router.put('/animals/:id', async (req, res) => {
        const { id } = req.params;
        const { animal_name, birth_date, gender, weight_kg, species_id, current_diet_id } = req.body;

        // Basic validation
        if (!animal_name || !gender || !weight_kg || !species_id) {
            return res.status(400).json({ message: 'Missing required fields: Name, Gender, Weight, and Species are mandatory.' });
        }

        const querySql = `
            UPDATE Animals SET 
                animal_name = ?, 
                birth_date = ?, 
                gender = ?, 
                weight_kg = ?, 
                species_id = ?, 
                current_diet_id = ?
            WHERE animal_id = ?
        `;

        const values = [
            animal_name,
            birth_date || null, 
            gender,
            weight_kg,
            species_id,
            current_diet_id || null,
            id
        ];

        try {
            const result = await query(querySql, values);

            if (result.affectedRows === 0) {
                // Check if the animal ID exists (returns 404) or if the data was just identical (returns 200)
                const checkExistence = await query("SELECT 1 FROM Animals WHERE animal_id = ?", [id]);
                if (checkExistence.length === 0) {
                    return res.status(404).json({ message: `Animal with ID ${id} not found.` });
                }
                return res.status(200).json({ message: `Animal ID ${id} updated (no changes detected).`, animal_id: id });
            }

            res.status(200).json({ 
                message: `Animal '${animal_name}' updated successfully!`, 
                animal_id: id 
            });

        } catch (err) {
            console.error('Database Error in PUT /api/animals/:id:', err);
            if (err.code === 'ER_DUP_ENTRY') {
                return res.status(409).json({ message: `Could not update animal: Duplicate data found.` });
            }
            res.status(500).json({ message: 'Failed to update animal due to a server error.' });
        }
    });

    // GET /api/reports/diet-health
    // GET /api/reports/diet-health
    router.get('/reports/diet-health', async (req, res) => {
        try {
            // 1. Get nutritional data for all feed items
            const feedItemsQuery = `
                SELECT feed_id, calories_per_kg, protein_percentage, 
                       fat_percentage, fiber_percentage, calcium_mg_per_kg 
                FROM Feed_Items
            `;
            const feedItems = await query(feedItemsQuery);
            
            // Create a lookup map for fast access
            const feedNutritionMap = new Map();
            feedItems.forEach(item => feedNutritionMap.set(item.feed_id, item));

            // 2. Get all diet compositions
            const componentsQuery = `
                SELECT diet_id, feed_id, percentage_in_diet 
                FROM Diet_Components
            `;
            const components = await query(componentsQuery);
            
            // Group components by diet_id
            const componentsByDiet = new Map();
            components.forEach(comp => {
                if (!componentsByDiet.has(comp.diet_id)) {
                    componentsByDiet.set(comp.diet_id, []);
                }
                componentsByDiet.get(comp.diet_id).push(comp);
            });

            // 3. Get all diets and their animal counts
            const dietsQuery = `
                SELECT 
                    d.diet_id, d.diet_name,
                    COUNT(DISTINCT a.animal_id) as animal_count
                FROM Diets d
                LEFT JOIN Animals a ON d.diet_id = a.current_diet_id
                GROUP BY d.diet_id, d.diet_name
            `;
            const diets = await query(dietsQuery);

            let totalAnimals = 0;
            let totalHealthScoreSum = 0;
            const detailedDietResults = [];

            // 4. Calculate health score for each diet
            for (const diet of diets) {
                const dietComponents = componentsByDiet.get(diet.diet_id) || [];
                
                // Per-nutrient weighted totals for this diet
                let P_diet = 0, F_diet = 0, Fi_diet = 0, Ca_diet = 0, E_diet = 0;

                // --- This loop implements your first equation  ---
                for (const comp of dietComponents) {
                    const nutrition = feedNutritionMap.get(comp.feed_id);
                    // Get percentage as a decimal (e.g., 25% -> 0.25)
                    const percentage = (comp.percentage_in_diet || 0) / 100.0;
                    
                    if (nutrition) {
                        // Nutrient_diet = SUM( (percentage_i) * nutrient_value_i )
                        P_diet  += (nutrition.protein_percentage || 0) * percentage;
                        F_diet  += (nutrition.fat_percentage || 0) * percentage;
                        Fi_diet += (nutrition.fiber_percentage || 0) * percentage;
                        Ca_diet += (nutrition.calcium_mg_per_kg || 0) * percentage;
                        E_diet  += (nutrition.calories_per_kg || 0) * percentage;
                    }
                }

                // --- This section implements your second equation  ---
                
                // WARNING: Your document specifies using "normalized" values [cite: 7-10]
                // and "weight coefficients" (w1, w2, etc.)[cite: 12].
                // You must define these weights and normalization logic.
                
                // TODO: Define your weights based on species importance [cite: 12]
                const w1_protein = 1;
                const w2_fat = 1;
                const w3_fiber = 1;
                const w4_calcium = 0.1; // Example: calcium has a different scale
                const w5_energy = 0.5;  // Example: energy is half as important

                // TODO: Implement normalization [cite: 7-10]. 
                // This is a placeholder. A real score would compare P_diet
                // to an "ideal" protein level for that species.
                //
                // Example:
                // const IDEAL_PROTEIN = 18; // 18%
                // const P_normalized = Math.min(100, (P_diet / IDEAL_PROTEIN) * 100);
                //
                // For now, we will just use the weighted values.
                let health_score_raw = (w1_protein * P_diet) + 
                                       (w2_fat * F_diet) + 
                                       (w3_fiber * Fi_diet) + 
                                       (w4_calcium * Ca_diet) + 
                                       (w5_energy * E_diet);

                // TODO: This is a temporary way to get a 0-100 score.
                // Replace this with your real normalization logic.
                let health_score = Math.min(Math.max(health_score_raw, 0), 100); 

                // We no longer get alert data, so we set it to 0.
                // You could add another query to fetch this if needed.
                const alert_count = 0;
                const alert_level = 'low';

                detailedDietResults.push({
                    diet_id: diet.diet_id,
                    diet_name: diet.diet_name,
                    animal_count: diet.animal_count,
                    health_score: parseFloat(health_score.toFixed(1)),
                    alert_count: alert_count,
                    alert_level: alert_level,
                    // Keep using mock data helpers for these display fields
                    weight_gain: generateMockWeightGain(health_score),
                    feed_efficiency: generateMockFeedEfficiency(health_score)
                });

                totalAnimals += diet.animal_count;
                totalHealthScoreSum += health_score;
            }

            // 5. Aggregate overview
            const overview = {
                totalAnimals: totalAnimals,
                averageHealthScore: (totalHealthScoreSum / Math.max(detailedDietResults.length, 1)),
                totalDiets: detailedDietResults.length
            };

            res.json({
                overview,
                diets: detailedDietResults
            });

        } catch (error) {
            console.error('Database Error in /api/reports/diet-health:', error);
            res.status(500).json({ error: 'Error generating diet health report.' });
        }
    });
    // GET /api/reports/daily-feed-cost
    // Returns per-animal daily feed cost and per-feed aggregated daily cost
    router.get('/reports/daily-feed-cost', async (req, res) => {
        try {
            // 1) Get animals with their current diet and diet base info
            const animalDietQuery = `
                SELECT a.animal_id, a.animal_name, a.weight_kg, a.current_diet_id,
                       d.diet_name, d.ration_size_kg, d.feeding_frequency, d.total_ration_size_kg
                FROM Animals a
                LEFT JOIN Diets d ON a.current_diet_id = d.diet_id
                WHERE a.current_diet_id IS NOT NULL
            `;

            const animals = await query(animalDietQuery);

            // 2) Get diet components and feed costs for all diets referenced
            const dietIds = [...new Set(animals.map(a => a.current_diet_id).filter(Boolean))];

            let components = [];
            if (dietIds.length > 0) {
                const compQuery = `
                    SELECT dc.diet_id, dc.feed_id, dc.percentage_in_diet,
                           fi.feed_name, fi.cost_per_kg
                    FROM Diet_Components dc
                    JOIN Feed_Items fi ON dc.feed_id = fi.feed_id
                    WHERE dc.diet_id IN (?);
                `;
                components = await query(compQuery, [dietIds]);
            }

            // Map components by diet_id for quick lookup
            const compsByDiet = {};
            components.forEach(c => {
                compsByDiet[c.diet_id] = compsByDiet[c.diet_id] || [];
                compsByDiet[c.diet_id].push(c);
            });

            const perAnimal = [];
            const perFeedTotals = {}; // feed_id -> { feed_name, kg_per_day, cost_per_day }
            let grandTotal = 0;

            animals.forEach(an => {
                const dietId = an.current_diet_id;
                // Use total_ration_size_kg (total food eaten per day) when available
                const totalRation = an.total_ration_size_kg !== undefined && an.total_ration_size_kg !== null
                    ? parseFloat(an.total_ration_size_kg)
                    : null;

                const rationSize = parseFloat(an.ration_size_kg) || 0; // kg per serving
                const freq = parseInt(an.feeding_frequency) || 0; // times per day

                // Apply equation: Daily Cost uses total_ration_size_kg when present
                const dailyKg = (totalRation !== null && !isNaN(totalRation) && totalRation > 0)
                    ? totalRation
                    : rationSize * freq; // fallback
                const dailyKgBasis = (totalRation !== null && !isNaN(totalRation) && totalRation > 0) ? 'total_ration_size_kg' : 'ration_size_kg*feeding_frequency';

                const comps = compsByDiet[dietId] || [];
                const feedBreakdown = comps.map(c => {
                    const pct = parseFloat(c.percentage_in_diet) || 0; // percent
                    const kg = (pct / 100) * dailyKg;
                    const cost = (parseFloat(c.cost_per_kg) || 0) * kg;

                    // accumulate per-feed totals
                    if (!perFeedTotals[c.feed_id]) {
                        perFeedTotals[c.feed_id] = { feed_name: c.feed_name, kg_per_day: 0, cost_per_day: 0 };
                    }
                    perFeedTotals[c.feed_id].kg_per_day += kg;
                    perFeedTotals[c.feed_id].cost_per_day += cost;

                    grandTotal += cost;

                    return {
                        feed_id: c.feed_id,
                        feed_name: c.feed_name,
                        percentage_in_diet: pct,
                        kg_per_day: parseFloat(kg.toFixed(4)),
                        cost_per_day: parseFloat(cost.toFixed(4))
                    };
                });

                perAnimal.push({
                    animal_id: an.animal_id,
                    animal_name: an.animal_name,
                    diet_id: dietId,
                    diet_name: an.diet_name,
                    daily_kg: parseFloat(dailyKg.toFixed(4)),
                    daily_kg_basis: dailyKgBasis,
                    feed_components: feedBreakdown,
                    total_cost_per_day: parseFloat(feedBreakdown.reduce((s, f) => s + f.cost_per_day, 0).toFixed(4))
                });
            });

            const perFeed = Object.keys(perFeedTotals).map(fid => ({
                feed_id: fid,
                feed_name: perFeedTotals[fid].feed_name,
                kg_per_day: parseFloat(perFeedTotals[fid].kg_per_day.toFixed(4)),
                cost_per_day: parseFloat(perFeedTotals[fid].cost_per_day.toFixed(4))
            }));

            res.json({
                perAnimal,
                perFeed,
                totalCostPerDay: parseFloat(grandTotal.toFixed(4))
            });

        } catch (err) {
            console.error('Database Error in /api/reports/daily-feed-cost:', err);
            res.status(500).json({ error: 'Database error computing daily feed cost.' });
        }
    });

    // Helper functions for mock data
    function generateMockWeightGain(healthScore) {
        const baseGain = (healthScore / 100) * 2; // Max 2 kg/week for perfect health
        return `${baseGain.toFixed(1)} kg/week`;
    }

    // GET /api/locations/live
    // Returns the most recent location record for each animal
    router.get('/locations/live', async (req, res) => {
        try {
            const sql = `
                SELECT l.location_id, l.animal_id, l.location_timestamp, l.latitude, l.longitude, l.speed, l.location_status,
                       a.animal_name
                FROM map.Locations l
                JOIN Animals a ON a.animal_id = l.animal_id
                INNER JOIN (
                    SELECT animal_id, MAX(location_timestamp) as latest_ts
                    FROM map.Locations
                    GROUP BY animal_id
                ) latest ON latest.animal_id = l.animal_id AND latest.latest_ts = l.location_timestamp
                ORDER BY l.location_timestamp DESC;
            `;

            const rows = await query(sql);
            res.json(rows);
        } catch (err) {
            console.error('Database Error in /api/locations/live:', err);
            res.status(500).json({ error: 'Database error fetching live locations.' });
        }
    });

    /**
     * ===============================================
     * COMPREHENSIVE MEDICAL RECORDS MANAGEMENT
     * ===============================================
     * Implements user stories S01, S02, S03 with:
     * - Unique tracking IDs for all records
     * - Comprehensive medical examination recording
     * - Advanced diagnostic result import
     * - Enhanced file upload with metadata
     * - Complete CRUD operations
     * - Record retrieval by unique ID
     * ===============================================
     */

    // ===============================================
    // ANIMAL MEDICAL OVERVIEW ENDPOINTS
    // ===============================================

    // GET /api/animals/:id/medical - comprehensive medical overview for an animal
    router.get('/animals/:id/medical', async (req, res) => {
        const animalId = parseInt(req.params.id);
        if (isNaN(animalId)) return res.status(400).json({ message: 'Invalid animal ID' });

        try {
            // Get comprehensive medical data
            const [exams, diagnostics, files, summary] = await Promise.all([
                query(`
                    SELECT 
                        exam_id, unique_record_id, exam_date, veterinarian, exam_type,
                        weight_kg, temperature_c, heart_rate_bpm, respiratory_rate_rpm,
                        body_condition_score, diagnosis, treatment_plan, exam_status,
                        follow_up_required, follow_up_date, created_at
                    FROM Medical_Exams 
                    WHERE animal_id = ? 
                    ORDER BY exam_date DESC
                `, [animalId]),
                
                query(`
                    SELECT 
                        result_id, unique_record_id, exam_id, test_name, test_category,
                        test_date, lab_name, result_value, units, reference_range,
                        abnormal_flag, interpretation, result_status, created_at
                    FROM Diagnostic_Results 
                    WHERE animal_id = ? 
                    ORDER BY test_date DESC
                `, [animalId]),
                
                query(`
                    SELECT 
                        file_id, unique_file_id, exam_id, result_id, original_filename,
                        file_category, description, file_size_bytes, uploaded_at,
                        uploaded_by, access_level
                    FROM Medical_Files 
                    WHERE animal_id = ? AND is_active = TRUE
                    ORDER BY uploaded_at DESC
                `, [animalId]),
                
                query(`
                    SELECT * FROM Animal_Medical_Summary 
                    WHERE animal_id = ?
                `, [animalId])
            ]);

            res.json({
                animal_id: animalId,
                summary: summary[0] || null,
                exams,
                diagnostics,
                files,
                total_records: exams.length + diagnostics.length + files.length
            });
        } catch (err) {
            console.error('DB error fetching comprehensive medical records:', err);
            res.status(500).json({ message: 'Database error fetching medical records' });
        }
    });

    // GET /api/medical/search/:recordId - retrieve record by unique tracking ID (S03 requirement)
    router.get('/medical/search/:recordId', async (req, res) => {
        const recordId = req.params.recordId.toUpperCase();
        
        try {
            let record = null;
            let recordType = null;
            
            // Determine record type and search accordingly
            if (recordId.startsWith('EXAM-')) {
                const examResults = await query(`
                    SELECT 
                        me.*, a.animal_name, a.animal_id,
                        COUNT(mf.file_id) as attached_files
                    FROM Medical_Exams me
                    JOIN Animals a ON me.animal_id = a.animal_id
                    LEFT JOIN Medical_Files mf ON me.exam_id = mf.exam_id
                    WHERE me.unique_record_id = ?
                    GROUP BY me.exam_id
                `, [recordId]);
                
                if (examResults.length > 0) {
                    record = examResults[0];
                    recordType = 'examination';
                    
                    // Get associated diagnostic results and files
                    const [diagnostics, files] = await Promise.all([
                        query(`
                            SELECT * FROM Diagnostic_Results 
                            WHERE exam_id = ? 
                            ORDER BY test_date DESC
                        `, [record.exam_id]),
                        query(`
                            SELECT * FROM Medical_Files 
                            WHERE exam_id = ? AND is_active = TRUE
                            ORDER BY uploaded_at DESC
                        `, [record.exam_id])
                    ]);
                    
                    record.associated_diagnostics = diagnostics;
                    record.attached_files = files;
                }
            } else if (recordId.startsWith('DIAG-')) {
                const diagResults = await query(`
                    SELECT 
                        dr.*, a.animal_name, a.animal_id,
                        me.exam_date, me.veterinarian,
                        COUNT(mf.file_id) as attached_files
                    FROM Diagnostic_Results dr
                    JOIN Animals a ON dr.animal_id = a.animal_id
                    LEFT JOIN Medical_Exams me ON dr.exam_id = me.exam_id
                    LEFT JOIN Medical_Files mf ON dr.result_id = mf.result_id
                    WHERE dr.unique_record_id = ?
                    GROUP BY dr.result_id
                `, [recordId]);
                
                if (diagResults.length > 0) {
                    record = diagResults[0];
                    recordType = 'diagnostic';
                    
                    // Get attached files
                    const files = await query(`
                        SELECT * FROM Medical_Files 
                        WHERE result_id = ? AND is_active = TRUE
                        ORDER BY uploaded_at DESC
                    `, [record.result_id]);
                    
                    record.attached_files = files;
                }
            } else if (recordId.startsWith('FILE-')) {
                const fileResults = await query(`
                    SELECT 
                        mf.*, a.animal_name, a.animal_id,
                        me.exam_date, me.veterinarian,
                        dr.test_name, dr.test_date
                    FROM Medical_Files mf
                    JOIN Animals a ON mf.animal_id = a.animal_id
                    LEFT JOIN Medical_Exams me ON mf.exam_id = me.exam_id
                    LEFT JOIN Diagnostic_Results dr ON mf.result_id = dr.result_id
                    WHERE mf.unique_file_id = ? AND mf.is_active = TRUE
                `, [recordId]);
                
                if (fileResults.length > 0) {
                    record = fileResults[0];
                    recordType = 'file';
                }
            }
            
            if (!record) {
                return res.status(404).json({ 
                    message: `No medical record found with ID: ${recordId}`,
                    searched_id: recordId
                });
            }
            
            res.json({
                record_id: recordId,
                record_type: recordType,
                found: true,
                record
            });
            
        } catch (err) {
            console.error('DB error searching for record:', err);
            res.status(500).json({ message: 'Database error searching for record' });
        }
    });

    // ===============================================
    // MEDICAL EXAMINATION ENDPOINTS
    // ===============================================

    // POST /api/animals/:id/medical/exam - create comprehensive medical examination (S03)
    router.post('/animals/:id/medical/exam', async (req, res) => {
        const animalId = parseInt(req.params.id);
        if (isNaN(animalId)) return res.status(400).json({ message: 'Invalid animal ID' });

        const {
            exam_date, veterinarian, exam_type, weight_kg, temperature_c,
            heart_rate_bpm, respiratory_rate_rpm, blood_pressure, body_condition_score,
            exam_notes, diagnosis, treatment_plan, medications_prescribed,
            follow_up_required, follow_up_date, created_by
        } = req.body;

        if (!exam_date) {
            return res.status(400).json({ message: 'Examination date is required' });
        }

        try {
            const insertSql = `
                INSERT INTO Medical_Exams (
                    animal_id, exam_date, veterinarian, exam_type, weight_kg, temperature_c,
                    heart_rate_bpm, respiratory_rate_rpm, blood_pressure, body_condition_score,
                    exam_notes, diagnosis, treatment_plan, medications_prescribed,
                    follow_up_required, follow_up_date, created_by
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;
            
            const result = await query(insertSql, [
                animalId, exam_date, veterinarian || null, exam_type || 'Routine',
                weight_kg || null, temperature_c || null, heart_rate_bpm || null,
                respiratory_rate_rpm || null, blood_pressure || null, body_condition_score || null,
                exam_notes || null, diagnosis || null, treatment_plan || null,
                medications_prescribed || null, follow_up_required || false,
                follow_up_date || null, created_by || 'System'
            ]);

            // Get the created record with unique ID
            const createdExam = await query(`
                SELECT exam_id, unique_record_id, exam_date, veterinarian, exam_type
                FROM Medical_Exams WHERE exam_id = ?
            `, [result.insertId]);

            res.status(201).json({
                message: 'Medical examination recorded successfully',
                exam: createdExam[0],
                exam_id: result.insertId,
                unique_record_id: createdExam[0].unique_record_id
            });
        } catch (err) {
            console.error('DB error inserting medical exam:', err);
            res.status(500).json({ message: 'Database error recording examination' });
        }
    });

    // PUT /api/medical/exam/:examId - update medical examination (S02 requirement)
    router.put('/medical/exam/:examId', async (req, res) => {
        const examId = parseInt(req.params.examId);
        if (isNaN(examId)) return res.status(400).json({ message: 'Invalid exam ID' });

        const {
            exam_date, veterinarian, exam_type, weight_kg, temperature_c,
            heart_rate_bpm, respiratory_rate_rpm, blood_pressure, body_condition_score,
            exam_notes, diagnosis, treatment_plan, medications_prescribed,
            follow_up_required, follow_up_date, exam_status
        } = req.body;

        try {
            const updateSql = `
                UPDATE Medical_Exams SET 
                    exam_date = COALESCE(?, exam_date),
                    veterinarian = COALESCE(?, veterinarian),
                    exam_type = COALESCE(?, exam_type),
                    weight_kg = COALESCE(?, weight_kg),
                    temperature_c = COALESCE(?, temperature_c),
                    heart_rate_bpm = COALESCE(?, heart_rate_bpm),
                    respiratory_rate_rpm = COALESCE(?, respiratory_rate_rpm),
                    blood_pressure = COALESCE(?, blood_pressure),
                    body_condition_score = COALESCE(?, body_condition_score),
                    exam_notes = COALESCE(?, exam_notes),
                    diagnosis = COALESCE(?, diagnosis),
                    treatment_plan = COALESCE(?, treatment_plan),
                    medications_prescribed = COALESCE(?, medications_prescribed),
                    follow_up_required = COALESCE(?, follow_up_required),
                    follow_up_date = COALESCE(?, follow_up_date),
                    exam_status = COALESCE(?, exam_status),
                    updated_at = CURRENT_TIMESTAMP
                WHERE exam_id = ?
            `;
            
            const result = await query(updateSql, [
                exam_date, veterinarian, exam_type, weight_kg, temperature_c,
                heart_rate_bpm, respiratory_rate_rpm, blood_pressure, body_condition_score,
                exam_notes, diagnosis, treatment_plan, medications_prescribed,
                follow_up_required, follow_up_date, exam_status, examId
            ]);

            if (result.affectedRows === 0) {
                return res.status(404).json({ message: 'Medical examination not found' });
            }

            // Get updated record
            const updatedExam = await query(`
                SELECT * FROM Medical_Exams WHERE exam_id = ?
            `, [examId]);

            res.json({
                message: 'Medical examination updated successfully',
                exam: updatedExam[0]
            });
        } catch (err) {
            console.error('DB error updating medical exam:', err);
            res.status(500).json({ message: 'Database error updating examination' });
        }
    });

    // ===============================================
    // DIAGNOSTIC RESULTS ENDPOINTS
    // ===============================================

    // POST /api/animals/:id/medical/diagnostics - import diagnostic results (S03)
    router.post('/animals/:id/medical/diagnostics', async (req, res) => {
        const animalId = parseInt(req.params.id);
        if (isNaN(animalId)) return res.status(400).json({ message: 'Invalid animal ID' });

        const { results, imported_by } = req.body;
        
        if (!Array.isArray(results) || results.length === 0) {
            return res.status(400).json({ message: 'Diagnostic results array is required' });
        }

        try {
            const insertPromises = results.map(async (result) => {
                const {
                    exam_id, test_name, test_category, test_date, lab_name, test_method,
                    result_value, units, reference_range, abnormal_flag, notes,
                    interpretation, clinical_significance, result_status
                } = result;

                if (!test_name || !result_value) {
                    throw new Error('test_name and result_value are required for each result');
                }

                const sql = `
                    INSERT INTO Diagnostic_Results (
                        exam_id, animal_id, test_name, test_category, test_date,
                        lab_name, test_method, result_value, units, reference_range,
                        abnormal_flag, notes, interpretation, clinical_significance,
                        result_status, imported_by
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `;
                
                return query(sql, [
                    exam_id || null, animalId, test_name, test_category || 'Other',
                    test_date || new Date(), lab_name || null, test_method || null,
                    result_value, units || null, reference_range || null,
                    abnormal_flag || 'Normal', notes || null, interpretation || null,
                    clinical_significance || null, result_status || 'Final',
                    imported_by || 'System'
                ]);
            });

            const insertResults = await Promise.all(insertPromises);
            
            // Get created records with unique IDs
            const createdIds = insertResults.map(r => r.insertId);
            const createdRecords = await query(`
                SELECT result_id, unique_record_id, test_name, test_date
                FROM Diagnostic_Results 
                WHERE result_id IN (${createdIds.map(() => '?').join(',')})
            `, createdIds);

            res.status(201).json({
                message: `${results.length} diagnostic result(s) imported successfully`,
                imported_count: results.length,
                records: createdRecords
            });
        } catch (err) {
            console.error('DB error importing diagnostic results:', err);
            res.status(500).json({ 
                message: 'Database error importing diagnostic results',
                details: err.message 
            });
        }
    });

    // PUT /api/medical/diagnostic/:resultId - update diagnostic result (S02 requirement)
    router.put('/medical/diagnostic/:resultId', async (req, res) => {
        const resultId = parseInt(req.params.resultId);
        if (isNaN(resultId)) return res.status(400).json({ message: 'Invalid result ID' });

        const {
            test_name, test_category, test_date, lab_name, test_method,
            result_value, units, reference_range, abnormal_flag, notes,
            interpretation, clinical_significance, result_status
        } = req.body;

        try {
            const updateSql = `
                UPDATE Diagnostic_Results SET 
                    test_name = COALESCE(?, test_name),
                    test_category = COALESCE(?, test_category),
                    test_date = COALESCE(?, test_date),
                    lab_name = COALESCE(?, lab_name),
                    test_method = COALESCE(?, test_method),
                    result_value = COALESCE(?, result_value),
                    units = COALESCE(?, units),
                    reference_range = COALESCE(?, reference_range),
                    abnormal_flag = COALESCE(?, abnormal_flag),
                    notes = COALESCE(?, notes),
                    interpretation = COALESCE(?, interpretation),
                    clinical_significance = COALESCE(?, clinical_significance),
                    result_status = COALESCE(?, result_status),
                    updated_at = CURRENT_TIMESTAMP
                WHERE result_id = ?
            `;
            
            const result = await query(updateSql, [
                test_name, test_category, test_date, lab_name, test_method,
                result_value, units, reference_range, abnormal_flag, notes,
                interpretation, clinical_significance, result_status, resultId
            ]);

            if (result.affectedRows === 0) {
                return res.status(404).json({ message: 'Diagnostic result not found' });
            }

            // Get updated record
            const updatedResult = await query(`
                SELECT * FROM Diagnostic_Results WHERE result_id = ?
            `, [resultId]);

            res.json({
                message: 'Diagnostic result updated successfully',
                result: updatedResult[0]
            });
        } catch (err) {
            console.error('DB error updating diagnostic result:', err);
            res.status(500).json({ message: 'Database error updating diagnostic result' });
        }
    });

    // ===============================================
    // ENHANCED FILE UPLOAD ENDPOINTS
    // ===============================================

    // POST /api/animals/:id/medical/files - upload medical files with enhanced metadata (S03)
    router.post('/animals/:id/medical/files', upload.array('files', 10), async (req, res) => {
        const animalId = parseInt(req.params.id);
        if (isNaN(animalId)) return res.status(400).json({ message: 'Invalid animal ID' });

        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ message: 'No files uploaded' });
        }

        const { 
            exam_id, result_id, file_category, description, tags, 
            uploaded_by, access_level, notes 
        } = req.body;

        try {
            // Insert file records with enhanced metadata
            const insertPromises = req.files.map(file => {
                const sql = `
                    INSERT INTO Medical_Files (
                        animal_id, exam_id, result_id, original_filename, storage_filename,
                        file_path, mime_type, file_size_bytes, file_category, description,
                        tags, uploaded_by, access_level, notes
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `;
                
                const filePath = `uploads/medical/${file.filename}`;
                
                return query(sql, [
                    animalId, exam_id || null, result_id || null,
                    file.originalname, file.filename, filePath,
                    file.mimetype, file.size, file_category || 'Other',
                    description || null, tags || null, uploaded_by || 'System',
                    access_level || 'Restricted', notes || null
                ]);
            });

            const results = await Promise.all(insertPromises);
            
            // Get created records with unique IDs
            const fileIds = results.map(r => r.insertId);
            const createdFiles = await query(`
                SELECT file_id, unique_file_id, original_filename, file_category, file_size_bytes
                FROM Medical_Files 
                WHERE file_id IN (${fileIds.map(() => '?').join(',')})
            `, fileIds);

            res.status(201).json({ 
                message: `${req.files.length} medical file(s) uploaded successfully`,
                uploaded_count: req.files.length,
                files: createdFiles
            });
        } catch (err) {
            console.error('DB error saving file records:', err);
            // Clean up uploaded files on database error
            req.files.forEach(file => {
                fs.unlink(file.path, (unlinkErr) => {
                    if (unlinkErr) console.error('Error cleaning up file:', unlinkErr);
                });
            });
            res.status(500).json({ message: 'Database error saving file records' });
        }
    });

    // GET /api/animals/:id/medical/files - get all medical files for an animal
    router.get('/animals/:id/medical/files', async (req, res) => {
        const animalId = parseInt(req.params.id);
        if (isNaN(animalId)) return res.status(400).json({ message: 'Invalid animal ID' });

        try {
            const sql = `
                SELECT 
                    mf.file_id, mf.unique_file_id, mf.exam_id, mf.result_id,
                    mf.original_filename, mf.file_category, mf.description,
                    mf.file_size_bytes, mf.uploaded_at, mf.uploaded_by,
                    mf.access_level, mf.tags,
                    me.unique_record_id as exam_record_id, me.exam_date, me.veterinarian,
                    dr.unique_record_id as diagnostic_record_id, dr.test_name, dr.test_date
                FROM Medical_Files mf
                LEFT JOIN Medical_Exams me ON mf.exam_id = me.exam_id
                LEFT JOIN Diagnostic_Results dr ON mf.result_id = dr.result_id
                WHERE mf.animal_id = ? AND mf.is_active = TRUE
                ORDER BY mf.uploaded_at DESC
            `;
            const files = await query(sql, [animalId]);
            res.json({
                animal_id: animalId,
                total_files: files.length,
                files
            });
        } catch (err) {
            console.error('DB error fetching medical files:', err);
            res.status(500).json({ message: 'Database error fetching medical files' });
        }
    });

    // GET /api/medical/files/:fileId/download - download medical file with access logging
    router.get('/medical/files/:fileId/download', async (req, res) => {
        const fileId = parseInt(req.params.fileId);
        if (isNaN(fileId)) return res.status(400).json({ message: 'Invalid file ID' });

        try {
            const sql = `
                SELECT 
                    mf.storage_filename, mf.original_filename, mf.mime_type,
                    mf.file_path, mf.access_level, mf.unique_file_id,
                    a.animal_name
                FROM Medical_Files mf
                JOIN Animals a ON mf.animal_id = a.animal_id
                WHERE mf.file_id = ? AND mf.is_active = TRUE
            `;
            const fileRecords = await query(sql, [fileId]);
            
            if (fileRecords.length === 0) {
                return res.status(404).json({ message: 'Medical file not found' });
            }

            const fileRecord = fileRecords[0];
            const filePath = path.join(__dirname, '..', 'uploads', 'medical', fileRecord.storage_filename);

            // Check if file exists on disk
            if (!fs.existsSync(filePath)) {
                return res.status(404).json({ message: 'File not found on disk' });
            }

            // Log file access for audit trail
            try {
                await query(`
                    INSERT INTO Medical_Audit_Log (
                        record_type, record_id, unique_record_id, action_type,
                        changed_by, ip_address
                    ) VALUES ('File', ?, ?, 'Downloaded', 'System', ?)
                `, [fileId, fileRecord.unique_file_id, req.ip || 'Unknown']);
            } catch (auditErr) {
                console.warn('Failed to log file access:', auditErr);
            }

            // Set appropriate headers for download
            res.setHeader('Content-Disposition', `attachment; filename="${fileRecord.original_filename}"`);
            res.setHeader('Content-Type', fileRecord.mime_type || 'application/octet-stream');

            // Stream the file
            const fileStream = fs.createReadStream(filePath);
            fileStream.pipe(res);
        } catch (err) {
            console.error('Error downloading medical file:', err);
            res.status(500).json({ message: 'Error downloading file' });
        }
    });

    // ===============================================
    // MEDICAL RECORD SEARCH AND REPORTING
    // ===============================================

    // GET /api/medical/recent - get recent medical activity across all animals
    router.get('/medical/recent', async (req, res) => {
        const { limit = 50, days = 30 } = req.query;
        
        try {
            const records = await query(`
                SELECT * FROM Recent_Medical_Activity 
                WHERE activity_date >= DATE_SUB(NOW(), INTERVAL ? DAY)
                ORDER BY activity_date DESC 
                LIMIT ?
            `, [parseInt(days), parseInt(limit)]);
            
            res.json({
                period_days: parseInt(days),
                total_records: records.length,
                records
            });
        } catch (err) {
            console.error('DB error fetching recent medical activity:', err);
            res.status(500).json({ message: 'Database error fetching recent activity' });
        }
    });

    // GET /api/medical/summary - comprehensive medical summary for all animals
    router.get('/medical/summary', async (req, res) => {
        try {
            const summary = await query(`
                SELECT 
                    COUNT(DISTINCT animal_id) as total_animals_with_records,
                    COUNT(DISTINCT CASE WHEN total_exams > 0 THEN animal_id END) as animals_with_exams,
                    SUM(total_exams) as total_examinations,
                    SUM(total_diagnostic_results) as total_diagnostic_results,
                    SUM(total_files) as total_files,
                    AVG(total_exams) as avg_exams_per_animal,
                    MAX(last_exam_date) as most_recent_exam,
                    MAX(last_test_date) as most_recent_test
                FROM Animal_Medical_Summary
            `);
            
            const recentActivity = await query(`
                SELECT record_type, COUNT(*) as count
                FROM Recent_Medical_Activity 
                WHERE activity_date >= DATE_SUB(NOW(), INTERVAL 7 DAY)
                GROUP BY record_type
            `);
            
            res.json({
                overall_summary: summary[0],
                recent_activity_by_type: recentActivity,
                generated_at: new Date()
            });
        } catch (err) {
            console.error('DB error generating medical summary:', err);
            res.status(500).json({ message: 'Database error generating summary' });
        }
    });

    // GET /api/animals - minimal list used by frontend pages (e.g. medical.html)
    router.get('/animals', async (req, res) => {
        try {
            const sql = `
                SELECT animal_id, animal_name
                FROM Animals
                ORDER BY animal_name ASC
            `;
            const rows = await query(sql);
            res.json(rows);
        } catch (err) {
            console.error('Database Error in GET /api/animals:', err);
            res.status(500).json({ message: 'Database error fetching animals.' });
        }
    });

    // GET /api/allAnimals - more detailed animal list (includes profile fields)
    router.get('/allAnimals', async (req, res) => {
        try {
            const sql = `
                SELECT
                    animal_id,
                    animal_name,
                    DATE_FORMAT(birth_date, '%Y-%m-%d') as birth_date,
                    gender,
                    weight_kg,
                    species_id,
                    current_diet_id
                FROM Animals
                ORDER BY animal_name ASC
            `;
            const rows = await query(sql);
            res.json(rows);
        } catch (err) {
            console.error('Database Error in GET /api/allAnimals:', err);
            res.status(500).json({ message: 'Database error fetching all animals.' });
        }
    });

    
    // router.get('/animals/:id/medical', async (req, res) => {

    function generateMockFeedEfficiency(healthScore) {
        // Feed efficiency ratio: feed consumed / weight gained
        // Lower is better, typical range 1.5-3.0
        const efficiency = 1.5 + ((100 - healthScore) / 100);
        return efficiency.toFixed(1);
    }

    return router;
};
