import svelte from "@astrojs/svelte";
import tailwind from "@astrojs/tailwind";
import { pluginCollapsibleSections } from "@expressive-code/plugin-collapsible-sections";
import { pluginLineNumbers } from "@expressive-code/plugin-line-numbers";
import swup from "@swup/astro";
import { defineConfig } from "astro/config";
import expressiveCode from "astro-expressive-code";
import icon from "astro-icon";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import rehypeComponents from "rehype-components"; /* Render the custom directive content */
import rehypeKatex from "rehype-katex";
import rehypeSlug from "rehype-slug";
import remarkDirective from "remark-directive"; /* Handle directives */
import remarkGithubAdmonitionsToDirectives from "remark-github-admonitions-to-directives";
import remarkMath from "remark-math";
import remarkSectionize from "remark-sectionize";
import { visit } from "unist-util-visit";
import { expressiveCodeConfig } from "./src/config.ts";
import { pluginCustomCopyButton } from "./src/plugins/expressive-code/custom-copy-button.js";
import { pluginLanguageBadge } from "./src/plugins/expressive-code/language-badge.ts";
import { AdmonitionComponent } from "./src/plugins/rehype-component-admonition.mjs";
import { rehypeFileCard } from "./src/plugins/rehype-component-file-card.mjs";
import { viteFileCardSrc } from "./src/plugins/vite-file-card-src.mjs";
import {
	GithubCardComponent,
	HuggingfaceCardComponent,
	ModelscopeCardComponent,
} from "./src/plugins/rehype-component-github-card.mjs";
import { parseDirectiveNode } from "./src/plugins/remark-directive-rehype.js";
import { remarkExcerpt } from "./src/plugins/remark-excerpt.js";
import { remarkFileCardBrace } from "./src/plugins/remark-file-card-brace.mjs";
import { remarkReadingTime } from "./src/plugins/remark-reading-time.mjs";

// https://astro.build/config
// site/base can be overridden via env vars (used by the GitHub Pages workflow).
// Defaults keep local dev on "/" with a placeholder site origin.
const site = process.env.SITE || "https://aboutme.sukina.workers.dev/";
const base = process.env.BASE || "/";

// Add loading="lazy" to all <img> elements for native lazy loading
const rehypeLazyImages = () => (tree) => {
	visit(tree, "element", (node) => {
		if (node.tagName === "img" && node.properties) {
			node.properties.loading = "lazy";
		}
	});
};

// Prefix site-absolute paths (starting with "/") with the base path, so
// links/iframes/images written for local dev also work when the site is
// deployed under a sub-path (BASE=/myblog/ in the GitHub Pages workflow).
// Runs after rehypeComponents so directive-rendered markup is covered too.
// Raw HTML nodes (hand-written <iframe>/<img> tags) are rewritten via regex.
const rehypeBaseUrls = () => (tree) => {
	const base = (process.env.BASE || "/").replace(/\/+$/, "");
	if (base === "") return; // root deployment: nothing to prefix
	const escaped = base.slice(1).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
	const rawRe = new RegExp(
		`(\\s(?:src|href)=")\\/(?!\\/)(?!${escaped})`,
		"g",
	);
	visit(tree, (node) => {
		if (node.type === "raw") {
			node.value = node.value.replace(rawRe, `$1${base}/`);
			return;
		}
		if (node.type !== "element" || !node.properties) return;
		for (const prop of ["href", "src"]) {
			const value = node.properties[prop];
			if (typeof value !== "string") continue;
			if (!value.startsWith("/") || value.startsWith("//")) continue;
			if (value.startsWith(base)) continue;
			node.properties[prop] = `${base}${value}`;
		}
	});
};

