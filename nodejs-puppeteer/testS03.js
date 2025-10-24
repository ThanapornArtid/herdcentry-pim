// Filename: testS03.js
const puppeteer = require('puppeteer');

// --- Configuration ---
// The page to test
const MEDICAL_URL = 'http://localhost:3000/medical.html';
// The animal to add records for (must exist in your database)
const ANIMAL_ID = '1'; // Using 'Bessie' from seed_data.sql

// --- Test Data ---
const testVet = `Dr. Puppeteer ${Math.random().toString(36).substring(7)}`;
const testNote = `Puppeteer test exam note ${Date.now()}`;
const testJsonString = JSON.stringify([
  {
    "test_name": `Puppeteer Test ${Math.random().toString(36).substring(7)}`,
    "test_date": new Date().toISOString(), // Use current time
    "result_value": "Positive",
    "notes": "Automated test result"
  }
], null, 2); // 'null, 2' formats it with indentation

// Use an async function to use await
(async () => {
  let browser;
  let testPassed = false;
  try {
    browser = await puppeteer.launch();
    const page = await browser.newPage();

    console.log(`Navigating to ${MEDICAL_URL}...`);
    await page.goto(MEDICAL_URL, { waitUntil: 'networkidle0' });

    // --- 1. Select Animal ---
    console.log('Waiting for animal dropdown to populate...');
    // Wait for an option other than the default 'Loading animals...'
    await page.waitForSelector('#animalSelect option:not([value=""])');
    
    console.log(`Selecting Animal ID: ${ANIMAL_ID}`);
    await page.select('#animalSelect', ANIMAL_ID);

    // Wait for the initial medical records to load
    // We'll wait for the "Medical Exams" table body to appear
    await page.waitForSelector('#examsBody');

    // --- 2. Test: Record Medical Examination ---
    console.log('--- Testing Medical Exam Form ---');
    console.log(`Filling exam form with Vet: ${testVet}`);

    // Fill the exam form
  // Fill the exam form
    await page.$eval('#examDate', el => el.value = '2025-10-25T10:30'); // Set value directly
    await page.type('#veterinarian', testVet);
    await page.type('#weightKg', '500.25');
    await page.type('#temperatureC', '38.5');
    await page.type('#examNotes', testNote);

    console.log('Submitting exam form...');
    // Click submit and wait for the network request to finish and tables to reload
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 5000 }).catch(() => {}), // Handle case where no full navigation happens
      page.click('#examForm button[type="submit"]'),
      page.waitForSelector('#examsBody tr') // Wait for the table to have at least one row
    ]);
    
    console.log('Verifying exam submission...');

    // Verify the new exam appeared in the table
    const examSuccess = await page.evaluate((vet, note) => {
      const rows = Array.from(document.querySelectorAll('#examsBody tr'));
      return rows.some(row => 
        row.cells[1].textContent.includes(vet) &&
        row.cells[4].textContent.includes(note)
      );
    }, testVet, testNote);

    if (!examSuccess) {
      throw new Error('Test Failed: New medical exam did not appear in the history table.');
    }
    console.log('✅ Medical Exam test passed.');


    // --- 3. Test: Import Diagnostic Results ---
    console.log('--- Testing Diagnostic Import ---');
    console.log(`Filling JSON import with: ${testJsonString}`);
    
    // Fill the JSON textarea
    await page.type('#resultsJson', testJsonString);

    console.log('Submitting diagnostic import...');
    // Click import and wait for tables to reload
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 5000 }).catch(() => {}),
      page.click('#importBtn'),
      page.waitForSelector('#resultsBody tr') // Wait for the results table
    ]);

    console.log('Verifying diagnostic submission...');
    const testName = JSON.parse(testJsonString)[0].test_name;
    const diagnosticSuccess = await page.evaluate((name) => {
      const rows = Array.from(document.querySelectorAll('#resultsBody tr'));
      return rows.some(row => 
        row.cells[1].textContent.includes(name)
      );
    }, testName);

    if (!diagnosticSuccess) {
      throw new Error('Test Failed: New diagnostic result did not appear in the history table.');
    }
    console.log('✅ Diagnostic Import test passed.');
    
    // If both passed
    testPassed = true;
    console.log('🎉 ✅ All S03 Tests Passed! ✅ 🎉');

  } catch (error) {
    console.error(`❌ Test Failed: ${error.message}`);
    if (browser) {
      const page = (await browser.pages())[0];
      if (page) await page.screenshot({ path: 'test-S03-failure.png' });
    }
  } finally {
    if (browser) {
      await browser.close();
    }
  }
})();