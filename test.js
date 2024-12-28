console.log("Script started");

const cheerio = require("cheerio");
const fetch = require("node-fetch"); // Required for Telegram API requests
const qs = require("querystring"); // For encoding form data for POST requests

// Configuration using environment variables
require("dotenv").config();
const botToken = process.env.BOT_TOKEN;
const chatId = process.env.CHAT_ID;
const loginUrl = "https://ais.usvisa-info.com/en-et/niv/users/sign_in";
const scrapeUrl =
  "https://ais.usvisa-info.com/en-et/niv/schedule/57941991/payment";
const username = "wabcdefghij14w@gmail.com";

const password = process.env.PASSWORD;
console.log("Loaded password:", process.env.PASSWORD);


// Function to send messages to Telegram
async function postToTelegram(slotInfo) {
  console.log("Posting to Telegram...");
  if (slotInfo) {
    try {
      const message = `Available slot: ${slotInfo}`;
      const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: message,
        }),
      });

      if (!response.ok) {
        throw new Error(`Telegram API error: ${response.statusText}`);
      }

      console.log("Message sent to Telegram");
    } catch (error) {
      console.error("Error sending message:", error);
    }
  } else {
    console.log("No appointments available");
  }
}

// Main function to automate login and scraping
async function automateLogin() {
  console.log("Inside automateLogin function");

  try {
    // Use puppeteer-core locally, chrome-aws-lambda in production (Render)
    const puppeteer =
      process.env.NODE_ENV === "production"
        ? require("chrome-aws-lambda")
        : require("puppeteer-core");

    const browser = await puppeteer.launch({
      args:
        process.env.NODE_ENV === "production"
          ? require("chrome-aws-lambda").args
          : ["--no-sandbox", "--disable-setuid-sandbox"], // Default args locally (for Render, we use chrome-aws-lambda)
      executablePath:
        process.env.NODE_ENV === "production"
          ? await require("chrome-aws-lambda").executablePath
          : "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe", // Path for local installation (adjust if needed)
      headless: true,
    });

    console.log("Browser launched");

    // Make sure 'page' is properly initialized here
    const page = await browser.newPage();
    console.log("New page created");

    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
    );

    console.log("Navigating to login page...");
    await page.goto(loginUrl, { waitUntil: "networkidle2" });
    console.log("Login page loaded");

    console.log("Filling in login form...");
    await page.type("#user_email", username);
    await page.type("#user_password", password);
    console.log("Login form filled");
    console.log("Username:", username);
    console.log("Password:", password);

    console.log("Ticking checkbox and submitting form...");
    await page.click('input[name="policy_confirmed"]');
    await page.click('input[type="submit"]');
    console.log("Form submitted");

    // Wait for navigation or wait for an element that indicates successful login
    console.log("Waiting for navigation or specific page element...");
    await page.waitForNavigation();

    // Look for a specific element after login
    console.log("Page loaded after form submission");

    const currentUrl = page.url();
    console.log(`Current URL after login: ${currentUrl}`);

    if (currentUrl.includes("ais.usvisa-info.com/en-et/niv/groups/")) {
      console.log("Redirected to target page");

      console.log("Navigating to scrape URL...");
      try {
        await page.goto(scrapeUrl, { waitUntil: "networkidle2" });
      } catch (error) {
        console.error("Error navigating to scrape URL:", error);
        return;
      }
      console.log("Scrape URL loaded");

      console.log("Waiting for page content...");
      await page
        .waitForSelector("td.text-right", { timeout: 15000 })
        .catch(() => {
          console.log("Timeout: Unable to find slot information.");
        });

      const content = await page.content();
      const $ = cheerio.load(content);
      const slotInfo = $("td.text-right").text().trim();

      if (!slotInfo) {
        console.log("No slot available.");
      } else {
        console.log(`Slot info: ${slotInfo}`);
        await postToTelegram(slotInfo);
        console.log("Slot info posted to Telegram");
      }
    } else {
      console.log("Login failed, unexpected redirect or invalid credentials.");
    }

    await browser.close();
    console.log("Browser closed");
  } catch (error) {
    console.error("Error during automation:", error);
  }
}

// Execute the automation function
automateLogin();
