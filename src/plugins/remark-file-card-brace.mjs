import { visit } from "unist-util-visit";

// Matches a whole text node that is exactly a `file` directive with a `{...}`
// brace "label". `remark-directive` only treats `{...}` as *attributes*, and a
// bare quoted string (e.g. `::file{"/path"}`) is not valid attributes, so the
// leaf directive fails to parse and the entire line falls back to plain text.
const DIRECTIVE_ONLY = /^([:]{1,2})\s*file\s*\{([\s\S]*)\}$/;

// Matches a following text node that holds a `{...}` block. For the inline
// (single-colon) form `:file{"/path"}`, `remark-directive` parses the directive
// with empty attributes and leaves the `{...}` as a separate text sibling.
const BRACE_TEXT = /^\s*\{([\s\S]*)\}\s*$/;

/**
 * Remark plugin that makes `file` directives accept a brace "label", so all of
 * these work identically to the native `[...]` label form:
 *
 *   ::file{"/notes/a.pdf", "显示名称"}
 *   ::file["/notes/a.pdf", "显示名称"]
 *   :file{"/notes/a.pdf"}
 *   :file["/notes/a.pdf"]
 *   ::file{path="/notes/a.pdf" name="显示名称"}
 *
 * It must run after `remark-directive` and before the directive-to-HAST
 * conversion (`parseDirectiveNode` / `remark-rehype`).
 *
 * @returns {(tree: import('mdast').Root) => void} The transformer.
 */
export function remarkFileCardBrace() {
	return (tree) => {
		// Leaf/text form that failed to parse: the whole line became plain
		// text. Rebuild it as a directive carrying the `{...}` content as a
		// label, so the downstream HAST conversion treats it as a block card.
		visit(tree, "paragraph", (paragraph) => {
			if (paragraph.children.length !== 1) return;
			const only = paragraph.children[0];
			if (only.type !== "text") return;
			const match = DIRECTIVE_ONLY.exec(only.value);
			if (!match) return;
			paragraph.children[0] = {
				type: match[1].length === 2 ? "leafDirective" : "textDirective",
				name: "file",
				attributes: {},
				children: [{ type: "text", value: match[2] }],
				position: only.position,
			};
		});

		// Inline form `:file{...}`: the directive node parses empty and the
		// `{...}` remains as the next text sibling. Move it into the label.
		visit(tree, "textDirective", (node, index, parent) => {
			if (!parent || node.name !== "file") return;
			const hasAttrs = node.attributes && Object.keys(node.attributes).length > 0;
			const hasChildren = node.children && node.children.length > 0;
			if (hasAttrs || hasChildren) return;
			const next = parent.children[index + 1];
			if (!next || next.type !== "text") return;
			const match = BRACE_TEXT.exec(next.value);
			if (!match) return;
			node.children = [{ type: "text", value: match[1] }];
			parent.children.splice(index + 1, 1);
		});
	};
}
