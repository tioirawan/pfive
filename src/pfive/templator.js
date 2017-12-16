const cheerio = require('cheerio');
const path = require("path");
const libData = require("../../data/libData.json");
const beautify_html = require('js-beautify').html;

module.exports.compileHTML = (html, data)=> {
    const $ = cheerio.load(html);

    // change title
    $("title").text(data.name);

    // remove all lbraries first
    for(lib of Object.keys(libData)){
        $(`#p5-lib #${lib.replace(/\./g, "-")}`).remove();
    }

    // add libraries that selected
    for(lib of data.lib){
        const script = `<script id="${lib.replace(/\./g, "-")}" src="${path.join("p5_lib", lib)}"></script>`;
        $("#p5-lib").append(script);
    }

    return beautify_html($.html(), {max_preserve_newlines: 1});
}
