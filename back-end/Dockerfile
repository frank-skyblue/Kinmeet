FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
RUN npm install -g typescript
COPY ./ ./
RUN npm run build
CMD [ "node", "./dist/src/app.js" ]