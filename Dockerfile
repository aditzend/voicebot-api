#
# ---- Base Node ----
FROM alpine:3.10 AS base
# install node
RUN apk add --update nodejs-current npm

RUN addgroup -S node && adduser -S node -G node

USER node

RUN mkdir /home/node/code

WORKDIR /home/node/code

COPY --chown=node:node package-lock.json package.json ./

RUN npm ci

COPY --chown=node:node ./src .

# copy production node_modules
# copy app sources
# expose port and define CMD
EXPOSE 8646
CMD ["node", "main.js"]
