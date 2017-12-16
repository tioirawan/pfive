const inquirer = require("inquirer");
const chalk = require("chalk");
const path = require("path");
const libData = require("../../data/libData.json");
const fs = require("fs");
const ProgressBar = require('progress');
const https = require('https');
const urlParser = require("url-parse");
const templator = require("./templator");
const fsExtra = require('fs-extra');

async function init(dir) {
    const usrDir = dir.split("/").pop();
    const usrPackage = await inquirer.prompt([{
            type: "input",
            name: "name",
            message: chalk.cyan("App Name:"),
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

    fs.writeFileSync(path.join(dir, usrPackage.main), templator.compileHTML(htmlTemplate, usrPackage));
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

    const mainFile = path.join(dir, pfive.main);
    pfive.lib = usrLib.lib;

    fs.writeFileSync(path.join(dir, "pfive.json"), JSON.stringify(pfive, null, 2));

    if (!fs.existsSync(mainFile)) {
        console.log("Can't find main file");
        return;
    }

    const mainHTML = fs.readFileSync(mainFile, 'utf8');

    fs.writeFileSync(path.join(dir, pfive.main), templator.compileHTML(mainHTML, pfive));
    console.log(chalk.green("Done... now, type 'pfive install'"));
}

async function install(dir, offline = false) {
    checkJSON(dir);
    // check connection
    require('dns').resolve('www.google.com', (err) => {
        if (offline || err) {
            if (!offline) console.log("can't connect to the internet\ntrying offline installation...");
            offlineInstall(dir);
        } else {
            onlineInstall(dir);
        }
    });
}

async function offlineInstall(dir) {
    const pfive = require(path.join(dir, "pfive.json"));
    const p5Lib = path.join(dir, "p5_lib");

    if (!fs.existsSync(p5Lib)) {
        fs.mkdirSync(p5Lib);
    }

    cleanUnusedLib(dir);

    if (pfive.lib.length) {
        console.log(chalk.cyan("Installing libraries...\n"));
    } else {
        console.log(chalk.yellow("No library found in pfive.json, try 'pfive add-lib'"));
    }

    let libProcessed = 0;
    let libErr = 0;
    pfive.lib.forEach(lib => {
        const libPath = path.join(__dirname, "../../lib", lib);
        console.log(chalk.blue(`Installing ${lib}...`));
        if (!fs.existsSync(libPath)) {
            console.log(chalk.magenta("can't install " + lib + "\n "));
            libErr++;
            libProcessed++;
            // skip :(
            return;
        }
        fsExtra.copySync(libPath, path.join(p5Lib, lib));
        console.log(chalk.green("Done...!\n"));
        libProcessed++;
    });

    console.log(chalk.green(`Successfully installed: ${libProcessed - libErr}`) + " | " + chalk.red(`Error: ${libErr}`))
    if (libErr) console.log(chalk.yellow("once you install a library with online mode, you can install it offline"));
}

async function onlineInstall(dir) {
    const pfive = require(path.join(dir, "pfive.json"));
    const p5Lib = path.join(dir, "p5_lib");

    if (!fs.existsSync(p5Lib)) {
        fs.mkdirSync(p5Lib);
    }

    cleanUnusedLib(dir);

    let libIndex = 0;
    if (pfive.lib.length) {
        console.log(chalk.cyan("Downloading libraries...\n"));
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
                // write file to pfive lib for local installation
                fs.writeFileSync(path.join(__dirname, "../../lib", lib), data);
                fs.writeFileSync(path.join(p5Lib, lib), data);
                download(++libIndex)
            });
        });

        req.end();
    };
}

async function cleanUnusedLib(dir) {
    checkJSON(dir);
    const pfive = require(path.join(dir, "pfive.json"));
    const libDir = path.join(dir, "p5_lib");
    let libDeleted = 0;
    fs.readdir(libDir, (err, files) => {
        if (err) throw err;
        for (const file of files) {
            if (pfive.lib.includes(file)) continue;
            console.log(chalk.yellow(`Deleting ${file}`));
            fs.unlink(path.join(libDir, file), err => {
                if (err) throw err;
                libDeleted++;
            });
        }
    });
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
    addLib,
    cleanUnusedLib
}