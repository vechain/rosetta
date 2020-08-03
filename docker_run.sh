docker run -d\
  -v /Users/moglu/Developer/dataCenter/VechainThor:/root/.org.vechain.thor\
  -p 0.0.0.0:8030:8030 -p 0.0.0.0:8669:8669 -p 11235:11235 -p 11235:11235/udp\
  -e MAINNET=main\
  vechain/rosetta:v1.4.1