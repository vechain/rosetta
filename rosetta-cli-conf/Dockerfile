# Linux build of rosetta-cli (now published as coinbase/mesh-cli) for CI.
# bin/rosetta-cli is a macOS arm64 binary and only runs on Apple Silicon.
FROM golang:1.24-bookworm AS builder

ARG MESH_CLI_VERSION=v0.10.4

WORKDIR /src
RUN git clone --depth 1 --branch ${MESH_CLI_VERSION} https://github.com/coinbase/mesh-cli.git . && \
    go build -o /out/rosetta-cli .

FROM debian:bookworm-slim

RUN apt-get update && \
    apt-get install -y --no-install-recommends ca-certificates && \
    rm -rf /var/lib/apt/lists/*

COPY --from=builder /out/rosetta-cli /usr/local/bin/rosetta-cli

ENTRYPOINT ["rosetta-cli"]
