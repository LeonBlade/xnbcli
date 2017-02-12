const BaseReader = require('./BaseReader');
const BufferReader = require('../../BufferReader');
const BooleanReader = require('./BooleanReader');

/**
 * Nullable Reader
 * @class
 * @extends BaseReader
 */
class NullableReader extends BaseReader {
    /**
     * @constructor
     * @param {BaseReader} reader
     */
    constructor(reader) {
        super();
        /**
         * Nullable type
         * @type {BaseReader}
         */
        this.reader = reader;
    }

    /**
     * Reads Nullable type from buffer.
     * @param {BufferReader} buffer
     * @param {ReaderResolver} resolver
     * @returns {mixed|null}
     */
    read(buffer, resolver) {
        // get an instance of boolean reader
        const booleanReader = new BooleanReader();
        // read in if the nullable has a value or not
        let hasValue = booleanReader.read(buffer);

        // return the value
        return (hasValue ? (this.reader.isValueType() ? this.reader.read(buffer) : resolver.read(buffer)) : null);
    }

    isValueType() {
        return false;
    }

    get type() {
        return `Nullable<${this.reader.type}>`;
    }
}

module.exports = NullableReader;
