// BigInt serialization fix for Jest
(BigInt.prototype as any).toJSON = function() {
    return this.toString();
};