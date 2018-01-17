const path = require("path");
const inquirer = require("inquirer");
const chalk = require("chalk");
const normalize = require("normalize-path");

const libData = require("../../data/libData.json");

const { isStringEmpty, checkJSON, getPfive } = require("./utils");

async function askNew(usrPath) {
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

async function askExist(usrPath) {
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
        await askLib(pfive, false)
    ]);

    console.log();

    return answer;
}

async function askLib(pfive, ask = true) {
    const question = {
        type: "checkbox",
        name: "lib",
        message: chalk.green("Lib:"),
        choices: Object.keys(libData).map(lib => ({
            name: lib,
            value: lib,
            checked: pfive.lib ? pfive.lib.includes(lib) : false
        }))
    };

    if (ask) return await inquirer.prompt([question]);

    return question;
}

module.exports = { askNew, askExist, askLib };
