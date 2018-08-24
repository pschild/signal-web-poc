var StaticArrayBufferProto = new ArrayBuffer().__proto__;

window.signalUtil = {
    randomId: function() {
        return Math.floor((Math.random() * 4000) + 1);
    },
    toString: function (thing) {
        if (typeof thing == 'string') {
            return thing;
        }
        return new dcodeIO.ByteBuffer.wrap(thing).toString('binary');
    },
    toArrayBuffer: function (thing) {
        if (thing === undefined) {
            return undefined;
        }
        if (thing === Object(thing)) {
            if (thing.__proto__ == StaticArrayBufferProto) {
                return thing;
            }
        }

        var str;
        if (typeof thing == "string") {
            str = thing;
        } else {
            throw new Error("Tried to convert a non-string of type " + typeof thing + " to an array buffer");
        }
        return new dcodeIO.ByteBuffer.wrap(thing, 'binary').toArrayBuffer();
    },
    arrayBufferToBase64: function (buffer) {
        var binary = '';
        var bytes = new Uint8Array(buffer);
        var len = bytes.byteLength;
        for (var i = 0; i < len; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return window.btoa(binary);
    },
    base64ToArrayBuffer: function (base64) {
        var binary_string = window.atob(base64);
        var len = binary_string.length;
        var bytes = new Uint8Array(len);
        for (var i = 0; i < len; i++) {
            bytes[i] = binary_string.charCodeAt(i);
        }
        return bytes.buffer;
    }
};