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
        // create a string buffer for special characters 4 extra bytes per utf8 character
        const _buff = Buffer.alloc(string.length * 4);
        // write into the buffer and get the size back out
        const size = _buff.write(string);
        // write the length of the string
        buffer.write7BitNumber(size); 
        // write the string
        buffer.concat(_buff.slice(0, size));
    }

    isValueType() {
        return false;
    }
}

module.exports = StringReader;
