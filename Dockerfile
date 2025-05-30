FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 3000 3001 3002 3003 3004 3005

CMD ["node", "services/gateway/index.js"]