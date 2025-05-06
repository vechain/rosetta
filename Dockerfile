# Build thor in a stock Go builder container
FROM golang:1.22 AS thor-builder

ARG THOR_VERSION=v2.1.6

WORKDIR /go/thor
RUN git clone https://github.com/vechain/thor.git . && \
    git checkout ${THOR_VERSION} && \
    make all

# Node.js builder stage
FROM node:18-alpine AS node-builder

WORKDIR /usr/src/app/rosetta
COPY package*.json ./
RUN npm install --ignore-scripts && \
    npm rebuild @pzzh/solc

COPY . .
RUN npm run build

# Final stage
FROM ubuntu:24.04

# Install system dependencies
RUN apt-get update && \
    apt-get --no-install-recommends install -y \
    ca-certificates \
    curl \
    && curl --proto "=https" --tlsv1.2 -sSf -L https://deb.nodesource.com/setup_18.x | bash - \
    && apt-get --no-install-recommends install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

# Setup application directories and user
RUN groupadd -r rosettagroup && \
    useradd -r -g rosettagroup rosettauser && \
    mkdir -p /home/rosettauser/.pm2 && \
    chown -R rosettauser:rosettagroup /home/rosettauser/.pm2

# Set working directories
WORKDIR /data
WORKDIR /usr/src/app

# Copy built artifacts and scripts
COPY --from=thor-builder /go/thor/bin/thor /usr/src/app/
COPY --from=node-builder /usr/src/app/rosetta /usr/src/app/rosetta
COPY --from=node-builder /usr/src/app/rosetta/start.sh /usr/src/app/

# Make start.sh executable
RUN chmod +x /usr/src/app/start.sh

# Install PM2 globally
RUN npm install --ignore-scripts -g pm2

# Expose ports
EXPOSE 8080 8669 11235 11235/udp

# Switch to non-root user
USER rosettauser

# Set entrypoint
ENTRYPOINT ["sh","./start.sh"]