export default defineConfig({
	site: site,
	base: base,
	trailingSlash: "always",
	devToolbar: {
		enabled: false,
	},
	integrations: [
		tailwind({
			nesting: true,
		}),
		swup({
			theme: false,
			animationClass: "transition-swup-", // see https://swup.js.org/options/#animationselector
			// the default value `transition-` cause transition delay
			// when the Tailwind class `transition-all` is used
			containers: ["main", "#toc"],
			smoothScrolling: true,
			cache: true,
			preload: true,
			accessibility: true,
			updateHead: true,
			updateBodyClass: false,
			globalInstance: true,
		}),
		icon({
			include: {
				"preprocess: vitePreprocess(),": ["*"],
				"fa6-brands": ["*"],
				"fa6-regular": ["*"],
				"fa6-solid": ["*"],
			},
		}),
		expressiveCode({
			themes: [expressiveCodeConfig.theme, expressiveCodeConfig.theme],
			plugins: [
				pluginCollapsibleSections(),
				pluginLineNumbers(),
				pluginLanguageBadge(),
				pluginCustomCopyButton(),
			],
			defaultProps: {
				wrap: true,
				overridesByLang: {
					shellsession: {
						showLineNumbers: false,
					},
				},
			},
			styleOverrides: {
				codeBackground: "var(--codeblock-bg)",
				borderRadius: "0.75rem",
				borderColor: "none",
				codeFontSize: "0.875rem",
				codeFontFamily:
					"'JetBrains Mono Variable', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
				codeLineHeight: "1.5rem",
				frames: {
					editorBackground: "var(--codeblock-bg)",
					terminalBackground: "var(--codeblock-bg)",
					terminalTitlebarBackground: "var(--codeblock-topbar-bg)",
					editorTabBarBackground: "var(--codeblock-topbar-bg)",
					editorActiveTabBackground: "none",
					editorActiveTabIndicatorBottomColor: "var(--primary)",
					editorActiveTabIndicatorTopColor: "none",
					editorTabBarBorderBottomColor: "var(--codeblock-topbar-bg)",
					terminalTitlebarBorderBottomColor: "none",
				},
				textMarkers: {
					delHue: 0,
					insHue: 180,
					markHue: 250,
				},
			},
			frames: {
				showCopyToClipboardButton: false,
			},
		}),
		svelte(),
	],
	markdown: {
		remarkPlugins: [
			remarkMath,
			remarkReadingTime,
			remarkExcerpt,
			remarkGithubAdmonitionsToDirectives,
			remarkDirective,
			remarkFileCardBrace,
			remarkSectionize,
			parseDirectiveNode,
		],
		rehypePlugins: [
			rehypeLazyImages,
			rehypeFileCard,
			rehypeKatex,
			rehypeSlug,
			[
				rehypeComponents,
				{
					components: {
						github: GithubCardComponent,
						huggingface: HuggingfaceCardComponent,
						modelscope: ModelscopeCardComponent,
						note: (x, y) => AdmonitionComponent(x, y, "note"),
						tip: (x, y) => AdmonitionComponent(x, y, "tip"),
						important: (x, y) => AdmonitionComponent(x, y, "important"),
						caution: (x, y) => AdmonitionComponent(x, y, "caution"),
						warning: (x, y) => AdmonitionComponent(x, y, "warning"),
					},
				},
			],
			rehypeBaseUrls,
			[
				rehypeAutolinkHeadings,
				{
					behavior: "append",
					properties: {
						className: ["anchor"],
					},
					content: {
						type: "element",
						tagName: "span",
						properties: {
							className: ["anchor-icon"],
							"data-pagefind-ignore": true,
						},
						children: [
							{
								type: "text",
								value: "#",
							},
						],
					},
				},
			],
		],
	},
	vite: {
		plugins: [viteFileCardSrc()],
		optimizeDeps: {
			exclude: ["@swup/astro"],
		},
		build: {
			rollupOptions: {
				onwarn(warning, warn) {
					// temporarily suppress this warning
					if (
						warning.message.includes("is dynamically imported by") &&
						warning.message.includes("but also statically imported by")
					) {
						return;
					}
					warn(warning);
				},
			},
		},
	},
});
