const Log = require('../Log');
const BufferReader = require('../BufferReader');

class XactClip {
    constructor(buffer, clipOffset) {
        const oldPosition = buffer.bytePosition;
        buffer.seek(clipOffset, 0);

        //buffer.debug();
        const numEvents = buffer.readByte();
        const events = new Array(numEvents);

        for (let i = 0; i < numEvents; i++) {
            const eventInfo = buffer.readUInt32();
            const eventId = eventInfo & 0x1F;
            switch (eventId) {
                case 1:
                    const evnt = {};
                    const trackIndex = buffer.readUInt16();
                    const waveBankIndex = buffer.readByte();

                    buffer.seek(5);

                    Log.debug(`Track: ${Log.h(trackIndex)}`);
                    break;
                case 4:
                    Log.debug(`EventPlayWavePitchVolumeFilterVariation`);
                    break;
                default:
                    Log.warn(`Event id ${eventId} not implemented`);
                    break;
            }
        }
        buffer.seek(oldPosition, 0);
    }
}

module.exports = XactClip;
