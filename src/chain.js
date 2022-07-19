const HDWalletProvider = require('@truffle/hdwallet-provider');
const Web3Contract = require('web3-eth-contract');
const web3EthAbi = require("web3-eth-abi");
const Web3 = require('web3');
const pu = require('promisefy-util');

class Chain {
    constructor(nodeUrl, privateKeys = []) {
        this.provider = new HDWalletProvider({
            privateKeys: privateKeys,
            providerOrUrl: nodeUrl,
        });
        this.web3 = new Web3(this.provider);
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

    static getEventHash(eventName, contractAbi) {
        let eventHash = Chain.calcEventSignature(eventName, contractAbi);
        return eventHash ? Chain.hexWith0x(eventHash) : eventHash;
    }

    static parseEventSignatures(abi) {
        return abi.filter(json => json.type === 'event').map(json => {
            return {
                event: json.name,
                signature: web3EthAbi.encodeEventSignature(json)
            };
        });
    }

    static parseFuncSignatures(abi) {
        return abi.filter(json => json.type === 'function').map(json => {
            return {
                function: json.name,
                signature: web3EthAbi.encodeFunctionSignature({name: json.name, type: json.type, inputs: json.inputs})
            };
        });
    }

    static getContract(abi, contractAddr, currentProvider) {
        let conInstance = new Web3Contract(abi, contractAddr);
        conInstance.setProvider(currentProvider);
        // conInstance.setProvider(this.web3.currentProvider);
        return conInstance;
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

    currentProvider() {
        return this.web3.currentProvider;
    }
}

exports.Chain = Chain;