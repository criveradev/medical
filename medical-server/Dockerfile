# syntax=docker/dockerfile:1

FROM node:24-bookworm-slim AS base
WORKDIR /app
COPY package*.json ./

FROM base AS development-dependencies
RUN npm ci

FROM development-dependencies AS development
ENV NODE_ENV=development
COPY --chown=node:node . .
RUN mkdir -p logs uploads/resultados \
    && chown -R node:node logs uploads
USER node
EXPOSE 3000
CMD ["npm", "run", "dev"]

FROM development AS test
ENV NODE_ENV=test
CMD ["npm", "test", "--", "--runInBand"]

FROM base AS production-dependencies
ENV NODE_ENV=production
RUN npm ci --omit=dev \
    && npm cache clean --force

FROM node:24-bookworm-slim AS production
ENV NODE_ENV=production
WORKDIR /app
COPY --from=production-dependencies --chown=node:node /app/node_modules ./node_modules
COPY --chown=node:node package*.json server.js reminders-once.js instrument.js ./
COPY --chown=node:node src ./src
RUN mkdir -p logs uploads/resultados \
    && chown -R node:node logs uploads
USER node
EXPOSE 3000
CMD ["npm", "start"]
