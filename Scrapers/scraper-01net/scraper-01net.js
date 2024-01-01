const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs');
const path = require('path');
const dns = require('dns').promises;

puppeteer.use(StealthPlugin());

// Configuration settings
const config = {
    baseUrl: 'https://www.01net.com/actualites/page/',
    numberOfPages: 500,
    articlesDirectory: path.join(__dirname, '01net-articles'),
    indexPath: path.join(__dirname, '01net-articles', '01net-index.json'),
    navigationTimeout: 60000, // 60 seconds
    randomDelay: () => Math.floor(Math.random() * (4300 - 2800 + 1)) + 2800 // Random delay between 2.8s and 4.3s
};

// Function to check internet connectivity
async function checkInternetConnection() {
    try {
        await dns.lookup('google.com');
        return true;
    } catch (error) {
        console.error("Internet connection error:", error);
        return false;
    }
}

// Function to handle cookie consent
async function handleCookieConsent(articlePage) {
    await articlePage.waitForTimeout(config.randomDelay());
    const cookieButtonSelector = 'button.sd-cmp-1VJEb span.sd-cmp-2nUXb';
    if (await articlePage.$(cookieButtonSelector) !== null) {
        await articlePage.click(cookieButtonSelector);
    }
}

// Function to scrape article data
async function scrapeArticleData(articlePage) {
    return await articlePage.evaluate(() => {
        const title = document.querySelector('h1.entry-title')?.innerText || 'Title not found';
        const dateElement = document.querySelector('time.updated');
        let date = dateElement ? new Date(dateElement.getAttribute('datetime')).toISOString() : 'Date not found';
        const author = document.querySelector('div.text-right.py-4.px-8.border div.font-light.text-lg.leading-6')?.innerText.trim() || 'Author not found';
        const subtitle = document.querySelector('.post-excerpt p')?.innerText || 'Subtitle not found';
        return { title, date, author, subtitle };
    });
}

(async () => {
    if (!fs.existsSync(config.articlesDirectory)) {
        fs.mkdirSync(config.articlesDirectory, { recursive: true });
    }

    let indexData = [];
    if (fs.existsSync(config.indexPath)) {
        indexData = JSON.parse(fs.readFileSync(config.indexPath));
    }

    const processedUrls = new Set();

    const browser = await puppeteer.launch({
        headless: false,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-accelerated-2d-canvas', '--no-first-run', '--no-zygote', '--single-process', '--disable-gpu']
    });
    const page = await browser.newPage();
    page.setDefaultNavigationTimeout(config.navigationTimeout);

    for (let i = 1; i <= config.numberOfPages; i++) {
        if (!await checkInternetConnection()) {
            console.log("No internet connection. Retrying...");
            await new Promise(resolve => setTimeout(resolve, 10000));
            continue;
        }

        console.log(`Navigating to page ${i}...`);
        await page.goto(`${config.baseUrl}${i}/`, { waitUntil: 'networkidle2' });
        await page.waitForTimeout(config.randomDelay());

        console.log("Gathering article links...");
        const articleUrls = await page.$$eval('article a[href]', links => links.map(link => link.href));

        for (const url of articleUrls) {
            if (processedUrls.has(url)) {
                console.log(`Skipping already processed article: ${url}`);
                continue;
            }

            let attempts = 3;
            while (attempts-- > 0) {
                try {
                    console.log(`Processing article: ${url}`);
                    const articlePage = await browser.newPage();
                    await articlePage.goto(url, { waitUntil: 'networkidle2' });

                    await handleCookieConsent(articlePage);

                    const articleData = await scrapeArticleData(articlePage);
                    const fileName = `${articleData.date}_${articleData.title}.pdf`.replace(/[/\\?%*:|"<>]/g, '-');
                    const filePath = path.join(config.articlesDirectory, fileName);

                    if (!indexData.some(item => item.url === url)) {
                        await articlePage.pdf({ path: filePath, format: 'A4' });
                        indexData.push({ ...articleData, url, filePath });
                        fs.writeFileSync(config.indexPath, JSON.stringify(indexData, null, 2));
                        console.log(`Article saved: ${fileName}`);
                        processedUrls.add(url);
                    } else {
                        console.log(`Article already exists, skipping: ${url}`);
                    }

                    await articlePage.close();
                } catch (error) {
                    console.error(`Error processing ${url}: ${error}. Attempts remaining: ${attempts}`);
                    if (attempts <= 0) {
                        console.log(`Skipping ${url} after multiple failed attempts.`);
                    }
                }
            }
        }
    }

    await browser.close();
    console.log("Script completed.");
})();
