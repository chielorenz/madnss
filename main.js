import { readdir, readFile, writeFile, mkdir, stat } from 'fs/promises'
import path from 'path'
import MarkdownIt from 'markdown-it'
import { fileURLToPath } from 'url'

const md = new MarkdownIt()

// Get current dir name
const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

// Create public folder is missing
try {
  await stat(dirname + '/public')
} catch (e) {
  await mkdir(dirname + '/public')
}

try {
  const files = await readdir(dirname + '/pages')
  for (const file of files) {
    const data = await readFile(dirname + '/pages/' + file, {encoding: 'utf8'})

    var result = md.render(data)
    var name = file.replace('.md', '.html')

    writeFile(dirname + '/public/' + name, result)
  }
} catch (e) {
  console.log(e)
}