/// <reference types="mdast" />
import { existsSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { h } from "hastscript";
import { visit } from "unist-util-visit";
import { registerSrcFile } from "./file-card-registry.mjs";

// ---------------------------------------------------------------------------
// File type -> icon configuration.
// Each entry maps a file extension to a brand color + short label rendered on
// a rounded badge. Unknown extensions fall back to a neutral gray badge that
// shows the uppercased extension.
// ---------------------------------------------------------------------------
const FILE_TYPES = {
	pdf: { bg: "#d93025", label: "PDF" },
	doc: { bg: "#2b579a", label: "W" },
	docx: { bg: "#2b579a", label: "W" },
	xls: { bg: "#217346", label: "X" },
	xlsx: { bg: "#217346", label: "X" },
	ppt: { bg: "#d24726", label: "P" },
	pptx: { bg: "#d24726", label: "P" },
	html: { bg: "#e34f26", label: "HTML" },
	htm: { bg: "#e34f26", label: "HTML" },
	md: { bg: "#6b7280", label: "MD" },
	markdown: { bg: "#6b7280", label: "MD" },
	txt: { bg: "#4b5563", label: "TXT" },
	zip: { bg: "#7c6a5d", label: "ZIP" },
	rar: { bg: "#7c6a5d", label: "RAR" },
	"7z": { bg: "#7c6a5d", label: "7Z" },
	tar: { bg: "#7c6a5d", label: "TAR" },
	gz: { bg: "#7c6a5d", label: "GZ" },
};

const DEFAULT_ICON_BG = "#6b7280";
const MAX_LABEL_LENGTH = 4;

// Directive attributes that are recognised as "real" configuration and must
// never be treated as an unquoted file path.
const KNOWN_KEYS = new Set([
	"path",
	"src",
	"href",
	"name",
	"title",
	"id",
	"class",
	"has-directive-label",
]);

/**
 * Builds the colored format badge (SVG) for a given extension.
 *
 * @param {string} ext - Lower-cased file extension without the leading dot.
 * @returns {import('hast').Element} The SVG badge element.
 */
function fileIcon(ext) {
	const type = FILE_TYPES[ext] || {
		bg: DEFAULT_ICON_BG,
		label: (ext || "FILE").toUpperCase().slice(0, MAX_LABEL_LENGTH),
	};
	const fontSize = type.label.length <= 3 ? 15 : 12.5;
	return h(
		"svg",
		{
			viewBox: "0 0 48 48",
			xmlns: "http://www.w3.org/2000/svg",
			"aria-hidden": "true",
		},
		[
			h("rect", { width: 48, height: 48, rx: 11, fill: type.bg }),
			h(
				"text",
				{
					x: 24,
					y: 24,
					"text-anchor": "middle",
					"dominant-baseline": "central",
					"font-size": fontSize,
					"font-weight": "700",
					fill: "#ffffff",
					"font-family": "'Segoe UI', Roboto, Arial, sans-serif",
					"letter-spacing": "0.5",
				},
				type.label,
			),
		],
	);
}

/** @returns {import('hast').Element} The download arrow icon. */
function downloadIcon() {
	return h(
		"svg",
		{ viewBox: "0 0 24 24", "aria-hidden": "true" },
		h("path", {
			d: "M12 3v10m0 0-3.5-3.5M12 13l3.5-3.5M4 17v2.5A1.5 1.5 0 0 0 5.5 21h13a1.5 1.5 0 0 0 1.5-1.5V17",
			fill: "none",
			stroke: "currentColor",
			"stroke-width": "2",
			"stroke-linecap": "round",
			"stroke-linejoin": "round",
		}),
	);
}

/**
 * Formats a byte count into a human readable string (e.g. "1.2 MB").
 *
 * @param {number} bytes - File size in bytes.
 * @returns {string} Formatted size string.
 */
function formatSize(bytes) {
	if (!Number.isFinite(bytes) || bytes < 0) return "";
	if (bytes < 1024) return `${bytes} B`;
	let value = bytes;
	let unit = "B";
	for (const u of ["KB", "MB", "GB", "TB"]) {
		value /= 1024;
		unit = u;
		if (value < 1024) break;
	}
	const digits = value >= 100 ? 0 : value >= 10 ? 1 : 2;
	return `${value.toFixed(digits)} ${unit}`;
}

/**
 * Extracts the file path and optional display name from a `file` directive node.
 *
 * Supported forms (all produce a `file` element after parsing):
 * - Attributes:  `::file{path="..." name="..."}` (`src`/`href` and `title` are aliases)
 * - Label:       `::file["...", "..."]` / `:file{"...", "..."}`
 *
 * @param {import('hast').Element} node - The `file` element.
 * @returns {{ filePath: string, name: string }} Extracted path and display name.
 */
function extractPathAndName(node) {
	const props = node.properties || {};
	let filePath =
		typeof props.path === "string" && props.path.trim() !== ""
			? props.path
			: typeof props.src === "string" && props.src.trim() !== ""
				? props.src
				: typeof props.href === "string"
					? props.href
					: "";
	let name =
		typeof props.name === "string" && props.name.trim() !== ""
			? props.name
			: typeof props.title === "string"
				? props.title
				: "";

	const labelText = (node.children || [])
		.filter((child) => child.type === "text")
		.map((child) => child.value)
		.join("")
		.trim();

	if (labelText) {
		const parts = splitLabel(labelText);
		if (!filePath && parts.length > 0) filePath = parts[0];
		if (!name && parts.length > 1) name = parts[1];
	}

	// Without quotes, a bare path that contains no `/` (e.g. `::file{demo.pdf}`)
	// parses as a valid (value-less) directive attribute instead of a label, so
	// it shows up as an unknown property here. Fall back to the first property
	// that looks like a file name.
	if (!filePath) {
		for (const key of Object.keys(props)) {
			if (!key || typeof key !== "string") continue;
			if (KNOWN_KEYS.has(key)) continue;
			if (key.startsWith("#") || key.startsWith(".")) continue;
			if (/^[\w\-./@+~ ]+$/.test(key)) {
				filePath = key;
				break;
			}
		}
	}

	return { filePath: filePath.trim(), name: name.trim() };
}

/**
 * Splits the raw label content of a directive into parts, tolerating optional
 * `{...}` / `[...]` wrappers, quoted values and commas inside quotes.
 *
 * @param {string} text - Raw label text.
 * @returns {string[]} Trimmed, unquoted parts.
 */
function splitLabel(text) {
	let t = text.trim();
	if ((t.startsWith("{") && t.endsWith("}")) || (t.startsWith("[") && t.endsWith("]"))) {
		t = t.slice(1, -1);
	}
	const parts = [];
	let current = "";
	let inQuote = false;
	for (const ch of t) {
		if (ch === '"') inQuote = !inQuote;
		if (ch === "," && !inQuote) {
			parts.push(current);
			current = "";
		} else {
			current += ch;
		}
	}
	parts.push(current);
	return parts
		.map((part) => part.trim().replace(/^["']|["']$/g, ""))
		.filter((part) => part !== "");
}

/**
 * Converts the markdown source location passed to rehype plugins into an
 * absolute filesystem path (Astro passes a `file://` URL).
 *
 * @param {import('vfile').VFile} file - The virtual file being processed.
 * @returns {string} Absolute path to the markdown source, or "".
 */
function resolveMarkdownPath(file) {
	const p = file?.path || file?.history?.[0];
	if (!p) return "";
	if (typeof p === "string" && p.startsWith("file:")) {
		try {
			return fileURLToPath(p);
		} catch {
			return p;
		}
	}
	return String(p);
}

/**
 * The site base path, used to build absolute download URLs. The plugin is
 * loaded through Astro's config (native Node ESM, where `import.meta.env` is
 * unavailable), so the base is read from `process.env.BASE`, matching the
 * `astro.config.mjs` default of "/".
 * @type {string}
 */
const BASE = typeof process !== "undefined" && process.env.BASE ? process.env.BASE : "/";

/**
 * Resolves a `file` directive path to its absolute location on disk and the
 * URL it will be served at after the build.
 *
 * Path handling mirrors the theme's image resolution:
 * - Paths starting with "/" are relative to the `public/` directory. `public/`
 *   files are copied verbatim to the site root, so the URL matches verbatim.
 * - Paths without a leading "/" are relative to the `src/` directory. Files
 *   under `src/` are not emitted to the build output by default, so they are
 *   registered and emitted by the `vite-file-card-src` plugin under the
 *   `/download/` prefix (the prefix keeps them from colliding with `public/`).
 *
 * @param {string} filePath - Path as written in the directive.
 * @returns {{ target: string, href: string }} Absolute path on disk and final URL.
 */
function resolveDownload(filePath) {
	const isPublic = filePath.startsWith("/");
	const clean = filePath.replace(/^[/\\]+/, "").replace(/\\/g, "/");
	if (isPublic) {
		return {
			target: path.resolve(process.cwd(), "public", clean),
			href: buildUrl(clean),
		};
	}
	const target = path.resolve(process.cwd(), "src", clean);
	const publicPath = `download/${clean}`;
	registerSrcFile(publicPath, target);
	return { target, href: buildUrl(publicPath) };
}

/**
 * Joins the site base with a site-relative path into an absolute URL.
 * @param {string} clean - Site-relative path without a leading "/".
 * @returns {string} The final URL.
 */
function buildUrl(clean) {
	return `${BASE.replace(/\/+$/, "")}/${clean}`.replace(/\/{2,}/g, "/");
}

/**
 * Builds the file info card element for a `file` directive.
 *
 * @param {import('hast').Element} node - The `file` element.
 * @param {string} mdPath - Absolute path of the markdown source file.
 * @returns {import('hast').Element} The card element.
 */
function createFileCard(node, mdPath) {
	const { filePath, name } = extractPathAndName(node);

	if (!filePath) {
		console.warn("[FILE-CARD] Missing file path. Usage: ::file[\"path\", \"name\"]");
		return errorCard("Missing file path", "Usage: ::file[\"path\", \"name\"]");
	}

	const ext = filePath.includes(".") ? filePath.split(".").pop().toLowerCase() : "";
	const displayName = name || path.basename(filePath);
	const { target, href: resolvedHref } = resolveDownload(filePath);

	let sizeText;
	let ok = true;
	if (!existsSync(target)) {
		ok = false;
		console.warn(
			`[FILE-CARD] File not found: "${filePath}" (expected at "${target}"). Paths without a leading "/" resolve under "src/", paths with a leading "/" resolve under "public/".`,
		);
		sizeText = "File not found";
	} else {
		const stat = statSync(target);
		sizeText = stat.isFile() ? formatSize(stat.size) : "";
	}
	const href = ok ? resolvedHref : "#";

	const nIcon = h("span", { class: "cf-icon", "aria-hidden": "true" }, fileIcon(ext));
	const nInfo = h("span", { class: "cf-info" }, [
		h("span", { class: "cf-name" }, displayName),
		h(
			"span",
			{ class: "cf-meta" },
			`${ext ? `${ext.toUpperCase()} · ` : ""}${sizeText}`,
		),
	]);
	const nBtn = h("span", { class: "cf-btn", "aria-hidden": "true" }, downloadIcon());

	return h(
		"a",
		{
			class: `card-file no-styling${ok ? "" : " file-missing"}`,
			href,
			download: ok ? displayName : undefined,
			title: ok ? `Download ${displayName}` : `File not found: ${filePath}`,
		},
		[nIcon, nInfo, nBtn],
	);
}

/**
 * Builds a warning card shown when a directive is malformed.
 *
 * @param {string} title - Short error title.
 * @param {string} detail - Detailed message.
 * @returns {import('hast').Element} The error card element.
 */
function errorCard(title, detail) {
	return h("div", { class: "card-file file-error" }, [
		h("span", { class: "cf-icon", "aria-hidden": "true" }, fileIcon("")),
		h("span", { class: "cf-info" }, [
			h("span", { class: "cf-name" }, title),
			h("span", { class: "cf-meta" }, detail),
		]),
	]);
}

/**
 * Rehype plugin that turns `file` directives into downloadable file info cards.
 *
 * @returns {(tree: import('hast').Root, file: import('vfile').VFile) => void} The transformer.
 */
export function rehypeFileCard() {
	return (tree, file) => {
		const mdPath = resolveMarkdownPath(file);
		visit(tree, "element", (node) => {
			if (node.tagName !== "file") return;
			const card = createFileCard(node, mdPath);
			node.tagName = card.tagName;
			node.properties = card.properties;
			node.children = card.children;
			node.position = undefined;
		});
	};
}
