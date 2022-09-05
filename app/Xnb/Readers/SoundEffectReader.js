const BaseReader = require('./BaseReader');
const BufferReader = require('../../BufferReader');
const fs = require('fs');

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
        buffer.seek(1)
        const riff = "524946468893DF00574156454A554E4B1C00000000000000000000000000000000000000000000000000000000000000666D742010";
        const head1 = Buffer.from(riff, 'hex');
        const chunk1 = buffer.read(19);
        buffer.seek(2);
        const chunk2 = Buffer.from('64617461', 'hex');
        const chunk3 = buffer.read(buffer.size - buffer._offset - 12);
        const final = Buffer.concat([head1, chunk1, chunk2, chunk3], head1.length + chunk1.length + chunk2.length + chunk3.length);
        return { export: {type: this.type, data: final} }
    }

    write(buffer, content, resolver) {
        this.writeIndex(buffer, resolver);
        buffer.write(content);
    }
}

module.exports = SoundEffectReader;
