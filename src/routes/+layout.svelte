<script lang="ts">
	import { onMount } from 'svelte';
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';

	let { children } = $props();
	let totalPlayers = $state(0);

	async function fetchPlayerCount() {
		try {
			const res = await fetch('/api/stats');
			if (res.ok) {
				const data = await res.json();
				totalPlayers = data.totalPlayers;
			}
		} catch {
			// Silently fail - not critical
		}
	}

	onMount(() => {
		fetchPlayerCount();
		// Refresh every 30 seconds
		const interval = setInterval(fetchPlayerCount, 30000);
		return () => clearInterval(interval);
	});
</script>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>
<div class="w-full">
	{@render children()}
</div>

<!-- Total Players (desktop only) -->
<div
	class="fixed right-4 bottom-4 hidden rounded-lg border-2 border-90s-pink/30 bg-90s-pink/10 px-2 py-1 text-sm text-white/80 backdrop-blur-sm lg:block"
>
	<span class="font-bold text-90s-yellow/80">{totalPlayers}</span> player{totalPlayers === 1
		? ''
		: 's'}
	online
</div>
