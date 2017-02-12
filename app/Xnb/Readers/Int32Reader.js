const BaseReader = require('./BaseReader');
const BufferReader = require('../../BufferReader');

/**
 * Int32 Reader
 * @class
 * @extends BaseReader
 */
class Int32Reader extends BaseReader {
    /**
     * Reads Int32 from buffer.
     * @param {BufferReader} buffer
     * @returns {Number}
     */
    read(buffer) {
        return buffer.read(4).readInt32LE();
    }
}

module.exports = Int32Reader;
