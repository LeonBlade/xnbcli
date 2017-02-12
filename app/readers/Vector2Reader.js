const BaseReader = require('./BaseReader');
const BufferReader = require('../BufferReader');
const SingleReader = require('./SingleReader');

/**
 * Vector2 Reader
 * @class
 * @extends BaseReader
 */
class Vector2Reader extends BaseReader {
    /**
     * Reads Vector2 from buffer.
     * @param {BufferReader} buffer
     * @returns {object}
     */
    read(buffer) {
        const singleReader = new SingleReader();

        let x = singleReader.read(buffer);
        let y = singleReader.read(buffer);

        return { x, y };
    }
}

module.exports = Vector2Reader;
