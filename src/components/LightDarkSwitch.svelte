<script lang="ts">
import { AUTO_MODE, DARK_MODE, LIGHT_MODE } from "@constants/constants.ts";
import Icon from "@iconify/svelte";
import {
	applyThemeToDocument,
	getStoredTheme,
	setTheme,
} from "@utils/setting-utils.ts";
import { onMount } from "svelte";

let isDark = $state(false);

onMount(() => {
	isDark = document.documentElement.classList.contains("dark");

	// Set initial banner opacity based on current theme
	const lightWrapper = document.getElementById('banner-light-wrapper');
	const darkWrapper = document.getElementById('banner-dark-wrapper');
	const bannerFade = document.querySelector('.banner-fade') as HTMLElement | null;
	const setBannerOpacity = (dark: boolean) => {
		if (lightWrapper) {
			lightWrapper.style.animation = 'none';
			lightWrapper.style.opacity = dark ? '0' : '1';
		}
		if (darkWrapper) {
			darkWrapper.style.animation = 'none';
			darkWrapper.style.opacity = dark ? '1' : '0';
		}
		// Reset mask to default visible state
		if (bannerFade) {
			bannerFade.style.cssText = '';
		}
	};
	setBannerOpacity(isDark);

	const darkModePreference = window.matchMedia(
		"(prefers-color-scheme: dark)",
	);
	const onChange = () => {
		if (getStoredTheme() === AUTO_MODE) {
			applyThemeToDocument(AUTO_MODE);
			isDark = document.documentElement.classList.contains("dark");
			setBannerOpacity(isDark);
		}
	};
	darkModePreference.addEventListener("change", onChange);
	return () => darkModePreference.removeEventListener("change", onChange);
});

function toggle() {
	isDark = !isDark;

	const lightWrapper = document.getElementById('banner-light-wrapper');
	const darkWrapper = document.getElementById('banner-dark-wrapper');
	const bannerFade = document.querySelector('.banner-fade') as HTMLElement | null;

	// Clear any inline styles on mask so it transitions naturally via CSS
	if (bannerFade) {
		bannerFade.style.cssText = '';
	}

	// Start theme transition for all other components (and mask) immediately
	// The mask's background-color will transition along with other components
	setTheme(isDark ? DARK_MODE : LIGHT_MODE);

	// After 300ms (when other components finish), swap banner image
	setTimeout(() => {
		if (lightWrapper) {
			lightWrapper.style.animation = 'none';
			lightWrapper.offsetHeight; // force reflow
			lightWrapper.style.animation = `banner-fade-${isDark ? 'out' : 'in'} 300ms cubic-bezier(0.4, 0, 0.2, 1) forwards`;
		}
		if (darkWrapper) {
			darkWrapper.style.animation = 'none';
			darkWrapper.offsetHeight; // force reflow
			darkWrapper.style.animation = `banner-fade-${isDark ? 'in' : 'out'} 300ms cubic-bezier(0.4, 0, 0.2, 1) forwards`;
		}
	}, 300);
}
</script>

<button
	onclick={toggle}
	aria-label="Toggle dark mode"
	class="relative h-7 w-[3.5rem] rounded-full transition-colors duration-200
		bg-black/10 dark:bg-white/20 flex items-center px-0.5 shrink-0 ml-4"
>
	<div
		class="h-6 w-6 rounded-full bg-white dark:bg-[oklch(0.30_0.02_var(--hue))] shadow-md transition-transform duration-200 translate-x-0 dark:translate-x-[1.75rem] flex items-center justify-center"
	>
		<Icon
			icon="material-symbols:wb-sunny-outline-rounded"
			class="text-[0.875rem] text-black/60 dark:hidden"
		/>
		<Icon
			icon="material-symbols:dark-mode-outline-rounded"
			class="text-[0.875rem] hidden dark:block text-white/80"
		/>
	</div>
</button>
