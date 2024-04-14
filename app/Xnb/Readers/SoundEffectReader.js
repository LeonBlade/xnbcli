const BaseReader = require('./BaseReader');
const BufferReader = require('../../BufferReader');
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
        const WAVEJUNK = 'WAVEJUNK';
        const fmt = 'fmt ';
        const data = 'data';
        const headerSize = 80;  // size in bytes of the WAVE file header (this will always be the same given these constants ^)

        // First, the WAVE header needs to be determined
        let wavFmt = buffer.readInt32();
        if(wavFmt != 18) {
            throw new XnbError('This audio type is not supported');
        }
        let wavType = buffer.readInt16()
        if(wavType != 1) {
            throw new XnbError(`Only PCM (type 1) WAVs are supported. Got type ${wavType}`);
        }
        let channels = buffer.readInt16();
        let sampleRate = buffer.readInt32();
        let avgBps = buffer.readInt32(); // https://docs.fileformat.com/audio/wav/
        let blockAlign = buffer.readInt16();
        let bitDepth = buffer.readInt16();
        buffer.seek(2);
        let chunks = buffer.readInt32();

        // Now we actually write the header
        let headerBuffer = Buffer.alloc(headerSize);
        headerBuffer.write(RIFF, 'utf-8')
        headerBuffer.writeInt32LE(chunks + 72, 4)
        headerBuffer.write(WAVEJUNK, 8)
        headerBuffer.writeInt32LE(28, 16)
        headerBuffer.writeInt32LE(0, 20)
        headerBuffer.writeInt32LE(0, 24)
        headerBuffer.writeInt32LE(0, 28)
        headerBuffer.writeInt32LE(0, 32)
        headerBuffer.writeInt32LE(0, 36)
        headerBuffer.writeInt32LE(0, 40)
        headerBuffer.write(fmt, 48)
        headerBuffer.writeInt32LE(16, 52);
        headerBuffer.writeInt16LE(1, 56);
        headerBuffer.writeInt16LE(channels, 58);
        headerBuffer.writeInt32LE(sampleRate, 60);
        headerBuffer.writeInt32LE(avgBps, 64);
        headerBuffer.writeInt16LE(blockAlign, 68);
        headerBuffer.writeInt16LE(bitDepth, 70);
        headerBuffer.write(data, 72);
        headerBuffer.writeInt32LE(chunks, 76)
        let finalBuffer = Buffer.concat([headerBuffer, buffer.read(chunks)], chunks + headerSize)
        return { export: {type: this.type, data: finalBuffer} }
    }
}

module.exports = SoundEffectReader;
