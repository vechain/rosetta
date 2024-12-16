ARG THOR_VERSION=v2.1.5

FROM vechain/thor:${THOR_VERSION} AS thor-builder

FROM alpine:3.20 AS node-buider

# Install necessary packages
RUN apk add --no-cache ca-certificates bash nodejs npm

# Copy and build rosetta
WORKDIR /usr/src/app/rosetta
COPY package.json package-lock.json tsconfig.json ./
RUN npm ci --ignore-scripts \
    && cd node_modules/@pzzh/solc \
    && npm run postinstall
COPY src src
RUN npm run build

FROM alpine:3.20

RUN apk add --no-cache ca-certificates nodejs npm

# Install pm2 globally
RUN npm install -g pm2

WORKDIR /usr/src/app/rosetta

COPY --from=thor-builder /usr/local/bin/thor /usr/src/app
COPY --from=node-buider /usr/src/app/rosetta/dist/index.js /usr/src/app/rosetta/dist/index.js

COPY process_online.json process_offline.json start.sh ./
COPY rosetta-cli-conf rosetta-cli-conf
COPY config config

# Create a non-root user
RUN adduser -D -s /bin/ash thor

# Create /data/logs directory and set permissions for the thor user
RUN mkdir -p /data/logs && chown -R thor:thor /data/logs

# Prepare PM2 directories with correct permissions
RUN mkdir -p /home/thor/.pm2/logs /home/thor/.pm2/pids && \
    chown -R thor:thor /home/thor/.pm2

ENV PM2_HOME=/home/thor/.pm2

USER thor

EXPOSE 8080 8669 11235 11235/udp

ENTRYPOINT ["sh", "./start.sh"]
