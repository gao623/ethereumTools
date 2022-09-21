const keythereum = require("keythereum");

class Keystore {
  static iv(ivBytes = 16) {
    return keythereum.crypto.randomBytes(ivBytes);
  }
  static salt(saltBytes = 32) {
    return keythereum.crypto.randomBytes(saltBytes);
  }
  static dump(password, privateKey, options) {
    return keythereum.dump(password, privateKey, Keystore.salt(), Keystore.iv(), options);
  }
  static recover(password, keystoreObj) {
    let keys = [];
    for (let k in keystoreObj) {
      if (k.startsWith("crypto" || "Crypto")) {
        keys.push({version: keystoreObj.version, crypto: keystoreObj[k]});
      }
    }
    return keys.map(key => (keythereum.recover(password, key)).toString("hex"));
  }
}

exports.Keystore = Keystore;