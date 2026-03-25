### Stage 1: Build React app
# NOTE: Build context must be the project root (set via docker-compose.yml)
FROM node:20-alpine AS builder

WORKDIR /app

COPY frontend/package.json ./
RUN npm install

COPY frontend/ .
RUN npm run build

### Stage 2: Serve with Nginx
FROM nginx:alpine

# Copy built files
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy custom Nginx config (handles React Router + API proxy)
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
