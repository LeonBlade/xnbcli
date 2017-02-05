const fs = require('fs');
const Log = require('./Log');
const XnbError = require('./XnbError');

class BufferReader {

    /**
     * Creates instance of Reader class.
     * @constructor
     * @param {String} filename The filename to read with the reader.
     */
    constructor(filename) {
        // ensure the file exists
        if (!fs.existsSync(filename))
            throw new XnbError(`"${filename}" does not exist!`);

        /**
         * internal buffer for the reader
         * @private
         * @type {Buffer}
         */
        this._buffer = fs.readFileSync(filename);

        /**
         * Seek index for the internal buffer.
         * @private
         * @type {Number}
         */
        this._offset = 0;

        /**
         * Bit offset for bit reading.
         * @private
         * @type {Number}
         */
        this._bitOffset = 0;
    }

    /**
    * Seeks to a specific index in the buffer.
    * @public
    * @param {Number} index Sets the buffer seek index.
    */
    seek(index) {
        this._offset += Number.parseInt(index);
    }

    /**
     * Gets the seek index of the buffer.
     * @public
     * @property bytePosition
     * @return {Number} Reurns the buffer seek index.
     */
    get bytePosition() {
        return Number.parseInt(this._offset);
    }

    /**
     * Sets the seek index of the buffer.
     * @public
     * @property bytePosition
     * @param {Number} value
     */
    set bytePosition(value) {
        this._offset = value;
    }

    /**
     * Gets the current position for bit reading.
     * @public
     * @property _bitPosition
     * @returns {Number}
     */
    get bitPosition() {
        return Number.parseInt(this._bitOffset);
    }

    /**
     * Sets the bit position clamped at 16-bit frames
     * @public
     * @property bitPosition
     * @param {Number} offset
     */
    set bitPosition(offset) {
        // when rewinding, reset it back to
        if (offset < 0) offset = 16 - offset;
        // set the offset and clamp to 16-bit frame
        this._bitOffset = offset % 16;
        // get byte seek for bit ranges that wrap past 16-bit frames
        const byteSeek = ((offset - (Math.abs(offset) % 16)) / 16) * 2;
        // seek ahead for overflow on 16-bit frames
        this.seek(byteSeek);
    }

    /**
     * Get the buffer size.
     * @public
     * @property size
     * @return {Number} Returns the size of the buffer.
     */
    get size() {
        return this.buffer.length;
    }

    /**
     * Returns the buffer.
     * @public
     * @property buffer
     * @returns {Buffer} Returns the internal buffer.
     */
    get buffer() {
        return this._buffer;
    }

    /**
     * Writes another buffer into this buffer.
     * @public
     * @method write
     * @param {Buffer} buffer
     * @param {Number} targetIndex
     * @param {Number} sourceIndex
     * @param {Number} length
     */
    copyFrom(buffer, targetIndex = 0, sourceIndex = 0, length = buffer.length) {
        Log.debug(`CopyFrom: ${targetIndex} -> ${sourceIndex}, ${length}`);
        // we need to resize the buffer to fit the contents
        if (this.buffer.length < length + targetIndex) {
            // create a temporary buffer of the new size
            const tempBuffer = Buffer.alloc(this.buffer.length + (length + targetIndex - this.buffer.length));
            // copy our buffer into the temp buffer
            this.buffer.copy(tempBuffer);
            // copy the buffer given into the temp buffer
            buffer.copy(tempBuffer, targetIndex, sourceIndex, length);
            // assign our buffer to the temporary buffer
            this._buffer = tempBuffer;
        }
        else {
            // copy the buffer into our buffer
            buffer.copy(this.buffer, targetIndex, sourceIndex, length);
        }
    }

    // [XX|XX]XXXX|

    /**
     * Reads a specific number of bytes.
     * @public
     * @method read
     * @param {Number} count Number of bytes to read.
     * @returns {Buffer} Contents of the buffer.
     */
    read(count) {
        // read from the buffer
        const buffer = this.buffer.slice(this._offset, this._offset + count);
        // advance seek offset
        this.seek(count);
        // return the read buffer
        return buffer;
    }

    /**
     * Peeks ahead in the buffer without actually seeking ahead.
     * @public
     * @method peek
     * @param {Number} count Number of bytes to peek.
     * @returns {Buffer} Contents of the buffer.
     */
    peek(count) {
        // read from the buffer
        const buffer = this.read(count);
        // rewind the buffer
        this.seek(-count);
        // return the buffer
        return buffer;
    }

    /**
     * Reads a 7-bit number.
     * @public
     * @method read7BitNumber
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

        return result;
    }

    /**
     * Reads bits used for LZX compression.
     * @public
     * @method readLZXBits
     * @param {Number} bits
     * @returns {Number}
     */
    readLZXBits(bits) {
        // initialize values for the loop
        let bitsLeft = bits;
        let read = 0;

        //Log.debug();
        //Log.debug(`> Reading ${bits} bits ...`);

        // read bits in 16-bit chunks
        while (bitsLeft > 0) {
            // peek in a 16-bit value
            const peek = this.peek(2).readUInt16LE();

            // clamp bits into the 16-bit frame we have left and only read in as much as we have left
            const bitsInFrame = Math.min(Math.max(bitsLeft, 0), 16 - this.bitPosition);
            // set the offset based on current position in and bit count
            const offset = 16 - this.bitPosition - bitsInFrame;

            // create mask and shift the mask up to the offset <<
            // and then shift the return back down into mask space >>
            const value = (peek & (2 ** bitsInFrame - 1 << offset)) >> offset;

            // Log.debug(Log.b(peek, 16, this.bitPosition, this.bitPosition + bitsInFrame));

            // remove the bits we read from what we have left
            bitsLeft -= bitsInFrame;
            // add the bits read to the bit position
            this.bitPosition += bitsInFrame;

            // assign read with the value shifted over for reading in loops
            read |= value << bitsLeft;
        }

        // return the read bits
        return read;
    }

    /**
     * Used to peek bits.
     * @public
     * @method peekLZXBits
     * @param {Number} bits
     * @returns {Number}
     */
    peekLZXBits(bits) {
        // get the current bit position to store
        let bitPosition = this.bitPosition;
        // get the current byte position to store
        let bytePosition = this.bytePosition;

        // read the bits like normal
        const read = this.readLZXBits(bits);

        // just rewind the bit position, this will also rewind bytes where needed
        this.bitPosition = bitPosition;
        // restore the byte position
        this.bytePosition = bytePosition;

        // return the peeked value
        return read;
    }

    /**
     * Reads a 16-bit integer from a LZX bitstream
     *
     * bytes are reverse as the bitstream sequences 16 bit integers stored as LSB -> MSB (bytes)
     * abc[...]xyzABCDEF as bits would be stored as:
     * [ijklmnop][abcdefgh][yzABCDEF][qrstuvwx]
     *
     * @public
     * @method readLZXInt16
     * @param {Boolean} seek
     * @returns {Number}
     */
    readLZXInt16(seek = true) {
        // read in the next two bytes worth of data
        let lsB = this.read(1).readUInt8();
        let msB = this.read(1).readUInt8();

        // rewind the seek head
        if (!seek)
            this.seek(-2);

        // set the value
        return (lsB << 8) | msB;
    }

    /**
     * Aligns to 16-bit offset.
     * @public
     * @method align
     */
    align() {

    }
}

// export the BufferReader class
module.exports = BufferReader;
