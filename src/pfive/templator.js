const cheerio = require('cheerio');
const path = require("path");
const libData = require("../../data/libData.json");
const beautify_html = require('js-beautify').html;

module.exports.compileHTML = (html, data)=> {
    const $ = cheerio.load(html);

    $("title").text((i, t) => t === '{PACKAGE_NAME}'? data.name: t);

    for(lib of Object.keys(libData)){
        $(`#p5-lib #${lib.replace(/\./g, "-")}`).remove();
    }

    for(lib of data.lib){
        const script = `<script id="${lib.replace(/\./g, "-")}" src="${path.join("p5_lib", lib)}"></script>`;
        $("#p5-lib").append(script);
    }

    return beautify_html($.html(), {max_preserve_newlines: 1});
}
