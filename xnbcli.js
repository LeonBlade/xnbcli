const fs = require('fs');
const path = require('path');
const { program } = require('commander');
const Log = require('./app/Log');
const Xnb = require('./app/Xnb');
const { exportFile, resolveImports } = require('./app/Porter');
const chalk = require('chalk');
const mkdirp = require('mkdirp');
const walk = require('walk');
const got = require('got');
const compareVersions = require('compare-versions');

// used for displaying the tally of success and fail
let success = 0;
let fail = 0;

// define the version number
const VERSION = '1.0.7';

// check for updates
async function checkUpdate() {

    try {
        // fetch the package.json to see if there's a new version available
        const response = await got('https://raw.githubusercontent.com/LeonBlade/xnbcli/master/package.json', { json: true });
        const remoteVersion = response.body.version;

        // compare remote version with the current version
        if (compareVersions(remoteVersion, VERSION) > 0) {
            // NOTE: this bugs the user every time they run the tool, not exactly a bad idea but maybe should think
            // of a different approach to not hit github every time?  idk maybe it doesn't matter though
            Log.info(`${chalk.bold.green(`xnbcli v${remoteVersion} is available!`)} Visit ${chalk.blue('https://github.com/LeonBlade/xnbcli/releases')} to get the latest release.`);
        }
    }
    catch (error) {
        Log.error('Failed to search for a new update. Application should still function normally.');
        Log.error(error);
    }
}

(() => {
    // call the init function to get the party started
    init();

})();

// initialize function called after we fetch the newest version
function init() {
    // create the program and set version number
    program.version(VERSION);

    // turn on debug printing
    program.option('--debug', 'Enables debug verbose printing.', () => Log.setMode(Log.DEBUG, true));

    // only display errors
    program.option('--errors', 'Only prints error messages.', () => Log.setMode(Log.INFO | Log.WARN | Log.DEBUG, false));

    // display nothing
    program.option('--silent', 'Prints nothing at all.', () => Log.setMode(Log.INFO | Log.WARN | Log.DEBUG | Log.ERROR, false));

    // XNB unpack command
    program
        .command('unpack <input> [output]')
        .description('Used to unpack XNB files.')
        .action((input, output) => {
            // process the unpack
            processFiles(processUnpack, input, output, details);
        });

    // XNB pack Command
    program
        .command('pack <input> [output]')
        .description('Used to pack XNB files.')
        .action((input, output) => {
            // process the pack
            processFiles(processPack, input, output, details);
        });

    // default action
    program.action(() => program.help());

    // parse the input and run the commander program
    program.parse(process.argv);

    // show help if we didn't specify any valid input
    if (!process.argv.slice(2).length)
        program.help();
}

/**
 * Display the results of the processing
 */
function details() {
    // give a final analysis of the files
    console.log(`${chalk.bold.green('Success')} ${success}`);
    console.log(`${chalk.bold.red('Fail')} ${fail}`);
}

/**
 * Takes input and processes input for unpacking.
 * @param {String} input
 * @param {String} output
 */
function processUnpack(input, output) {
    // catch any exceptions to keep a batch of files moving
    try {
        // ensure that the input file has the right extension
        if (path.extname(input).toLocaleLowerCase() != '.xnb')
            return;

        // create new instance of XNB
        const xnb = new Xnb();

        // load the XNB and get the object from it
        const result = xnb.load(input);

        // save the file
        if (!exportFile(output, result)) {
            Log.error(`File ${output} failed to save!`);
            return fail++;
        }

        // log that the file was saved
        Log.info(`Output file saved: ${output}`);

        // increase success count
        success++;
    }
    catch (ex) {
        // log out the error
        Log.error(`Filename: ${input}\n${ex.stack}\n`);
        // increase fail count
        fail++;
    }
}

/**
 * Process the pack of files to xnb
 * @param {String} input
 * @param {String} output
 * @param {Function} done
 */
function processPack(input, output) {
    try {
        // ensure that the input file has the right extension
        if (path.extname(input).toLocaleLowerCase() != '.json')
            return;

        Log.info(`Reading file "${input}" ...`);

        // create instance of xnb
        const xnb = new Xnb();

        // resolve the imports
        const json = resolveImports(input);
        // convert the JSON to XNB
        const buffer = xnb.convert(json);

        // write the buffer to the output
        fs.writeFileSync(output, buffer);

        // log that the file was saved
        Log.info(`Output file saved: ${output}`);

        // increase success count
        success++;
    }
    catch (ex) {
        // log out the error
        Log.error(`Filename: ${input}\n${ex.stack}\n`);
        // increase fail count
        fail++;
    }
}

/**
 * Used to walk a path with input/output for processing
 * @param {Function} fn
 * @param {String} input
 * @param {String} output
 * @param {Function} cb
 */
function processFiles(fn, input, output, cb) {

    // if this isn't a directory then just run the function
    if (!fs.statSync(input).isDirectory()) {
        // get the extension from the original path name
        const ext = path.extname(input);
        // get the new extension
        const newExt = (ext == '.xnb' ? '.json' : '.xnb');

        // output is undefined or is a directory
        if (output == undefined) {
            output = path.join(path.dirname(input), path.basename(input, ext) + newExt); 
        }
        // output is a directory
        else if (fs.statSync(output).isDirectory())
            output = path.join(output, path.basename(input, ext) + newExt);

        // call the function
        return fn(input, output);
    }

    // output is undefined
    if (output == undefined)
        output = input;

    // get out grandpa's walker
    const walker = walk.walk(input);

    // when we encounter a file
    walker.on('file', (root, stats, next) => {
        // get the extension
        const ext = path.extname(stats.name).toLocaleLowerCase();
        // skip files that aren't JSON or XNB
        if (ext != '.json' && ext != '.xnb')
            return next();

        // swap the input base directory with the base output directory for our target directory
        const target = root.replace(input, output);
        // get the source path
        const inputFile = path.join(root, stats.name);
        // get the target ext
        const targetExt = ext == '.xnb' ? '.json' : '.xnb';
        // form the output file path
        const outputFile = path.join(target, path.basename(stats.name, ext) + targetExt);

        // ensure the path to the output file exists
        if (!fs.existsSync(path.dirname(inputFile)))
            mkdirp.sync(outputFile);

        // run the function
        fn(inputFile, outputFile);
        // next file
        next();
    });

    // any errors that happen
    walker.on('errors', (root, stats, next) => {
        next();
    });

    // done walking the dog
    walker.on('end', cb);
}
