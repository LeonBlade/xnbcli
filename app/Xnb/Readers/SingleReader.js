const BaseReader = require('./BaseReader');
const BufferReader = require('../../BufferReader');

/**
 * Single Reader
 * @class
 * @extends BaseReader
 */
class SingleReader extends BaseReader {
    /**
     * Reads Single from the buffer.
     * @param {BufferReader} buffer
     * @returns {Number}
     */
    read(buffer) {
        return buffer.readSingle();
    }
}

module.exports = SingleReader;
