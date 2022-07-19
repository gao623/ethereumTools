const ethereumTransaction = require("@ethereumjs/tx");
const ethereumCommon = require("@ethereumjs/common");
const ethereumUtil = require('ethereumjs-util');

class LegacyTransaction extends ethereumTransaction.Transaction {
    static fromValuesArray(values, opts = {}) {
        // If length is not 7, it has length 10. If v/r/s are empty Buffers, it is still an unsigned transaction
        // This happens if you get the RLP data from `raw()`
        if (values.length !== 7 && values.length !== 10) {
            throw new Error('Invalid transaction. Only expecting 7 values (for unsigned tx) or 10 values (for signed tx).');
        }
        const [Txtype, nonce, gasPrice, gasLimit, to, value, data, v, r, s] = values;
        ethereumUtil.validateNoLeadingZeroes({ Txtype, nonce, gasPrice, gasLimit, value, v, r, s });
        return new LegacyTransaction({
            Txtype,
            nonce,
            gasPrice,
            gasLimit,
            to,
            value,
            data,
            v,
            r,
            s,
        }, opts);
    }

    /**
     * Instantiate a transaction from the serialized tx.
     *
     * Format: `rlp([nonce, gasPrice, gasLimit, to, value, data, v, r, s])`
     */
     static fromSerializedTx(serialized, opts = {}) {
        const values = ethereumUtil.rlp.decode(serialized);
        if (!Array.isArray(values)) {
            throw new Error('Invalid serialized tx input. Must be array');
        }
        return LegacyTransaction.fromValuesArray(values, opts);
    }

    static fromRlpSerializedTx(serialized, opts = {}) {
        return LegacyTransaction.fromSerializedTx(serialized, opts);
    }

    constructor(txData, opts = {}) {
        const Txtype = txData.Txtype;

        super(txData, Object.assign({}, { freeze: false }, opts));

        this.DEFAULT_HARDFORK = ethereumCommon.Hardfork.Byzantium;

        this.activeCapabilities.push(ethereumTransaction.Capability.EIP155ReplayProtection);

        this.Txtype = new ethereumUtil.BN(ethereumUtil.toBuffer(Txtype === '' ? '0x' : Txtype));

        let _a;
        const freeze = (_a = opts === null || opts === void 0 ? void 0 : opts.freeze) !== null && _a !== void 0 ? _a : true;
        if (freeze) {
            Object.freeze(this);
        }
    }

    raw() {
        return [
            ethereumUtil.bnToUnpaddedBuffer(this.Txtype),
            ethereumUtil.bnToUnpaddedBuffer(this.nonce),
            ethereumUtil.bnToUnpaddedBuffer(this.gasPrice),
            ethereumUtil.bnToUnpaddedBuffer(this.gasLimit),
            this.to !== undefined ? this.to.buf : Buffer.from([]),
            ethereumUtil.bnToUnpaddedBuffer(this.value),
            this.data,
            this.v !== undefined ? ethereumUtil.bnToUnpaddedBuffer(this.v) : Buffer.from([]),
            this.r !== undefined ? ethereumUtil.bnToUnpaddedBuffer(this.r) : Buffer.from([]),
            this.s !== undefined ? ethereumUtil.bnToUnpaddedBuffer(this.s) : Buffer.from([]),
        ];
    }

    _getMessageToSign() {
        const values = [
            ethereumUtil.bnToUnpaddedBuffer(this.Txtype),
            ethereumUtil.bnToUnpaddedBuffer(this.nonce),
            ethereumUtil.bnToUnpaddedBuffer(this.gasPrice),
            ethereumUtil.bnToUnpaddedBuffer(this.gasLimit),
            this.to !== undefined ? this.to.buf : Buffer.from([]),
            ethereumUtil.bnToUnpaddedBuffer(this.value),
            this.data,
        ];
        if (this.supports(ethereumTransaction.Capability.EIP155ReplayProtection)) {
            values.push(ethereumUtil.toBuffer(this.common.chainIdBN()));
            values.push(ethereumUtil.unpadBuffer(ethereumUtil.toBuffer(0)));
            values.push(ethereumUtil.unpadBuffer(ethereumUtil.toBuffer(0)));
        }
        return values;
    }

    hash() {
        // In contrast to the tx type transaction implementations the `hash()` function
        // for the legacy tx does not throw if the tx is not signed.
        // This has been considered for inclusion but lead to unexpected backwards
        // compatibility problems (no concrete reference found, needs validation).
        //
        // For context see also https://github.com/ethereumjs/ethereumjs-monorepo/pull/1445,
        // September, 2021 as well as work done before.
        //
        // This should be updated along the next major version release by adding:
        //
        //if (!this.isSigned()) {
        //  const msg = this._errorMsg('Cannot call hash method if transaction is not signed')
        //  throw new Error(msg)
        //}
        if (Object.isFrozen(this)) {
            if (!this.cache.hash) {
                this.cache.hash = ethereumUtil.rlphash(this.raw());
            }
            return this.cache.hash;
        }
        return ethereumUtil.rlphash(this.raw());
    }

    /**
     * Process the v, r, s values from the `sign` method of the base transaction.
     */
     _processSignature(v, r, s) {
        const vBN = new ethereumUtil.BN(v);
        if (this.supports(ethereumTransaction.Capability.EIP155ReplayProtection)) {
            vBN.iadd(this.common.chainIdBN().muln(2).addn(8));
        }
        const opts = Object.assign(Object.assign({}, this.txOptions), { common: this.common });
        return LegacyTransaction.fromTxData({
            Txtype: this.Txtype,
            nonce: this.nonce,
            gasPrice: this.gasPrice,
            gasLimit: this.gasLimit,
            to: this.to,
            value: this.value,
            data: this.data,
            v: vBN,
            r: new ethereumUtil.BN(r),
            s: new ethereumUtil.BN(s),
        }, opts);
    }

    /**
     * Returns an object with the JSON representation of the transaction.
     */
     toJSON() {
        return {
            Txtype: this.Txtype.toNumber(),
            nonce: this.nonce.toNumber(),
            gasPrice: ethereumUtil.bnToHex(this.gasPrice),
            gasLimit: ethereumUtil.bnToHex(this.gasLimit),
            from: ethereumUtil.Address.fromPublicKey(this.getSenderPublicKey()).toString(),
            to: this.to !== undefined ? this.to.toString() : undefined,
            value: ethereumUtil.bnToHex(this.value),
            data: '0x' + this.data.toString('hex'),
            v: this.v !== undefined ? this.v.toNumber() : undefined,
            r: this.r !== undefined ? ethereumUtil.bnToHex(this.r) : undefined,
            s: this.s !== undefined ? ethereumUtil.bnToHex(this.s) : undefined,
        };
    }
}

module.exports = {...ethereumTransaction, WanChainLegacyTransaction:LegacyTransaction}
