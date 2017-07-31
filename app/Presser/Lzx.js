const Log = require('../Log');
const BufferReader = require('../BufferReader');
const XnbError = require('../XnbError');

// LZX Constants
const MIN_MATCH = 2; // smallest allowable match length
const MAX_MATCH = 257; // largest allowable match length
const NUM_CHARS = 256; // number of uncompressed character types
const BLOCKTYPE = {
    INVALID: 0,
    VERBATIM: 1,
    ALIGNED: 2,
    UNCOMPRESSED: 3
};
const PRETREE_NUM_ELEMENTS = 20;
const ALIGNED_NUM_ELEMENTS = 8; // aligned offset tree elements
const NUM_PRIMARY_LENGTHS = 7;
const NUM_SECONDARY_LENGTHS = 249; // number of elements in length tree

// LZX Huffman Constants
const PRETREE_MAXSYMBOLS = PRETREE_NUM_ELEMENTS;
const PRETREE_TABLEBITS = 6;
const MAINTREE_MAXSYMBOLS = NUM_CHARS + 50 * 8;
const MAINTREE_TABLEBITS = 12;
const LENGTH_MAXSYMBOLS = NUM_SECONDARY_LENGTHS + 1;
const LENGTH_TABLEBITS = 12;
const ALIGNED_MAXSYMBOLS = ALIGNED_NUM_ELEMENTS;
const ALIGNED_TABLEBITS = 7;
const LENTABLE_SAFETY = 64; // table decoding overruns are allowed

/**
 * LZX Static Data Tables
 *
 * LZX uses 'position slots' to represent match offsets.  For every match,
 * a small 'position slot' number and a small offset from that slot are
 * encoded instead of one large offset.
 *
 * position_base[] is an index to the position slot bases
 *
 * extra_bits[] states how many bits of offset-from-base data is needed.
 */
const position_base = [];
const extra_bits = [];

/**
 * Used to compress and decompress LZX format buffer.
 * @class
 * @public
 */
class Lzx {

    /**
     * Creates an instance of LZX with a given window frame.
     * @constructor
     * @param {Number} window_bits
     */
    constructor(window_bits) {
        // get the window size from window bits
        this.window_size = 1 << window_bits;

        // LZX supports window sizes of 2^15 (32 KB) to 2^21 (2 MB)
        if (window_bits < 15 || window_bits > 21)
            throw new XnbError('Window size out of range!');

        // initialize static tables
        if (!extra_bits.length) {
            for (let i = 0, j = 0; i <= 50; i += 2) {
                extra_bits[i] = extra_bits[i + 1] = j;
                if (i != 0 && j < 17)
                    j++;
            }
        }
        if (!position_base.length) {
            for (let i = 0, j = 0; i <= 50; i++) {
                position_base[i] = j;
                j += 1 << extra_bits[i];
            }
        }

        Log.debug(`Extra Bits:`);
        Log.debug(JSON.stringify(extra_bits));
        Log.debug(`Position Base:`);
        Log.debug(JSON.stringify(position_base));

        /**
         * calculate required position slots
         *
         * window bits:     15 16 17 18 19 20 21
         * position slots:  30 32 34 36 38 42 50
         */
        const posn_slots = (window_bits == 21 ? 50 : (window_bits == 20 ? 42 : window_bits << 1));

        // repeated offsets
        this.R0 = this.R1 = this.R2 = 1;
        // set the number of main elements
        this.main_elements = NUM_CHARS + (posn_slots << 3);
        // state of header being read used for when looping over multiple blocks
        this.header_read = false;
        // set the block remaining
        this.block_remaining = 0;
        // set the default block type
        this.block_type = BLOCKTYPE.INVALID;
        // window position
        this.window_posn = 0;

        // frequently used tables
        this.pretree_table = [];
        this.pretree_len = [];
        this.aligned_table = [];
        this.aligned_len = [];
        this.length_table = [];
        this.length_len = [];
        this.maintree_table = [];
        this.maintree_len = [];

        // initialize main tree and length tree for use with delta operations
        for (let i = 0; i < MAINTREE_MAXSYMBOLS; i++)
            this.maintree_len[i] = 0;
        for (let i = 0; i < NUM_SECONDARY_LENGTHS; i++)
            this.length_len[i] = 0;

        // the decompression window
        this.win = [];
    }

