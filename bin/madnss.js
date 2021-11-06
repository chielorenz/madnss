#!/usr/bin/env node
import path from "path";
import fs from "fs";
import chokidar from "chokidar";
import server from "live-server";
import madnss from "../src/madnss.js";

// Available commands:
// madnss build [source] [dest]
// madnss serve [source] [dest]
// madnss init [source]

var args = process.argv.slice(2);
var command = args[0] || "build";
var source = args[1] || process.cwd();
var dest = args[2] || path.join(process.cwd(), "public");

switch (command) {
  case "build":
    await madnss(source, dest);
    break;
  case "serve":
    await madnss(source, dest);

    chokidar
      .watch(source, { ignoreInitial: true, ignored: dest })
      .on("all", async () => {
        await madnss(source, dest);
      });

    server.start({ root: dest });
    break;
  case "init":
    console.log("Initializing madnss project");

    if (!fs.existsSync(source)) {
      fs.mkdirSync(source);
    }

    fs.writeFile(path.join(source, "index.md"), "# Madness init", async () => {
      await madnss(source, path.join(source, "public"));
    });

    break;
  default:
    console.log(`Invalid command "${command}"`);
}
