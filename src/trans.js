const EthInputDataDecoder = require('ethereum-input-data-decoder');
const ethers = require("ethers");
const { WanChainLegacyTransaction } = require("./wanchain-tx");

class TxInputDataDecoder {
    constructor(abi) {
        this.decoder = new EthInputDataDecoder(abi);
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

    decode(data) {
        const input = this.decoder.decodeData(data);
        let result = {method:input.method, types:input.types, args:{}};

        for (let idx = 0; idx < input.names.length; ++idx) {
            const name = input.names[idx];
            const type = input.types[idx];
            const inputData = input.inputs[idx];
            const needConvert = this.toHexKeywords.some(keyword => {
                return type.indexOf(keyword) >= 0;
            });
            if (needConvert) {
                if (type.indexOf(this.toArrayKeyword) >= 0) {
                    result.args[name] = inputData.map(data => TxInputDataDecoder.hexWith0x(data.toString("hex")));
                } else {
                    result.args[name] = TxInputDataDecoder.hexWith0x(inputData.toString("hex"));
                }
            } else {
                result.args[name] = inputData;
            }
        }
        return result
    }
}

class Web3TxRawDataDecoder {
    constructor(log = console) {
        this.log = log;
    }
    static chainType = "ETH"

    static hexStrip0x(str) {
        return str.replace(/^0x/, '');
    }

    static hexWith0x(hexStr) {
        if(0 > hexStr.indexOf('0x')){
            return `0x${hexStr}`;
        }
        return hexStr;
    }

    static parseBufToInt(buf) {
      return parseInt(buf.toString('hex'), 16);
    }

    static parseStringToInt(buf) {
        return parseInt(buf, 16);
    }

    decode(data) {
        let decodedTransaction = ethers.utils.parseTransaction(data);
        for (let key in decodedTransaction) {
            if (ethers.BigNumber.isBigNumber(decodedTransaction[key])) {
                decodedTransaction[key] = decodedTransaction[key].toHexString();
            }
        }
        return decodedTransaction;
    }
}

class WanTxRawDataDecoder extends Web3TxRawDataDecoder {
    constructor(log = console) {
        super(log);
    }

    static chainType = "WAN"

    decode(data) {
        let result;

        const payload = ethers.utils.arrayify(data);
        const rlpDecodedData = ethers.utils.RLP.decode(data)

        if (payload[0] === 0xffffffff) {
            // wanchain jupiter transaction
            result = super.decode(ethers.utils.RLP.encode(rlpDecodedData.slice(1)));
        } else if (payload[0] > 0x7f && rlpDecodedData.length === 10) {
            // wanchain legacy transaction
            const wanTx = WanChainLegacyTransaction.fromValuesArray(rlpDecodedData);
            result = wanTx.toJSON();
        } else {
            // common ethereum-like transaction
            result = super.decode(data);
        }

        return result;
    }
}

class TxRawDataDecoder {
    constructor(options) {
        options = Object.assign({}, {decoder: null, log: TxRawDataDecoder.defaultLog}, options);
        if (!options.decoder) {
            this.decoder = TxRawDataDecoder.selectDecoder({chainType: WanTxRawDataDecoder.chainType, log: options.log});
        } else {
            this.decoder = options.decoder;
        }
    }

    static defaultLog = console;

    static selectDecoder(options) {
        let decoder;
        options = Object.assign({}, {chainType: null, log: TxRawDataDecoder.defaultLog}, options);

        switch (options.chainType) {
            case WanTxRawDataDecoder.chainType: {
                decoder = new WanTxRawDataDecoder(options.log);
                break;
            }

            default: {
                decoder = new Web3TxRawDataDecoder(options.log);
                break;
            }
        }
        return decoder;
    }

    setDecoder(decoder) {
        this.decoder = decoder;
    }

    decode(data) {
        return this.decoder.decode(data);
    }
}

exports.TxInputDataDecoder = TxInputDataDecoder;
exports.Web3TxRawDataDecoder = Web3TxRawDataDecoder;
exports.WanTxRawDataDecoder = WanTxRawDataDecoder;
exports.TxRawDataDecoder = TxRawDataDecoder;