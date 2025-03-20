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
RUN apt-get update && apt-get install -y curl git \
    && curl -sL https://deb.nodesource.com/setup_18.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/* \
    && git clone https://github.com/vechain/rosetta.git
WORKDIR /usr/src/app/rosetta
RUN npm ci && npm run build && npm install -g pm2 \
    && groupadd -r rosettagroup \
    && useradd -r -g rosettagroup rosettauser

COPY --from=builder /go/thor/bin/thor /usr/src/app/
EXPOSE 8080 8669 11235 11235/udp

USER rosettauser

ENTRYPOINT ["sh","./start.sh"]
