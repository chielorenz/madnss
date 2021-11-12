# Madnss

Madnss (read "madness") is a proof-of-concept opinionated simple **Ma**rk**d**ow**n** **s**tatic **s**ite (generator) powered by Tailwindcss.

## Quick start

Initialize a new project and spin up the development server:

```
npx github:b1n01/madnss init my-site
cd my-syte
npm i
npm run dev
```

Now play around with files in the `src/` folder to update the site.

## Overview

At its core, Madnss goes trought every `.md` file and generates a `.html` page with the same name (`index.md` will be `index.html`). Thats basically it, you can deploy the generated pages as a static site.

To improve upon basics there are some additional features: `partials`, `front matters`, and `globals`, let's see them in detail.

## Partials

You can reuse a portion of code in multiple pages by using `partials`, which are just `.md` files stating with `_`. To reuse this code just add a named `slot` where you want to render the, for example `<slot name="nav">` will render the content from `_nav.md`.

For example, let's assume the `_nav.md` partial as:

```
- [Home](./index.html)
- [About](./about.html)
```

Use the "nav" slot in the `index.md` as:

```
# Index
<slot name="nav">
```

This will generate this `index.html`:

```
<h1>Index</h1>
<ul>
  <li><a href="index.html">Home</a></li>
  <li><a href="about.html">About</a></li>
</ul>

```

As you can see the `<slot name="nav">` slot has been replaced by the content of the `_nav.md` partial.

## Front matter

You can add tags to the html `<head>` by using the front matter notation (as seen in other popular SSG like [Hugo](https://gohugo.io/content-management/front-matter/) and [Jekill](https://jekyllrb.com/docs/front-matter/)).

All tags defined between a set of `---` at the beginning of each `.md` file are injected in the generated `html` page.

If you add this to the `about.md` file:

```
---
<title>About | Madnss</title>
---
```

The generate `about.md` page will look like:

```
<head>
 <title>About | Madnss</title>
</head>
```

## Globals

If you need to add tags to the `<head>` of all pages you can put them in a special file called `_globals.md`. For example, if you add the "meta" tag to `_globals.md` it will be added to every generated page:

```
---
<meta charset="utf-8">
---
```

## Development

You can work on Madnss locally by cloning this repo and starting the development server:

```
git clone https://github.com/b1n01/madnss.git
cd madnss
npm i
npm run dev
```

This will watch the source code for changes with `nodemon` and serve the demo folder `dev/` on your localhost. Both changes to the source code and to `.md` files inside the demo folder will trigger a browser reload.

There are two main files to work on:

- `src/madnss.js` which holds the core logic
- `bin/madnss.js` which is the CLI executable

### CLI commands

You can use it from the command line with:

```
node ./bin/madnss.js init  [folder]
node ./bin/madnss.js build [source] [dest]
node ./bin/madnss.js watch [source] [dest]
node ./bin/madnss.js serve [folder]
node ./bin/madnss.js demo  [src folder] [public folder]
```

Or by installing it globally:

```
npm i -g https://github.com/b1n01/madnss
madnss init [folder]
(...see all commands above)
```

### Import

You can import and use it with Nodejs with:

```js
import madnss from "madnss";
await madnss(source, dest);
```
