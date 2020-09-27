# Build thor in a stock Go builder container
FROM vechain/thor:v1.3.4 as thorimage

FROM keymetrics/pm2:12-alpine
ENV THORNODE_VERSION v1.3.4
WORKDIR /usr/src/app

COPY ["./","./"]

RUN npm ci && npm run build

COPY --from=thorimage /usr/local/bin/thor /usr/src/app/

EXPOSE 8080 8669 11235 11235/udp

ENTRYPOINT ["pm2-runtime","process.json"]