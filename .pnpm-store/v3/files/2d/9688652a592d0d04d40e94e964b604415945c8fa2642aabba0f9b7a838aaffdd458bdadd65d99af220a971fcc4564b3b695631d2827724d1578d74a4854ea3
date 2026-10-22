import type ts from 'typescript';
/**
 * Walk up from the given directories until an installed `astro` package is found,
 * returning the directory that contains its `package.json`.
 */
export declare function findAstroPackageDirectory(tsModule: typeof import('typescript'), currentDirectory: string | string[]): string | undefined;
/**
 * Inject the installed Astro package's `env.d.ts` and `astro-jsx.d.ts` into the
 * TypeScript program. Without these, the `Astro` global is undeclared and the type
 * chain through `Astro.locals` can't be resolved, so "Go To References" from a `.ts`
 * file misses usages inside `.astro` files. Mirrors the language server's
 * `addAstroTypes()`.
 */
export declare function addAstroTypes(tsModule: typeof import('typescript'), host: ts.LanguageServiceHost, currentDirectory: string | string[]): void;
