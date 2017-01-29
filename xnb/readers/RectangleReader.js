const BaseReader = require('./BaseReader');
const BufferReader = require('../BufferReader');
const Int32Reader = require('./Int32Reader');

/**
 * Rectangle Reader
 * @class
 * @extends BaseReader
 */
class RectangleReader extends BaseReader {
    /**
     * Reads Rectangle from buffer.
     * @param {BufferReader} buffer
     * @returns {object}
     */
    read(buffer) {
        const int32Reader = new Int32Reader();

        let x = int32Reader.read(buffer);
        let y = int32Reader.read(buffer);
        let width = int32Reader.read(buffer);
        let height = int32Reader.read(buffer);

        return { x, y, width, height };
    }
}

module.exports = RectangleReader;