    /**
     * Decompress the buffer with given frame and block size
     * @param {BufferReader} buffer
     * @param {Number} frame_size
     * @param {Number} block_size
     * @returns {Number[]}
     */
    decompress(buffer, frame_size, block_size) {

        // read header if we haven't already
        if (!this.header_read) {
            // read the intel call
            const intel = buffer.readLZXBits(1);

            Log.debug(`Intel: ${Log.b(intel, 1)} = ${intel}`);

            // don't care about intel e8
            if (intel != 0)
                throw new XnbError(`Intel E8 Call found, invalid for XNB files.`);

            // the header has been read
            this.header_read = true;
        }

        // set what's left to go to the frame size
        let togo = frame_size;

        // loop over what's left of the frame
        while (togo > 0) {

            // this is a new block
            if (this.block_remaining == 0) {
                // read in the block type
                this.block_type = buffer.readLZXBits(3);

                Log.debug(`Blocktype: ${Log.b(this.block_type, 3)} = ${this.block_type}`);

                // read 24-bit value for uncompressed bytes in this block
                const hi = buffer.readLZXBits(16);
                const lo = buffer.readLZXBits(8);
                // number of uncompressed bytes for this block left
                this.block_remaining = (hi << 8) | lo;

                Log.debug(`Block Remaining: ${this.block_remaining}`);

                // switch over the valid block types
                switch (this.block_type) {
                    case BLOCKTYPE.ALIGNED:
                        // aligned offset tree
                        for (let i = 0; i < 8; i++)
                            this.aligned_len[i] = buffer.readLZXBits(3);
                        // decode table for aligned tree
                        this.aligned_table = this.decodeTable(
                            ALIGNED_MAXSYMBOLS,
                            ALIGNED_TABLEBITS,
                            this.aligned_len
                        );
                        // NOTE: rest of aligned block type is the same as verbatim block type
                    case BLOCKTYPE.VERBATIM:
                        // read the first 256 elements for main tree
                        this.readLengths(buffer, this.maintree_len, 0, 256);
                        // read the rest of the elements for the main tree
                        this.readLengths(buffer, this.maintree_len, 256, this.main_elements);
                        // decode the main tree into a table
                        this.maintree_table = this.decodeTable(
                            MAINTREE_MAXSYMBOLS,
                            MAINTREE_TABLEBITS,
                            this.maintree_len
                        );
                        // read path lengths for the length tree
                        this.readLengths(buffer, this.length_len, 0, NUM_SECONDARY_LENGTHS);
                        // decode the length tree
                        this.length_table = this.decodeTable(
                            LENGTH_MAXSYMBOLS,
                            LENGTH_TABLEBITS,
                            this.length_len
                        );
                        break;
                    case BLOCKTYPE.UNCOMPRESSED:
                        // align the bit buffer to byte range
                        buffer.align();
                        // read the offsets
                        this.R0 = buffer.readInt32();
                        this.R1 = buffer.readInt32();
                        this.R2 = buffer.readInt32();
                        break;
                    default:
                        throw new XnbError(`Invalid Blocktype Found: ${this.block_type}`);
                        break;
                }
            }

            // iterate over the block remaining
            let this_run = this.block_remaining;

            // loop over the bytes left in the buffer to run out our output
            while ((this_run = this.block_remaining) > 0 && togo > 0) {
                // if this run is somehow higher than togo then just cap it
                if (this_run > togo)
                    this_run = togo;

                // reduce togo and block remaining by this iteration
                togo -= this_run;
                this.block_remaining -= this_run;

                // apply 2^x-1 mask
                this.window_posn &= this.window_size - 1;
                // run cannot exceed frame size
                if (this.window_posn + this_run > this.window_size)
                    throw new XnbError('Cannot run outside of window frame.');

                switch (this.block_type) {
                    case BLOCKTYPE.ALIGNED:
                        while (this_run > 0) {
                            // get the element of this run
                            let main_element = this.readHuffSymbol(
                                buffer,
                                this.maintree_table,
                                this.maintree_len,
                                MAINTREE_MAXSYMBOLS,
                                MAINTREE_TABLEBITS
                            );

                            // main element is an unmatched character
                            if (main_element < NUM_CHARS) {
                                this.win[this.window_posn++] = main_element;
                                this_run--;
                                continue;
                            }

                            main_element -= NUM_CHARS;

                            let length_footer;

                            let match_length = main_element & NUM_PRIMARY_LENGTHS;
                            if (match_length == NUM_PRIMARY_LENGTHS) {
                                // get the length footer
                                length_footer = this.readHuffSymbol(
                                    buffer,
                                    this.length_table,
                                    this.length_len,
                                    LENGTH_MAXSYMBOLS,
                                    LENGTH_TABLEBITS
                                );
                                // increase match length by the footer
                                match_length += length_footer;
                            }
                            match_length += MIN_MATCH;

                            let match_offset = main_element >> 3;

                            if (match_offset > 2) {
                                // not repeated offset
                                let extra = extra_bits[match_offset];
                                match_offset = position_base[match_offset] - 2;
                                if (extra > 3) {
                                    // verbatim and aligned bits
                                    extra -= 3;
                                    let verbatim_bits = buffer.readLZXBits(extra);
                                    match_offset += verbatim_bits << 3;
                                    let aligned_bits = this.readHuffSymbol(
                                        buffer,
                                        this.aligned_table,
                                        this.aligned_len,
                                        ALIGNED_MAXSYMBOLS,
                                        ALIGNED_TABLEBITS
                                    );
                                    match_offset += aligned_bits;
                                }
                                else if (extra == 3) {
                                    // aligned bits only
                                    match_offset += this.readHuffSymbol(
                                        buffer,
                                        this.aligned_table,
                                        this.aligned_len,
                                        ALIGNED_MAXSYMBOLS,
                                        ALIGNED_TABLEBITS
                                    );
                                }
                                else if (extra > 0)
                                    // verbatim bits only
                                    match_offset += buffer.readLZXBits(extra);
                                else
                                    match_offset = 1; // ???

                                // update repeated offset LRU queue
                                this.R2 = this.R1;
                                this.R1 = this.R0;
                                this.R0 = match_offset;
                            }
                            else if (match_offset === 0) {
                                match_offset = this.R0;
                            }
                            else if (match_offset == 1) {
                                match_offset = this.R1;
                                this.R1 = this.R0;
                                this.R0 = match_offset;
                            }
                            else {
                                match_offset = this.R2;
                                this.R2 = this.R0;
                                this.R0 = match_offset;
                            }

                            let rundest = this.window_posn;
                            let runsrc;
                            this_run -= match_length;

                            // copy any wrapped around source data
                            if (this.window_posn >= match_offset)
                                runsrc = rundest - match_offset; // no wrap
                            else {
                                runsrc = rundest + (this.window_size - match_offset);
                                let copy_length = match_offset - this.window_posn;
                                if (copy_length < match_length) {
                                    match_length -= copy_length;
                                    this.window_posn += copy_length;
                                    while (copy_length-- > 0)
                                        this.win[rundest++] = this.win[runsrc++];
                                    runsrc = 0;
                                }
                            }
                            this.window_posn += match_length;

                            // copy match data - no worrries about destination wraps
                            while (match_length-- > 0)
                                this.win[rundest++] = this.win[runsrc++];
                        }
                        break;

                    case BLOCKTYPE.VERBATIM:
                        while (this_run > 0) {
                            // get the element of this run
                            let main_element = this.readHuffSymbol(
                                buffer,
                                this.maintree_table,
                                this.maintree_len,
                                MAINTREE_MAXSYMBOLS,
                                MAINTREE_TABLEBITS
                            );

                            // main element is an unmatched character
                            if (main_element < NUM_CHARS) {
                                this.win[this.window_posn++] = main_element;
                                this_run--;
                                continue;
                            }

                            // match: NUM_CHARS + ((slot << 3) | length_header (3 bits))

                            main_element -= NUM_CHARS;

                            let length_footer;

                            let match_length = main_element & NUM_PRIMARY_LENGTHS;
                            if (match_length == NUM_PRIMARY_LENGTHS) {
                                // read the length footer
                                length_footer = this.readHuffSymbol(
                                    buffer,
                                    this.length_table,
                                    this.length_len,
                                    LENGTH_MAXSYMBOLS,
                                    LENGTH_TABLEBITS
                                );
                                match_length += length_footer;
                            }
                            match_length += MIN_MATCH;

                            let match_offset = main_element >> 3;

                            if (match_offset > 2) {
                                // not repeated offset
                                if (match_offset != 3) {
                                    let extra = extra_bits[match_offset];
                                    let verbatim_bits = buffer.readLZXBits(extra);
                                    match_offset = position_base[match_offset] - 2 + verbatim_bits;
                                }
                                else
                                    match_offset = 1;

                                // update repeated offset LRU queue
                                this.R2 = this.R1;
                                this.R1 = this.R0;
                                this.R0 = match_offset;
                            }
                            else if (match_offset === 0) {
                                match_offset = this.R0;
                            }
                            else if (match_offset == 1) {
                                match_offset = this.R1;
                                this.R1 = this.R0;
                                this.R0 = match_offset;
                            }
                            else {
                                match_offset = this.R2;
                                this.R2 = this.R0;
                                this.R0 = match_offset;
                            }

                            let rundest = this.window_posn;
                            let runsrc;
                            this_run -= match_length;

                            // copy any wrapped around source data
                            if (this.window_posn >= match_offset)
                                runsrc = rundest - match_offset; // no wrap
                            else {
                                runsrc = rundest + (this.window_size - match_offset);
                                let copy_length = match_offset - this.window_posn;
                                if (copy_length < match_length) {
                                    match_length -= copy_length;
                                    this.window_posn += copy_length;
                                    while (copy_length-- > 0)
                                        this.win[rundest++] = this.win[runsrc++];
                                    runsrc = 0;
                                }
                            }
                            this.window_posn += match_length;

                            // copy match data - no worrries about destination wraps
                            while (match_length-- > 0)
                                this.win[rundest++] = this.win[runsrc++];
                        }
                        break;

                    case BLOCKTYPE.UNCOMPRESSED:
                        if ((buffer.bytePosition + this_run) > block_size)
                            throw new XnbError('Overrun!' + block_size + ' ' + buffer.bytePosition + ' ' + this_run);
                        for (let i = 0; i < this_run; i++)
                            this.win[window_posn + i] = buffer.buffer[buffer.bytePosition + i];
                        buffer.bytePosition += this_run;
                        this.window_posn += this_run;
                        break;

                    default:
                        throw new XnbError('Invalid blocktype specified!');
                }
            }
        }

        // there is still more left
        if (togo != 0)
            throw new XnbError('EOF reached with data left to go.');

        // ensure the buffer is aligned
        buffer.align();

        // get the start window position
        const start_window_pos = ((this.window_posn == 0) ? this.window_size : this.window_posn) - frame_size;

        // return the window
        return this.win.slice(start_window_pos, start_window_pos + frame_size);
    }

