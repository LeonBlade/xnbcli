const BaseReader = require('./BaseReader');
const BufferReader = require('../../BufferReader');
const BufferWriter = require('../../BufferWriter');
const XnbError = require('../../XnbError');

/**
 * Single Reader
 * @class
 * @extends BaseReader
 */
class SoundEffectReader extends BaseReader {
    /**
     * Reads Single from the buffer.
     * @param {BufferReader} buffer
     * @returns {Number}
     */
    read(buffer) {
        const RIFF = 'RIFF';
        const WAVE = 'WAVE';
        const fmt = 'fmt ';
        const data = 'data';
        const fmtHeaderSize = 20;  // size in bytes of the WAVE file header (this will always be the same given these constants ^)
        const dataHeaderSize = 8;

        // Read the fmt and data sections
        const fmtLength = buffer.readUInt32();
        const fmtBuffer = buffer.read(fmtLength);
        const dataLength = buffer.readUInt32();
        const dataBuffer = buffer.read(dataLength);

        // Build a header for the fmt section
        let fmtHeader = new BufferWriter(fmtHeaderSize);
        fmtHeader.write(RIFF);
        fmtHeader.writeUInt32(fmtHeaderSize + fmtLength + dataLength);
        fmtHeader.write(WAVE);
        fmtHeader.write(fmt);
        fmtHeader.writeUInt32(fmtLength);

        // Build a header for the data section
        let dataHeader = new BufferWriter(dataHeaderSize);
        dataHeader.write(data);
        dataHeader.writeUInt32(dataLength);

        // And put them all together
        let finalBuffer = Buffer.concat([fmtHeader.buffer, fmtBuffer, dataHeader.buffer, dataBuffer]);
        return { export: {type: this.type, data: finalBuffer} }
    }
}

module.exports = SoundEffectReader;
