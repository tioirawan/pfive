const program = require("commander");

const { version, description } = require("../../package.json");

module.exports.run = () => {
    program.version(version).description(description);

    program
        .option("-v, --version", "Show version", version)
        .option(
            "-o, --offline",
            "Offline installer, use with 'install' command"
        )
        .option(
            "-n, --new",
            "Use with 'init' command to force pfive generate new project"
        )
        .option(
            "-p, --port <port>",
            "Use with 'serve' command to set port, default is 8080"
        );

    program
        .command("help")
        .alias("h")
        .description("Show this help message")
        .action(() => program.help());

    program
        .command("init")
        .description("Create pfive.json file")
        .action(() => require("./main").init(process.cwd(), program.new));

    program
        .command("install")
        .alias("i")
        .description("Install libraries from pfive.json")
        .action(() =>
            require("./main").install(process.cwd(), program.offline)
        );

    program
        .command("lib")
        .alias("l")
        .description("Edit pfive.json libraries")
        .action(() => require("./main").addLib(process.cwd()));

    program
        .command("prune")
        .alias("p")
        .description("Remove unused libraries")
        .action(() => require("./main").cleanUnusedLib(process.cwd()));

    program
        .command("serve")
        .alias("s")
        .description("Run simple local server")
        .action(() =>
            require("./main").serveHTTPServer(process.cwd(), program.port)
        );

    program.parse(process.argv);

    if (program.args.length < 1) {
        console.log(`pfive version: ${program.version()}, 'pfive -h' for help`);
    }
};
