#!/usr/bin/env node

import path from "path";
import fs from "fs";
import chokidar from "chokidar";
import madnss from "../src/madnss.js";
import { execSync } from "child_process";
import { Command } from "commander/esm.mjs";
import browserSync from "browser-sync";

const program = new Command();
const bs = browserSync.create();

// Available commands:
// madness [build] -s|--source [./src] -d|--dest [./public] -w|--watch -f|--flavour=[tailwindcss|vanilla]
// madness init [name]

/**
 * Create a demo project on dest folder
 *
 * @param {strind} dest
 */
const demo = async (source, dest) => {
  if (fs.existsSync(source)) {
    console.log(`Cannot create demo on existing folder "${source}"`);
  } else {
    fs.mkdirSync(source, { recursive: true });

    var data = `---\n<title>Index | Madnss</title>\n---\n# Index\n<slot name="nav">`;
    fs.writeFileSync(path.join(source, "index.md"), data);

    var data = `---\n<title>About | Madnss</title>\n---\n# About\n<slot name="nav">`;
    fs.writeFileSync(path.join(source, "about.md"), data);

    var data = `- [Home](index.html)\n- [About](about.html)\n`;
    fs.writeFileSync(path.join(source, "_nav.md"), data);

    var data = `---\n<meta charset="utf-8">\n---`;
    fs.writeFileSync(path.join(source, "_globals.md"), data);

    madnss(source, dest);
  }
};

program
  .command("build", { isDefault: true })
  .description("Build your site")
  .option(
    "-i, --input <folder>",
    "the source folder containing your .md files",
    "./src"
  )
  .option(
    "-o, --output <folder>",
    "the output folder that will contail your .html files",
    "./public"
  )
  .option(
    "-f, --flavour <type>",
    "choose a style engine [tailwindcss|vanilla]",
    "tailwindcss"
  )
  .option("-w, --watch", "watch input folder for changes")
  .option("-s, --serve", "serve output folder")
  .action(async (opts) => {
    const input = path.join(process.cwd(), opts.input);
    const output = path.join(process.cwd(), opts.output);
    const styleOut = path.join(output, "/styles.css");
    const purge = [
      path.join(input, "**/*.md"),
      path.join(output, "**/*.html"),
    ].join(",");
    const cmd =
      "node node_modules/tailwindcss/lib/cli.js -c tailwind.config.cjs";

    if (opts.watch) {
      if (opts.flavour === "tailwindcss") {
        execSync(`${cmd} -o ${styleOut} --purge="${purge}" --jit`);
      }

      await madnss(input, output);
      chokidar
        .watch(input, { ignoreInitial: true })
        .on("all", () => madnss(input, output));
    } else {
      if (opts.flavour === "tailwindcss") {
        execSync(`${cmd} -o ${styleOut} --purge="${purge}" --jit -m`);
      }
      madnss(input, output);
    }

    if (opts.serve) {
      bs.init({
        server: output,
        watch: true,
        ui: false,
        notify: false,
      });
    }
  });

program
  .command("init")
  .description("Initialize a new Madnss site")
  .argument("<folder>", "the folder where to create the project")
  .action(async (folder) => {
    const dest = path.join(process.cwd(), folder);
    await demo(path.join(dest, "src"), path.join(dest, "public"));
    console.log("Project initilized");
  });

program
  .command("serve")
  .description("Serve a folder")
  .argument("<folder>", "the folder to serve")
  .action(async (folder) => {
    bs.init({
      server: folder,
      watch: true,
      ui: false,
      notify: false,
    });
  });

program.parse(process.argv);
