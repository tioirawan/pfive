const inquirer = require("inquirer");
const chalk = require("chalk");
const path = require("path");
const libData = require("../../data/libData.json");
const fs = require("fs");
const ProgressBar = require("progress");
const request = require("request");
const templator = require("./templator");
const fsExtra = require("fs-extra");
const normalize = require("normalize-path");
const dns = require("dns");
const schema = require("validate");
const stripAnsi = require("strip-ansi");

async function init(usrPath) {
    const isNewProject = !fs.existsSync(path.join(usrPath, "pfive.json"));

    const usrPackage = isNewProject
        ? await newProject(usrPath)
        : await existingProject(usrPath);

    const oldPfive = !isNewProject
        ? await readJSON(path.join(usrPath, "pfive.json"), "utf8")
        : false;

    fs.writeFileSync(
        path.join(usrPath, "pfive.json"),
        JSON.stringify(usrPackage, null, 2)
    );

    let jsName;
    let cssName;
    if (isNewProject) {
        const resName = await generateTemplates(usrPath);
        jsName = resName.jsName;
        cssName = resName.cssName;
    }

    const htmlTemplate =
        path.join(usrPath, usrPackage.main) &&
        fs.existsSync(path.join(usrPath, usrPackage.main))
            ? fs.readFileSync(path.join(usrPath, usrPackage.main))
            : fs.readFileSync(
                  path.join(__dirname, "/../../templates/main.html"),
                  "utf8"
              );

    create(
        "file",
        path.join(usrPath, usrPackage.main),
        templator.compileHTML(
            htmlTemplate,
            usrPackage,
            jsName,
            cssName,
            oldPfive
        ),
        isNewProject ? "create" : "update",
        false
    );

    print(chalk.green("Done...!"), "\n");
    print(chalk.blue("type 'pfive install' to install all libraries"));
}

async function generateTemplates(dir) {
    print(chalk.green("Generating templates..."), "\n");
    horizontalLine(chalk.gray("="));
    const cssTemplate = fs.readFileSync(
        path.join(__dirname, "/../../templates/style.css"),
        "utf8"
    );
    const jsTemplate = fs.readFileSync(
        path.join(__dirname, "/../../templates/sketch.js"),
        "utf8"
    );

    const jsDir = path.join(dir, "js");
    const cssDir = path.join(dir, "css");
    const p5Dir = path.join(dir, "p5_lib");

    if (!fs.existsSync(jsDir)) await create("dir", jsDir);
    if (!fs.existsSync(cssDir)) await create("dir", cssDir);
    if (!fs.existsSync(p5Dir)) await create("dir", p5Dir);

    const cssName = await create(
        "file",
        path.join(cssDir, "style.css"),
        cssTemplate
    );
    const jsName = await create(
        "file",
        path.join(jsDir, "sketch.js"),
        jsTemplate
    );

    return {
        jsName,
        cssName
    };
}

async function create(type, fullPath, data, mess = "create", validate = true) {
    const base = path.basename(normalize(fullPath));
    const dir = path.dirname(normalize(fullPath)) + "/";
    const relativePath = normalize(fullPath).replace(
        normalize(global.projectPath),
        ""
    );

    if (!fs.existsSync(fullPath) || !validate) {
        print(`${chalk.cyan(`${mess} ${type}:`)} ${relativePath}`);
        type == "file"
            ? fs.writeFileSync(fullPath, data)
            : fs.mkdirSync(fullPath);
        return base;
    }

    const answer = await inquirer.prompt([
        {
            type: "list",
            name: "action",
            message: `${chalk.cyan(dir)}${chalk.cyan.bold.italic.dim(
                base
            )} already exist`,
            choices: ["Overwrite", "Rename", "Abort"]
        }
    ]);

    if (answer.action === "Overwrite") {
        print(`${chalk.cyan(`${mess} ${type}:`)} ${relativePath}`);

        type == "file"
            ? fs.writeFileSync(fullPath, data)
            : fs.mkdirSync(fullPath);

        return base;
    } else if (answer.action === "Rename") {
        const nameAnswer = await inquirer.prompt([
            {
                type: "input",
                name: "newFileName",
                message: `Enter new file name:`,
                validate: isStringEmpty
            }
        ]);

        return await create(
            "file",
            path.join(dir, nameAnswer.newFileName),
            data
        );
    } else print(chalk.red("Abort..."));
}

