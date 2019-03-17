const fs = require('fs');
const Lzx = require('./Lzx');
const BufferReader = require('../BufferReader');
const XnbError = require('../XnbError');
const Log = require('../Log');

/**
 * Used to compress and decompress LZX.
 * @class
 * @public
 */
class Presser {

    /**
     * Decompress a certain amount of bytes.
     * @public
     * @static
     * @param {BufferReader} buffer
     * @returns {Buffer}
     */
    static decompress(buffer, compressedTodo, decompressedTodo) {
        // current index into the buffer
        let pos = 0;

        // allocate variables for block and frame size
        let block_size;
        let frame_size;

        // create the LZX instance with 16-bit window frame
        const lzx = new Lzx(16);

        // the full decompressed array
        let decompressed = [];
        let z = 0;

        // loop over the bytes left
        while (pos < compressedTodo) {
            // flag is for determining if frame_size is fixed or not
            const flag = buffer.readByte();

            // if flag is set to 0xFF that means we will read in frame size
            if (flag == 0xFF) {
                // read in the frame size
                frame_size = buffer.readLZXInt16();
                // read in the block size
                block_size = buffer.readLZXInt16();
                // advance the byte position forward
                pos += 5;
            }
            else {
                // rewind the buffer
                buffer.seek(-1);
                // read in the block size
                block_size = buffer.readLZXInt16(this.buffer);
                // set the frame size
                frame_size = 0x8000;
                // advance byte position forward
                pos += 2;
            }

            // ensure the block and frame size aren't empty
            if (block_size == 0 || frame_size == 0)
                break;

            // ensure the block and frame size don't exceed size of integers
            if (block_size > 0x10000 || frame_size > 0x10000)
                throw new XnbError('Invalid size read in compression content.');

            Log.debug(`Block Size: ${block_size}, Frame Size: ${frame_size}`);

            // decompress the file based on frame and block size
            decompressed = decompressed.concat(lzx.decompress(buffer, frame_size, block_size));

            // increase position counter
            pos += block_size;
        }

        // we have finished decompressing the file
        Log.info('File has been successfully decompressed!');

        // return a decompressed buffer
        return Buffer.from(decompressed);
    }
}

module.exports = Presser;
