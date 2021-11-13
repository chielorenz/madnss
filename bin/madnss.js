#!/usr/bin/env node

import path from "path";
import fs from "fs";
import chokidar from "chokidar";
import madnss from "../src/madnss.js";
import { exec } from "child_process";
import { Command, Option } from "commander/esm.mjs";
import browserSync from "browser-sync";
import degit from "degit";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const program = new Command();
const bs = browserSync.create();
const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * @param {string} path
 */
const serve = (path) => {
  bs.init({
    server: path,
    watch: true,
    ui: false,
    notify: false,
  });
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
  .addOption(
    new Option("-f, --flavour <type>", "choose a style engine", "tailwindcss")
      .choices(["tailwindcss", "vanilla"])
      .default("tailwindcss")
  )
  .option("-w, --watch", "watch input folder for changes")
  .option("-s, --serve", "serve output folder")
  .action(async (opts) => {
    const input = path.join(process.cwd(), opts.input);
    const output = path.join(process.cwd(), opts.output);
    const styleOut = path.join(output, "/styles.css");

    const template = fs
      .readFileSync(
        path.join(__dirname, `../assets/template-${opts.flavour}.html`)
      )
      .toString();

    await madnss({ input, output, template });

    if (opts.flavour === "tailwindcss") {
      const purge = [
        // path.join(input, "**/*.md"),
        path.join(output, "**/*.html"),
      ].join(",");

      var tailwindConfig = "tailwind.config.cjs";
      if (!fs.existsSync(tailwindConfig)) {
        tailwindConfig = join(__dirname, "../tailwind.config.cjs");
      }

      const watch = opts.watch ? "-w" : "";
      const cmd = `node node_modules/tailwindcss/lib/cli.js -c ${tailwindConfig}`;
      exec(`${cmd} -o ${styleOut} --purge="${purge}" ${watch} --jit -m`);

      // proc.stderr.pipe(process.stderr);
      // var isRunnning = false;
      // proc.stderr.on("data", (data) => {
      //   if (data.includes("Done in") && !isRunnning && opts.serve) {
      //     console.log("Now we sould spin up browserSynck");
      //     isRunnning = true;
      //     bs.init({
      //       server: output,
      //       watch: true,
      //       ui: false,
      //       notify: false,
      //     });
      //   }
      // });
    }

    if (opts.watch) {
      chokidar.watch(input, { ignoreInitial: true }).on("all", () => {
        madnss({ input, output, template });
      });
    }

    if (opts.serve) {
      if (opts.flavour == "tailwindcss") {
        // Wait for `styles.css` to be ready than start the server (only once)
        const watcher = chokidar
          .watch(path.join(output, "styles.css"))
          .on("change", () => {
            serve(output);
            watcher.close();
          });
      } else {
        serve(output);
      }
    }
  });

program
  .command("init")
  .description("Initialize a new Madnss site")
  .argument("<folder>", "the folder where to create the project")
  .addOption(
    new Option("-f, --flavour <type>", "choose a style engine", "")
      .choices(["tailwindcss", "vanilla"])
      .default("tailwindcss")
  )
  .action(async (folder, opts) => {
    const dest = path.join(process.cwd(), folder);

    if (fs.existsSync(dest)) {
      console.log(`Cannot create demo on existing folder "${dest}"`);
    } else {
      fs.mkdirSync(dest, { recursive: true });

      var template;
      if (opts.flavour == "tailwindcss") {
        template = "b1n01/madnss-tailwindcss-template#main";
      } else {
        template = "b1n01/madnss-vanilla-template#main";
      }

      const emitter = degit(template);
      await emitter.clone(dest);

      // Should we run `npm i` here?

      console.log(`Start the Madnss on ${dest} folder`);
    }
  });

program
  .command("serve")
  .description("Serve a folder")
  .argument("<folder>", "the folder to serve")
  .action(serve);

program.parse(process.argv);
