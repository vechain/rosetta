# Build thor in a stock Go builder container
FROM vechain/thor:v1.3.4 as thorimage
ENV THORNODE_VERSION v1.3.4

FROM keymetrics/pm2:12-alpine
ENV NODE_ENV production
WORKDIR /usr/src/app

RUN npm config set registry https://registry.npm.taobao.org

RUN npm install -g typescript

COPY ["./package.json","./package-lock.json","./tsconfig.json","./process.json","./"]
COPY ["./config","./config"]
COPY ["./src","./src"]

RUN npm install && npm run build

COPY --from=thorimage /usr/local/bin/thor /usr/src/app/

EXPOSE 8030 8669 11235 11235/udp

ENTRYPOINT ["pm2-runtime","process.json"]