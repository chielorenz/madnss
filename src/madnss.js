import { readFile, writeFile, mkdir, stat, access } from "fs/promises";
import { join, dirname, basename } from "path";
import { fileURLToPath } from "url";
import { globby } from "globby";
import jsdom from "jsdom";
import MarkdownIt from "markdown-it";
import markdownItAttrs from "markdown-it-attrs";
import { read } from "fs";

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

          // TODO check for infilite loop
          var newData = await hydrate(data, files);
          console.log("New Data", newData);

          // // Find all available partials name in this file
          // const matches = data.matchAll(/<p-([\w-]+)[^>]*>/g);
          // for (const match of matches) {
          //   const [full, partial] = match;
          //   partials.push(partial);
          // }

          // // Remove duplicated partials
          // partials = [...new Set(partials)];

          // partials.forEach(async (partial) => {
          //   // fetch the partial content
          //   var partialPath = files.filter(
          //     (file) => basename(file) === `_${partial}.md`
          //   );

          //   var partialContent = (await readFile(partialPath)).toString();
          //   var partial = await hydrate(partialContent);

          //   const dom = new JSDOM(data);
          //   const elems = dom.window.document.querySelectorAll(`p-${partial}`);
          //   elems.forEach((e) => {
          //     console.log(`Partial "${partial}" has content: "${e.innerHTML}"`);
          //     // e.attributes.label.value <- attribute value
          //     // TODO keep going from here
          //   });
          // });

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

          // TODO use JSDOM to add stuf to head and body

          const head = headTags.join("");
          html = html.replace('<slot name="{head}">', head);

          const markdown = md.render(newData);
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

const hydrate = async (data, files) => {
  var partials = [];
  var replacements = [];

  // Find all available partials name in this file
  const matches = data.matchAll(/<p-([\w-]+)[^>]*>/g);
  for (const match of matches) {
    const [full, partial] = match;
    partials.push(partial);
  }

  // Remove duplicated partials
  partials = [...new Set(partials)];

  for (const partial of partials) {
    // fetch the partial content
    var path = files.find((file) => basename(file) === `_${partial}.md`);

    var templateGlob = (await readFile(path)).toString();

    templateGlob = await hydrate(templateGlob, files);

    const dom = new JSDOM(data, { includeNodeLocations: true });
    const elems = dom.window.document.querySelectorAll(`p-${partial}`);

    for (const elem of elems) {
      var template = templateGlob;
      var partialContent = elem.innerHTML;
      const dom2 = new JSDOM(template, { includeNodeLocations: true });
      const slot = dom2.window.document.querySelector("slot");
      if (slot) {
        // if slot has an attribute name we must search for a attribute with the same name and
        // use that as content

        var partialAttrs = {};
        if (elem.hasAttributes()) {
          var attrs = elem.attributes;
          for (var i = attrs.length - 1; i >= 0; i--) {
            partialAttrs[attrs[i].name] = attrs[i].value;
          }
        }

        if (slot.hasAttributes()) {
          var slotName = slot.name;
          if (partialAttrs[slotName]) {
            var slotValue = partialAttrs[slotName];
          } else {
            slotValue = slot.innerHTML;
          }
          var pos = dom2.nodeLocation(slot);
          template =
            template.substring(0, pos.startOffset) +
            slotValue +
            template.substring(pos.endOffset, template.length);
        } else {
          var pos = dom2.nodeLocation(slot);
          var replace = partialContent || slot.innerHTML;
          template =
            template.substring(0, pos.startOffset) +
            replace +
            template.substring(pos.endOffset, template.length);
        }
      }

      // template = dom.serialize();
      // if (dom.children.length === 0) {
      //   template = dom.textContent;
      // } else {
      //   template = dom.firstChild.outerHTML;
      // }

      console.log(`Partial "${partial}" has content: "${elem.innerHTML}"`);

      // elem.replaceWith(template);
      // var elemData = elem.outerHTML;
      // data = data.replace(elemData, template);
      var pos = dom.nodeLocation(elem);
      replacements.push({
        start: pos.startOffset,
        end: pos.endOffset,
        content: template,
      });
    }

    // data = dom.serialize();
    // data = dom.textContent;
  }

  var result = "";
  if (replacements.length) {
    replacements.sort((a, b) => a.start - b.start);
    var lastPos = 0;
    for (const rep of replacements) {
      result += data.substring(lastPos, rep.start) + rep.content;
      lastPos = rep.end;
    }
  } else {
    result = data;
  }

  return result;
};
