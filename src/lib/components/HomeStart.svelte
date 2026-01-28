<script>
	import ButtonCyan from '$lib/components/ButtonCyan.svelte';
	import ButtonPink from '$lib/components/ButtonPink.svelte';

	let { mode = $bindable(), error = $bindable(), loading = $bindable() } = $props();
</script>

<!-- Home Screen -->
<div class="space-y-4">
	<ButtonPink onclick={() => (mode = 'create')}>Create a Room</ButtonPink>
	<ButtonCyan onclick={() => (mode = 'join')}>Join a Room</ButtonCyan>
</div>

<!-- How to Play -->
<div class="mt-8 rounded-xl border-[3px] border-90s-pink bg-90s-purple/30 p-4">
	<h2 class="mb-2 font-bold text-90s-yellow">How to Play</h2>
	<ul class="space-y-1 text-sm text-white">
		<li class="inline-block">
			<span class="inline-block size-4 rounded-full bg-90s-cyan align-middle"></span>
			<strong class="text-90s-cyan">Blue</strong> = +1 point (keep rolling!)
		</li>
		<li class="inline-block">
			<span class="inline-block size-4 rounded-full bg-90s-yellow align-middle"></span>
			<strong class="text-90s-yellow">Yellow</strong> = neutral (roll again if no pinks or 1+ blues)
		</li>
		<li class="inline-block">
			<span class="inline-block size-4 rounded-full bg-90s-pink align-middle"></span>
			<strong class="text-90s-pink">Pink</strong> without blue = BUST!
		</li>
		<li>🏆 First to 100 triggers final round!</li>
	</ul>
	<a href="/rules" class="mt-3 inline-block text-sm font-bold text-90s-cyan hover:text-90s-yellow">
		Learn more →
	</a>
</div>
