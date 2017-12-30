const cheerio = require("cheerio");
const path = require("path");
const libData = require("../../data/libData.json");
const beautify_html = require("js-beautify").html;

module.exports.compileHTML = (html, data, usrJS, usrCSS, oldPfive = false) => {
    const $ = cheerio.load(html);

    $("title").text((i, t) => {
        if (t === "{PACKAGE_NAME}" || (oldPfive && t === oldPfive.name)) {
            return data.name;
        }
        return t;
    });

    if (!$("#p5-lib").length) {
        $('<div id="p5-lib"></div>').appendTo("body");
    }

    for (let lib of Object.keys(libData)) {
        $(`#p5-lib #${lib.replace(/\./g, "-")}`).remove();
    }

    if (usrJS) $("#main-script").attr("src", usrJS);
    if (usrCSS) $("#main-style").attr("href", usrCSS);

    for (let lib of data.lib) {
        const script = `<script id="${lib.replace(
            /\./g,
            "-"
        )}" src="${path.join("p5_lib", lib)}"></script>`;
        $("#p5-lib").append(script);
    }

    return beautify_html($.html(), { max_preserve_newlines: 1 });
};
