const { Chain } = require("../src/");
const { testnetChainInfo, mainnetChainInfo } = require("./config");

async function testCross(nodeUrl, scInfo, privateKeys = []) {
  try {
    const { address, abi } = scInfo;

    console.log("nodeUrl:", nodeUrl)
    const chain = new Chain(nodeUrl, privateKeys);
    const sc = chain.getContract(abi, address);

    console.log(await chain.call(sc, "getFee", ["0x800003c6","2147483708"])); // matic -> eth
    console.log(await chain.call(sc, "getFee", ["1073741825","2147483708"])); // movr -> eth
    console.log(await chain.call(sc, "getFee", ["2153201998","2147483708"])); // wan -> eth
    console.log(await chain.call(sc, "getFee", ["2153201998","1073741825"])); // wan -> eth
    console.log(await chain.call(sc, "owner")); // wan -> eth

  } catch (error) {
      console.log(error);
  }

  process.exit(0)

}

testCross(testnetChainInfo.MOVR.nodeUrl, testnetChainInfo.MOVR.Cross, [process.env.EthPK]);

