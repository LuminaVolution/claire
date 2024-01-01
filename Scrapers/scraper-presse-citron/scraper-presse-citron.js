const express = require('express');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs');
const path = require('path');
const dns = require('dns').promises;

// Apply stealth plugin to puppeteer
puppeteer.use(StealthPlugin());

// Initialize express app
const app = express();
const port = 3000;

// Function to check internet connectivity
async function checkInternetConnection() {
    try {
        await dns.lookup('google.com');
        return true;
    } catch (error) {
        console.error('No internet connection:', error);
        return false;
    }
}

// Main scraping function
async function scrapeData() {
    const articlesDirectory = path.join(__dirname, 'presse-citron-articles');
    const indexPath = path.join(articlesDirectory, 'presse-citron-index.json');

    if (!fs.existsSync(articlesDirectory)) {
        fs.mkdirSync(articlesDirectory, { recursive: true });
    }

    let indexData = [];
    if (fs.existsSync(indexPath)) {
        indexData = JSON.parse(fs.readFileSync(indexPath));
    }

    console.log("Launching browser...");
    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-accelerated-2d-canvas', '--no-first-run', '--no-zygote', '--single-process', '--disable-gpu']
    });

    const page = await browser.newPage();
    page.setDefaultNavigationTimeout(60000); // 60 seconds timeout

    const randomDelay = () => Math.floor(Math.random() * 3000) + 1000;
    const numberOfPages = 2; // Adjust as needed

    for (let i = 1; i <= numberOfPages; i++) {
        if (!await checkInternetConnection()) {
            console.log("No internet connection. Pausing script...");
            while (!await checkInternetConnection()) {
                await new Promise(resolve => setTimeout(resolve, 10000));
            }
            console.log("Internet connection resumed.");
        }

        console.log(`Navigating to page ${i}...`);
        await page.goto(`https://www.presse-citron.net/category/actualites/page/${i}/`, { waitUntil: 'networkidle2' });
        await page.waitForTimeout(randomDelay());

        console.log("Checking for cookie consent button...");
        const cookieButtonSelector = 'button.sd-cmp-1VJEb';
        if (await page.$(cookieButtonSelector) !== null) {
            console.log("Accepting cookies...");
            await page.click(cookieButtonSelector);
            await page.waitForTimeout(randomDelay());
        }

        console.log("Gathering article links...");
        const articleUrls = await page.$$eval('div.grid a[href]', links => links.map(link => link.href));

        for (const url of articleUrls) {
            let attempts = 3;
            while (attempts--) {
                try {
                    console.log(`Processing article: ${url}`);
                    const articlePage = await browser.newPage();
                    await articlePage.goto(url, { waitUntil: 'networkidle2' });

                    console.log("Scrolling through article...");
                    let lastHeight = await articlePage.evaluate('document.body.scrollHeight');
                    while (true) {
                        await articlePage.evaluate('window.scrollTo(0, document.body.scrollHeight)');
                        await articlePage.waitForTimeout(randomDelay());
                        let newHeight = await articlePage.evaluate('document.body.scrollHeight');
                        if (newHeight === lastHeight) {
                            break;
                        }
                        lastHeight = newHeight;
                    }

                    const articleData = await articlePage.evaluate(() => {
                        const title = document.querySelector('h1.entry-title')?.innerText || 'Title not found';
                        const dateElement = document.querySelector('time.updated');
                        let date = dateElement ? new Date(dateElement.getAttribute('datetime')).toISOString() : 'Date not found';
                        const subtitle = document.querySelector('div.post-excerpt p')?.innerText || 'Subtitle not found';
                        return { title, date, subtitle };
                    });

                    const fileName = `${articleData.date}_${articleData.title}.pdf`.replace(/[/\\?%*:|"<>]/g, '-');
                    const filePath = path.join(articlesDirectory, fileName);

                    if (!indexData.some(item => item.url === url)) {
                        console.log(`Saving article: ${fileName}`);
                        await articlePage.pdf({ path: filePath, format: 'A4' });

                        indexData.push({ ...articleData, url, filePath });
                        fs.writeFileSync(indexPath, JSON.stringify(indexData, null, 2));

                        console.log(`Article saved and index updated.`);
                    } else {
                        console.log(`Article already exists. Skipping.`);
                    }

                    await articlePage.close();
                    break;
                } catch (error) {
                    console.log(`Error processing ${url}: ${error}. Attempts remaining: ${attempts}`);
                    if (attempts <= 0) {
                        console.log(`Skipping ${url} after multiple failed attempts.`);
                    }
                }
            }
        }
    }

    console.log("Closing browser...");
    await browser.close();
    console.log("Script completed.");
}

// Define the POST route to trigger the scraping
app.post('/trigger', async (req, res) => {
    try {
        await scrapeData();
        res.send('Scraping initiated successfully.');
    } catch (error) {
        console.error('Scraping failed:', error);
        res.status(500).send('An error occurred during scraping.');
    }
});

// Start the server
app.listen(port, () => {
    console.log(`Scraper server listening on port ${port}`);
});

module.exports = app; // Optional: for testing purposes
