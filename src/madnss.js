import { readdir, readFile, writeFile, mkdir, stat } from "fs/promises";
import path from "path";
import MarkdownIt from "markdown-it";
const md = new MarkdownIt();

/**
 * Create a folder if it does not exist
 *
 * @param {string} path Folder path
 */
const createFolder = async (path) => {
  if (!(await folderExist(path))) await mkdir(path);
};

/**
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
    const files = await readdir(source);
    for (const file of files) {
      const data = await readFile(path.join(source, file), {
        encoding: "utf8",
      });

      var result = md.render(data);
      var name = file.replace(".md", ".html");

      writeFile(path.join(dest, name), result);
    }

    console.log("All done");
  } catch (e) {
    console.log(e);
  }
};
