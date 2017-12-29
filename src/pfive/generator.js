const inquirer = require("inquirer");
const chalk = require("chalk");
const path = require("path");
const libData = require("../../data/libData.json");
const fs = require("fs");
const ProgressBar = require('progress');
const request = require('request');
const templator = require("./templator");
const fsExtra = require('fs-extra');
const normalize = require('normalize-path');
const dns = require('dns')
const schema = require('validate');

async function init(usrPath) {
    const usrPackage = fs.existsSync(path.join(usrPath, 'pfive.json'))
        ? await existingProject(usrPath)
        : await newProject(usrPath)

    fs.writeFileSync(path.join(usrPath, "pfive.json"), JSON.stringify(usrPackage, null, 2));

    const htmlTemplate = path.join(usrPath, usrPackage.main) && fs.existsSync(path.join(usrPath, usrPackage.main))
        ? fs.readFileSync(path.join(usrPath, usrPackage.main))
        : fs.readFileSync(path.join(__dirname, "/../../templates/main.html"), 'utf8')

    const cssTemplate = fs.readFileSync(path.join(__dirname, "/../../templates/style.css"), 'utf8');
    const jsTemplate = fs.readFileSync(path.join(__dirname, "/../../templates/sketch.js"), 'utf8');

    const jsDir = path.join(usrPath, "js");
    const cssDir = path.join(usrPath, "css");

    if (!fs.existsSync(jsDir)) {
        fs.mkdirSync(jsDir);
    }
    if (!fs.existsSync(cssDir)) {
        fs.mkdirSync(cssDir);
    }

    fs.writeFileSync(path.join(usrPath, usrPackage.main), templator.compileHTML(htmlTemplate, usrPackage));
    fs.writeFileSync(path.join(cssDir, "style.css"), cssTemplate);
    fs.writeFileSync(path.join(jsDir, "sketch.js"), jsTemplate);
    print(chalk.green("Done... now, type 'pfive install'"));
}

async function newProject(usrPath) {
    const usrDir = path.basename(normalize(usrPath));

    return await inquirer.prompt([{
            type: "input",
            name: "name",
            message: chalk.cyan("App Name:"),
            default: usrDir,
            validate: isStringEmpty
        },
        {
            type: "input",
            name: "main",
            message: chalk.yellow("Main file:"),
            default: "index.html",
            validate: isStringEmpty
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
            choices: Object.keys(libData).map(lib => ({
                name: lib,
                value: lib,
                checked: lib == "p5.js" // default
            }))
        },
    ]);
}

async function existingProject(usrPath) {
    checkJSON(usrPath, false)
    const pfive = await getPfive(usrPath);
    return await inquirer.prompt([{
            type: "input",
            name: "name",
            message: chalk.cyan("App Name:"),
            default: pfive.name,
            validate: isStringEmpty
        },
        {
            type: "input",
            name: "main",
            message: chalk.yellow("Main file:"),
            default: pfive.main,
            validate: isStringEmpty
        },
        {
            type: "input",
            name: "version",
            message: chalk.magenta("Version:"),
            default: pfive.version
        },
        {
            type: "input",
            name: "description",
            message: chalk.blue("Description:"),
            default: pfive.description
        },
        {
            type: "checkbox",
            name: "lib",
            message: chalk.green("Lib:"),
            choices: Object.keys(libData).map(lib => ({
                name: lib,
                value: lib,
                checked: pfive.lib.includes(lib)
            }))
        },
    ])
}

async function addLib(dir) {
    checkJSON(dir);
    const pfive = await getPfive(dir);
    const usrLib = await inquirer.prompt([{
        type: "checkbox",
        name: "lib",
        message: chalk.green("Lib:"),
        choices: Object.keys(libData).map(lib => ({
            name: lib,
            value: lib,
            checked: pfive.lib.includes(lib)
        }))
    }]);

    const mainFile = path.join(dir, pfive.main);
    pfive.lib = usrLib.lib;

    fs.writeFileSync(path.join(dir, "pfive.json"), JSON.stringify(pfive, null, 2));

    if (!fs.existsSync(mainFile)) {
        print("Can't find main file");
        return;
    }

    const mainHTML = fs.readFileSync(mainFile, 'utf8');

    fs.writeFileSync(path.join(dir, pfive.main), templator.compileHTML(mainHTML, pfive));
    print(chalk.green("Done... now, type 'pfive install'"));
}

