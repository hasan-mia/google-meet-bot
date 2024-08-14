# Use a small base image
FROM node:18-slim

# Install necessary dependencies for Puppeteer

RUN apt-get update && apt-get install -y ffmpeg

# Set the working directory
WORKDIR /app

# Copy the package.json and install dependencies
COPY package.json ./
RUN npm install

# Copy the rest of the application code
COPY ./src ./src

# Run the application
CMD ["npm", "start"]
