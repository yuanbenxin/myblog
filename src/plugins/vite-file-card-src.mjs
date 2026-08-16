import { createReadStream, existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { getSrcFiles } from "./file-card-registry.mjs";

// Content types for files served from `src/` during development. `public/`
// files are served by Vite itself; these are only used for the `/download/`
// URLs that map into `src/`.
const MIME = {
	".pdf": "application/pdf",
	".doc": "application/msword",
	".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
	".xls": "application/vnd.ms-excel",
	".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
	".ppt": "application/vnd.ms-powerpoint",
	".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
	".md": "text/markdown; charset=utf-8",
	".txt": "text/plain; charset=utf-8",
	".html": "text/html; charset=utf-8",
	".htm": "text/html; charset=utf-8",
	".json": "application/json; charset=utf-8",
	".zip": "application/zip",
	".rar": "application/vnd.rar",
	".7z": "application/x-7z-compressed",
	".tar": "application/x-tar",
	".gz": "application/gzip",
	".png": "image/png",
	".jpg": "image/jpeg",
	".jpeg": "image/jpeg",
	".gif": "image/gif",
	".svg": "image/svg+xml",
	".webp": "image/webp",
};

/**
 * Vite plugin that makes files referenced from `src/` by the file card
 * directive downloadable.
 *
 * The rehype plugin registers every referenced `src/` file in the shared
 * registry (`file-card-registry.mjs`) together with the `/download/...` URL it
 * should be served at. This plugin:
 * - emits those files into the build output under their `/download/...` URL
 *   during `astro build`, and
 * - serves them straight from `src/` during `astro dev`.
 *
 * @returns {import('vite').Plugin} The Vite plugin object.
 */
export function viteFileCardSrc() {
	return {
		name: "vite-file-card-src",
		enforce: "post",
		generateBundle() {
			for (const [publicPath, absPath] of getSrcFiles()) {
				if (!existsSync(absPath) || !statSync(absPath).isFile()) continue;
				// `this.emitFile` is Rollup's asset emission; `fileName` is
				// relative to the build output directory.
				this.emitFile({
					type: "asset",
					fileName: publicPath.replace(/^\/+/, ""),
					source: readFileSync(absPath),
				});
			}
		},
		configureServer(server) {
			server.middlewares.use((req, res, next) => {
				const url = (req.url || "").split("?")[0];
				if (!url.startsWith("/download/")) return next();
				const rel = url.slice("/download/".length);
				const file = path.join(server.config.root, "src", rel);
				if (!existsSync(file) || !statSync(file).isFile()) return next();
				const ext = path.extname(file).toLowerCase();
				res.setHeader("Content-Type", MIME[ext] || "application/octet-stream");
				createReadStream(file).pipe(res);
			});
		},
	};
}
