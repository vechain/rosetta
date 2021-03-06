# Build thor in a stock Go builder container
# FROM vechain/thor:v1.3.6 as thorimage
FROM vechain/thor@sha256:12dd82f109b731c2874e30955b3e299d30bfcc3310abc4250aa91328a963f1af as thorimage
# FROM keymetrics/pm2:12-alpine
FROM keymetrics/pm2@sha256:c0a3f3017cff09e1c8570216a716f41969f96ddc47a828653835df69095637f6
RUN apk add --no-cache git
WORKDIR /usr/src/app

RUN git clone https://github.com/vechain/rosetta.git /usr/src/app

ENV THORNODE_VERSION v1.3.6

RUN npm ci && npm run build
COPY --from=thorimage /usr/local/bin/thor /usr/src/app/
EXPOSE 8080 8669 11235 11235/udp
ENTRYPOINT ["sh","./start.sh"]