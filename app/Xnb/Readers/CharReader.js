const BaseReader = require('./BaseReader');
const BufferReader = require('../../BufferReader');

/**
 * Char Reader
 * @class
 * @extends BaseReader
 */
class CharReader extends BaseReader {
    /**
     * Reads Char from the buffer.
     * @param {BufferReader} buffer
     * @returns {String}
     */
    read(buffer) {
        let charSize = this._getCharSize(buffer.peek(1).readInt8());
        return buffer.read(charSize).toString('utf8');
    }

    /**
     * Gets size of char for some special characters that are more than one byte.
     * @param {Number} byte
     * @returns {Number}
     */
    _getCharSize(byte) {
        return (( 0xE5000000 >> (( byte >> 3 ) & 0x1e )) & 3 ) + 1;
    }
}

module.exports = CharReader;
