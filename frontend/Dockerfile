# 1) build stage
FROM node:18 AS builder
WORKDIR /app

# Require API base URL at build time
ARG VITE_API_BASE_URL
RUN if [ -z "$VITE_API_BASE_URL" ]; then \
      echo "❌ ERROR: VITE_API_BASE_URL is not set! Please pass it via --build-arg or docker-compose args." && \
      exit 1; \
    fi

# Make available to npm build
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# 2) production image using nginx
FROM nginx:stable-alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx/default.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
