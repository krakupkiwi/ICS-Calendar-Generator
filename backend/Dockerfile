FROM node:20-alpine

WORKDIR /app

# Copy package files first for better layer caching
COPY package.json ./

# Install production dependencies only
RUN npm install --omit=dev

# Copy application source
COPY src/ ./src/

# Create data directory
RUN mkdir -p /data

EXPOSE 3001

ENV NODE_ENV=production
ENV PORT=3001
ENV DATA_PATH=/data/fixtures.json

CMD ["node", "src/index.js"]
