const axios = require('axios');
const cron = require('node-cron');

// URL to trigger the scraper
const scraperTriggerUrl = 'http://scraper-presse-citron:3000/trigger';

// Scheduler configuration
const cronConfig = {
  days: 0,
  hours: 3, // Every 3 hours
  minutes: 0,
  seconds: 0
};

// Convert configuration to cron format
function getCronSchedule(config) {
  const secondPart = '0'; // Run at second 0 of every minute
  const minutePart = config.minutes.toString().padStart(2, '0'); // Run at minute 0
  const hourPart = `*/${config.hours}`; // Every 3 hours
  const dayPart = '*'; // Every day

  return `${secondPart} ${minutePart} ${hourPart} ${dayPart} * *`;
}

const scraperTriggerSchedule = getCronSchedule(cronConfig);

// Function to trigger scraper
async function triggerScraper() {
  try {
    const response = await axios.post(scraperTriggerUrl);
    console.log('Scraper triggered:', response.data);
  } catch (error) {
    console.error('Error triggering scraper:', error);
  }
}

// Schedule cron job to trigger the scraper
cron.schedule(scraperTriggerSchedule, () => {
  console.log('Running scheduled job to trigger scraper');
  triggerScraper();
});

console.log('Scheduler started');
