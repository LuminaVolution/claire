FROM  ghcr.io/puppeteer/puppeteer:21.6.1
USER root
WORKDIR /usr/src/app
ENV  PUPPETEER_SKIP_CHROMIUM_DOWNLOAD true 
ENV  PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable 
COPY package*.json ./
RUN npm ci
COPY . .
CMD ["node", "scraper-presse-citron.js"]
