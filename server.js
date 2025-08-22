const express = require("express");
const puppeteer = require("puppeteer");
const path = require("path");

const app = express();

app.use(express.json());
app.use("/public", express.static(path.join(__dirname, "public")));
app.get("/", (req, res) => res.sendFile(path.join(__dirname, "index.html")));

function classifyComment(text) {
  const c = text.toLowerCase();
  const hasPeopleWord = /\bpeople\b/.test(c);
  const hasPeopleDomain = /\b(?:https?:\/\/)?(?:www\.)?people\.com\b/.test(c);

  if (
    c.includes("recommend") ||
    c.includes("what are the") ||
    c.includes("which product") ||
    c.includes("can you suggest") ||
    c.includes("spam") ||
    c.includes("error") ||
    c.includes("mistake") ||
    c.includes("typo") ||
    c.includes("@people") ||
    hasPeopleWord ||
    hasPeopleDomain ||
    c.endsWith("?")
  )
    return "Does Warrant";

  return "Does Not Warrant";
}

async function autoScroll(page) {
  await page.evaluate(async () => {
    await new Promise((resolve) => {
      let totalHeight = 0;
      const distance = 400;
      const timer = setInterval(() => {
        const scrollHeight = document.body.scrollHeight;
        window.scrollBy(0, distance);
        totalHeight += distance;

        if (totalHeight >= scrollHeight) {
          clearInterval(timer);
          resolve();
        }
      }, 500);
    });
  });
}

app.post("/fetch-comments", async (req, res) => {
  const { urls } = req.body;
  const results = [];

  try {
    // ✅ Important: launch with Render-compatible args
    const browser = await puppeteer.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-accelerated-2d-canvas",
        "--no-first-run",
        "--no-zygote",
        "--single-process",
        "--disable-gpu",
      ],
    });

    for (const url of urls) {
      const page = await browser.newPage();
      await page.goto(url, { waitUntil: "networkidle2" });

      const hasNoComments = await page
        .$eval("span.comment-counter__text", (el) => el.innerText.trim().toLowerCase() === "leave a comment")
        .catch(() => false);

      if (!hasNoComments) {
        await autoScroll(page);
      }

      const comments = await page.$$eval(
        "div.vf-content-text.vf-comment__content-editor p span",
        (els) => els.map((e) => e.innerText.trim())
      );

      if (comments.length > 0) {
        comments.forEach((comment) => {
          results.push({
            url,
            comment,
            classification: classifyComment(comment),
          });
        });
      } else {
        results.push({
          url,
          comment: "No comments",
          classification: "No comments",
        });
      }

      await page.close();
    }

    await browser.close();
    res.json(results); // ✅ Always return JSON
  } catch (err) {
    console.error("Error in /fetch-comments:", err);
    res.status(500).json({ error: "Failed to fetch comments" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Server running at http://localhost:${PORT}`));
