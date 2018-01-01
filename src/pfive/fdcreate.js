const path = require("path");
const normalize = require("normalize-path");
const fs = require("fs");
const chalk = require("chalk");
const inquirer = require("inquirer");

const { isStringEmpty, print } = require("./utils");

module.exports = async (
    type,
    fullPath,
    data,
    mess = "create",
    validate = true
) => {
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

        return await this.create(
            "file",
            path.join(dir, nameAnswer.newFileName),
            data
        );
    } else print(chalk.red("Abort..."));
};
