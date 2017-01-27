const fs = require('fs');
const Log = require('./Log');
const XnbError = require('./XnbError');

class Reader {

    /**
     * Creates instance of Reader class.
     * @constructor
     * @param {String} filename The filename to read with the reader.
     */
    constructor(filename) {
        // ensure the file exists
        if (!fs.existsSync(filename))
            throw new XnbError(`"${filename}" does not exist!`);

        // assign buffer to the read file buffer
        this._buffer = fs.readFileSync(filename);
        // set the seek index to zero
        this._index = 0;

        // create a buffer stack for previous reads
        this._bufferStack = [];
    }

    /**
     * Get the last read buffer.
     * @method lastRead
     * @return {mixed} Reurns the last read buffer.
     */
    get lastRead() {
        return this._bufferStack[this._bufferStack.length - 1];
    }

    /**
    * Seeks to a specific index in the buffer.
    * @param {Number} index Sets the buffer seek index.
    */
    set seek(index) {
        this._index = Number.parseInt(index);
    }

    /**
     * Gets the seek index of the buffer.
     * @return {Number} Reurns the buffer seek index.
     */
    get seek() {
        return Number.parseInt(this._index);
    }

    /**
     * Get the buffer size
     * @return {Number} Returns the size of the buffer.
     */
    get size() {
        return this._buffer.length;
    }

    /**
     * Reads a specific number of bytes.
     * @param {Number} count Number of bytes to read.
     * @param {Boolean} [seek] If you want the seeker index to advance on read.
     * @returns {mixed} Contents of the buffer.
     */
    read(count, seek = true) {
        // read from the buffer
        let buffer = this._buffer.slice(this._index, this._index + count);
        // advance seek index if specified
        if (seek) this._index += count;

        // push the buffer into the stack
        this._bufferStack.push(buffer);

        // return the read buffer
        return buffer;
    }

    /**
     * Reads a 7-bit number.
     * @returns {Number} Returns the number read.
     */
    read7BitNumber() {
        let result = 0;
        let bitsRead = 0;
        let value;

        // loop over bits
        do {
            value = this.read(1).readUInt8();
            result |= (value & 0x7F) << bitsRead;
            bitsRead += 7;
        }
        while (value & 0x80);

        // push result into buffer stack
        this._bufferStack.push(result);

        return result;
    }

    /**
     * Read in a string.
     * @returns {String} String read from buffer.
     */
    readString() {
        // read the string size
        let size = this.read7BitNumber();
        // return the string read
        return this.read(size).toString('utf8');
    }
}

// export the Reader class
module.exports = Reader;
