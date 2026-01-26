<script lang="ts">
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';
	import { reducedEffects, highContrast } from '$lib/stores/accessibility';

	let { children } = $props();
</script>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>
<div class="w-full" class:reduced-effects={$reducedEffects} class:high-contrast={$highContrast}>
	{@render children()}
</div>
