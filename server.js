const express = require("express");
const cors = require("cors");
const puppeteer = require("puppeteer");

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

app.post("/fetch-comments", async (req, res) => {
  const { urls } = req.body;

  if (!urls || !Array.isArray(urls)) {
    return res.json([]);
  }

  let results = [];

  for (const url of urls) {
    try {
      const browser = await puppeteer.launch({
        headless: true,
        executablePath: puppeteer.executablePath(), // ✅ ensures Puppeteer finds Chromium
        args: [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-dev-shm-usage",
          "--disable-gpu",
        ],
      });

      const page = await browser.newPage();
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });

      const comments = await page.evaluate(() => {
        return Array.from(document.querySelectorAll("p"))
          .map(el => el.innerText.trim())
          .filter(Boolean);
      });

      await browser.close();

      const classified = comments.map(comment => {
        const isWarrant = /(bad|warrant|issue|problem|not good)/i.test(comment);
        return {
          url,
          comment,
          classification: isWarrant ? "Does Warrant" : "Does Not Warrant",
        };
      });

      results.push(...classified);

    } catch (err) {
      console.error(`Error scraping ${url}:`, err.message);
      results.push({
        url,
        comment: `Error fetching comments: ${err.message}`,
        classification: "Error",
      });
    }
  }

  res.json(results);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
