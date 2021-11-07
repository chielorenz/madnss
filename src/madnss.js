import { readdir, readFile, writeFile, mkdir, stat } from "fs/promises";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import MarkdownIt from "markdown-it";

const md = new MarkdownIt();
const __dirname = dirname(fileURLToPath(import.meta.url));
const template = await readFile(join(__dirname, "template.html"), {
  encoding: "utf8",
});

/**
 * Create a folder if it does not exist
 *
 * @param {string} path Folder path
 */
const createFolder = async (path) => {
  if (!(await folderExist(path))) await mkdir(path);
};

/**
 * Check if a folder exists
 *
 * @param {string} path Folder path
 * @returns
 */
const folderExist = async (path) => {
  try {
    await stat(path);
    return true;
  } catch (e) {
    return false;
  }
};

/**
 * Parse all .md files in the source folder to .html and put them
 * in the dest folder
 *
 * @param {string} source The source folder
 * @param {string} dest The destination folder
 */
export default async (source, dest) => {
  if (!(await folderExist(source))) {
    console.log(`Folder "${source}" not found`);
    process.exit(1);
  }

  await createFolder(dest);

  try {
    var partials = {};
    var globals = "";
    var files = await readdir(source);
    files.sort();

    try {
      files = files.filter((file) => file !== "_globals.md");
      globals = await readFile(join(source, "_globals.md"), {
        encoding: "utf8",
      });
      const matter = globals.match(/---([\s\S]*)---/);
      globals = matter[1];
    } catch (e) {
      console.log("No globals found");
    }

    for (const file of files) {
      var stats = await stat(join(source, file));
      var isMd = file.split(".").pop() === "md";

      if (stats.isFile() && isMd) {
        var data = await readFile(join(source, file), {
          encoding: "utf8",
        });

        const isPartial = file.startsWith("_");
        if (isPartial) {
          const name = file.replace("_", "").replace(".md", "");
          partials[name] = data;
        } else {
          for (const [name, content] of Object.entries(partials)) {
            data = data.replace(`<slot name="${name}">`, content);
          }

          var html = template;

          const matter = data.match(/---([\s\S]*)---/);
          if (matter || globals) {
            const [fullMatch, content] = matter;
            data = data.replace(fullMatch, "");
            const head = [content, globals].join("");
            html = html.replace('<slot name="{head}">', head);
          }

          const markdown = md.render(data);
          html = html.replace('<slot name="{body}">', markdown);

          const name = file.replace(".md", ".html");
          writeFile(join(dest, name), html);
        }
      }
    }

    console.log(`Build generated on ${dest}`);
  } catch (e) {
    console.log(e);
  }
};
