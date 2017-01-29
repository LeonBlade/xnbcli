const BaseReader = require('./BaseReader');
const BufferReader = require('../BufferReader');

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
}

module.exports = BooleanReader;
