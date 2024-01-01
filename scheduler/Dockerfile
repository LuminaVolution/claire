# Use the official Node slim image as a parent image
FROM node:16-slim

# Set the working directory in the container
WORKDIR /usr/src/app

# Copy package.json and package-lock.json (if available)
COPY package*.json ./

# Install any dependencies
RUN npm install

# Copy the rest of your application's source code from your host to your image filesystem
COPY . .

# At runtime, this container will execute the command to start your scheduler
CMD ["node", "scheduler.js"]
