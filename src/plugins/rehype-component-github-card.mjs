/// <reference types="mdast" />
import { readFileSync } from "node:fs";
import { h } from "hastscript";

// API endpoints for each platform. The card fetches repository/model info
// at runtime from the browser.
// - GitHub: the official API is CORS-enabled (`*`). Domestic mirrors for the
//   JSON API are unreliable, so a configurable base URL is kept here to swap
//   to one later if needed.
const GITHUB_API_BASE = "https://api.github.com";
// - Hugging Face: domestic mirror (hf-mirror.com) echoes back any request
//   Origin, so cross-origin fetches work from any site. Swap to the official
//   API by using "https://huggingface.co/api" instead.
const HF_API_BASE = "https://hf-mirror.com/api";

// Build-time data for platforms whose APIs cannot be called from the browser:
// ModelScope has no CORS support, and no public HF API exposes author avatars.
// `scripts/fetch-card-data.mjs` (`pnpm fetch:cards`, also run by the GitHub
// Pages workflow) writes this file before the build; cards inline the data
// instead of fetching at runtime. Missing file (e.g. fresh local checkout)
// degrades to placeholder cards.
let prefetchedData = null;
try {
	prefetchedData = JSON.parse(
		readFileSync(new URL("../data/card-data.json", import.meta.url), "utf8"),
	);
} catch {
	prefetchedData = null;
}

function getPrefetch(platform, repo) {
	if (!prefetchedData || !prefetchedData[platform]) return null;
	return prefetchedData[platform][repo] || null;
}

const PLATFORMS = {
	github: {
		apiUrl: (repo) => `${GITHUB_API_BASE}/repos/${repo}`,
		href: (repo) => `https://github.com/${repo}`,
		logoClass: "github-logo",
		allowSingleSegment: false,
		metrics: ["stars", "forks", "license", "language"],
	},
	huggingface: {
		apiUrl: (repo) => `${HF_API_BASE}/models/${repo}`,
		href: (repo) => `https://huggingface.co/${repo}`,
		logoClass: "huggingface-logo",
		allowSingleSegment: true,
		metrics: ["likes", "downloads", "license", "library"],
	},
	modelscope: {
		href: (repo) => `https://modelscope.cn/models/${repo}`,
		logoClass: "modelscope-logo",
		allowSingleSegment: false,
		metrics: ["stars", "downloads", "license", "library"],
	},
};

const METRICS = {
	stars: { className: "gc-stars", initial: "00K" },
	forks: { className: "gc-forks", initial: "0K" },
	likes: { className: "gc-likes", initial: "00K" },
	downloads: { className: "gc-downloads", initial: "0K" },
	license: { className: "gc-license", initial: "0K" },
	language: { className: "gc-language", initial: "Waiting..." },
	library: { className: "gc-library", initial: "Waiting..." },
};

// Mirrors the runtime formatter used in cardScript().
const fmt = (n) =>
	new Intl.NumberFormat("en-us", {
		notation: "compact",
		maximumFractionDigits: 1,
	})
		.format(Number(n) || 0)
		.replace(String.fromCharCode(0x202f), "");

/**
 * Creates a repository/model card component.
 *
 * @param {string} platform - The platform key ("github" | "huggingface" | "modelscope").
 * @param {Object} properties - The properties of the component.
 * @param {string} properties.repo - The repository/model id, "owner/repo" (or a single-segment id for Hugging Face). `model` is accepted as an alias.
 * @param {string} [properties.desc] - Optional custom description shown on the card.
 * @param {string} [properties.logo] - Optional custom logo. An absolute URL ("https://...") or a site path ("/images/logo.png"). Used as-is for the avatar.
 * @param {import('mdast').RootContent[]} children - The children elements of the component.
 * @returns {import('mdast').Parent} The created card component.
 */
