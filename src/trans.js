const web3EthAbi = require("web3-eth-abi");
const ethers = require("ethers");
const Transaction = require("./wanchain-tx");

class TxHelper {
    static hexStrip0x(str) {
        return str.replace(/^0x/, '');
    }

    static hexWith0x(hexStr) {
        if(0 > hexStr.indexOf('0x')){
            return `0x${hexStr}`;
        }
        return hexStr;
    }

    static defineProperty(obj, property) {
        let value;
        Object.defineProperty(obj, property, {
            get: ()  => value,
            set: val => value = val,
            enumerable: true
        });
    }

    static transactionTypeDict = Object.values(ethers.utils.TransactionTypes).reduce((reduced, next) => {
        if (typeof(next) === "string") {
            reduced[next] = next;
        }
        return reduced;
    }, {});

    static parseContractAbi(abi) {
        return abi.reduce((reduced, json) => {
            if (json.type === 'function') {
                const signature = web3EthAbi.encodeFunctionSignature(json);
                reduced.function[signature] = json;
            } else if (json.type === 'event') {
                const signature = web3EthAbi.encodeEventSignature(json);
                reduced.event[signature] = json;
            }
            return reduced;
        }, {function:{}, event:{}});
    }
}

class TxInputDataDecoder {
    constructor(abi) {
        this.toHexKeywords = ['byte', 'int'];
        this.toArrayKeyword = '[]';
        this.abiDict = TxHelper.parseContractAbi(abi);
    }

    decode(data) {
        const buffer = ethers.utils.arrayify(data);
        const divideBuffer = buffer.reduce((reduced, data, index) => {
            if (index < 4) {
                reduced.signature.push(data);
            } else {
                reduced.data.push(data)
            }
            return reduced;
        }, {signature: [], data: []})
        const {signature: funcSignature, data: contractData} = Object.keys(divideBuffer).reduce((reduced, key) => {
            reduced[key] = ethers.utils.hexlify(divideBuffer[key])
            return reduced;
        }, {});
        if (!this.abiDict.function[funcSignature]) {
            throw new Error("not found method");
        }
        const args = web3EthAbi.decodeParameters(this.abiDict.function[funcSignature].inputs, contractData);
        const result = {
            method: this.abiDict.function[funcSignature].name,
            types: this.abiDict.function[funcSignature].inputs,
            args: args,
        }
        return result;
    }
}

class Web3TxRawDataDecoder {
    constructor(log = console) {
        this.log = log;
    }
    static chainType = "ETH"

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
        const payload = ethers.utils.arrayify(data);

        if (payload[0] === ethers.utils.TransactionTypes.eip1559 || payload[0] === ethers.utils.TransactionTypes.eip2930) {
            // common ethereum-like transaction
            return super.decode(data);
        }

        const rlpDecodedData = ethers.utils.RLP.decode(payload);
        let isWanchainJupiter = false;
        try {
            isWanchainJupiter = ethers.BigNumber.from(rlpDecodedData[0]).eq(ethers.BigNumber.from("0xffffffff"));
        } catch {}
        if (isWanchainJupiter) {
            // wanchain jupiter transaction
            return super.decode(ethers.utils.RLP.encode(rlpDecodedData.slice(1)));
        }

        if (payload[0] > 0x7f && rlpDecodedData.length === 10) {
            // wanchain legacy transaction
            const wanTx = Transaction.WanChainLegacyTransaction.fromValuesArray(rlpDecodedData);
            return wanTx.toJSON();
        }

        // common ethereum-like legacy transaction
        return super.decode(data);

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

class GenTransaction {
    constructor() {
        TxHelper.defineProperty(this, "to");
        TxHelper.defineProperty(this, "nonce");
        TxHelper.defineProperty(this, "gasLimit");
        TxHelper.defineProperty(this, "gasPrice");
        TxHelper.defineProperty(this, "chainId");
        TxHelper.defineProperty(this, "value");
        TxHelper.defineProperty(this, "type");
        TxHelper.defineProperty(this, "accessList");
        TxHelper.defineProperty(this, "maxPriorityFeePerGas");
        TxHelper.defineProperty(this, "maxFeePerGas");
    }

    toJSON() {
        let json = {
            nonce: this.nonce !== undefined ? ethers.BigNumber.from(this.nonce).toHexString() : this.nonce,
            gasLimit: this.gasLimit !== undefined ? ethers.BigNumber.from(this.gasLimit).toHexString() : this.gasLimit,
            to: this.to,
            value: this.value !== undefined ? ethers.BigNumber.from(this.value).toHexString() : this.value,
            data: TxHelper.hexWith0x(this.data.toString('hex')),
        };
        this.chainId !== undefined && (json.chainId = this.chainId);
        this.gasPrice !== undefined && (json.gasPrice = ethers.BigNumber.from(this.gasPrice).toHexString());
        this.maxPriorityFeePerGas !== undefined && (json.maxPriorityFeePerGas = ethers.BigNumber.from(this.maxPriorityFeePerGas).toHexString());
        this.maxFeePerGas !== undefined && (json.maxFeePerGas = ethers.BigNumber.from(this.maxFeePerGas).toHexString());
        this.type !== undefined && (json.type = Number(this.type));
        this.v !== undefined && (json.v = this.v);
        this.v !== undefined && (json.v = this.v);
        this.r !== undefined && (json.r = this.r);
        this.s !== undefined && (json.s = this.s);

        return json;
    }
};

exports.TransactionHelper = TxHelper;
exports.TxInputDataDecoder = TxInputDataDecoder;
exports.Web3TxRawDataDecoder = Web3TxRawDataDecoder;
exports.WanTxRawDataDecoder = WanTxRawDataDecoder;
exports.TxRawDataDecoder = TxRawDataDecoder;
exports.Transaction = Transaction;
exports.GenTransaction = GenTransaction;