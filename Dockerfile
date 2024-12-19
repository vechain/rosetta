# Build thor in a stock Go builder container
ARG THOR_VERSION=v2.1.6

FROM golang:1.22 AS builder

WORKDIR  /go/thor
RUN git clone https://github.com/vechain/thor.git /go/thor
RUN git checkout ${THOR_VERSION}
RUN make all

FROM ubuntu:24.04

WORKDIR /data
WORKDIR /usr/src/app
RUN apt-get update
RUN apt-get install -y git
RUN apt-get install -y curl

RUN curl -sL https://deb.nodesource.com/setup_18.x | bash
RUN apt-get install -y nodejs

RUN git clone https://github.com/vechain/rosetta.git
WORKDIR /usr/src/app/rosetta
RUN git checkout master
RUN npm ci && npm run build

RUN npm install -g pm2

COPY --from=builder /go/thor/bin/thor /usr/src/app/
EXPOSE 8080 8669 11235 11235/udp

ENTRYPOINT ["sh","./start.sh"]
