const Log = require('./Log');
const BufferReader = require('./BufferReader');
const XnbError = require('./XnbError');

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
 *
 * Header
 *
 * Block
 *
 * Block
 *
 * Block
 *
 * ...
 *
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

        // initialize the state

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

        // set the number of main elements
        this.main_elements = NUM_CHARS + (posn_slots << 3);

        // Repeated Offsets
        this.R0 = this.R1 = this.R2 = 1;
    }

    /**
     * Decompress the buffer with given frame and block size
     * @param {BufferReader} buffer
     * @param {Number} frame_size
     * @param {Number} block_size
     * @returns {Buffer}
     */
    decompress(buffer, frame_size, block_size) {
        // read the intel call
        const intel = buffer.readLZXBits(1);
        Log.debug(`Intel: ${Log.b(intel, 1)} = ${intel}`);

        // don't care about intel e8
        if (intel != 0)
            throw new XnbError(`Intel E8 not 0!`);

        // TODO: loop over blocks

        // read in the block type
        const block_type = buffer.readLZXBits(3);
        Log.debug(`Blocktype: ${Log.b(block_type, 3)} = ${block_type}`);

        // TODO: switch over block type

        // NOTE: this is assuming a VERBATIM blocktype

        // read 24-bit value for uncompressed bytes in this block
        const hi = buffer.readLZXBits(16);
        const lo = buffer.readLZXBits(8);

        // number of uncompressed bytes for this block
        let block_remaining = (hi << 8) | lo;

        Log.debug(`Block Remaining: ${block_remaining}`);

        // TODO: this should be in state

        const MAINTREE_len = [];
        const LENGTH_len = [];

        // initialize main tree and length tree for use with delta changes
        for (let i = 0; i < MAINTREE_MAXSYMBOLS; i++)
            MAINTREE_len[i] = 0;
        for (let i = 0; i < NUM_SECONDARY_LENGTHS; i++)
            LENGTH_len[i] = 0;

        // read the first 256 elements for main tree
        this.readLengths(buffer, MAINTREE_len, 0, 256);
        // read the rest of the elements for the main tree
        this.readLengths(buffer, MAINTREE_len, 256, this.main_elements);
        // decode the main tree into a table
        const MAINTREE_table = this.decodeTable(MAINTREE_MAXSYMBOLS, MAINTREE_TABLEBITS, MAINTREE_len);
        // read path lengths for the length tree
        this.readLengths(buffer, LENGTH_len, 0, NUM_SECONDARY_LENGTHS);
        // decode the length tree
        const LENGTH_table = this.decodeTable(LENGTH_MAXSYMBOLS, LENGTH_TABLEBITS, LENGTH_len);

        /*Log.debug('Main Tree Length Table');
        Log.debug(MAINTREE_len);
        Log.debug();

        Log.debug('Main Tree Table');
        Log.debug(MAINTREE_table);
        Log.debug();

        Log.debug('Length Tree Length Table');
        Log.debug(LENGTH_len);
        Log.debug();

        Log.debug('Length Tree Table');
        Log.debug(LENGTH_table);
        Log.debug();*/

        // buffer exhaustion check
        // TODO: perform this check

        // TODO: togo should be total output length because of block loop that isn't implemented yet
        let togo = block_remaining;
        let this_run = block_remaining;

        // TODO: create this in state
        let window_posn = 0;

        // the byte window
        let win = [];

        // loop over the bytes left in the buffer to run out our output
        while (this_run > 0 && togo > 0) {
            // if this run is somehow higher than togo then just cap it
            if (this_run > togo)
                this_run = togo;

            togo -= this_run; // wat
            block_remaining -= this_run;

            // apply 2^x-1 mask
            window_posn &= this.window_size - 1;
            // runs can't straddle the window frame
            if (window_posn + this_run > this.window_size)
                throw new XnbError('Cannot run outside of window frame.');

            //switch (block_type) {

            // TODO: add switch for block type
            // NOTE: assuming verbatim

            while (this_run > 0) {
                // get the main element
                let main_element = this.readHuffSymbol(
                    buffer,
                    MAINTREE_table,
                    MAINTREE_len,
                    MAINTREE_MAXSYMBOLS,
                    MAINTREE_TABLEBITS
                );

                // main element is an unmatched character
                if (main_element < NUM_CHARS) {
                    win[window_posn++] = main_element;
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
                        LENGTH_table,
                        LENGTH_len,
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
                    this.R = match_offset;
                }
                else if (match_offset == 0)
                    match_offset = this.R0;
                else if (match_offset == 1)
                    match_offset = this.R = this.R1;
                else
                    match_offset = this.R = this.R2;

                let rundest = window_posn;
                let runsrc;
                this_run -= match_length;

                // copy any wrapped around source data
                if (window_posn >= match_offset)
                    runsrc = rundest - match_offset; // no wrap
                else {
                    runsrc = rundest + (this.window_size - match_offset);
                    let copy_length = match_offset - window_posn;
                    if (copy_length < match_length) {
                        match_length -= copy_length;
                        window_posn += copy_length;
                        while (copy_length-- > 0)
                            win[rundest++] = win[runsrc++];
                        runsrc = 0;
                    }
                }
                window_posn += match_length;

                // copy match data - no worrries about destination wraps
                while (match_length-- > 0)
                    win[rundest++] = win[runsrc++];
            }
        }

        if (togo != 0)
            throw new XnbError('EOF reached with data left to go.');

        let start_window_pos = window_posn;
        if (start_window_pos == 0)
            start_window_pos = this.window_size;
        start_window_pos -= block_remaining; // TODO: should be out length

        return Buffer.from(win);
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

        // TODO: write to state not a local variable
        // create pre-tree length array
        const PRETREE_len = [];

        // read in the 4-bit pre-tree deltas
        for (let i = 0; i < 20; i++)
            PRETREE_len[i] = buffer.readLZXBits(4);

        Log.debug();
        Log.debug('Pre-tree lengths table');
        Log.debug(JSON.stringify(PRETREE_len));

        // TODO: build table of pre-tree
        let PRETREE_table = this.decodeTable(
            PRETREE_MAXSYMBOLS,
            PRETREE_TABLEBITS,
            PRETREE_len
        );

        Log.debug();

        Log.debug('Pre-tree table decoded.');
        Log.debug(JSON.stringify(PRETREE_table));

        Log.debug();

        Log.debug(`Loop through ${first} to ${last}`);

        // loop through the lengths from first to last
        for (let i = first; i < last;) {

            // read in the huffman symbol
            let sym = this.readHuffSymbol(
                buffer,
                PRETREE_table,
                PRETREE_len,
                PRETREE_MAXSYMBOLS,
                PRETREE_TABLEBITS
            );

            // code = 17, run of ([read 4 bits] + 4) zeros
            if (sym == 17) {
                let zeros = buffer.readLZXBits(4) + 4;
                while (zeros-- != 0)
                    table[i++] = 0;
            }
            // code = 18, run of ([read 5 bits] + 20) zeros
            else if (sym == 18) {
                // read in number of zeros as a 5-bit number + 20
                let zeros = buffer.readLZXBits(5) + 20;
                // add the number of zeros into the table array
                while (zeros-- != 0)
                    table[i++] = 0;
            }
            // code = 19 run of ([read 1 bit] + 4) [read huffman symbol]
            else if (sym == 19) {
                let same = buffer.readLZXBits(1) + 4;
                // TODO: read huff sym
                sym = table[i] - sym;
                if (sym < 0)
                    sym += 17;
                while (same-- != 0)
                    table[i++] = sym;
            }
            // code 0 -> 16, delta current length entry
            else {
                sym = table[i] - sym;
                if (sym < 0)
                    sym += 17;
                table[i++] = sym;
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

        let sym;
        let next_symbol;
        let leaf;
        let fill;
        let bit_num;
        let pos = 0;
        let table_mask = 1 << bits;
        let bit_mask = table_mask >> 1;

        // loop across all bit positions
        for (bit_num = 1; bit_num <= bits; bit_num++) {
            // loop over the symbols we're decoding
            for (sym = 0; sym < symbols; sym++) {
                // if the symbol isn't in this iteration of length then just ignore
                if (length[sym] != bit_num)
                    continue;
                leaf = pos;
                // if the position has gone past the table mask then we're overrun
                if ((pos += bit_mask) > table_mask) {
                    Log.debug(`pos = ${pos} > ${table_mask}, ${bit_mask}, sym: ${sym}, ${bit_num}`);
                    throw new XnbError('Overrun table for direct mapping.');
                }
                // fill all possible lookups of this symbol with the symbol itself
                fill = bit_mask;
                while (fill-- > 0)
                    table[leaf++] = sym;
            }
            // advance bit mask down the bit positions
            bit_mask >>= 1;
        }

        // exit with success if table is complete
        if (pos == table_mask)
            return table;

        // mark all remaining table entries as unused
        for (sym = pos; sym < table_mask; sym++)
            table[sym] = 0xFFFF;

        // next_symbol = base of allocation for long codes
        next_symbol = ((table_mask >> 1) < symbols) ? symbols : (table_mask >> 1);

        // allocate space for 16-bit values
        pos <<= 16;
        table_mask <<= 16;
        bit_mask = 1 << 15;

        // loop again over the bits
        for (bit_num = bits + 1; bit_num <= 16; bit_num++) {
            // loop over the symbol range
            for (sym = 0; sym < symbols; sym++) {
                // if the current length iteration doesn't mach our bit then just ignore
                if (length[sym] != bit_num)
                    continue;

                // get leaf shifted away from 16 bit padding
                leaf = pos >> 16;

                // loop over fill to flood table with
                for (fill = 0; fill < (bit_num - bits); fill++) {
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
                table[leaf] = sym

                if ((pos += bit_mask) > table_mask)
                    throw new XnbError('Overrun table during decoding.');
            }
            bit_mask >>= 1;
        }

        if (pos == table_mask)
            return table;

        throw new XnbError('Error decoding table.');
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
        let bit = buffer.peekLZXBits(bits);
        let i = table[bit];

        // if our table is accessing a symbol beyond our range
        if (i >= symbols) {
            throw new XnbError('Not implemented yet!');
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
    set R(X) {
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

    /**
     * Gets the real offset given an encoded one
     * @param {Number} offset Encoded offset
     * @returns {Number} Real offset
     */
    getOffset(offset) {
        // if the encoded offset is 0 - 2 then return the repeated offset
        if (offset == 0)
            return this.R0;
        else if (offset == 1)
            return this.R1;
        else if (offset == 2)
            return this.R2;

        // otherwise return a real offset
        return offset - 2;
    }
}

module.exports = Lzx;
