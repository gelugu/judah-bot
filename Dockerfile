FROM node:18.4-alpine

WORKDIR /bot

COPY ./package*.json /bot/
RUN npm ci

COPY ./src /bot/src
COPY ./tsconfig.json /bot/tsconfig.json

RUN npm run build

CMD ["npm", "start"]
