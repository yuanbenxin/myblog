// Build-time prefetch for repository/model card data that cannot be fetched
// from the browser (ModelScope API has no CORS support; Hugging Face avatar
// URLs are not exposed by any public API, and the mirror's CORS behavior is
// unreliable in real browsers).
//
// Scans all markdown sources for `::modelscope{...}` / `::huggingface{...}`
// directives and writes the results to `src/data/card-data.json`, which the
// card plugin (rehype-component-github-card.mjs) inlines at build time.
//
// Run manually with `pnpm fetch:cards`; the GitHub Pages workflow runs it
// before `pnpm build`. Failed requests are skipped with a warning and never
// fail the build.
import { readdirSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join, extname } from "node:path";

const CONTENT_DIR = fileURLToPath(new URL("../src/content", import.meta.url));
const OUTPUT_FILE = fileURLToPath(
	new URL("../src/data/card-data.json", import.meta.url),
);
const MODEL_SCOPE_API = "https://www.modelscope.cn/api/v1/models";
const HF_API_BASE = "https://hf-mirror.com/api";
const HF_WEB_BASE = "https://hf-mirror.com";
const FETCH_TIMEOUT_MS = 15000;

const AVATAR_URL_RE =
	/https:\/\/cdn-avatars\.hf-mirror\.com\/v1\/production\/uploads\/[A-Za-z0-9_./-]+/;

const DIRECTIVE_RE = /::(modelscope|huggingface)\{([^}]*)\}/g;
const ATTR_RE = /(repo|model|logo)="([^"]+)"/g;

function collectDirectives(file) {
	const source = readFileSync(file, "utf8");
	const found = [];
	for (const match of source.matchAll(DIRECTIVE_RE)) {
		const platform = match[1];
		const attrs = {};
		for (const attr of match[2].matchAll(ATTR_RE)) {
			attrs[attr[1]] = attr[2];
		}
		const repo = attrs.repo || attrs.model;
		if (repo) found.push({ platform, repo, logo: attrs.logo || null });
	}
	return found;
}

function walkMarkdown(dir) {
	const files = [];
	for (const entry of readdirSync(dir, { withFileTypes: true })) {
		const path = join(dir, entry.name);
		if (entry.isDirectory()) {
			files.push(...walkMarkdown(path));
		} else if (extname(entry.name) === ".md" || extname(entry.name) === ".mdx") {
			files.push(path);
		}
	}
	return files;
}

async function fetchJson(url) {
	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
	try {
		const response = await fetch(url, { signal: controller.signal });
		if (!response.ok) throw new Error(`HTTP ${response.status}`);
		return await response.json();
	} finally {
		clearTimeout(timer);
	}
}

async function fetchHfAvatar(repo) {
	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
	try {
		const response = await fetch(`${HF_WEB_BASE}/${repo}`, {
			headers: { "User-Agent": "Mozilla/5.0 (compatible; card-prefetch/1.0)" },
			redirect: "follow",
			signal: controller.signal,
		});
		if (!response.ok) throw new Error(`HTTP ${response.status}`);
		const html = await response.text();
		const match = AVATAR_URL_RE.exec(html);
		if (!match) throw new Error("Avatar URL not found in page");
		return match[0];
	} finally {
		clearTimeout(timer);
	}
}

async function fetchHfModel(repo) {
	const data = await fetchJson(`${HF_API_BASE}/models/${repo}`);
	const lic = (data.tags || []).find((t) => t.startsWith("license:"));
	return {
		likes: data.likes,
		downloads: data.downloads,
		license: (lic
			? lic.replace("license:", "")
			: (data.cardData && data.cardData.license)) || "no-license",
		library: data.library_name || "model",
		pipeline: data.pipeline_tag || "pipeline",
	};
}

const files = walkMarkdown(CONTENT_DIR);
const directives = files.flatMap((file) => collectDirectives(file));

const modelscopeRepos = [
	...new Set(
		directives.filter((d) => d.platform === "modelscope").map((d) => d.repo),
	),
];
const hfRepos = [
	...new Set(
		directives.filter((d) => d.platform === "huggingface").map((d) => d.repo),
	),
];
const hfAvatarRepos = hfRepos.filter((repo) => repo.includes("/"));

console.log(
	`[fetch-card-data] Scanning ${files.length} files: ${modelscopeRepos.length} ModelScope repo(s), ${hfRepos.length} HF repo(s)`,
);

const [modelscopeResults, hfModelResults, hfAvatarResults] = await Promise.all([
	Promise.allSettled(
		modelscopeRepos.map(async (repo) => {
			const data = await fetchJson(`${MODEL_SCOPE_API}/${repo}`);
			return { repo, data };
		}),
	),
	Promise.allSettled(
		hfRepos.map(async (repo) => {
			const model = await fetchHfModel(repo);
			return { repo, model };
		}),
	),
	Promise.allSettled(
		hfAvatarRepos.map(async (repo) => {
			const avatarUrl = await fetchHfAvatar(repo);
			return { repo, avatarUrl };
		}),
	),
]);

const modelscope = {};
for (const result of modelscopeResults) {
	if (result.status === "fulfilled") {
		modelscope[result.value.repo] = result.value.data;
	} else {
		console.warn(`[fetch-card-data] (Warn) ModelScope fetch failed: ${result.reason}`);
	}
}

const huggingface = {};
for (const result of hfModelResults) {
	if (result.status === "fulfilled") {
		huggingface[result.value.repo] = result.value.model;
	} else {
		console.warn(`[fetch-card-data] (Warn) HF model fetch failed: ${result.reason}`);
	}
}
for (const result of hfAvatarResults) {
	if (result.status === "fulfilled") {
		const model = huggingface[result.value.repo] || {};
		huggingface[result.value.repo] = {
			...model,
			avatarUrl: result.value.avatarUrl,
		};
	} else {
		console.warn(`[fetch-card-data] (Warn) HF avatar fetch failed: ${result.reason}`);
	}
}

mkdirSync(join(OUTPUT_FILE, ".."), { recursive: true });
writeFileSync(
	OUTPUT_FILE,
	JSON.stringify({ modelscope, huggingface }, null, 2),
);
console.log(
	`[fetch-card-data] Wrote ${OUTPUT_FILE} (${Object.keys(modelscope).length} ModelScope, ${Object.keys(huggingface).length} HF)`,
);