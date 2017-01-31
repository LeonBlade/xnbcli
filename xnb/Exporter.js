const fs = require('fs');
const path = require('path');
const mkdirp = require('mkdirp');
const PNG = require('pngjs').PNG;
const Log = require('./Log');
const XnbError = require('./XnbError');

/**
 * Used to save a parsed XNB file.
 * @param {object} xnbObject
 */
const exportFile = (filename, xnbObject) => {
    // get the dirname for the file
    const dirname = path.dirname(filename);
    // get the basename for the file
    const basename = path.basename(filename, '.json');

    // create folder path if it doesn't exist
    if (!fs.existsSync(dirname))
        mkdirp.sync(dirname);

    // ensure we have content field
    if (!xnbObject.hasOwnProperty('content'))
        throw new XnbError('Invalid object!');

    // pull reference of content out of data
    const content = xnbObject.content;
    // search the content object for exports to process
    const found = search(content, 'export');

    // if we found data to export
    if (found) {
        // get the key path from found
        const keyPath = found.path;
        // get the exported buffer from found
        const exported = found.value;

        // log that we are exporting additional data
        Log.info(`Exporting ${exported.type} ...`);

        // set buffer by default
        let buffer = exported.data;
        // set extension by default
        let extension = 'bin';

        // resolve found content based on key path if empty then its just content
        const foundContent = (keyPath.length ? content[keyPath] : content);

        // switch over possible export types
        // TODO: make this a litle cleaner possibly with its own function
        switch (exported.type) {
            // Texture2D to PNG
            case 'Texture2D':
                buffer = toPNG(
                    foundContent.width,
                    foundContent.height,
                    exported.data
                );
                extension = 'png';
                break;

            // Compiled Effects
            case 'Effect':
                extension = 'cso';
                break;

            // TODO: TBin to tbin or tmx
            case 'TBin':
                extension = 'tbin';
                break;
        }

        // output file name
        const outputFilename = path.resolve(dirname, `${basename}.${extension}`);

        // save the file
        fs.writeFileSync(outputFilename, buffer);

        // set the exported value to the path
        foundContent['export'] = path.basename(outputFilename);
    }

    // save the XNB object as JSON
    fs.writeFileSync(filename, JSON.stringify(xnbObject, null, 4));

    // successfully exported file(s)
    return true;
}

module.exports = exportFile;

/**
 * Search an object for a given key.
 * @param {object} object
 * @param {String} key
 * @param {String[]} path
 * @returns {object}
 */
const search = (object, key, path = []) => {
    // ensure object is defined and is an object
    if (!object || typeof object != 'object')
        return;

    // if property exists then return it
    if (object.hasOwnProperty(key))
        return { path, value: object[key] };

    // search the objects for keys
    for (let [k, v] of entries(object)) {
        if (typeof v == 'object') {
            path.push(k);
            return search(v, key, path);
        }
    }

    // didn't find anything
    return null;
}

/**
 * Generator for key value pair of object.
 * @param {objec} object
 * @returns {Generator}
 */
function* entries(object) {
    for (let key of Object.keys(object))
        yield [key, object[key]];
}

/**
 * Converts Texture2D into PNG
 * @param {Number} width
 * @param {Number} height
 * @param {Buffer} buffer
 * @returns {Buffer}
 */
const toPNG = (width, height, buffer) => {
    // create an instance of PNG
    const png = new PNG({ width, height, inputHasAlpha: true });
    // set the data to the buffer
    png.data = buffer

    // return the PNG buffer
    return PNG.sync.write(png);
}
