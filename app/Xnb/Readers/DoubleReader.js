const BaseReader = require('./BaseReader');
const BufferReader = require('../../BufferReader');

/**
 * Double Reader
 * @class
 * @extends BaseReader
 */
class DoubleReader extends BaseReader {
    /**
     * Reads Double from buffer.
     * @param {BufferReader} buffer
     * @returns {Number}
     */
    read(buffer) {
        return buffer.readDouble();
    }
}

module.exports = DoubleReader;