    /**
     * Reads in code lengths for symbols first to last in the given table
     * The code lengths are stored in their own special LZX way.
     * @public
     * @method readLengths
     * @param {BufferReader} buffer
     * @param {Array} table
     * @param {Number} first
     * @param {Number} last
     * @returns {Array}
     */
    readLengths(buffer, table, first, last) {
        // read in the 4-bit pre-tree deltas
        for (let i = 0; i < 20; i++)
            this.pretree_len[i] = buffer.readLZXBits(4);

        // create pre-tree table from lengths
        this.pretree_table = this.decodeTable(
            PRETREE_MAXSYMBOLS,
            PRETREE_TABLEBITS,
            this.pretree_len
        );

        // loop through the lengths from first to last
        for (let i = first; i < last;) {

            // read in the huffman symbol
            let symbol = this.readHuffSymbol(
                buffer,
                this.pretree_table,
                this.pretree_len,
                PRETREE_MAXSYMBOLS,
                PRETREE_TABLEBITS
            );

            // code = 17, run of ([read 4 bits] + 4) zeros
            if (symbol == 17) {
                // read in number of zeros as a 4-bit number + 4
                let zeros = buffer.readLZXBits(4) + 4;
                // iterate over zeros counter and add them to the table
                while (zeros-- != 0)
                    table[i++] = 0;
            }
            // code = 18, run of ([read 5 bits] + 20) zeros
            else if (symbol == 18) {
                // read in number of zeros as a 5-bit number + 20
                let zeros = buffer.readLZXBits(5) + 20;
                // add the number of zeros into the table array
                while (zeros-- != 0)
                    table[i++] = 0;
            }
            // code = 19 run of ([read 1 bit] + 4) [read huffman symbol]
            else if (symbol == 19) {
                // read for how many of the same huffman symbol to repeat
                let same = buffer.readLZXBits(1) + 4;
                // read another huffman symbol
                symbol = this.readHuffSymbol(
                    buffer,
                    this.pretree_table,
                    this.pretree_len,
                    PRETREE_MAXSYMBOLS,
                    PRETREE_TABLEBITS
                );
                symbol = table[i] - symbol;
                if (symbol < 0) symbol += 17;
                while (same-- != 0)
                    table[i++] = symbol;
            }
            // code 0 -> 16, delta current length entry
            else {
                symbol = table[i] - symbol;
                if (symbol < 0) symbol += 17;
                table[i++] = symbol;
            }
        }

        // return the table created
        return table;
    }

