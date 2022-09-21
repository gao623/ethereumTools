
const web3EthAbi = require("web3-eth-abi");

class LogDataDecoder {
  constructor(abi) {
    this.abi = JSON.parse(JSON.stringify(abi));
    this.toHexKeywords = ['byte', 'int'];
    this.toArrayKeyword = '[]';
  }

  static hexStrip0x(str) {
    return str.replace(/^0x/, '');
  }

  static hexWith0x(hexStr) {
    if(0 > hexStr.indexOf('0x')){
        return `0x${hexStr}`;
    }
    return hexStr;
  }

  static decode(inputTypes, data, topicsWithoutSig) {
    return web3EthAbi.decodeLog(inputTypes, data, topicsWithoutSig);
  }

  decode(logs) {
    if (logs === null || !Array.isArray(logs)) {
      return logs;
    }
  
    return logs.map((log) => {
      let abiJson = this.abi.find(function (json) {
        return (json.type === 'event' && web3EthAbi.encodeEventSignature(json) === log.topics[0]);
      });
  
      if (abiJson) {
        try {
          //topics without the topic[0] if its a non-anonymous event, otherwise with topic[0].
          let args = LogDataDecoder.decode(abiJson.inputs, log.data, log.topics.slice(1));
          for (var index = 0; index < abiJson.inputs.length; index ++) {
            if (args.hasOwnProperty(index)) {
              delete args[index];
            }
          }
          log.event = log.event || abiJson.name;
          log.eventName = abiJson.name;
          log.args = args;
          return log;
        } catch (err) {
          console.log(err);
          return log;
        }
      } else {
        return log;
      }
    });
  }

}

exports.LogDataDecoder = LogDataDecoder;
