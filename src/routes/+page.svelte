<script lang="ts">
	import HomeStart from '$lib/components/HomeStart.svelte';
	import HomeCreate from '$lib/components/HomeCreate.svelte';
	import HomeJoin from '$lib/components/HomeJoin.svelte';
	import Logo from '$lib/components/Logo.svelte';

	let mode: 'home' | 'create' | 'join' = $state('home');
	let error = $state('');
	let loading = $state(false);

	const components = {
		home: HomeStart,
		create: HomeCreate,
		join: HomeJoin
	};

	let Component = $derived(components[mode]);
</script>

<svelte:head>
	<title>Cube Toss! - Online Cube Game</title>
</svelte:head>

<div class="flex items-center justify-center p-4">
	<div class="flex w-full max-w-md flex-col items-center">
		<!-- Logo/Title -->
		<div class="relative mb-8 text-center">
			<a href="/">
				<h1 class="mb-2 text-5xl font-bold text-white">
					<Logo />
				</h1>
			</a>
			<p class="text-lg font-bold text-white" style="text-shadow: 2px 2px 0 #9B59B6;">
				The cube game of risk and reward
			</p>
		</div>

		<!-- Main Card -->
		<div
			class="h-full w-full rounded-2xl border-4 border-90s-pink bg-black p-8 shadow-[0_0_20px_rgba(255,20,147,0.5)] shadow-90s-pink md:h-110 md:w-100"
		>
			<Component bind:mode bind:error bind:loading />
		</div>

		<!-- Footer -->
		<p
			class="mt-6 max-w-80 text-center text-sm font-bold text-white"
			style="text-shadow: 1px 1px 0 #FF1493;"
		>
			No account needed • Rooms expire after 2 hours and every day at 2 am EST
		</p>
		<footer class="mt-4 text-center text-sm text-white/50">
			&copy; 2026 A game by <a
				href="https://zachpatrick.com"
				target="_blank"
				class="font-medium text-90s-pink underline hover:text-white">Zach Patrick</a
			>. Inspired by
			<a
				href="https://boardgamegeek.com/boardgame/14102/toss-up"
				target="_blank"
				rel="noopener noreferrer"
				class="font-medium text-90s-pink underline hover:text-white">Toss Up!</a
			>
		</footer>
	</div>
</div>
