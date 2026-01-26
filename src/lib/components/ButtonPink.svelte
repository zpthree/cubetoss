<script lang="ts">
	import type { Snippet } from 'svelte';

	const {
		type = 'button',
		children,
		onclick,
		disabled = false,
		_class = ''
	}: {
		type?: 'button' | 'submit' | 'reset';
		children: Snippet;
		onclick?: () => void;
		disabled?: boolean;
		_class?: string;
	} = $props();
</script>

<button
	{type}
	{onclick}
	{disabled}
	class={`w-full transform cursor-pointer rounded-xl border-b-4 border-pink-800 bg-90s-pink px-6 py-4 font-bold text-white shadow-lg transition-all hover:scale-[1.02] hover:brightness-110 ${_class}`}
>
	{@render children()}
</button>
