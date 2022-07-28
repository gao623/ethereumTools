const Web3Contract = require('web3-eth-contract');
const web3EthAbi = require("web3-eth-abi");
const Web3 = require('web3');
const ethers = require("ethers");
const pu = require('promisefy-util');

class Chain {
    constructor(nodeUrl) {
        this.jsonRpcProvider = new ethers.providers.Web3Provider(new Web3.providers.HttpProvider(nodeUrl))
        this.web3 = new Web3(this.jsonRpcProvider.provider);
    }

    static calcEventSignature(eventName, abi) {
        let info = abi.filter(function (json) {
        return (json.type === 'event' && json.name === eventName);
        });
        if (info.length !== 1) {
        return null;
        }
        return web3EthAbi.encodeEventSignature(info[0]);
    }

    static hexStrip0x(str) {
        return str.replace(/^0x/, '');
      }

    static hexWith0x(hexStr){
        if(0 > hexStr.indexOf('0x')){
            return `0x${hexStr}`;
        }
        return hexStr;
    }

    static parseAddress(publicKeyOrPrivateKey) {
        return ethers.utils.computeAddress(Chain.hexWith0x(publicKeyOrPrivateKey));
    }

    static getEventHash(eventName, contractAbi) {
        let eventHash = Chain.calcEventSignature(eventName, contractAbi);
        return eventHash ? Chain.hexWith0x(eventHash) : eventHash;
    }

    static parseEventSignatures(abi) {
        return abi.filter(json => json.type === 'event').map(json => {
            return {
                event: json.name,
                inputs: json.inputs,
                signature: web3EthAbi.encodeEventSignature(json)
            };
        });
    }

    static parseFuncSignatures(abi) {
        return abi.filter(json => json.type === 'function').map(json => {
            return {
                function: json.name,
                inputs: json.inputs,
                signature: web3EthAbi.encodeFunctionSignature({name: json.name, type: json.type, inputs: json.inputs})
            };
        });
    }

    static parseEventSignatures(abi) {
        return abi.filter(json => json.type === 'event').map(json => {
            return {
                event: json.name,
                inputs: json.inputs,
                signature: web3EthAbi.encodeEventSignature(json)
            };
        });
    }

    static parseAbiSignatures(abi) {
        return abi.reduce((reduced, next) => {
            let signature;
            if (next.type === 'function') {
                // signature = web3EthAbi.encodeFunctionSignature({name: next.name, type: next.type, inputs: next.inputs})
                signature = web3EthAbi.encodeFunctionSignature(next)
            } else if (next.type === 'event') {
                // signature = web3EthAbi.encodeEventSignature({name: next.name, type: next.type, inputs: next.inputs})
                signature = web3EthAbi.encodeEventSignature(next)
            }
            if (!reduced[next.type]) {
                reduced[next.type] = {};
            }
            if (!reduced[next.type][signature]) {
                reduced[next.type][signature] = {};
            }
            reduced[next.type][signature][next.type] = next.name.trim();
            reduced[next.type][signature].inputs = next.inputs;
            reduced[next.type][signature].format = `${reduced[next.type][signature][next.type]}(${next.inputs.map(input => input.type).join(",")})`;
            if (!reduced[next.type][next.name]) {
                reduced[next.type][next.name] = [];
            }
            reduced[next.type][next.name].push(signature);

            return reduced;
        }, {})
    }

    static getContract(abi, contractAddr, currentProvider) {
        let conInstance = new Web3Contract(abi, contractAddr);
        conInstance.setProvider(currentProvider);
        // conInstance.setProvider(this.web3.currentProvider);
        return conInstance;
    }

    static serializeTransaction(txObj) {
        return ethers.utils.serializeTransaction(txObj);
    }

    static async signTransaction(tx, privateKe) {
        const singer = new ethers.Wallet(privateKe);
        return await singer.signTransaction(tx);
    }

    static async make(sc, func, ...info) {
        if (info.length) {
            return await sc.methods[func](...info).encodeABI();
        }
        return await sc.methods[func]().encodeABI();
    }

    static async call(sc, func, ...info) {
        if (info.length) {
            return await pu.promisefy(sc.methods[func](...info).call, [], sc.methods);
        }
        return await pu.promisefy(sc.methods[func]().call, [], sc.methods);
    }

    async make(sc, func, ...info) {
        if (info.length) {
            return await sc.methods[func](...info).encodeABI();
        }
        return await sc.methods[func]().encodeABI();
    }

    async call(sc, func, ...info) {
        if (info.length) {
            return await pu.promisefy(sc.methods[func](...info).call, [], sc.methods);
        }
        return await pu.promisefy(sc.methods[func]().call, [], sc.methods);
    }

    async getPastLogs(address, topics, options) {
        let { abi, eventName, fromBlock, toBlock } = options;
        if (eventName) {
            topics[0] = Chain.getEventHash(eventName, abi);
        }

        let filter = {
            fromBlock: fromBlock || 0,
            toBlock: toBlock || "latest",
            topics: topics,
            address: address
        };
        return await this.web3.eth.getPastLogs(filter);
    }

    async getFeeData() {
        const [block, gasPrice] = await Promise.all([
            this.web3.eth.getBlock("latest"),
            ethers.BigNumber.from(await this.web3.eth.getGasPrice()).toHexString()
        ]);

        let maxFeePerGas = null
        let maxPriorityFeePerGas = null;
        if (block && block.baseFeePerGas) {
            // We may want to compute this more accurately in the future,
            // using the formula "check if the base fee is correct".
            // See: https://eips.ethereum.org/EIPS/eip-1559
            const maxPriorityFeePerGasBigNumber = ethers.BigNumber.from("1500000000");
            maxFeePerGas = ethers.BigNumber.from(block.baseFeePerGas).mul(2).add(maxPriorityFeePerGasBigNumber).toHexString();
            maxPriorityFeePerGas = maxPriorityFeePerGasBigNumber.toHexString();
        }

        return { maxFeePerGas, maxPriorityFeePerGas, gasPrice };
    }

    currentProvider() {
        return this.web3.currentProvider;
    }

    async signTransaction(tx, privateKey) {
        return (await this.web3.eth.accounts.signTransaction(tx, privateKey)).rawTransaction;
    }

    sendRawTransaction(signedTx) {
        return new Promise((resolve, reject) => {
            this.web3.eth.sendSignedTransaction(signedTx)
                .on('transactionHash', (hash) => resolve(hash))
                .on('error', (err) => reject(err))
            ;
        });
    }
}

exports.Chain = Chain;