const cheerio = require("cheerio");
const fetch = require("node-fetch");
require("dotenv").config();

const botToken = process.env.BOT_TOKEN;
const chatId = process.env.CHAT_ID;
const loginUrl = "https://ais.usvisa-info.com/en-et/niv/users/sign_in";
const scrapeUrl =
  "https://ais.usvisa-info.com/en-et/niv/schedule/57941991/payment";
const username = "wabcdefghij14w@gmail.com"; // Moved username to .env for security
const password = process.env.PASSWORD;

// Function to send messages to Telegram
async function postToTelegram(slotInfo) {
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
    } catch (error) {
      console.error("Error sending message:", error.message);
    }
  }
}

// Main function to automate login and scraping
async function automateLogin() {
  try {
    const puppeteer = require("puppeteer-core");
    const chrome = require("chrome-aws-lambda");

    const browser = await puppeteer.launch({
      args: chrome.args,
      headless: true,
      executablePath:
        process.env.NODE_ENV === "production"
          ? await chrome.executablePath
          : "/usr/bin/google-chrome-stable", // For local testing
    });

    const page = await browser.newPage();

    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
    );

    await page.goto(loginUrl, { waitUntil: "networkidle2" });

    await page.type("#user_email", username);
    await page.type("#user_password", password);

    await page.click('input[name="policy_confirmed"]');
    await page.click('input[type="submit"]');

    await page.waitForNavigation();

    const currentUrl = page.url();

    if (currentUrl.includes("ais.usvisa-info.com/en-et/niv/groups/")) {
      try {
        await page.goto(scrapeUrl, { waitUntil: "networkidle2" });

        await page.waitForSelector("td.text-right", { timeout: 15000 });

        const content = await page.content();
        const $ = cheerio.load(content);
        const slotInfo = $("td.text-right").text().trim();

        if (slotInfo) {
          await postToTelegram(slotInfo);
        }
      } catch (error) {
        console.error(
          "Error navigating or scraping the target page:",
          error.message
        );
      }
    }

    await browser.close();
  } catch (error) {
    console.error("Error during automation:", error.message);
  }
}

// Execute the automation function
automateLogin();
