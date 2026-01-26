<script>
	import ButtonPink from '$lib/components/ButtonPink.svelte';

	let { mode = $bindable(), error = $bindable(), loading = $bindable() } = $props();
	let hostName = $state('');
	let targetScore = $state(100);

	async function createRoom() {
		if (!hostName) {
			error = 'Please fill in all fields';
			return;
		}

		loading = true;
		error = '';

		try {
			const response = await fetch('/api/room/create', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ hostName, targetScore })
			});

			const data = await response.json();

			if (data.success) {
				// Store player info in sessionStorage
				sessionStorage.setItem('playerId', data.playerId);
				sessionStorage.setItem('roomCode', data.roomCode);
				sessionStorage.setItem('playerName', hostName);
				// Navigate to game room
				window.location.href = `/room/${data.roomCode}`;
			} else {
				error = data.error || 'Failed to create room';
			}
		} catch {
			error = 'Failed to create room. Please try again.';
		} finally {
			loading = false;
		}
	}
</script>

<!-- Create Room Form -->
<button
	onclick={() => (mode = 'home')}
	class="mb-4 flex cursor-pointer items-center gap-1 font-bold text-90s-cyan hover:text-90s-yellow"
>
	← Back
</button>

<h2 class="mb-6 text-2xl font-bold text-90s-pink">Create a Room</h2>

<form
	onsubmit={(e) => {
		e.preventDefault();
		createRoom();
	}}
	class="space-y-4"
>
	<div>
		<label for="hostName" class="mb-1 block text-sm font-bold text-90s-cyan"> Your Name </label>
		<input
			id="hostName"
			type="text"
			bind:value={hostName}
			placeholder="Enter your name"
			class="w-full rounded-xl border-[3px] border-90s-pink bg-black/50 px-4 py-3 text-white placeholder-gray-400 ring-90s-pink focus:ring-2 focus:outline-none"
		/>
	</div>

	<div>
		<label for="targetScore" class="mb-1 block text-sm font-bold text-90s-cyan">
			Points to Win
		</label>
		<select
			id="targetScore"
			bind:value={targetScore}
			class="w-full rounded-xl border-[3px] border-90s-pink bg-black/50 px-4 py-3 text-white ring-90s-pink focus:ring-2 focus:outline-none"
		>
			<option value={50}>50 points (wicked fast)</option>
			<option value={100}>100 points (just right)</option>
			<option value={150}>150 points (whoa, man)</option>
			<option value={200}>200 points (what are you nuts)</option>
		</select>
	</div>

	{#if error}
		<p class="text-sm font-bold text-90s-pink">{error}</p>
	{/if}

	<ButtonPink type="submit" disabled={loading} onclick={() => (mode = 'create')}
		>{loading ? 'Creating...' : 'Create Room'}</ButtonPink
	>
</form>
