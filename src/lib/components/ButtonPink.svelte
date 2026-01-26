<script lang="ts">
	import type { Snippet } from 'svelte';

	const {
		href = null,
		type = 'button',
		children,
		onclick,
		disabled = false
	}: {
		href?: string | null;
		type?: 'button' | 'submit' | 'reset';
		children: Snippet;
		onclick?: () => void;
		disabled?: boolean;
	} = $props();
</script>

{#if href}
	<a
		{href}
		class="inline-block transform cursor-pointer rounded-xl border-b-4 border-[color-mix(in_srgb,var(--color-90s-pink)_70%,black)] bg-90s-pink px-6 py-4 font-bold text-white shadow-lg transition-all hover:scale-[1.02] hover:brightness-110"
	>
		{@render children()}
	</a>
{:else}
	<button
		{type}
		{onclick}
		{disabled}
		class="w-full transform cursor-pointer rounded-xl border-b-4 border-[color-mix(in_srgb,var(--color-90s-pink)_70%,black)] bg-90s-pink px-6 py-4 font-bold text-white shadow-lg transition-all hover:scale-[1.02] hover:brightness-110"
	>
		{@render children()}
	</button>
{/if}
