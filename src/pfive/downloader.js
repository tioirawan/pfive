const path = require("path");
const fs = require("fs");
const chalk = require("chalk");
const fsExtra = require("fs-extra");
const ProgressBar = require("progress");
const request = require("request");

const libData = require("../../data/libData.json");

const { horizontalLine, getPfive, print } = require("./utils");

async function offline(dir) {
    const pfive = await getPfive(dir);
    const p5Lib = path.join(dir, "p5_lib");

    if (!fs.existsSync(p5Lib)) {
        fs.mkdirSync(p5Lib);
    }

    if (pfive.lib.length) {
        print(chalk.cyan("Installing libraries...\n"));
        horizontalLine(chalk.blue("="), "", "\n");
    } else {
        print(chalk.yellow("No library found in pfive.json, try 'pfive lib'"));
    }

    let libProcessed = 0;
    let libErr = 0;

    pfive.lib.forEach(lib => {
        const libPath = path.join(__dirname, "../../lib", lib);

        print(chalk.blue(`Installing ${lib}...`));

        if (!fs.existsSync(libPath)) {
            print(chalk.magenta(chalk.red("\u2717"), `can't install ${lib}\n`));
            libErr++;
            libProcessed++;
            return;
        }

        fsExtra.copySync(libPath, path.join(p5Lib, lib));

        print(chalk.green("Installation Complete...! \u2713 \n"));

        libProcessed++;
    });

    horizontalLine(chalk.blue("="), "", "\n");

    print(
        chalk.green(`Successfully installed: ${libProcessed - libErr}`) +
            " | " +
            chalk.red(`Error: ${libErr}`)
    );

    if (libErr) {
        print(
            chalk.yellow(
                "once you install a library with online mode, you can install it offline"
            )
        );
    }
}

async function online(dir) {
    const pfive = await getPfive(dir);
    const p5Lib = path.join(dir, "p5_lib");

    if (!fs.existsSync(p5Lib)) {
        fs.mkdirSync(p5Lib);
    }

    let libIndex = 0;

    if (pfive.lib.length) {
        print(chalk.cyan("Downloading libraries...\n"));
        horizontalLine(chalk.blue("="), "", "\n");
        download(libIndex);
    } else {
        print(chalk.yellow("No library found in pfive.json, try 'pfive lib'"));
    }

    function download(index) {
        if (libIndex >= pfive.lib.length) {
            horizontalLine(chalk.blue("="), "", "\n");
            print(chalk.green("Download Success!"));
            return;
        }

        const lib = pfive.lib[index];
        const req = request(libData[lib]);

        let data = "";

        req.on("response", res => {
            const len = parseInt(res.headers["content-length"], 10);

            const bar = new ProgressBar(
                chalk.cyanBright(
                    `Downloading '${chalk.bold.italic.dim(lib)}' ${chalk.green(
                        "[:bar]"
                    )} :rate/bps :percent :etas`
                ),
                {
                    complete: "\u2713",
                    incomplete: chalk.red("\u2718"),
                    width: process.stdout.columns,
                    total: len
                }
            );

            res.on("data", chunk => {
                bar.tick(chunk.length);
                data += chunk;
            });

            res.on("end", () => {
                print(chalk.blueBright(`Writing file to p5_lib/${lib}...`));

                fs.writeFileSync(path.join(p5Lib, lib), data);

                // write file to pfive lib for local installation
                print(
                    chalk.blueBright("Creating cache for local installation...")
                );

                fs.writeFileSync(path.join(__dirname, "../../lib", lib), data);

                print(chalk.green("Done...! \u2713 \n"));

                download(++libIndex);
            });
        });

        req.end();
    }
}

module.exports = { offline, online };
