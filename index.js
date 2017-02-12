const fs = require('fs');
const path = require('path');
const program = require('commander');
const Log = require('./app/Log');
const Xnb = require('./app/Xnb');
const exportFile = require('./app/Exporter');
const XnbError = require('./app/XnbError');
const chalk = require('chalk');

// local variables for input and output to check if they were set later
let inputValue;
let outputValue;

// used for displaying the tally of success and fail
let success = 0;
let fail = 0;

// create the program and set version number
program.version('0.5.0');

// turn on debug printing
program.option('--debug', 'Enables debug verbose printing.', () => {
    Log.setMode(Log.DEBUG, true);
});

// only display errors
program.option('--errors', 'Only prints error messages.', () => {
    Log.setMode(Log.INFO | Log.WARN | Log.DEBUG, false);
});

// XNB unpack command
program
    .command('unpack <input> [output]')
    .description('Used to unpack XNB files.')
    .action((input, output) => {
        // process the upack
        processUnpack(input, output);

        // give a final analysis of the files
        //console.log(`${chalk.bold.green('Success')} ${success}`);
        //console.log(`${chalk.bold.red('Fail')} ${fail}`);
    });

// XNB pack Command
program
    .command('pack <input> [output]')
    .description('Used to pack XNB files.')
    .action((input, output) => {
        // TODO: add functionality to pack XNB files
    });

// default action
program.action(() => program.help());

// parse the input and run the commander program
program.parse(process.argv);

// show help if we didn't specify any valid input
if (!process.argv.slice(2).length)
    program.help();

/**
 * Takes input and processes input for unpacking.
 * @param {String} input
 */
function processUnpack(input, output) {
    // get stats for the input
    const stats = fs.statSync(input);
    // check if input is a directory
    if (stats.isDirectory())
        for (let dir of fs.readdirSync(input))
            processUnpack(path.resolve(input, dir), path.resolve(output, path.basename(input), path.dirname(dir)));
    else if (path.extname(input).toLocaleLowerCase() == '.xnb') {
        // catch any exceptions to keep a batch of files moving
        try {
             // create new instance of XNB
            const xnb = new Xnb();

            // load the XNB and get the object from it
            const result = xnb.load(input);

            // if output is undefined then set path to input path
            if (output === undefined)
                output = path.dirname(input);

            // get the basename from the input
            const basename = path.basename(input, '.xnb');
            // get the dirname from the input
            const dirname = path.dirname(input);

            // get the output file path
            const outputFile = path.resolve(output, basename + '.json');

            // save the file
            if (exportFile(outputFile, result))
                Log.info(`Output file saved: ${outputFile}`);
            else
                Log.error(`File ${outputFile} failed to save!`);

            // increase success count
            success++;
        }
        catch (ex) {
            // log out the error
            Log.error(`Filename: ${path.basename(input)}\n${ex.stack}\n`);
            // increase fail count
            fail++;
        }
        finally {
            // TODO: remove broken file output
        }
    }
}
