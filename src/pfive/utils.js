const chalk = require("chalk");
const stripAnsi = require("strip-ansi");
const path = require("path");
const fs = require("fs");
const schema = require("validate");

function isStringEmpty(str) {
    return str.trim().length > 0;
}

function print(mess, before = "", after = "") {
    console.log(`${before}${chalk.blue("~>")} ${mess}${after}`);
}

function horizontalLine(char = "-", beforeLine = "", afterLine = "") {
    const length = Math.round(process.stdout.columns / stripAnsi(char).length);
    console.log(`${beforeLine}${char.repeat(length)}${afterLine}`);
}

function blueDim(str) {
    return chalk.blue.bold.italic.dim(str);
}

async function getPfive(dir) {
    return await readJSON(path.join(dir, "pfive.json"));
}

async function readJSON(dir) {
    return JSON.parse(fs.readFileSync(dir));
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
        print(chalk.green(`Repair with ${blueDim("pfive init")} command`));
        process.exit();
    }
}

async function checkJSON(dir, validate = true) {
    print(chalk.blue("Checking pfive.json..."));

    const pfivePath = path.join(dir, "pfive.json");

    // check if file exist
    if (!fs.existsSync(pfivePath)) {
        print(chalk.red("Cannot find find pfive.json, try 'pfive init'"));
        process.exit();
    }

    // check parsing
    try {
        JSON.parse(fs.readFileSync(pfivePath));
    } catch (error) {
        print(chalk.red("Failed to parse JSON"));
        print(chalk.gray(`${pfivePath}: ${chalk.yellow(error)}`));
        print(
            chalk.green(
                `Check your pfive.json file or try ${blueDim(
                    "pfive init -n"
                )} command, ${blueDim("pfive help")} for more info`
            )
        );
        process.exit();
    }

    // validate data
    if (validate) await validatePfive(await getPfive(dir));
}

module.exports = {
    isStringEmpty,
    print,
    horizontalLine,
    getPfive,
    readJSON,
    validatePfive,
    checkJSON
};
