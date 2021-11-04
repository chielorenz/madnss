#!/usr/bin/env node
import madnss from "../src/madnss.js";

// Available commands:
// madnss build [source]
// madnss serve [source]

var args = process.argv.slice(2);
var command = args[0] || "build";
var source = args[1] || "pages";

if (command === "build") {
  await madnss(source, "public");
  process.exit(1);
}

if (command === "serve") {
  console.log("Builde a server here");
  process.exit(1);
}

console.log("Invalid command");
