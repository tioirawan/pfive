const inquirer = require("inquirer");
const chalk = require("chalk");
const path = require("path");
const libData = require("../../data/libData.json");
const fs = require("fs");
const ProgressBar = require('progress');
const https = require('https');
const urlParser = require("url-parse");
const templator = require("./templator");

async function init(dir) {
    const usrDir = dir.split("/").pop();
    const usrPackage = await inquirer.prompt([{
            type: "input",
            name: "name",
            message: chalk.cyan("Package Name:"),
            default: usrDir
        },
        {
            type: "input",
            name: "main",
            message: chalk.yellow("Main file:"),
            default: "index.html"
        },
        {
            type: "input",
            name: "version",
            message: chalk.magenta("Version:"),
            default: "0.0.1"
        },
        {
            type: "input",
            name: "description",
            message: chalk.blue("Description:")
        },
        {
            type: "checkbox",
            name: "lib",
            message: chalk.green("Lib:"),
            choices: Object.keys(libData).map(lib => {
                return {
                    name: lib,
                    value: lib,
                    checked: lib == "p5.js" // default
                }
            })
        },
    ]);

    // template string
    const htmlTemplate = fs.readFileSync(__dirname + "/../../templates/main.html", 'utf8');
    const cssTemplate = fs.readFileSync(__dirname + "/../../templates/style.css", 'utf8');
    const jsTemplate = fs.readFileSync(__dirname + "/../../templates/sketch.js", 'utf8');

    const assetsDir = path.join(dir, "assets");
    const jsDir = path.join(assetsDir, "js");
    const cssDir = path.join(assetsDir, "css");

    if (!fs.existsSync(assetsDir)) {
        fs.mkdirSync(assetsDir);
    }
    if (!fs.existsSync(jsDir)) {
        fs.mkdirSync(jsDir);
    }
    if (!fs.existsSync(cssDir)) {
        fs.mkdirSync(cssDir);
    }

    fs.writeFileSync(path.join(dir, usrPackage.main), templator.compileHTML(htmlTemplate, usrPackage.lib));
    fs.writeFileSync(path.join(assetsDir, "css", "style.css"), cssTemplate);
    fs.writeFileSync(path.join(assetsDir, "js", "sketch.js"), jsTemplate);
    fs.writeFileSync(path.join(dir, "pfive.json"), JSON.stringify(usrPackage, null, 2));
    console.log(chalk.green("Done... now, type 'pfive install'"));
}

async function addLib(dir) {
    checkJSON(dir);
    const pfive = require(path.join(dir, "pfive.json"));
    const usrLib = await inquirer.prompt([{
        type: "checkbox",
        name: "lib",
        message: chalk.green("Lib:"),
        choices: Object.keys(libData).map(lib => {
            return {
                name: lib,
                value: lib,
                checked: pfive.lib.includes(lib)
            }
        })
    }]);
    pfive.lib = usrLib.lib;
    fs.writeFileSync(path.join(dir, "pfive.json"), JSON.stringify(pfive, null, 2));
    console.log(chalk.green("Done... now, type 'pfive install'"));
}

async function install(dir) {
    checkJSON(dir);
    const pfive = require(path.join(dir, "pfive.json"));
    const p5Lib = path.join(dir, "p5_lib");

    if (!fs.existsSync(p5Lib)) {
        fs.mkdirSync(p5Lib);
    }

    let libIndex = 0;
    if (pfive.lib.length) {
        console.log(chalk.cyan("Downloading library...\n"));
        download(libIndex);
    } else {
        console.log(chalk.yellow("No library found in pfive.json, try 'pfive add-lib'"));
    }

    function download(index) {
        if (libIndex >= pfive.lib.length) {
            console.log(chalk.green("\nDone!"))
            return;
        };
        const lib = pfive.lib[index];

        const url = new urlParser(libData[lib]);
        let data = '';

        const req = https.request({
            host: url.host,
            port: 443,
            path: url.pathname
        });

        req.on('response', function (res) {
            const len = parseInt(res.headers['content-length'], 10);
            const bar = new ProgressBar(chalk.bgBlue(`Downloading ${lib} [:bar] :rate/bps :percent :etas`), {
                complete: '=',
                incomplete: ' ',
                width: 20,
                total: len
            });

            res.on('data', function (chunk) {
                bar.tick(chunk.length);
                data += chunk;
            });

            res.on('end', function () {
                fs.writeFileSync(path.join(p5Lib, lib), data);
                download(++libIndex)
            });
        });

        req.end();
    };
}

async function checkJSON(dir) {
    if (!fs.existsSync(path.join(dir, "pfive.json"))) {
        console.log(chalk.red("cannot find find pfive.json, try 'pfive init'"));
        process.exit();
    }
}

module.exports = {
    init,
    install,
    addLib
}
