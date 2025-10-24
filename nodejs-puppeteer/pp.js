// เรียกใช้ไลบรารี่ puppeteer 
const puppeteer = require('puppeteer');

// เว็บไซต์
const WEBSITE_URL = 'http://localhost:3000/newAnimal.html';

(async (WEBSITE_URL) => {

  // เปิด Browser 
  const browser = await puppeteer.launch();

  // เปิด page 
  const page = await browser.newPage();

  // เข้าเว็บไซต์
  await page.goto(WEBSITE_URL);
  
  // screenshot หน้าเว็บไซต์
  await page.screenshot({path: 'screenshots.png'});
  
  // ปิด Browser 
  await browser.close();
  
})(WEBSITE_URL);