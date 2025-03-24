# Build thor in a stock Go builder container
FROM golang:1.22 AS builder

ARG THOR_VERSION=v2.1.6

WORKDIR  /go/thor
RUN git clone https://github.com/vechain/thor.git /go/thor
RUN git checkout ${THOR_VERSION}
RUN make all

FROM ubuntu:24.04

WORKDIR /data
WORKDIR /usr/src/app
RUN apt-get update && apt-get --no-install-recommends install -y ca-certificates curl git \
    && curl --proto "=https" --tlsv1.2 -sSf -L https://deb.nodesource.com/setup_18.x | bash - \
    && apt-get --no-install-recommends install -y nodejs \
    && rm -rf /var/lib/apt/lists/* \
    && git clone https://github.com/vechain/rosetta.git
WORKDIR /usr/src/app/rosetta
RUN npm ci --ignore-scripts && \
    npm rebuild @pzzh/solc && \
    npm run build && \
    npm install --ignore-scripts -g pm2 \
    && groupadd -r rosettagroup \
    && useradd -r -g rosettagroup rosettauser \
    && mkdir -p /home/rosettauser/.pm2 \
    && chown -R rosettauser:rosettagroup /home/rosettauser/.pm2

COPY --from=builder /go/thor/bin/thor /usr/src/app/
EXPOSE 8080 8669 11235 11235/udp

USER rosettauser

ENTRYPOINT ["sh","./start.sh"]