function createCard(platform, properties, children) {
	const config = PLATFORMS[platform];
	const name = properties.repo || properties.model || properties.id;
	const desc = typeof properties.desc === "string" ? properties.desc : "";
	const logo =
		typeof properties.logo === "string" && properties.logo.trim() !== ""
			? properties.logo
			: null;

	if (Array.isArray(children) && children.length !== 0)
		return h("div", { class: "hidden" }, [
			`Invalid directive. ("${platform}" directive must be leaf type ::${platform}{repo="owner/repo"})`,
		]);

	if (!name || (!config.allowSingleSegment && !name.includes("/")))
		return h(
			"div",
			{ class: "hidden" },
			`Invalid repository. ("repo" attribute must be in the format "owner/repo"${config.allowSingleSegment ? " or a model id" : ""})`,
		);

	const cardUuid = `GC${Math.random().toString(36).slice(-6)}${platform.slice(0, 2)}${Math.random().toString(36).slice(-2)}`; // Collisions are not important
	const owner = name.includes("/") ? name.split("/")[0] : "";
	const modelName = name.includes("/") ? name.split("/")[1] : name;
	const prefetch = getPrefetch(platform, name);

	const nAvatar = h(`div#${cardUuid}-avatar`, { class: "gc-avatar" });

	const nTitle = h("div", { class: "gc-titlebar" }, [
		h("div", { class: "gc-titlebar-left" }, [
			...(owner
				? [
						h("div", { class: "gc-owner" }, [
							nAvatar,
							h("div", { class: "gc-user" }, owner),
						]),
						h("div", { class: "gc-divider" }, "/"),
					]
				: []),
			h("div", { class: "gc-repo" }, modelName),
		]),
		h(`div.${config.logoClass}`),
	]);

	if (platform === "modelscope") {
		// ModelScope cards are rendered entirely at build time from the
		// prefetched data; no runtime fetch script is emitted.
		const d = prefetch?.Data ?? null;
		const textDesc = desc || d?.Description || "Description not set";
		const avatarUrl = logo || d?.Organization?.Avatar || d?.Avatar || null;
		if (avatarUrl) {
			nAvatar.properties.style = `background-image: url('${avatarUrl}'); background-color: transparent;`;
		}
		const nDescription = h(
			`div#${cardUuid}-description`,
			{ class: "gc-description" },
			textDesc,
		);
		const nMetrics = config.metrics.map((key) => {
			const metric = METRICS[key];
			let value = metric.initial;
			if (d) {
				switch (key) {
					case "stars":
						value = fmt(d.Stars);
						break;
					case "downloads":
						value = fmt(d.Downloads);
						break;
					case "license":
						value = d.License || "no-license";
						break;
					case "library":
						value = d?.Libraries?.[0] || "model";
						break;
				}
			}
			return h(`span#${cardUuid}-${key}`, { class: metric.className }, value);
		});
		const nInfobar = h("div", { class: "gc-infobar" }, nMetrics);
		return h(
			`a#${cardUuid}-card`,
			{
				class: `card-github no-styling platform-${platform}`,
				href: config.href(name),
				target: "_blank",
				repo: name,
				"data-platform": platform,
			},
			[nTitle, nDescription, nInfobar],
		);
	}

	let nDescription;
	let script;

	if (platform === "huggingface" && !desc) {
		// Hugging Face has no API description: show framework + task badges.
		nDescription = h(
			`div#${cardUuid}-description`,
			{ class: "gc-description" },
			[
				h(`span#${cardUuid}-library-badge`, { class: "gc-badge" }),
				h(`span#${cardUuid}-pipeline-badge`, { class: "gc-badge" }),
			],
		);
	} else {
		nDescription = h(
			`div#${cardUuid}-description`,
			{ class: "gc-description" },
			"Waiting for API...",
		);
	}

	const nMetrics = config.metrics.map((key) => {
		const metric = METRICS[key];
		return h(
			`span#${cardUuid}-${key}`,
			{ class: metric.className },
			metric.initial,
		);
	});

	const nInfobar = h("div", { class: "gc-infobar" }, nMetrics);

	switch (platform) {
		case "huggingface": {
			const descCode = desc
				? `document.getElementById('${cardUuid}-description').textContent = ${JSON.stringify(desc)};`
				: [
						`document.getElementById('${cardUuid}-library-badge').textContent = data.library_name || 'model';`,
						`document.getElementById('${cardUuid}-pipeline-badge').textContent = data.pipeline_tag || 'pipeline';`,
					].join("\n");
			const hfAvatar = prefetch;
			script = cardScript(
				cardUuid,
				platform,
				name,
				config.apiUrl(name),
				`
	  ${descCode}
	  document.getElementById('${cardUuid}-likes').innerText = fmt(data.likes);
	  document.getElementById('${cardUuid}-downloads').innerText = fmt(data.downloads);
	  const lic = (data.tags || []).find(t => t.startsWith('license:'));
	  document.getElementById('${cardUuid}-license').innerText = (lic ? lic.replace('license:', '') : (data.cardData && data.cardData.license) || 'no-license');
	  document.getElementById('${cardUuid}-library').innerText = data.library_name || 'model';
	  const avatarEl = document.getElementById('${cardUuid}-avatar');
	  const setAvatar = (url) => {
	    if (url) {
	      avatarEl.style.backgroundImage = 'url(' + url + ')';
	      avatarEl.style.backgroundColor = 'transparent';
	    }
	  };
	  ${
			logo
				? `setAvatar(${JSON.stringify(logo)});`
				: hfAvatar
					? `setAvatar(${JSON.stringify(hfAvatar)});`
					: ""
		}
`,
			);
			break;
		}
		default: {
			script = cardScript(
				cardUuid,
				platform,
				name,
				config.apiUrl(name),
				`
	  document.getElementById('${cardUuid}-description').innerText = data.description && data.description.replace(/:[a-zA-Z0-9_]+:/g, '') || 'Description not set';
	  document.getElementById('${cardUuid}-language').innerText = data.language;
	  document.getElementById('${cardUuid}-forks').innerText = fmt(data.forks);
	  document.getElementById('${cardUuid}-stars').innerText = fmt(data.stargazers_count);
	  const avatarEl = document.getElementById('${cardUuid}-avatar');
	  avatarEl.style.backgroundImage = 'url(' + data.owner.avatar_url + ')';
	  avatarEl.style.backgroundColor = 'transparent';
	  document.getElementById('${cardUuid}-license').innerText = (data.license && data.license.spdx_id) || 'no-license';
`,
			);
			break;
		}
	}

	return h(
		`a#${cardUuid}-card`,
		{
			class: `card-github fetch-waiting no-styling platform-${platform}`,
			href: config.href(name),
			target: "_blank",
			repo: name,
			"data-platform": platform,
		},
		[nTitle, nDescription, nInfobar, script],
	);
}

