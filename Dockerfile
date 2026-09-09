FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY src ./src
COPY shared ./shared
COPY webpack.config.js ./
RUN npm run build

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production PORT=8080 MAX_ROOMS=8 MAX_CONNECTIONS=96
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=build /app/dist ./dist
COPY server/server.js ./server/server.js
COPY server/rankings ./server/rankings
RUN mkdir -p /app/server/data && chown node:node /app/server/data
COPY shared ./shared
USER node
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s --start-period=15s CMD node -e "fetch('http://127.0.0.1:8080/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "server/server.js"]
