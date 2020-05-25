FROM keymetrics/pm2:12-stretch
ENV NODE_ENV production
WORKDIR /usr/src/app

RUN npm config set registry https://registry.npm.taobao.org

RUN npm install --silent --save-dev -g typescript

COPY ["./package.json","./package-lock.json","./tsconfig.json","./process.json","./"]
COPY ["./config","./config"]
COPY ["./src","./src"]

RUN npm install && npm run build
EXPOSE 8030
ENTRYPOINT ["pm2-docker","process.json"]
