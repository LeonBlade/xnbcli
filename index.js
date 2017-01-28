const fs = require('fs');
const path = require('path');
const program = require('commander');
const Log = require('./xnb/Log');
const Xnb = require('./xnb/Xnb');

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

        // filepath for output
        const filepath = path.join(output, path.dirname(input));
        // filename for output
        const filename = path.join(filepath, path.basename(input, '.xnb') + '.json');

        if (!fs.existsSync(filepath))
            fs.mkdirSync(filepath);

        fs.writeFileSync(filename, JSON.stringify(result, null, 4));
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
