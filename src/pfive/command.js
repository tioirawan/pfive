const program = require("commander");
const generator = require("./generator");
const {
    version,
    description
} = require("../../package.json");

module.exports.run = () => {

    program
        .version(version)
        .description(description);

    program
        .option('-off, --offline', 'Install from existing libraries');

    program
        .command("init")
        .action(() => generator.init(process.cwd()))

    program
        .command("install")
        .alias("i")
        .action(() => generator.install(process.cwd(), program.offline))

    program
        .command("lib")
        .alias("l")
        .action(() => generator.addLib(process.cwd()))

    program
        .command("prune")
        .alias("p")
        .action(() => generator.cleanUnusedLib(process.cwd()))


    program.parse(process.argv);
}
