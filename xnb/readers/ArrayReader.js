const BaseReader = require('./BaseReader');
const BufferReader = require('../BufferReader');
const UInt32Reader = require('./UInt32Reader');

/**
 * Array Reader
 * @class
 * @extends BaseReader
 */
class ArrayReader extends BaseReader {
    constructor(reader) {
        super();
        /** @type {BaseReader} */
        this.reader = reader;
    }

    /**
     * Reads Array from buffer.
     * @param {BufferReader} buffer
     * @param {ReaderResolver} resolver
     * @returns {Array}
     */
    read(buffer, resolver) {
        // create a uint32 reader
        const uint32Reader = new UInt32Reader();
        // read the number of elements in the array
        let size = uint32Reader.read(buffer);
        // create local array
        let array = [];

        // loop size number of times for the array elements
        for (let i = 0; i < size; i++) {
            // get value from buffer
            let value = this.reader.isValueType() ? this.reader.read(buffer) : resolver.read(buffer);
            // push into local array
            array.push(value);
        }

        // return the array
        return array;
    }

    isValueType() {
        return false;
    }

    get type() {
        return `Array<${this.reader.type}>`;
    }
}

module.exports = ArrayReader;