    /**
     * Build a decode table from a canonical huffman lengths table
     * @public
     * @method makeDecodeTable
     * @param {Number} symbols Total number of symbols in tree.
     * @param {Number} bits Any symbols less than this can be decoded in one lookup of table.
     * @param {Number[]} length Table for lengths of given table to decode.
     * @returns {Number[]} Decoded table, length should be ((1<<nbits) + (nsyms*2))
     */
    decodeTable(symbols, bits, length) {
        // decoded table to act on and return
        let table = [];

        let pos = 0;
        let table_mask = 1 << bits;
        let bit_mask = table_mask >> 1;

        // loop across all bit positions
        for (let bit_num = 1; bit_num <= bits; bit_num++) {
            // loop over the symbols we're decoding
            for (let symbol = 0; symbol < symbols; symbol++) {
                // if the symbol isn't in this iteration of length then just ignore
                if (length[symbol] == bit_num) {
                    let leaf = pos;
                    // if the position has gone past the table mask then we're overrun
                    if ((pos += bit_mask) > table_mask) {
                        Log.debug(length[symbol]);
                        Log.debug(`pos: ${pos}, bit_mask: ${bit_mask}, table_mask: ${table_mask}`);
                        Log.debug(`bit_num: ${bit_num}, bits: ${bits}`);
                        Log.debug(`symbol: ${symbol}, symbols: ${symbols}`);
                        throw new XnbError('Overrun table!');
                    }
                    // fill all possible lookups of this symbol with the symbol itself
                    let fill = bit_mask;
                    while (fill-- > 0)
                        table[leaf++] = symbol;
                }
            }
            // advance bit mask down the bit positions
            bit_mask >>= 1;
        }

        // exit with success if table is complete
        if (pos == table_mask)
            return table;

        // mark all remaining table entries as unused
        for (let symbol = pos; symbol < table_mask; symbol++)
            table[symbol] = 0xFFFF;

        // next_symbol = base of allocation for long codes
        let next_symbol = ((table_mask >> 1) < symbols) ? symbols : (table_mask >> 1);

        // allocate space for 16-bit values
        pos <<= 16;
        table_mask <<= 16;
        bit_mask = 1 << 15;

        // loop again over the bits
        for (let bit_num = bits + 1; bit_num <= 16; bit_num++) {
            // loop over the symbol range
            for (let symbol = 0; symbol < symbols; symbol++) {
                // if the current length iteration doesn't mach our bit then just ignore
                if (length[symbol] != bit_num)
                    continue;

                // get leaf shifted away from 16 bit padding
                let leaf = pos >> 16;

                // loop over fill to flood table with
                for (let fill = 0; fill < (bit_num - bits); fill++) {
                    // if this path hasn't been taken yet, 'allocate' two entries
                    if (table[leaf] == 0xFFFF) {
                        table[(next_symbol << 1)] = 0xFFFF;
                        table[(next_symbol << 1) + 1] = 0xFFFF;
                        table[leaf] = next_symbol++;
                    }

                    // follow the path and select either left or right for the next bit
                    leaf = table[leaf] << 1;
                    if ((pos >> (15 - fill)) & 1)
                        leaf++;
                }
                table[leaf] = symbol

                // bit position has overun the table mask
                if ((pos += bit_mask) > table_mask)
                    throw new XnbError('Overrun table during decoding.');
            }
            bit_mask >>= 1;
        }

        // we have reached table mask
        if (pos == table_mask)
            return table;

        // something else went wrong
        throw new XnbError('Decode table did not reach table mask.');
    }

