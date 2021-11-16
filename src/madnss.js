import { readFile, writeFile, mkdir, access } from "fs/promises";
import { exit } from "process";
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
 * Parse all .md files in the input folder to .html and put them
 * in the output folder
 */
export default async ({ input = "src", output = "public", template }) => {
  await checkIO(input, output);

  if (!template) {
    const path = "../assets/template-tailwindcss.html";
    template = (await readFile(join(__dirname, path))).toString();
  }

  const files = (await globby(input))
    .filter((file) => file.split(".").pop() === "md")
    .sort();
  const pages = files.filter((file) => !basename(file).startsWith("_"));
  const partials = files.filter((file) => basename(file).startsWith("_"));
  const global = files.find((file) => basename(file) === "_globals.md");

  // TODO handle front matters
  // const globalFM = global ? getFrontMatter(global) : null;

  for (const page of pages) {
    const name = basename(page).replace(".md", ".html");
    const content = (await readFile(page)).toString();
    const hydrated = await hydrate(content, partials);
    const markdown = md.render(hydrated);

    const result = template.replace('<slot name="{body}">', markdown);
    writeFile(join(output, name), result);
  }

  log(`Build generated in ${output}`);
};

/**
 * Hydrate a string with all its partials content
 *
 * @param {string} content
 * @param {array} partials
 * @returns
 */
const hydrate = async (content, files) => {
  const partials = getPartialTags(content);
  var replacements = [];

  for (const partial of partials) {
    const path = getFilePath(`_${partial}.md`, files);
    const partialContent = (await readFile(path)).toString();
    const hydratedPartial = await hydrate(partialContent, files);

    const dom = new JSDOM(content, { includeNodeLocations: true });
    const elements = dom.window.document.body.querySelectorAll(`p-${partial}`);

    elementssLoop: for (const elem of elements) {
      if (isChildOfPartial(elem, partials)) {
        continue elementssLoop;
      }

      var template = hydratedPartial;
      const elemDOM = new JSDOM(template, { includeNodeLocations: true });
      const slot = elemDOM.window.document.querySelector("slot");

      if (slot) {
        const pos = elemDOM.nodeLocation(slot);
        var value;

        if (slot.hasAttributes()) {
          const elemAttrs = getElemAttributes(elem);
          value = elemAttrs[slot.name] || slot.innerHTML;
        } else {
          value = elem.innerHTML
            ? await hydrate(elem.innerHTML, files)
            : slot.innerHTML;
        }

        template = spliceString(template, pos, value);
      }

      var pos = dom.nodeLocation(elem);
      replacements.push({ template, ...pos });
    }
  }

  return applyReplacements(content, replacements);
};

/**
 * Get all partial tags ("<p-")
 *
 * @param {string} content
 * @returns array
 */
const getPartialTags = (content) => {
  var tags = [];
  const matches = content.matchAll(/<p-([\w-]+)[^>]*>/g);
  for (const match of matches) {
    const [full, tag] = match;
    tags.push(tag);
  }

  // remove duplicated values
  return [...new Set(tags)];
};

/**
 * Check is an element is child of a partial
 *
 * @param {DOMElement} element
 * @param {array} partials
 * @returns boolean
 */
const isChildOfPartial = (element, partials) => {
  for (const partial of partials) {
    if (element.parentElement.closest(`p-${partial}`)) {
      return true;
    }
  }
  return false;
};

/**
 * Get all attributes of an element
 *
 * @param {DOMElem} elem
 * @returns object
 */
const getElemAttributes = (elem) => {
  var attributes = {};
  if (elem.hasAttributes()) {
    var attrs = elem.attributes;
    for (var i = attrs.length - 1; i >= 0; i--) {
      attributes[attrs[i].name] = attrs[i].value;
    }
  }

  return attributes;
};

/**
 * Splice the string in position pos and add the value
 *
 * @param {string} string
 * @param {pos} pos JSDOM node location
 * @param {string} value
 * @returns
 */
const spliceString = (string, pos, value) => {
  return (
    string.substring(0, pos.startOffset) +
    value +
    string.substring(pos.endOffset, string.length)
  );
};

/**
 * Get the full path from the a file name
 *
 * @param {string} name
 * @param {array} files
 * @returns
 */
const getFilePath = (name, files) => {
  const path = files.find((file) => basename(file) === name);
  if (!path) {
    error(`Partial "${partial} not found"`);
    exit(1);
  }

  return path;
};

/**
 * Apply a list of replacements to a string
 *
 * @param {string} content
 * @param {array} replacements
 */
const applyReplacements = (content, replacements) => {
  var result = "";
  if (replacements.length) {
    replacements.sort((a, b) => a.startOffset - b.startOffset);
    var lastPos = 0;
    for (const rep of replacements) {
      result += content.substring(lastPos, rep.startOffset) + rep.template;
      lastPos = rep.endOffset;
    }
  } else {
    result = content;
  }

  return result;
};

/**
 * Ensure input and output folder are correcly set
 *
 * @param {string} input
 * @param {string} output
 */
const checkIO = async (input, output) => {
  try {
    await access(input);
  } catch {
    error(`Input folder "${input}" not found`);
    exit(1);
  }

  try {
    await access(output);
  } catch {
    debug(`Creating output folder "${input}"`);
    await mkdir(output);
  }
};

/**
 * Get front matters from a file
 *
 * @param {string} path
 * @returns string | null
 */
const getFrontMatter = async (path) => {
  const content = (await readFile(path)).toString();
  const match = content.match(/^---([\s\S]*)---/);
  return ([fullMatch, content] = match);
};

const log = (args) => console.log(args);
const debug = (args) => log(args);
const error = (args) => log(args);
