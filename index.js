const path = require('path');
const program = require('commander');
const Log = require('./xnb/Log');
const Xnb = require('./xnb/Xnb');
const exportFile = require('./xnb/Exporter');
const XnbError = require('./xnb/XnbError');

// turn on debug printing
Log.DEBUG = true;

// local variables for input and output to check if they were set later
let inputValue;
let outputValue;

// create the program and set version number
program.version('0.1.0');

// XNB unpack command
program
    .command('unpack <input> [output]')
    .description('Used to unpack XNB files.')
    .action((input, output) => {
        // create new instance of XNB
        const xnb = new Xnb();
        // load the XNB and get the object from it
        const result = xnb.load(input);

        // if output is undefined then set path to input path
        if (output == undefined)
            output = path.dirname(input);

        // get the basename from the input
        const basename = path.basename(input, '.xnb');
        // get the dirname from the input
        const dirname = path.dirname(input);

        // get the output file path
        const outputFile = path.resolve(output, dirname, basename + '.json');

        // save the file
        if (exportFile(outputFile, result))
            Log.info(`Output file saved: ${outputFile}`);
        else
            Log.error(`File ${outputFile} failed to save!`);
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
if (!process.argv.slice(2).length) {
    //program.help();
    let xnb = new Xnb();
    xnb.load('test/Greenhouse.xnb');
}

// TODO: process input/output into the XNB tool
