# Build thor in a stock Go builder container
FROM golang:1.25 AS thor-builder

ARG THOR_REPO=https://github.com/vechain/thor.git
ARG THOR_VERSION=v2.4.0

WORKDIR /go/thor
RUN git clone --depth 1 --branch ${THOR_VERSION} ${THOR_REPO} . && \
    make thor

# Node.js builder stage
FROM node:18-alpine AS node-builder

WORKDIR /usr/src/app/rosetta

COPY package*.json ./
RUN npm ci

COPY process_online.json ./
COPY process_online_solo.json ./
COPY process_offline.json ./
COPY tsconfig.json ./
COPY src/ ./src/
COPY start.sh ./
COPY config/ ./config/

RUN npm run build

# Final stage
FROM node:18-slim

RUN groupadd -r rosettagroup && \
    useradd -r -g rosettagroup rosettauser && \
    mkdir -p /home/rosettauser/.pm2 && \
    chown -R rosettauser:rosettagroup /home/rosettauser/.pm2

WORKDIR /usr/src/app

# Copy only necessary built artifacts
COPY --from=thor-builder /go/thor/bin/thor ./
COPY --from=node-builder /usr/src/app/rosetta/dist ./rosetta/dist
COPY --from=node-builder /usr/src/app/rosetta/start.sh ./
COPY --from=node-builder /usr/src/app/rosetta/package*.json ./rosetta/
COPY --from=node-builder /usr/src/app/rosetta/process_online.json ./rosetta/
COPY --from=node-builder /usr/src/app/rosetta/process_online_solo.json ./rosetta/
COPY --from=node-builder /usr/src/app/rosetta/process_offline.json ./rosetta/
COPY --from=node-builder /usr/src/app/rosetta/node_modules ./rosetta/node_modules
COPY --from=node-builder /usr/src/app/rosetta/config ./rosetta/config

RUN chmod +x start.sh

RUN npm install --ignore-scripts -g pm2

EXPOSE 8080 8669 11235 11235/udp

USER rosettauser

ENTRYPOINT ["sh","./start.sh"]
