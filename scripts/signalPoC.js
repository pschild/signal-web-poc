(() => {
    localStorage.clear();

    const signalWrapper = new SignalWrapper();

    const storeAlice = new SignalProtocolStore('alice');
    const storeBob = new SignalProtocolStore('bob');

    let preKeyBundleAlice = null;
    let preKeyBundleBob = null;

    const addressAlice = new libsignal.SignalProtocolAddress('alice', 0);
    const addressBob = new libsignal.SignalProtocolAddress('bob', 0);

    let registerUser = (store) => {
        return signalWrapper.generateIdentity(store)
            .then(() => {
                return signalWrapper.generatePreKeyBundle(store, signalUtil.randomId());
            });
    };

    let encrypt = (plainMessage, senderStore, receiverAddress) => {
        let sessionCipher = new libsignal.SessionCipher(senderStore, receiverAddress);
        let messageAsArrayBuffer = signalUtil.toArrayBuffer(plainMessage);
        return sessionCipher.encrypt(messageAsArrayBuffer)
            .then((encryptedMessageObject) => {
                encryptedMessageObject.body = signalUtil.toArrayBuffer(encryptedMessageObject.body);
                encryptedMessageObject.body = signalUtil.arrayBufferToBase64(encryptedMessageObject.body);
                return encryptedMessageObject;
            });
    };

    let decrypt = (encryptedMessageObject, receiverStore, senderAddress) => {
        let ciphertext = signalUtil.base64ToArrayBuffer(encryptedMessageObject.body);
        let messageType = encryptedMessageObject.type;

        const sessionCipher = new libsignal.SessionCipher(receiverStore, senderAddress);

        let decryptionPromise;
        if (messageType === 3) { // 3 = PREKEY_BUNDLE
            decryptionPromise = sessionCipher.decryptPreKeyWhisperMessage(ciphertext, 'binary');
        } else {
            decryptionPromise = sessionCipher.decryptWhisperMessage(ciphertext, 'binary');
        }

        return decryptionPromise
            .then((decryptedText) => {
                return signalUtil.toString(decryptedText);
            });
    };

    Promise.resolve()
        .then(() => {
            console.log('1) Registering alice...');
            return registerUser(storeAlice);
        })
        .then((pkb) => {
            preKeyBundleAlice = pkb;
            console.log('alice registered!');
            console.log('2) Registering bob...');
            return registerUser(storeBob)
        })
        .then((pkb) => {
            preKeyBundleBob = pkb;
            console.log('bob registered!');
        })
        .then(() => {
            console.log('3) Alice: Starting session to chat with bob...');
            let builder = new libsignal.SessionBuilder(storeAlice, addressBob);
            return builder.processPreKey(preKeyBundleBob);
        })
        .then(() => {
            console.log('Session started!');
            console.log('4) Alice: Encrypting message for bob...');
            return encrypt('Hi Bob, this is Alice! How are you?', storeAlice, addressBob);
        })
        .then((encryptedMessageObject) => {
            console.log('Encrypted =>', encryptedMessageObject.body);
            console.log('5) Bob: Decrypting alice\'s message...');
            return decrypt(encryptedMessageObject, storeBob, addressAlice);
        })
        .then((plaintext) => {
            console.log('Decrypted =>', plaintext);
        })
        .then(() => {
            console.log('6) Bob: Starting session to chat with alice...');
            let builder = new libsignal.SessionBuilder(storeBob, addressAlice);
            return builder.processPreKey(preKeyBundleAlice);
        })
        .then(() => {
            console.log('Session started!');
            console.log('7) Bob: Encrypting message for alice...');
            return encrypt('Hi Alice, this is Bob! I\'m fine!', storeBob, addressAlice);
        })
        .then((encryptedMessageObject) => {
            console.log('Encrypted =>', encryptedMessageObject.body);
            console.log('8) Alice: Decrypting bob\'s message...');
            return decrypt(encryptedMessageObject, storeAlice, addressBob);
        })
        .then((plaintext) => {
            console.log('Decrypted =>', plaintext);
        });
})();