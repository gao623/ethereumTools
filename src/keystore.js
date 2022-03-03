const fs = require("fs");
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
  static recover(password, path) {
    let keystoreObj;
    if (typeof(path) === "object") {
      // keystore object
      keystoreObj = path;
    } else if (typeof(path) === "string") {
      // keystore path
      keystoreObj = JSON.parse(fs.readFileSync(path, "utf8"));
    } else {
      throw new Error("invalid keystore");
    }
    let keys = [];
    for (let k in keystoreObj) {
      if (k.startsWith("crypto" || "Crypto")) {
        keys.push({version: keystoreObj.version, crypto: keystoreObj[k]});
      }
    }
    return keys.map(key => (keythereum.recover(password, key)).toString("hex"));
  }
  static saveAs(path, object) {
    return fs.writeFileSync(path, JSON.stringify(object), {encoding: "utf8"});
  }
}

exports.Keystore = Keystore;