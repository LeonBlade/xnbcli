const Log = require('../Log');
const BufferReader = require('../BufferReader');
const XactClip = require('./XactClip');

class XactSound {
    constructor(buffer, soundOffset) {
        const oldPosition = buffer.bytePosition;
        buffer.seek(soundOffset, 0);

        const flags = buffer.readByte();
        const complexSound = (flags & 1) != 0;

        const category = buffer.readUInt16();
        buffer.seek(1);
        const volume = buffer.readUInt16();
        buffer.seek(1);
        const entryLength = buffer.readUInt16();

        let numClips = 0;
        if (complexSound) {
            numClips = buffer.readByte();
        }
        else {
            const trackIndex = buffer.readUInt16();
            const waveBankIndex = buffer.readByte();
            // wave =
            Log.debug(`Track Index: ${Log.h(trackIndex)}`);
            Log.debug(`WaveBank Index: ${(waveBankIndex)}`);
        }

        if ((flags & 0x1E) != 0) {
            const extraDataLen = buffer.readUInt16();

            if (complexSound) Log.info(`Extra Data Length: ${extraDataLen}`);
            // TODO: parse RPC+DSP stuff
            buffer.seek(extraDataLen);
        }

        if (complexSound) {
            for (let i = 0; i < numClips; i++) {
                buffer.seek(1);
                const clipOffset = buffer.readUInt32();
                Log.debug(`Offset: ${clipOffset}`);
                try {
                    buffer.seek(4);
                    const clip = new XactClip(buffer, clipOffset);
                }
                catch (ex) {
                    Log.warn(`Offset too large!`);
                }
            }
        }

        buffer.seek(oldPosition, 0);
    }
}

module.exports = XactSound;
