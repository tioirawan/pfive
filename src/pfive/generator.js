const chalk = require("chalk");
const fs = require("fs");
const path = require("path");

const create = require("./fdcreate");

const { horizontalLine, print } = require("./utils");

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

module.exports = { generateTemplates };
