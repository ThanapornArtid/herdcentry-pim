// Import the puppeteer library
const puppeteer = require('puppeteer');
// Assuming your Node.js app (app.js) serves this page at /newAnimal
const ADD_ANIMAL_URL = 'http://localhost:3000/animalForm'; // Or adjust if served at a different path like /animalForm

// Use an async function to use await
(async () => {
  // Launch a new browser instance
  const browser = await puppeteer.launch();

  // Open a new page
  const page = await browser.newPage();

  console.log(`Navigating to ${ADD_ANIMAL_URL}...`);
  // Navigate to the Add New Animal page
  await page.goto(ADD_ANIMAL_URL, { waitUntil: 'networkidle0' }); // Wait until network activity settles

  console.log('Page loaded. Filling form...');

  // Animal Name / Tag ID
  await page.type('#animal_name', 'Test Puppeteer Animal');

  // Date of Birth
  // Note: Date input types require 'YYYY-MM-DD' format
  await page.type('#birth_date', '2024-01-15');

  // Weight (kg)
  await page.type('#weight_kg', '125.5');

  // Gender (select the 'Female' radio button)
  await page.click('#gender_female');

  // Species (select an existing species - IMPORTANT: Assumes species are loaded)
  // We need to wait for the species options to be populated by your fetchSpeciesAndPopulate function.
  // Let's assume a species with value '1' exists after loading.
  console.log('Waiting for species dropdown to populate...');
  // Wait for an option other than the default 'Loading...' to appear
  await page.waitForSelector('#species_id option:not([value=""])');
  await page.select('#species_id', '1'); // Select the option with value="1"

  // Current Diet (optional, leave it blank for this test)
  // await page.select('#current_diet_id', 'some_diet_id'); // If you wanted to select one

  console.log('Form filled. Submitting...');

  // --- Submit the form ---
  // Click the submit button
  await page.click('#submitButton');

  // --- Verify the result ---
  console.log('Waiting for submission result message...');

  // Wait for the message container to appear and check its content
  await page.waitForSelector('#messageContainer:not(.hidden)');

  const messageText = await page.$eval('#messageContainer', el => el.textContent);
  const isSuccess = await page.$eval('#messageContainer', el => el.classList.contains('text-green-800')); // Check if it's a success message

  console.log('Result message:', messageText);

  if (isSuccess && messageText.includes('added successfully')) {
    console.log('✅ Test Passed: Animal registered successfully!');
  } else {
    console.error('❌ Test Failed: Animal registration did not succeed or message incorrect.');
    // Optionally take a screenshot on failure
    await page.screenshot({ path: 'test-failure-screenshot.png' });
  }

  // Close the browser
  await browser.close();
})();