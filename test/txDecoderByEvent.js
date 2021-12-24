const { Chain, TxInputDataDecoder } = require("../src/");
const { testnetChainInfo, mainnetChainInfo } = require("./config");

async function testTxInputDataDecoder(nodeUrl, scInfo, privateKeys = []) {
  try {
    const { address, abi, events } = scInfo;

    console.log("nodeUrl:", nodeUrl)
    const chain = new Chain(nodeUrl, privateKeys);

    let logs = await chain.getPastLogs(address, events.smgMint.topics, {abi:abi,eventName:events.smgMint.name,fromBlock:events.smgMint.fromBlock,toBlock:events.smgMint.toBlock});

    let decoder = new TxInputDataDecoder(abi);
    for (let log of logs) {
      let tx = await chain.web3.eth.getTransaction(log.transactionHash);
      let parsedInputData = decoder.decode(tx.input);
      console.log(parsedInputData);
    }

  } catch (error) {
      console.log(error);
  }

  process.exit(0)

}

testTxInputDataDecoder(testnetChainInfo.MOVR.nodeUrl, testnetChainInfo.MOVR.Cross, [process.env.EthPK]);
