<script lang="ts">
	import type { Snippet } from 'svelte';

	const {
		href = null,
		type = 'button',
		children,
		onclick,
		disabled = false,
		_class = ''
	}: {
		href?: string | null;
		type?: 'button' | 'submit' | 'reset';
		children: Snippet;
		onclick?: () => void;
		disabled?: boolean;
		_class?: string;
	} = $props();
</script>

{#if href}
	<a
		{href}
		class={`inline-block w-full transform cursor-pointer rounded-xl border-b-4 border-[color-mix(in_srgb,var(--color-90s-yellow)_70%,black)] bg-90s-yellow px-6 py-4 font-bold text-black shadow-lg transition-all hover:scale-[1.02] hover:brightness-110 ${_class}`}
	>
		{@render children()}
	</a>
{:else}
	<button
		{type}
		{onclick}
		{disabled}
		class={`inline-block w-full transform cursor-pointer rounded-xl border-b-4 border-[color-mix(in_srgb,var(--color-90s-yellow)_70%,black)] bg-90s-yellow px-6 py-4 font-bold text-black shadow-lg transition-all hover:scale-[1.02] hover:brightness-110 ${_class}`}
	>
		{@render children()}
	</button>
{/if}
