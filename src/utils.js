class Utils {
  static deepArrayFlatten(arr) {
    return [].concat(...arr.map(v=>Array.isArray(v) ? Utils.deepArrayFlatten(v) : v));
  }
}

exports.Utils = Utils;