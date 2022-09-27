const fs = require("fs");
const { Keystore } = require("../src/");

async function test(password, privateKey, options = {kdf: "scrypt"}) {
  let keystoreObj = await Keystore.dump(password, privateKey, options);
  fs.writeFileSync(`${keystoreObj.address}.json`, JSON.stringify(keystoreObj));

  let keystoreContent = JSON.parse(fs.readFileSync(`${keystoreObj.address}.json`));
  let prvKeyRecoverByFile = Keystore.recover(password, keystoreContent);
  if (privateKey.toString("hex") !== prvKeyRecoverByFile.toString("hex")) {
    throw new Error("invalid keystore")
  } else {
    console.log("test keystore dump and recover by file success");
  }

  let prvKeyRecoverByObject = Keystore.recover(password, keystoreObj);
  if (privateKey.toString("hex") !== prvKeyRecoverByObject.toString("hex")) {
    throw new Error("invalid keystore")
  } else {
    console.log("test keystore dump and recover by object success");
  }
}


test('test', process.env.TestnetOwnerPK);
