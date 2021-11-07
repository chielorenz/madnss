#!/usr/bin/env node
import path from "path";
import fs from "fs";
import chokidar from "chokidar";
import server from "live-server";
import madnss from "../src/madnss.js";

// Available commands:
// madnss build [source] [dest]
// madnss watch [source] [dest]
// madnss serve [source]
// madnss demo [source]

// TODO use npm i commander chalk
// to handle commands

var args = process.argv.slice(2);
var command = args[0] || "build";
var source = args[1] || process.cwd();
var dest = args[2] || path.join(process.cwd(), "public");

/**
 * Watch sorce for changes and put the reult dest folder
 *
 * @param {string} source
 * @param {string} dest
 */
const watch = async (source, dest) => {
  await madnss(source, dest);
  chokidar
    .watch(source, { ignoreInitial: true, ignored: dest })
    .on("all", () => madnss(source, dest));
};

/**
 * Create a demo project on dest folder
 *
 * @param {strind} dest
 */
const demo = async (dest) => {
  if (fs.existsSync(source)) {
    console.log(`Cannot create demo on existing folder "${source}"`);
  } else {
    fs.mkdirSync(source);

    var data = `---\n<title>Index | Madnss</title>\n---\n# Index\n<slot name="nav">`;
    fs.writeFileSync(path.join(source, "index.md"), data);

    var data = `---\n<title>About | Madnss</title>\n---\n# About\n<slot name="nav">`;
    fs.writeFileSync(path.join(source, "about.md"), data);

    var data = `- [index.html](index.html)\n- [about.html](about.html)\n`;
    fs.writeFileSync(path.join(source, "_nav.md"), data);

    var data = `---\n<meta charset="utf-8">\n---`;
    fs.writeFileSync(path.join(source, "_globals.md"), data);

    madnss(source, path.join(source, "public"));
  }
};

switch (command) {
  case "build":
    madnss(source, dest);
    break;
  case "watch":
    watch(source, dest);
    break;
  case "serve":
    await watch(source, dest);
    server.start({ root: dest });
    break;
  case "demo":
    demo(source);
    break;
  default:
    console.log(`Invalid command "${command}"`);
}
