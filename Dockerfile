# base image, renovatebot will update the base image
FROM node:22.13.1-alpine3.21 AS base

# builder image
FROM base AS builder

USER node

WORKDIR /app

COPY package*.json ./
COPY .npmrc ./

RUN npm clean-install --no-audit --no-progress

COPY --chown=node:node . .

RUN npm run build

# intermediate image
FROM base AS intermediate

USER node

WORKDIR /app

COPY --chown=node:node package*.json ./
COPY --chown=node:node .npmrc ./
COPY --chown=node:node --from=builder /home/node/.npm/ /home/node/.npm/

RUN NODE_ENV=production npm clean-install --prefer-offline --no-audit --no-progress

# production image
FROM base

ENV NODE_ENV=production

LABEL name="node-atuin-server"
LABEL description="Atuin node API server"

USER node

WORKDIR /app

COPY --chown=node:node package.json ./
COPY --chown=node:node .npmrc ./
COPY --chown=node:node ./openapi ./openapi
COPY --chown=node:node ./public ./public
COPY --chown=node:node ./views ./views
COPY --chown=node:node ./templates ./templates
COPY --chown=node:node --from=intermediate /app/ ./

USER nobody

CMD [ "node", "dist/otel.js" ]
