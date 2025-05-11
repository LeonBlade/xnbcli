class BufferWriter {

    constructor(size = 500) {
        // the buffer to write to
        this._buffer = Buffer.alloc(size);
        // the current byte position
        this.bytePosition = 0;
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

    // trim the buffer to the byte position
    trim() {
        const tBuffer = Buffer.alloc(Number.parseInt(this.bytePosition));
        this._buffer.copy(tBuffer, 0, 0, this.bytePosition);
        this._buffer = tBuffer;
    }

    /**
     * Allocates number of bytes into the buffer and assigns more space if needed
     * @param {Number} bytes Number of bytes to allocate into the buffer
     */
    alloc(bytes) {
        if (this._buffer.length < this.bytePosition + bytes) {
            let tBuffer = Buffer.alloc(Math.max(this._buffer.length * 2, this._buffer.length + bytes));
            this._buffer.copy(tBuffer, 0);
            this._buffer = tBuffer;
        }
        return this;
    }

    concat(buffer) {
        this.alloc(buffer.length);
        this._buffer.set(buffer, this.bytePosition);
        this.bytePosition += buffer.length;
    }

    /**
     * Writes bytes to the buffer
     * @param {Mixed} string 
     */
    write(string, length = Buffer.byteLength(string)) {
        this.alloc(length).buffer.write(string, this.bytePosition);
        this.bytePosition += length;
    }

    /**
     * Write a byte to the buffer
     * @param {Mixed} byte 
     */
    writeByte(byte) {
        this.alloc(1).buffer.writeUInt8(byte, this.bytePosition);
        this.bytePosition++;
    }

    /**
     * Write an int8 to the buffer
     * @param {Number} number 
     */
    writeInt(number) {
        this.alloc(1).buffer.writeInt8(byte, this.bytePosition);
        this.bytePosition++;
    }

    /**
     * Write a uint8 to the buffer
     * @param {Number} number 
     */
    writeUInt(number) {
        this.alloc(1).buffer.writeUInt8(byte, this.bytePosition);
        this.bytePosition++;
    }

    /**
     * Write a int16 to the buffer
     * @param {Number} number 
     */
    writeInt16(number) {
        this.alloc(2).buffer.writeInt16(byte, this.bytePosition);
        this.bytePosition += 2;
    }

    /**
     * Write a uint16 to the buffer
     * @param {Number} number 
     */
    writeUInt16(number) {
        this.alloc(2).buffer.writeUInt16(byte, this.bytePosition);
        this.bytePosition += 2;
    }

    /**
     * Write a int32 to the buffer
     * @param {Number} number 
     */
    writeInt32(number) {
        this.alloc(4).buffer.writeInt32LE(number, this.bytePosition);
        this.bytePosition += 4;
    }

    /**
     * Write a uint32 to the buffer
     * @param {Number} number 
     */
    writeUInt32(number) {
        this.alloc(4).buffer.writeUInt32LE(number, this.bytePosition);
        this.bytePosition += 4;
    }

    /**
     * Write a float to the buffer
     * @param {Number} number 
     */
    writeSingle(number) {
        this.alloc(4).buffer.writeFloatLE(number, this.bytePosition);
        this.bytePosition += 4;
    }

    /**
     * Write a double to the buffer
     * @param {Number} number 
     */
    writeDouble(number) {
        this.alloc(4).buffer.writeDoubleLE(number, this.bytePosition);
        this.bytePosition += 4;
    }

    /**
     * Write a 7-bit number to the buffer
     * @param {Number} number 
     */
    write7BitNumber(number) {
        this.alloc(2);
        do {
            let byte = number & 0x7F;
            number = number >> 7;
            if (number) byte |= 0x80;
            this.buffer.writeUInt8(byte, this.bytePosition);
            this.bytePosition++;
        }
        while (number);
    }

}

// export the BufferWriter class
module.exports = BufferWriter;
