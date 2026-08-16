import { unified } from "file:///D:/DevData/myblog/node_modules/.pnpm/unified@11.0.5/node_modules/unified/index.js";
import remarkParse from "file:///D:/DevData/myblog/node_modules/.pnpm/remark-parse@11.0.0/node_modules/remark-parse/index.js";
import remarkDirective from "file:///D:/DevData/myblog/node_modules/.pnpm/remark-directive@3.0.1/node_modules/remark-directive/index.js";
import remarkRehype from "file:///D:/DevData/myblog/node_modules/.pnpm/remark-rehype@11.1.2/node_modules/remark-rehype/index.js";
import { remarkFileCardBrace } from "../src/plugins/remark-file-card-brace.mjs";
import { parseDirectiveNode } from "../src/plugins/remark-directive-rehype.js";
import { rehypeFileCard } from "../src/plugins/rehype-component-file-card.mjs";
import { getSrcFiles } from "../src/plugins/file-card-registry.mjs";

// IMPORTANT: remark-directive extends the *parser* (micromark extensions), so
// it must be registered on the processor before `parse()`. Running it only in
// a transform phase does nothing — that is why the pipeline below configures
// every plugin on a single processor, then parses and runs separately, which
// mirrors how Astro wires remarkPlugins + rehypePlugins.
const md = [
  '::file["/notes/the_manipulated_man/index.html", "公网测试"]',
  "",
  "::file{/notes/the_manipulated_man/index.html}",
  "",
  ":file{/notes/the_manipulated_man/index.html}",
  "",
  '::file{notes/test-note.pdf, "src测试"}',
  "",
  ":file{notes/test-note.pdf}",
  "",
  "::file{test-note.pdf}",
  "",
  '::file{path="notes/test-note.pdf" name="属性写法"}',
  "",
].join("\n");

const processor = unified()
  .use(remarkParse)
  .use(remarkDirective)
  .use(remarkFileCardBrace)
  .use(parseDirectiveNode)
  .use(remarkRehype)
  .use(rehypeFileCard);

const result = await processor.run(processor.parse(md));

console.log("=== OUTPUT (hast) ===");
function summarize(node, depth = 0) {
  if (!node || typeof node !== "object") return;
  if (node.type === "element") {
    const props = { ...(node.properties || {}) };
    delete props.class;
    const text = node.children
      .filter((c) => c.type === "text")
      .map((c) => c.value)
      .join("")
      .trim();
    const inner = node.children.filter((c) => c.type === "element").map((c) => c.tagName);
    console.log(
      `${"  ".repeat(depth)}<${node.tagName}> ${JSON.stringify(props)} text="${text}" children=[${inner.join(",")}]`,
    );
    node.children.forEach((c) => summarize(c, depth + 1));
  } else if (node.children) {
    node.children.forEach((c) => summarize(c, depth));
  }
}
summarize(result);

console.log("\n=== SRC REGISTRY ===");
for (const [k, v] of getSrcFiles()) console.log(`${k}  ->  ${v}`);
