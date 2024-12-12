# Build thor in a stock Go builder container
ARG THOR_VERSION=v2.1.4

FROM golang:1.22-alpine3.20 AS builder

RUN apk add --no-cache make gcc musl-dev linux-headers git

WORKDIR  /go/thor
RUN git clone https://github.com/vechain/thor.git /go/thor
RUN git checkout ${THOR_VERSION}
RUN make all

FROM alpine:3.20

# Install necessary packages
RUN apk add --no-cache ca-certificates git curl bash nodejs npm

# Install pm2 globally
RUN npm install -g pm2

# Copy and build rosetta
WORKDIR /usr/src/app/rosetta
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig.json ./
COPY rosetta-cli-conf rosetta-cli-conf
COPY config config
COPY src src
RUN npm run build
COPY process_online.json process_offline.json start.sh ./

COPY --from=builder /go/thor/bin/thor /usr/src/app

EXPOSE 8080 8669 11235 11235/udp

ENTRYPOINT ["sh", "./start.sh"]
