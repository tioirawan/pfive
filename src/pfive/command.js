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
        .command("init")
        .action(() => generator.init(process.cwd()))

    program
        .command("install")
        .alias("i")
        .action(() => generator.install(process.cwd()))

    program
        .command("add-lib")
        .alias("al")
        .action(() => generator.addLib(process.cwd()))


    program.parse(process.argv);
}
