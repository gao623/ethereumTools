
const testnetChainInfo = {
  MOVR: {
    nodeUrl: "https://rpc.testnet.moonbeam.network",
    Cross: {
      address: "0x9274Be9167c7dBa7F81b61d3870e0272cB8474f6",
      abi: require("./abi/abi.CrossDelegateV3.json"),
    }
  },
}

const mainnetChainInfo = {
  MOVR: {
    nodeUrl: "https://rpc.moonriver.moonbeam.network",
    Cross: {
      address: "0x2216072A246A84f7b9CE0f1415Dd239C9bF201aB",
      abi: require("./abi/abi.CrossDelegateV3.json"),
    }
  },
}

exports.testnetChainInfo = testnetChainInfo;
exports.mainnetChainInfo = mainnetChainInfo;
