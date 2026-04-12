FROM node:22-alpine
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY ./ ./
RUN npm run build
RUN npm prune --omit=dev
ENV NODE_ENV=production
CMD ["node", "dist/src/app.js"]
