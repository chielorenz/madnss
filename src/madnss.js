import { readdir, readFile, writeFile, mkdir, stat, access } from "fs/promises";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import MarkdownIt from "markdown-it";
import markdownItAttrs from "markdown-it-attrs";

const md = new MarkdownIt({ html: true });
md.use(markdownItAttrs);
const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Check if a folder exists
 *
 * @param {string} path Folder path
 * @returns
 */
const folderExist = async (path) => {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
};

/**
 * Parse all .md files in the input folder to .html and put them
 * in the output folder
 */
export default async ({ input = "src", output = "public", template }) => {
  if (!(await folderExist(input))) {
    console.log(`Folder "${input}" not found`);
    process.exit(1);
  }

  if (!(await folderExist(output))) {
    await mkdir(output);
  }

  try {
    var partials = {};
    var globals = "";
    var files = await readdir(input);
    files.sort();
    var htmlTemplate = template;
    if (!template) {
      const path = "../assets/template-tailwindcss.html";
      htmlTemplate = (await readFile(join(__dirname, path))).toString();
    }

    try {
      files = files.filter((file) => file !== "_globals.md");
      globals = await readFile(join(input, "_globals.md"), {
        encoding: "utf8",
      });
      const matter = globals.match(/^---([\s\S]*)---/);
      globals = matter[1];
    } catch {}

    for (const file of files) {
      var stats = await stat(join(input, file));
      var isMd = file.split(".").pop() === "md";

      if (stats.isFile() && isMd) {
        var html = htmlTemplate;
        var headTags = [];
        var data = await readFile(join(input, file), {
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

          const matter = data.match(/---([\s\S]*)---/);
          if (matter) {
            const [fullMatch, content] = matter;
            data = data.replace(fullMatch, "");
            headTags.push(content);
          }

          if (globals) {
            headTags.push(globals);
          }

          const head = headTags.join("");
          html = html.replace('<slot name="{head}">', head);

          const markdown = md.render(data);
          html = html.replace('<slot name="{body}">', markdown);

          const name = file.replace(".md", ".html");
          writeFile(join(output, name), html);
        }
      }
    }

    console.log(`Build generated on ${output}`);
  } catch (e) {
    console.log(e);
  }
};
