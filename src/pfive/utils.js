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

async function checkJSON(dir, validate = true) {
    print(chalk.blue("Checking pfive.json..."));
    if (!fs.existsSync(path.join(dir, "pfive.json"))) {
        print(chalk.red("Cannot find find pfive.json, try 'pfive init'"));
        process.exit();
    }

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
