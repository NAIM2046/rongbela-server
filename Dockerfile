FROM node:20

WORKDIR /app

COPY package.json .

RUN npm install

COPY . .

# VOLUME ["/app/logs"]

EXPOSE 5000

RUN npx prisma generate

CMD ["sh", "-c", "npx prisma migrate deploy && npm run dev"]