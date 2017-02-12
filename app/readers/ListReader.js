const BaseReader = require('./BaseReader');
const BufferReader = require('../BufferReader');
const ReaderResolver = require('../ReaderResolver');
const UInt32Reader = require('./UInt32Reader');

/**
 * List Reader
 * @class
 * @extends BaseReader
 */
class ListReader extends BaseReader {
    constructor(reader) {
        super();
        /** @type {BaseReader} */
        this.reader = reader;
    }

    /**
     * Reads List from buffer.
     * @param {BufferReader} buffer
     * @param {ReaderResolver} resolver
     * @returns {Array}
     */
    read(buffer, resolver) {
        const uint32Reader = new UInt32Reader();
        let size = uint32Reader.read(buffer);

        let list = [];
        for (let i = 0; i < size; i++) {
            let value = this.reader.isValueType() ? this.reader.read(buffer) : resolver.read(buffer);
            list.push(value);
        }
        return list;
    }

    get type() {
        return `List<${this.reader.type}>`;
    }
}

module.exports = ListReader;
