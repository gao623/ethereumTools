const EthInputDataDecoder = require('ethereum-input-data-decoder');

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
        let input = this.decoder.decodeData(data);
        let result = {method:input.method, types:input.types, args:{}};

        for (let idx = 0; idx < input.names.length; ++idx) {
            let name = input.names[idx];
            let type = input.types[idx];
            let inputData = input.inputs[idx];
            let needConvert = this.toHexKeywords.some(keyword => {
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

exports.TxInputDataDecoder = TxInputDataDecoder;