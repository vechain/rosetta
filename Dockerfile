# Build thor in a stock Go builder container
FROM vechain/thor:v2.0.0 as thorimage

FROM keymetrics/pm2:12-alpine
WORKDIR /usr/src/app

COPY ["./","./"]

RUN npm ci && npm run build

COPY --from=thorimage /usr/local/bin/thor /usr/src/app/

EXPOSE 8080 8669 11235 11235/udp

ENTRYPOINT ["pm2-runtime","process.json"]