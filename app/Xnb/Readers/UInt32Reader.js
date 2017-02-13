const BaseReader = require('./BaseReader');
const BufferReader = require('../../BufferReader');

/**
 * UInt32 Reader
 * @class
 * @extends BaseReader
 */
class UInt32Reader extends BaseReader {
    /**
     * Reads UInt32 from buffer.
     * @param {BufferReader} buffer
     * @returns {Number}
     */
    read(buffer) {
        return buffer.readUInt32();
    }
}

module.exports = UInt32Reader;
