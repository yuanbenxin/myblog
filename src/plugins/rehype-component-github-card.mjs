/// <reference types="mdast" />
import { readFileSync } from "node:fs";
import { h } from "hastscript";

// API endpoint for GitHub, whose official API is CORS-enabled (`*`).
const GITHUB_API_BASE = "https://api.github.com";

// Build-time data for platforms whose APIs cannot be fetched reliably from
// the browser: ModelScope has no CORS support, and the Hugging Face mirror's
// CORS/Origin handling is unreliable in real browsers. `scripts/fetch-card-data.mjs`
// (`pnpm fetch:cards`, also run by the GitHub Pages workflow) writes this file
// before the build; ModelScope and Hugging Face cards inline the data (avatar,
// metrics, badges) instead of fetching at runtime. Missing file (e.g. fresh
// local checkout) degrades to placeholder cards.
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

	if (platform === "modelscope" || platform === "huggingface") {
		// ModelScope and Hugging Face cards are rendered entirely at build
		// time from the prefetched data; no runtime fetch script is emitted.
		const d = prefetch ?? null;
		let nDescription;
		if (platform === "huggingface" && !desc) {
			// Hugging Face has no API description: show framework + task badges.
			nDescription = h(
				`div#${cardUuid}-description`,
				{ class: "gc-description" },
				[
					h(
						`span#${cardUuid}-library-badge`,
						{ class: "gc-badge" },
						d?.library || "model",
					),
					h(
						`span#${cardUuid}-pipeline-badge`,
						{ class: "gc-badge" },
						d?.pipeline || "pipeline",
					),
				],
			);
		} else {
			const textDesc =
				platform === "modelscope"
					? desc || d?.Data?.Description || "Description not set"
					: desc || "Description not set";
			nDescription = h(
				`div#${cardUuid}-description`,
				{ class: "gc-description" },
				textDesc,
			);
		}
		const avatarUrl =
			logo ||
			(platform === "modelscope"
				? d?.Data?.Organization?.Avatar || d?.Data?.Avatar
				: d?.avatarUrl) ||
			null;
		if (avatarUrl) {
			nAvatar.properties.style = `background-image: url('${avatarUrl}'); background-color: transparent;`;
		}
		const nMetrics = config.metrics.map((key) => {
			const metric = METRICS[key];
			let value = metric.initial;
			if (d) {
				if (platform === "modelscope") {
					switch (key) {
						case "stars":
							value = fmt(d.Data.Stars);
							break;
						case "downloads":
							value = fmt(d.Data.Downloads);
							break;
						case "license":
							value = d.Data.License || "no-license";
							break;
						case "library":
							value = d.Data?.Libraries?.[0] || "model";
							break;
					}
				} else {
					switch (key) {
						case "likes":
							value = fmt(d.likes);
							break;
						case "downloads":
							value = fmt(d.downloads);
							break;
						case "license":
							value = d.license || "no-license";
							break;
						case "library":
							value = d.library || "model";
							break;
					}
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

	const nDescription = h(
		`div#${cardUuid}-description`,
		{ class: "gc-description" },
		"Waiting for API...",
	);

	const nMetrics = config.metrics.map((key) => {
		const metric = METRICS[key];
		return h(
			`span#${cardUuid}-${key}`,
			{ class: metric.className },
			metric.initial,
		);
	});

	const nInfobar = h("div", { class: "gc-infobar" }, nMetrics);

	const script = cardScript(
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
