(() => {
    // object holding signal specific methods
    const signalWrapper = new SignalWrapper();

    // create a store for each user
    const storeAlice = new SignalProtocolStore('alice');
    const storeBob = new SignalProtocolStore('bob');

    let preKeyBundleAlice = null;
    let preKeyBundleBob = null;

    // addresses for each user
    const addressAlice = new libsignal.SignalProtocolAddress('alice', 0); // deviceId is always 0 for the PoC
    const addressBob = new libsignal.SignalProtocolAddress('bob', 0); // deviceId is always 0 for the PoC

    // registering a new user consists of two steps:
    // 1. generate a new identity (identity key pair and registrationId)
    // 2. generate a bunch of prekeys
    let registerUser = (store) => {
        return signalWrapper.generateIdentity(store)
            .then(() => {
                return signalWrapper.generatePreKeyBundle(store, signalUtil.randomId());
            });
    };

    // before a message can be encrypted, a session with the recipient needs to be established
    let encrypt = (plainMessage, senderStore, receiverAddress) => {
        // 1. establish a session
        let sessionCipher = new libsignal.SessionCipher(senderStore, receiverAddress);
        let messageAsArrayBuffer = signalUtil.toArrayBuffer(plainMessage);
        // 2. encrypt the plain message
        return sessionCipher.encrypt(messageAsArrayBuffer)
            .then((encryptedMessageObject) => {
                encryptedMessageObject.body = signalUtil.toArrayBuffer(encryptedMessageObject.body);
                encryptedMessageObject.body = signalUtil.arrayBufferToBase64(encryptedMessageObject.body);
                return encryptedMessageObject;
            });
    };

    // before a message can be decrypted, a session with the sender needs to be established
    let decrypt = (encryptedMessageObject, receiverStore, senderAddress) => {
        let ciphertext = signalUtil.base64ToArrayBuffer(encryptedMessageObject.body);
        let messageType = encryptedMessageObject.type;

        // 1. establish a session
        const sessionCipher = new libsignal.SessionCipher(receiverStore, senderAddress);

        let decryptionPromise;
        // a message can be a PreKeyWhisperMessage (3 = PREKEY_BUNDLE) or a normal WhisperMessage, depending on the session state
        if (messageType === 3) {
            // Decrypt a PreKeyWhisperMessage by first establishing a new session
            // The session will be set up automatically by libsignal.
            // The information to do that is delivered within the message's ciphertext.
            decryptionPromise = sessionCipher.decryptPreKeyWhisperMessage(ciphertext, 'binary');
        } else {
            // Decrypt a normal message using an existing session
            decryptionPromise = sessionCipher.decryptWhisperMessage(ciphertext, 'binary');
        }

        return decryptionPromise
            .then((decryptedText) => {
                return signalUtil.toString(decryptedText);
            });
    };

    // walk through the single steps:
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