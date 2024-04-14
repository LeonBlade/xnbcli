const BaseReader = require('./BaseReader');
const BufferReader = require('../../BufferReader');
const BufferWriter = require('../../BufferWriter');
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

    /**
     * Writes the string to the buffer.
     * @param {BufferWriter} buffer 
     * @param {String} string 
     * @param {ReaderResolver} resolver
     */
    write(buffer, string, resolver) {
        // write the index
        this.writeIndex(buffer, resolver);
        // get the size of the string
        const size = Buffer.byteLength(string);
        // write the length of the string
        buffer.write7BitNumber(size); 
        // write the string
        buffer.write(string, size);
    }

    isValueType() {
        return false;
    }
}

module.exports = StringReader;
