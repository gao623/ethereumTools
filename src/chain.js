const HDWalletProvider = require('@truffle/hdwallet-provider');
const Web3Contract = require('web3-eth-contract');
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

    getContract(abi, contractAddr) {
        let conInstance = new Web3Contract(abi, contractAddr);
        conInstance.setProvider(this.web3.currentProvider);
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
}

module.exports = Chain;
