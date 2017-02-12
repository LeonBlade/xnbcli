const BaseReader = require('./BaseReader');
const BufferReader = require('../../BufferReader');
const ReaderResolver = require('../ReaderResolver');

/**
 * String Reader
 * @class
 * @extends BaseReader
 */
class StringReader extends BaseReader {
    /**
     * Reads String from buffer.
     * @param {BufferReader} buffer
     * @returns {String}
     */
    read(buffer) {
        // read in the length of the string
        let length = buffer.read7BitNumber();
        // read in the UTF-8 encoded string
        return buffer.read(length).toString('utf8');
    }

    isValueType() {
        return false;
    }
}

module.exports = StringReader;
