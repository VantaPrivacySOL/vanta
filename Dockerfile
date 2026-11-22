FROM node:24-slim
WORKDIR /app
COPY package.json ./
COPY server ./server
COPY client ./client
ENV NODE_ENV=production PORT=8080
EXPOSE 8080
CMD ["node", "--max-old-space-size=160", "server/index.js"]
