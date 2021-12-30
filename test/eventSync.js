const { Chain } = require("../src/");
const { testnetChainInfo, mainnetChainInfo } = require("./config");

async function testEvent(nodeUrl, scInfo, privateKeys = []) {
  try {
    const { address, abi, events } = scInfo;

    console.log("nodeUrl:", nodeUrl)
    const chain = new Chain(nodeUrl, privateKeys);

    console.log(await chain.getPastLogs(address, events.smgMint.topics, {abi:abi,eventName:events.smgMint.name,fromBlock:events.smgMint.fromBlock,toBlock:events.smgMint.toBlock}));

  } catch (error) {
      console.log(error);
  }

  process.exit(0)

}

testEvent(testnetChainInfo.MOVR.nodeUrl, testnetChainInfo.MOVR.Cross, [process.env.EthPK]);
