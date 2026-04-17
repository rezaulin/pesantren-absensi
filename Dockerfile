FROM node:22-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm install --production

# Copy app
COPY . .

# Create data dir
RUN mkdir -p /app/data

# Expose port
EXPOSE 3000

# Start
CMD ["node", "server.js"]
