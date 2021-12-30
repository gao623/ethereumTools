const { LogDataDecoder } = require("../src");
const { testnetChainInfo, mainnetChainInfo } = require("./config");

async function testTxInputDataDecoder(nodeUrl, scInfo, privateKeys = []) {
  try {
    const { abi, logs } = scInfo;

    console.log("nodeUrl:", nodeUrl)

    let decoder = new LogDataDecoder(abi);
    for (let key in logs) {
      let parsedLogsData = decoder.decode(logs[key]);
      console.log(key, parsedLogsData);
    }

  } catch (error) {
      console.log(error);
  }

  process.exit(0)

}

testTxInputDataDecoder(testnetChainInfo.MOVR.nodeUrl, testnetChainInfo.MOVR.Cross, [process.env.EthPK]);
