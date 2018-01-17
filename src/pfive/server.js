const http = require("http");
const finalhandler = require("finalhandler");
const serveStatic = require("serve-static");
const chalk = require("chalk");

const { print } = require("./utils");

module.exports.create = (_dir, _port) => {
    const port = _port || 8080;

    print(chalk.green(`Serving static http server at ${_dir}`));

    const serve = serveStatic(_dir);

    const server = http.createServer((req, res) => {
        const done = finalhandler(req, res);
        serve(req, res, done);
    });

    server.listen(port);

    print(chalk.cyan(`Available on: localhost:${port}`));
    print(chalk.gray("CTRL + C to stop"));
};
