// Netlify Function proxy for repository/model card APIs that lack CORS
// support.
//
// Supported platforms:
// - modelscope: forwards `https://www.modelscope.cn/api/v1/models/{repo}`.
// - hfavatar: fetches the Hugging Face model page and extracts the author's
//   real avatar URL. No public HF API exposes the avatar, and the model page
//   HTML has no CORS headers, so this must run server-side.
//
// Deployment notes:
// - Netlify auto-discovers functions in this directory; no netlify.toml needed.
// - Exposed as: /.netlify/functions/card-proxy?platform=modelscope&repo=org/model
// - Included in the free plan, billed by request credits.
const MODEL_SCOPE_API = "https://www.modelscope.cn/api/v1/models";
const HF_WEB_BASE = "https://hf-mirror.com";

const RESPONSE_HEADERS = {
	"Content-Type": "application/json; charset=utf-8",
	"Access-Control-Allow-Origin": "*",
	"Access-Control-Allow-Methods": "GET, OPTIONS",
	"Access-Control-Allow-Headers": "Content-Type",
	"Cache-Control": "public, max-age=3600",
};

// In-memory avatar cache: repo -> { url, expiresAt } (TTL 1h).
const avatarCache = new Map();
const AVATAR_CACHE_TTL_MS = 60 * 60 * 1000;

const AVATAR_URL_RE =
	/https:\/\/cdn-avatars\.hf-mirror\.com\/v1\/production\/uploads\/[A-Za-z0-9_./-]+/;

function cachedAvatar(repo) {
	const entry = avatarCache.get(repo);
	if (!entry) return null;
	if (Date.now() > entry.expiresAt) {
		avatarCache.delete(repo);
		return null;
	}
	return entry.url;
}

async function fetchHfAvatar(repo) {
	const cached = cachedAvatar(repo);
	if (cached !== null) return { avatarUrl: cached };

	const page = await fetch(`${HF_WEB_BASE}/${repo}`, {
		headers: { "User-Agent": "Mozilla/5.0 (compatible; card-proxy/1.0)" },
		redirect: "follow",
	});
	if (!page.ok) {
		return { error: `Upstream page returned ${page.status}` };
	}
	const html = await page.text();
	const match = AVATAR_URL_RE.exec(html);
	if (!match) {
		return { error: "Avatar URL not found in page" };
	}

	const url = match[0];
	avatarCache.set(repo, { url, expiresAt: Date.now() + AVATAR_CACHE_TTL_MS });
	return { avatarUrl: url };
}

export const handler = async (event) => {
	if (event.httpMethod === "OPTIONS") {
		return { statusCode: 204, headers: RESPONSE_HEADERS, body: "" };
	}

	if (event.httpMethod !== "GET") {
		return {
			statusCode: 405,
			headers: RESPONSE_HEADERS,
			body: JSON.stringify({ error: "Method not allowed" }),
		};
	}

	const params = new URLSearchParams(event.queryStringParameters || {});
	const platform = params.get("platform");
	const repo = params.get("repo") || "";

	if (platform === "hfavatar") {
		if (!repo.includes("/")) {
			return {
				statusCode: 400,
				headers: RESPONSE_HEADERS,
				body: JSON.stringify({
					error: 'repo must be in the format "org/model"',
				}),
			};
		}
		try {
			const result = await fetchHfAvatar(repo);
			const ok = "avatarUrl" in result;
			return {
				statusCode: ok ? 200 : 502,
				headers: RESPONSE_HEADERS,
				body: JSON.stringify(result),
			};
		} catch (err) {
			return {
				statusCode: 502,
				headers: RESPONSE_HEADERS,
				body: JSON.stringify({ error: "Upstream request failed" }),
			};
		}
	}

	if (platform !== "modelscope") {
		return {
			statusCode: 400,
			headers: RESPONSE_HEADERS,
			body: JSON.stringify({ error: `Unsupported platform: ${platform}` }),
		};
	}

	if (!repo.includes("/")) {
		return {
			statusCode: 400,
			headers: RESPONSE_HEADERS,
			body: JSON.stringify({ error: 'repo must be in the format "org/model"' }),
		};
	}

	try {
		const upstream = await fetch(`${MODEL_SCOPE_API}/${repo}`);
		const body = await upstream.text();
		return {
			statusCode: upstream.status,
			headers: RESPONSE_HEADERS,
			body,
		};
	} catch (err) {
		return {
			statusCode: 502,
			headers: RESPONSE_HEADERS,
			body: JSON.stringify({ error: "Upstream request failed" }),
		};
	}
};
