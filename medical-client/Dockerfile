# syntax=docker/dockerfile:1

FROM node:24-bookworm-slim AS base
WORKDIR /app
COPY package*.json ./

FROM base AS dependencies
RUN npm ci && chown -R node:node /app/node_modules

FROM dependencies AS development
ENV NODE_ENV=development
COPY --chown=node:node . .
USER node
EXPOSE 4200
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]

FROM dependencies AS build
ARG VITE_API_URL=""
ENV VITE_API_URL=$VITE_API_URL
COPY . .
RUN npm run build

FROM nginx:1.30.4-alpine AS production
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80

FROM mcr.microsoft.com/playwright:v1.62.0-noble AS e2e
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY playwright.config.js ./
COPY e2e ./e2e
CMD ["npx", "playwright", "test"]
