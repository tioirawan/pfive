const chalk = require("chalk");

const { print } = require("./utils");

module.exports.create = (_dir, _port) => {
    const port = _port || 8080;

    print(chalk.green(`Serving static http server at ${_dir}`));

    const serve = require("serve-static")(_dir);

    const server = require("http").createServer((req, res) => {
        const done = require("finalhandler")(req, res);
        serve(req, res, done);
    });

    server.listen(port);

    print(chalk.cyan(`Available on: localhost:${port}`));
    print(chalk.gray("CTRL + C to stop"));
};
