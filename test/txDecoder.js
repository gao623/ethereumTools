const { TxInputDataDecoder } = require("../src");
const { testnetChainInfo, mainnetChainInfo } = require("./config");

async function testTxInputDataDecoder(nodeUrl, scInfo, privateKeys = []) {
  try {
    const { abi, inputs } = scInfo;

    console.log("nodeUrl:", nodeUrl)

    let decoder = new TxInputDataDecoder(abi);
    for (let key in inputs) {
      for (let i = 0; i < inputs[key].length; ++i) {
        let parsedInputData = decoder.decode(inputs[key][i]);
        console.log(parsedInputData);
      }
    }

  } catch (error) {
      console.log(error);
  }

  process.exit(0)

}

testTxInputDataDecoder(testnetChainInfo.MOVR.nodeUrl, testnetChainInfo.MOVR.Cross, [process.env.EthPK]);
