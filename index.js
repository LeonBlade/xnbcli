const program = require('commander');

program
    .version('0.0.1')
    .arguments('<input> [output]')
    .parse(process.argv);

if (cmd == 'undefined') {
    console.error('no command given');
    process.exit(1);
}
