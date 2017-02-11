const BaseReader = require('./BaseReader');
const BufferReader = require('../BufferReader');
const StringReader = require('./StringReader');

/**
 * BmFont Reader
 * @class
 * @extends BaseReader
 */
class BmFontReader extends BaseReader {
    /**
     * Reads BmFont from buffer.
     * @param {BufferReader} buffer
     * @returns {Object}
     */
    read(buffer) {
		const stringReader = new StringReader();
		const xml = stringReader.read(buffer);
		return { export: { type: this.type, data: xml } };
    }

	isValueType() {
        return false;
    }
}

module.exports = BmFontReader;
