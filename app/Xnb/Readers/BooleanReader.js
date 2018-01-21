const BaseReader = require('./BaseReader');
const BufferReader = require('../../BufferReader');
const BufferWriter = require('../../BufferWriter');

/**
 * Boolean Reader
 * @class
 * @extends BaseReader
 */
class BooleanReader extends BaseReader {
    /**
     * Reads Boolean from buffer.
     * @param {BufferReader} buffer
     * @returns {Boolean}
     */
    read(buffer) {
        return Boolean(buffer.read(1).readInt8());
    }

    /**
     * Writes Boolean into buffer
     * @param {BufferWriter} buffer
     * @param {Mixed} data
     * @param {ReaderResolver}
     */
    write(buffer, content, resolver) {
        this.writeIndex(buffer, resolver);
        buffer.writeByte(content);
    }
}

module.exports = BooleanReader;
