// Import the puppeteer library
const puppeteer = require('puppeteer');

// !!! IMPORTANT: Replace with the ID of an EXISTING animal in your database !!!
const ANIMAL_ID_TO_EDIT = 1; // Example: Using ID 1 from seed_data.sql

// Construct the URL for the edit page
const EDIT_ANIMAL_URL = `http://localhost:3000/editAnimal?id=${ANIMAL_ID_TO_EDIT}`;

// Use an async function to use await
(async () => {
  // Launch a new browser instance
  const browser = await puppeteer.launch();

  // Open a new page
  const page = await browser.newPage();

  console.log(`Navigating to ${EDIT_ANIMAL_URL}...`);
  // Navigate to the Edit Animal page for the specific ID
  await page.goto(EDIT_ANIMAL_URL, { waitUntil: 'networkidle0' }); // Wait until network activity settles

  console.log('Page loaded. Waiting for form to populate...');

  // --- Wait for the form to be populated ---
  // Wait for a field that gets populated last, like the species dropdown having options
  await page.waitForSelector('#species_id option:not([value=""])');
  // Or wait for the name field to have a value (assuming it's fetched)
  await page.waitForFunction(
    () => document.getElementById('animal_name').value.length > 0
  );
  console.log('Form populated with existing data.');

  // --- Modify some fields ---
  const newName = `${Math.random().toString(36).substring(7)}`; // Generate a random name
  const newWeight = (Math.random() * 100 + 50).toFixed(2); // Generate a random weight

  // Clear existing name and type the new one
  // Puppeteer v22+ approach:
  await page.evaluate(() => {
    document.getElementById('animal_name').value = '';
    document.getElementById('weight_kg').value = '';
  });
  // Or for older versions:
  // await page.click('#animal_name', { clickCount: 3 }); // Select all text
  // await page.keyboard.press('Backspace');
  await page.type('#animal_name', newName);

  // Clear existing weight and type the new one
  // await page.click('#weight_kg', { clickCount: 3 });
  // await page.keyboard.press('Backspace');
  await page.type('#weight_kg', newWeight);

  // Optionally change other fields like gender or species
  // await page.click('#gender_male');
  // await page.select('#species_id', '2'); // Change species if needed

  console.log(`Updating name to: ${newName}, weight to: ${newWeight}`);
  console.log('Submitting updated form...');

  // --- Submit the form ---
  await page.click('#submitButton');

  // --- Verify the result ---
  console.log('Waiting for update result message...');

  // Wait for the message container to appear and check its content
// Wait specifically for the success message styles to be applied
  await page.waitForSelector('#messageContainer.text-green-800');

  const messageText = await page.$eval('#messageContainer', el => el.textContent);
  const isSuccess = await page.$eval('#messageContainer', el => el.classList.contains('text-green-800'));

  console.log('Result message:', messageText);

  if (isSuccess && messageText.includes('updated successfully')) {
    console.log('✅ Test Passed: Animal updated successfully!');

    // Optional: Verify the data was actually saved by checking the form again
    const updatedNameValue = await page.$eval('#animal_name', el => el.value);
    const updatedWeightValue = await page.$eval('#weight_kg', el => el.value);
    if (updatedNameValue === newName && updatedWeightValue === newWeight) {
      console.log('✅ Verification Passed: Form fields reflect the saved changes.');
    } else {
      console.error('❌ Verification Failed: Form fields do not match updated values.');
      console.error(` Expected Name: ${newName}, Got: ${updatedNameValue}`);
      console.error(` Expected Weight: ${newWeight}, Got: ${updatedWeightValue}`);
    }

  } else {
    console.error('❌ Test Failed: Animal update did not succeed or message incorrect.');
    console.error(' Check server logs for detailed database errors!');
    await page.screenshot({ path: 'test-update-failure-screenshot.png' });
  }

  // Close the browser
  await browser.close();
})();