    /**
     * Decodes the next huffman symbol from the bitstream.
     * @public
     * @method readHuffSymbol
     * @param {BufferReader} buffer
     * @param {Number[]} table
     * @param {Number[]} length
     * @param {Number} symbols
     * @param {Number} bits
     * @returns {Number}
     */
    readHuffSymbol(buffer, table, length, symbols, bits) {
        // peek the specified bits ahead
        let bit = (buffer.peekLZXBits(32) >>> 0); // (>>> 0) allows us to get a 32-bit uint
        let i = table[buffer.peekLZXBits(bits)];

        // if our table is accessing a symbol beyond our range
        if (i >= symbols) {
            let j = 1 << (32 - bits);
            do {
                j >>= 1;
                i <<= 1;
                i |= (bit & j) != 0 ? 1 : 0;
                if (j == 0)
                    return 0;
            }
            while ((i = table[i]) >= symbols)
        }

        // seek past this many bits
        buffer.bitPosition += length[i];

        // return the symbol
        return i;
    }

    /**
     * Sets the shortest match.
     * @param {Number} X
     */
    set RRR(X) {
        // No match, R2 <- R1, R1 <- R0, R0 <- X
        if (this.R0 != X && this.R1 != X && this.R2 != X) {
            // shift all offsets down
            this.R2 = this.R1;
            this.R1 = this.R0;
            this.R0 = X;
        }
        // X = R1, Swap R0 <-> R1
        else if (this.R1 == X) {
            let R1 = this.R1;
            this.R1 = this.R0;
            this.R0 = R1;
        }
        // X = R2, Swap R0 <-> R2
        else if (this.R2 == X) {
            let R2 = this.R2;
            this.R2 = this.R0;
            this.R0 = R2;
        }
    }
}

module.exports = Lzx;
