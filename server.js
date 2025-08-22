const express = require("express");
const cors = require("cors");
const puppeteer = require("puppeteer");

const app = express();
app.use(cors());
app.use(express.json());

// Serve static frontend files (index.html, script.js, etc.)
app.use(express.static(__dirname));

app.post("/fetch-comments", async (req, res) => {
  const { urls } = req.body;

  if (!urls || !Array.isArray(urls)) {
    return res.json([]); // ✅ Always return array
  }

  let results = [];

  for (const url of urls) {
    try {
      const browser = await puppeteer.launch({
        headless: "new",
        args: ["--no-sandbox", "--disable-setuid-sandbox"]
      });
      const page = await browser.newPage();
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });

      // ✅ Extract comments (adjust selectors as needed)
      const comments = await page.evaluate(() => {
        return Array.from(document.querySelectorAll("p"))
          .map(el => el.innerText.trim())
          .filter(Boolean);
      });

      await browser.close();

      // ✅ Classify comments
      const classified = comments.map(comment => {
        const isWarrant = /(bad|warrant|issue|problem|not good)/i.test(comment);
        return {
          url,
          comment,
          classification: isWarrant ? "Does Warrant" : "Does Not Warrant"
        };
      });

      results.push(...classified);

    } catch (err) {
      console.error(`Error scraping ${url}:`, err.message);

      // ✅ Push an error entry instead of breaking JSON
      results.push({
        url,
        comment: `Error fetching comments: ${err.message}`,
        classification: "Error"
      });
    }
  }

  res.json(results); // ✅ Always send array
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
