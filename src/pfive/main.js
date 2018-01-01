const chalk = require("chalk");
const path = require("path");
const fs = require("fs");
const dns = require("dns");

const templator = require("./templator");
const project = require("./project");
const create = require("./fdcreate");
const downloader = require("./downloader");

const { generateTemplates } = require("./generator");
const { print, getPfive, readJSON, checkJSON } = require("./utils");

async function init(usrPath, newProject = false) {
    const isNewProject = !fs.existsSync(path.join(usrPath, "pfive.json"));

    const usrPackage =
        isNewProject || newProject
            ? await project.askNew(usrPath)
            : await project.askExist(usrPath);

    const oldPfive =
        !isNewProject && !newProject
            ? await readJSON(path.join(usrPath, "pfive.json"), "utf8")
            : false;

    fs.writeFileSync(
        path.join(usrPath, "pfive.json"),
        JSON.stringify(usrPackage, null, 2)
    );

    // if sketch.js or style.css already exist, user can rename or overwrite
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

    await create(
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

async function addLib(dir) {
    await checkJSON(dir);
    const pfive = await getPfive(dir);
    const usrLib = await project.askLib(pfive);

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
            downloader.offline(dir);
        } else {
            downloader.online(dir);
        }
    });
}

async function cleanUnusedLib(dir) {
    await checkJSON(dir);
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

module.exports = {
    init,
    install,
    addLib,
    cleanUnusedLib
};
