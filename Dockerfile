# Build thor in a stock Go builder container
FROM golang:1.25 AS thor-builder

ARG THOR_REPO=https://github.com/vechain/thor.git
ARG THOR_VERSION=v2.3.1

WORKDIR /go/thor
RUN git clone ${THOR_REPO} . && \
    git checkout ${THOR_VERSION} && \
    make all

# Node.js builder stage
FROM node:18-alpine AS node-builder

WORKDIR /usr/src/app/rosetta

COPY package*.json ./
RUN npm install --ignore-scripts && \
    npm rebuild @pzzh/solc

COPY process_online.json ./
COPY process_online_solo.json ./
COPY process_offline.json ./
COPY tsconfig.json ./
COPY src/ ./src/
COPY start.sh ./
COPY config/ ./config/

RUN npm run build

# Final stage
FROM ubuntu:24.04

RUN apt-get update && \
    apt-get --no-install-recommends install -y \
    ca-certificates \
    curl \
    && curl --proto "=https" --tlsv1.2 -sSf -L https://deb.nodesource.com/setup_18.x | bash - \
    && apt-get --no-install-recommends install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

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

WORKDIR /usr/src/app
RUN chmod +x start.sh

RUN npm install --ignore-scripts -g pm2

EXPOSE 8080 8669 11235 11235/udp

USER rosettauser

ENTRYPOINT ["sh","./start.sh"]
