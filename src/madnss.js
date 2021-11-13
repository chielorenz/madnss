import { readFile, writeFile, mkdir, stat, access } from "fs/promises";
import { join, dirname, basename } from "path";
import { fileURLToPath } from "url";
import { globby } from "globby";
import jsdom from "jsdom";
import MarkdownIt from "markdown-it";
import markdownItAttrs from "markdown-it-attrs";

const { JSDOM } = jsdom;
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

  /**
   * 1. read all non partials and no globals file
   * 2. for each file check if it contains partials
   * 3. if so search that partials in the files name array
   * 4. if it is not found throw an error
   * 5. otherwise read that partial and check if it is using partials itself
   * 6. if so go on from poin 3
   * 7. than if the prtials has a single slot replace it with the content of the partiels in the point 2
   * 8. if the partias has a named slot searhc in the caller for attributes that matches the name of the slot
   * 9. if found replace the slot in the partials otherwise use the default value
   * 10. replace the final content in the original file
   *
   * Note:
   * - check for infilite loops'
   * - can the default value for a slot be required???
   *
   */
  try {
    // var partials = {};
    var partials = [];
    var globals = "";
    // var files = await readdir(input);
    const files = await globby(input);
    files.sort();
    var htmlTemplate = template;
    if (!template) {
      const path = "../assets/template-tailwindcss.html";
      htmlTemplate = (await readFile(join(__dirname, path))).toString();
    }

    // searcing for globals
    try {
      files = files.filter((file) => file !== "_globals.md");
      globals = await readFile(join(input, "_globals.md"), {
        encoding: "utf8",
      });
      const matter = globals.match(/^---([\s\S]*)---/);
      globals = matter[1];
    } catch {}

    console.log(files);

    for (const file of files) {
      const isPartial = basename(file).startsWith("_");
      if (isPartial) continue;

      var stats = await stat(file);
      var isMd = file.split(".").pop() === "md";

      if (stats.isFile() && isMd) {
        var html = htmlTemplate;
        var headTags = [];
        var data = (await readFile(file)).toString();

        const isPartial = basename(file).startsWith("_");
        if (isPartial) {
          const name = basename(file).replace("_", "").replace(".md", "");
          partials[name] = data;
        } else {
          // data is the file content

          // Find all available partials name in this file
          const matches = data.matchAll(/<p-([\w-]+)[^>]*>/g);
          for (const match of matches) {
            const [full, partial] = match;
            partials.push(partial);
          }

          // Remove duplicated partials
          partials = [...new Set(partials)];

          partials.forEach((partial) => {
            const dom = new JSDOM(data);
            const elems = dom.window.document.querySelectorAll(`p-${partial}`);
            elems.forEach((e) => {
              console.log(`Partial "${partial}" has content: "${e.innerHTML}"`);
              // e.attributes.label.value <- attribute value
              // TODO keep going from here
            });
          });

          // for (const [name, content] of Object.entries(partials)) {
          //   data = data.replace(`<slot name="${name}">`, content);
          // }

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

          const name = basename(file).replace(".md", ".html");
          writeFile(join(output, name), html);
        }
      }
    }

    console.log(`Build generated on ${output}`);
  } catch (e) {
    console.log(e);
  }
};
