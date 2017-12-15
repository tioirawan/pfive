const Mustache = require("mustache");
const path = require("path");

module.exports.compileHTML = (html, libs, appName) => {
    libs = libs.map(lib => path.join("p5_lib", lib));
    return Mustache.render(html.toString(), {
        libs,
        appName
    });
}
