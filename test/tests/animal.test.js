// tests/animal.test.js
const request = require('supertest');
const express = require('express'); // Import express to create a minimal app instance if needed, or import your actual app
const mysql = require('mysql2/promise'); // Use promise version for async/await


const app = require('../../app');

// --- Test Database Connection (Example - Adapt!) ---
let testConnection;

beforeAll(async () => {
    // Connect to your TEST database before all tests run
    testConnection = await mysql.createConnection({
        host: process.env.TEST_MYSQL_HOST || 'localhost',
        user: process.env.TEST_MYSQL_USER || 'pim',
        password: process.env.TEST_MYSQL_PASSWORD || 'pim07032548_',
        database: process.env.TEST_MYSQL_DATABASE || 'animals_test'
    });

    // --- ADD SEEDING ---
    try {
        // Clean tables before seeding (optional but good practice)
        await testConnection.query('SET FOREIGN_KEY_CHECKS = 0;'); 
        await testConnection.query('TRUNCATE TABLE Animals;');
        await testConnection.query('TRUNCATE TABLE Species;');
        await testConnection.query('SET FOREIGN_KEY_CHECKS = 1;'); // Re-enable checks

        // Seed necessary data
        await testConnection.query("INSERT INTO Species (species_id, species_name) VALUES (1, 'Test Species For S01/S02') ON DUPLICATE KEY UPDATE species_name=species_name;");
        console.log('Test DB seeded successfully.'); // Optional log
    } catch (seedError) {
        console.error("!!! FAILED TO SEED TEST DATABASE !!!", seedError);
        // Optionally throw the error to stop tests if seeding is critical
        // throw seedError;
    }
    // --- END SEEDING ---
});

afterAll(async () => {
    // Close the connection after all tests
    if (testConnection) {
        await testConnection.end();
    }
});

// Optional: Clean tables between tests if necessary
// beforeEach(async () => {
//     await testConnection.query('TRUNCATE TABLE Animals');
// });

// SO1 tests
describe('S01: Animal Registration API (/api/animals)', () => {

    it('POST /api/animals - should create a new animal successfully', async () => {
        const newAnimalData = {
            animal_name: `TestAnimal_${Date.now()}`, // Unique name
            birth_date: '2023-01-15',
            gender: 'Female',
            weight_kg: 55.5,
            species_id: 1, // Assuming species ID 1 exists in test DB
            current_diet_id: null
        };

        const response = await request(app)
            .post('/api/animals')
            .send(newAnimalData);

        expect(response.statusCode).toBe(201); // Check for Created status
        expect(response.body).toHaveProperty('message', 'Animal added successfully!');
        expect(response.body).toHaveProperty('animal_id'); // Check if an ID was returned
        expect(response.body).toHaveProperty('animal_name', newAnimalData.animal_name);

        // Optional: Verify in DB (less common in pure API tests, but possible)
        // const [rows] = await testConnection.query('SELECT * FROM Animals WHERE animal_id = ?', [response.body.animal_id]);
        // expect(rows.length).toBe(1);
        // expect(rows[0].animal_name).toBe(newAnimalData.animal_name);
    });

    it('POST /api/animals - should return 400 for missing required fields', async () => {
        const incompleteData = {
            animal_name: `Incomplete_${Date.now()}`,
            // Missing gender, weight_kg, species_id
        };
        const response = await request(app)
            .post('/api/animals')
            .send(incompleteData);

        expect(response.statusCode).toBe(400); // Check for Bad Request status
        expect(response.body).toHaveProperty('message'); // Check for an error message
        expect(response.body.message).toContain('Missing required fields');
    });

     it('POST /api/animals - should return 400 for invalid species ID', async () => {
        const invalidSpeciesData = {
             animal_name: `InvalidSpecies_${Date.now()}`,
             birth_date: '2023-01-15',
             gender: 'Male',
             weight_kg: 60.0,
             species_id: 9999, // Assuming this ID does not exist
             current_diet_id: null
        };
        const response = await request(app)
            .post('/api/animals')
            .send(invalidSpeciesData);

        expect(response.statusCode).toBe(400); // Or maybe 404 depending on your implementation
        expect(response.body).toHaveProperty('message', expect.stringContaining('Invalid Species ID'));
    });

    // ... more tests for GET /api/species, POST /api/species/add ...
});

// SO2 tests
describe('S02: Animal Update API (/api/animals/:id)', () => {
    let createdAnimalId; // Store ID from a POST test or setup

    // Setup: Create an animal to test updates on (or use seeded data)
    beforeAll(async () => {
        // Example: Create an animal needed for PUT/GET tests
        const response = await request(app)
            .post('/api/animals')
            .send({
                animal_name: `UpdateTest_${Date.now()}`,
                gender: 'Male', weight_kg: 100, species_id: 1
            });
        if (response.statusCode === 201) {
            createdAnimalId = response.body.animal_id;
        } else {
            throw new Error("Failed to create animal for S02 tests");
        }
    });

    it('GET /api/animals/:id - should retrieve an existing animal', async () => {
        const response = await request(app).get(`/api/animals/${createdAnimalId}`);
        expect(response.statusCode).toBe(200);
        expect(response.body).toHaveProperty('animal_id', createdAnimalId);
        expect(response.body).toHaveProperty('animal_name', expect.stringContaining('UpdateTest_'));
    });

     it('GET /api/animals/:id - should return 404 for non-existent animal', async () => {
        const response = await request(app).get('/api/animals/99999'); // Non-existent ID
        expect(response.statusCode).toBe(404);
        expect(response.body).toHaveProperty('message', expect.stringContaining('not found'));
    });

    it('PUT /api/animals/:id - should update an existing animal successfully', async () => {
        const updatedData = {
            animal_name: `UpdatedName_${Date.now()}`,
            birth_date: '2022-05-20',
            gender: 'Male',
            weight_kg: 105.5,
            species_id: 1, // Keep the same or change if needed
            current_diet_id: null // Example: clearing diet
        };
        const response = await request(app)
            .put(`/api/animals/${createdAnimalId}`)
            .send(updatedData);

        expect(response.statusCode).toBe(200);
        expect(response.body).toHaveProperty('message', expect.stringContaining('updated successfully'));

        // Verify update with another GET
        const verifyResponse = await request(app).get(`/api/animals/${createdAnimalId}`);
        expect(verifyResponse.body.animal_name).toBe(updatedData.animal_name);
        expect(parseFloat(verifyResponse.body.weight_kg)).toBe(updatedData.weight_kg);
        expect(verifyResponse.body.birth_date).toBe(updatedData.birth_date);
    });

    it('PUT /api/animals/:id - should return 400 for missing required fields', async () => {
       const incompleteUpdate = { animal_name: 'IncompleteUpdate' /* missing gender etc */ };
       const response = await request(app)
            .put(`/api/animals/${createdAnimalId}`)
            .send(incompleteUpdate);
        expect(response.statusCode).toBe(400);
        expect(response.body).toHaveProperty('message', expect.stringContaining('Missing required fields'));
    });

    it('PUT /api/animals/:id - should return 404 for non-existent animal ID', async () => {
       const validUpdateData = { animal_name: 'NoAnimal', gender: 'Female', weight_kg: 50, species_id: 1 };
       const response = await request(app)
            .put('/api/animals/99999') // Non-existent ID
            .send(validUpdateData);
        expect(response.statusCode).toBe(404);
        expect(response.body).toHaveProperty('message', expect.stringContaining('not found'));
    });

});

