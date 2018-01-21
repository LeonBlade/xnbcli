const BaseReader = require('./BaseReader');
const BufferReader = require('../../BufferReader');
const BufferWriter = require('../../BufferWriter');

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

    /**
     * Writes Double into buffer
     * @param {BufferWriter} buffer
     * @param {Mixed} data
     * @param {ReaderResolver}
     */
    write(buffer, content, resolver) {
        this.writeIndex(buffer, resolver);
        
    }
}

module.exports = DoubleReader;