async function install(dir, offline = false) {
    checkJSON(dir);
    // check connection
    dns.resolve('www.google.com', err => {
        if (offline || err) {
            if (!offline) print("can't connect to the internet\ntrying offline installation...");
            offlineInstall(dir);
        } else {
            onlineInstall(dir);
        }
    });
}

async function offlineInstall(dir) {
    const pfive = await getPfive(dir);
    const p5Lib = path.join(dir, "p5_lib");

    if (!fs.existsSync(p5Lib)) {
        fs.mkdirSync(p5Lib);
    }

    cleanUnusedLib(dir);

    if (pfive.lib.length) {
        print(chalk.cyan("Installing libraries...\n"));
    } else {
        print(chalk.yellow("No library found in pfive.json, try 'pfive lib'"));
    }

    let libProcessed = 0;
    let libErr = 0;
    pfive.lib.forEach(lib => {
        const libPath = path.join(__dirname, "../../lib", lib);
        print(chalk.blue(`Installing ${lib}...`));
        if (!fs.existsSync(libPath)) {
            print(chalk.magenta(`can't install ${lib}\n`));
            libErr++;
            libProcessed++;
            return;
        }
        fsExtra.copySync(libPath, path.join(p5Lib, lib));
        print(chalk.green("Done...!\n"));
        libProcessed++;
    });

    print(chalk.green(`Successfully installed: ${libProcessed - libErr}`) + " | " + chalk.red(`Error: ${libErr}`))
    if (libErr) print(chalk.yellow("once you install a library with online mode, you can install it offline"));
}

async function onlineInstall(dir) {
    const pfive = await getPfive(dir);
    const p5Lib = path.join(dir, "p5_lib");

    if (!fs.existsSync(p5Lib)) {
        fs.mkdirSync(p5Lib);
    }

    cleanUnusedLib(dir);

    let libIndex = 0;
    if (pfive.lib.length) {
        print(chalk.cyan("Downloading libraries...\n"));
        download(libIndex);
    } else {
        print(chalk.yellow("No library found in pfive.json, try 'pfive lib'"));
    }

    function download(index) {
        if (libIndex >= pfive.lib.length) {
            console.log();
            print(chalk.green("Done!"));
            return;
        };

        const lib = pfive.lib[index];
        let data = '';

        const req = request(libData[lib]);

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
    const pfive = await getPfive(dir);
    const libDir = path.join(dir, "p5_lib");
    let libDeleted = 0;
    fs.readdir(libDir, (err, files) => {
        if (err) throw err;
        for (const file of files) {
            if (pfive.lib.includes(file)) continue;
            print(chalk.yellow(`Deleting ${file}`));
            fs.unlink(path.join(libDir, file), err => {
                if (err) throw err;
                libDeleted++;
            });
        }
    });
}

async function checkJSON(dir, validate = true) {
    if (!fs.existsSync(path.join(dir, "pfive.json"))) {
        print(chalk.red("cannot find find pfive.json, try 'pfive init'"));
        process.exit();
    }

    if (validate) validatePfive(await getPfive(dir))
}

async function validatePfive(pfiveObj) {
    const pfiveSchemaObj = readJSON(path.join(__dirname, '../../data/pfiveSchema.json'));
    const error = schema(pfiveSchemaObj).validate(pfiveObj)

    error.forEach(e => {
        print(chalk.red(e.message));
        print(chalk.green(`Repair with ${chalk.blue('pfive init')} command`));
    })

    // stop process because templator need some data from pfive.json
    if (error.length) process.exit()
}

function print(mess) {
    console.log(`${chalk.blue('~>')} ${mess}`)
}

async function getPfive(dir) {
    return readJSON(path.join(dir, "pfive.json"));
}

function readJSON(dir) {
    return JSON.parse(fs.readFileSync(dir))
}

function isStringEmpty(str) {
    return str.trim().length > 0
}

module.exports = {
    init,
    install,
    addLib,
    cleanUnusedLib
}
