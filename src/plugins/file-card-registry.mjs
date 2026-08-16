// Shared registry for files referenced from `src/` by the file card plugin.
//
// The rehype plugin (loaded through Astro's markdown pipeline) and the Vite
// plugin (loaded through Vite's build pipeline) may end up as different module
// instances, so state is kept on `globalThis` instead of module scope. Both
// run in the same Node process during `astro dev` / `astro build`, which is
// all that matters here.

const REGISTRY_KEY = "__fileCardSrcFiles__";

/**
 * @returns {Map<string, string>} Map of site-relative output path (e.g.
 *   `download/notes/note.pdf`) to the absolute path of the source file under
 *   `<projectRoot>/src/`.
 */
function registry() {
	if (!globalThis[REGISTRY_KEY]) {
		globalThis[REGISTRY_KEY] = new Map();
	}
	return globalThis[REGISTRY_KEY];
}

/**
 * Records a file referenced from `src/` so the Vite plugin can emit it into
 * the build output under `publicPath`.
 *
 * @param {string} publicPath - Site-relative path the file will be served at.
 * @param {string} absPath - Absolute filesystem path of the file under `src/`.
 */
export function registerSrcFile(publicPath, absPath) {
	registry().set(publicPath, absPath);
}

/**
 * @returns {Map<string, string>} All registered `src/` files.
 */
export function getSrcFiles() {
	return registry();
}