async function newProject(usrPath) {
    const usrDir = path.basename(normalize(usrPath));

    return await inquirer.prompt([
        {
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
        }
    ]);
}

async function existingProject(usrPath) {
    checkJSON(usrPath, false);
    const pfive = await getPfive(usrPath);

    console.log();

    const answer = await inquirer.prompt([
        {
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
                checked: pfive.lib ? pfive.lib.includes(lib) : false
            }))
        }
    ]);

    console.log();

    return answer;
}

async function addLib(dir) {
    checkJSON(dir);
    const pfive = await getPfive(dir);
    const usrLib = await inquirer.prompt([
        {
            type: "checkbox",
            name: "lib",
            message: chalk.green("Lib:"),
            choices: Object.keys(libData).map(lib => ({
                name: lib,
                value: lib,
                checked: pfive.lib.includes(lib)
            }))
        }
    ]);

    const mainFile = path.join(dir, pfive.main);
    pfive.lib = usrLib.lib;

    fs.writeFileSync(
        path.join(dir, "pfive.json"),
        JSON.stringify(pfive, null, 2)
    );

    if (!fs.existsSync(mainFile)) {
        print("Can't find main file");
        return;
    }

    const mainHTML = fs.readFileSync(mainFile, "utf8");

    fs.writeFileSync(
        path.join(dir, pfive.main),
        templator.compileHTML(mainHTML, pfive)
    );
    print(chalk.green("Done... now, type 'pfive install'"));
}

async function install(dir, offline = false) {
    await cleanUnusedLib(dir);
    console.log("");

    // check connection
    dns.resolve("www.google.com", err => {
        if (offline || err) {
            if (!offline) {
                print(chalk.red("can't connect to the internet"));
                print(chalk.green("trying offline installation... \n"));
            }
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

async function onlineInstall(dir) {
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
        let data = "";

        const req = request(libData[lib]);

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

async function cleanUnusedLib(dir) {
    checkJSON(dir);

    const pfive = await getPfive(dir);
    const libDir = path.join(dir, "p5_lib");

    print(chalk.cyan("Checking for unused libraries..."));

    if (!fs.existsSync(libDir)) {
        print(chalk.yellow(`Can't find p5_lib directory`));
        return;
    }

    fs.readdir(libDir, (err, files) => {
        if (err) throw err;

        let libDeleted = 0;
        let libProcessed = 0;
        files.forEach(file => {
            if (!pfive.lib.includes(file)) {
                print(chalk.yellow(`Deleting ${file}`));

                fs.unlinkSync(path.join(libDir, file));

                libDeleted++;
                print(chalk.blue("Deleted!"));
            }

            libProcessed++;

            if (libProcessed >= files.length) {
                if (!libDeleted)
                    print(chalk.magenta("All libraries are used..."));
                console.log();
            }
        });
    });
}

async function checkJSON(dir, validate = true) {
    print(chalk.blue("Checking pfive.json..."));
    if (!fs.existsSync(path.join(dir, "pfive.json"))) {
        print(chalk.red("Cannot find find pfive.json, try 'pfive init'"));
        process.exit();
    }

    if (validate) validatePfive(await getPfive(dir));
}

async function validatePfive(pfiveObj) {
    print(chalk.green("Validating pfive.json..."));
    const pfiveSchemaObj = await readJSON(
        path.join(__dirname, "../../data/pfiveSchema.json")
    );
    const error = schema(pfiveSchemaObj).validate(pfiveObj);

    error.forEach(e => {
        print(chalk.red(e.message));
    });

    // stop process because templator need some data from pfive.json
    if (error.length) {
        print(
            chalk.green(
                `Repair with ${chalk.blue.bold.italic.dim(
                    "pfive init"
                )} command`
            )
        );
        process.exit();
    }
}

function print(mess, before = "", after = "") {
    console.log(`${before}${chalk.blue("~>")} ${mess}${after}`);
}

async function getPfive(dir) {
    return await readJSON(path.join(dir, "pfive.json"));
}

async function readJSON(dir) {
    return JSON.parse(fs.readFileSync(dir));
}

function isStringEmpty(str) {
    return str.trim().length > 0;
}

function horizontalLine(char = "-", beforeLine = "", afterLine = "") {
    const length = Math.round(process.stdout.columns / stripAnsi(char).length);
    console.log(`${beforeLine}${char.repeat(length)}${afterLine}`);
}

module.exports = {
    init,
    install,
    addLib,
    cleanUnusedLib
};