/**
 * Builds the inline hydration script shared by every card.
 *
 * @param {string} cardUuid - Unique id used to address this card's elements.
 * @param {string} platform - Platform label used in logs.
 * @param {string} repo - The repository/model id.
 * @param {string} apiUrl - The API endpoint to fetch.
 * @param {string} fillCode - Platform specific code that fills the card fields.
 * @returns {import('hast').Element} The script element.
 */
function cardScript(cardUuid, platform, repo, apiUrl, fillCode) {
	return h(
		`script#${cardUuid}-script`,
		{ type: "text/javascript", defer: true },
		`
(async () => {
  const $ = (id) => document.getElementById('${cardUuid}-' + id);
  const fmt = n => new Intl.NumberFormat('en-us', { notation: "compact", maximumFractionDigits: 1 }).format(Number(n) || 0).replace(String.fromCharCode(0x202f), '');
  const fail = (e) => {
    const c = $('card');
    c?.classList.add('fetch-error');
    console.warn("[CARD] (Error) Loading card for ${platform} | ${repo} | ${cardUuid}.", e);
  };
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);
  try {
    const response = await fetch('${apiUrl}', { signal: controller.signal });
    const data = await response.json();
    ${fillCode}
    $('card').classList.remove('fetch-waiting');
    console.log("[CARD] Loaded card for ${platform} | ${repo} | ${cardUuid}.");
  } catch (e) {
    fail(e);
  } finally {
    clearTimeout(timer);
  }
})();
`,
	);
}

export function GithubCardComponent(properties, children) {
	return createCard("github", properties, children);
}

export function HuggingfaceCardComponent(properties, children) {
	return createCard("huggingface", properties, children);
}

export function ModelscopeCardComponent(properties, children) {
	return createCard("modelscope", properties, children);
}
