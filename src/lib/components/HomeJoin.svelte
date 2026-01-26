<script>
	import ButtonCyan from '$lib/components/ButtonCyan.svelte';

	let { mode = $bindable(), error = $bindable(), loading = $bindable() } = $props();
	let playerName = $state('');
	let roomCode = $state('');

	async function joinRoom() {
		if (!roomCode || !playerName) {
			error = 'Please fill in all fields';
			return;
		}

		loading = true;
		error = '';

		try {
			const response = await fetch('/api/room/join', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ roomCode: roomCode.toUpperCase(), playerName })
			});

			const data = await response.json();

			if (data.success) {
				// Store player info in sessionStorage
				sessionStorage.setItem('playerId', data.playerId);
				sessionStorage.setItem('roomCode', data.room.code);
				sessionStorage.setItem('playerName', playerName);
				// Navigate to game room
				window.location.href = `/room/${data.room.code}`;
			} else {
				error = data.error || 'Failed to join room';
			}
		} catch {
			error = 'Failed to join room. Please try again.';
		} finally {
			loading = false;
		}
	}
</script>

<!-- Join Room Form -->
<button
	onclick={() => (mode = 'home')}
	class="mb-4 flex cursor-pointer items-center gap-1 font-bold text-90s-cyan hover:text-90s-yellow"
>
	← Back
</button>

<h2 class="mb-6 text-2xl font-bold text-90s-cyan">Join a Room</h2>

<form
	onsubmit={(e) => {
		e.preventDefault();
		joinRoom();
	}}
	class="space-y-4"
>
	<div>
		<label for="playerName" class="mb-1 block text-sm font-bold text-90s-pink"> Your Name </label>
		<input
			id="playerName"
			type="text"
			bind:value={playerName}
			placeholder="Enter your name"
			class="w-full rounded-xl border-[3px] border-90s-cyan bg-black/50 px-4 py-3 text-white placeholder-gray-400 ring-90s-cyan focus:ring-2 focus:outline-none"
		/>
	</div>

	<div>
		<label for="roomCode" class="mb-1 block text-sm font-bold text-90s-pink"> Room Code </label>
		<input
			id="roomCode"
			type="text"
			bind:value={roomCode}
			placeholder="XXXXXX"
			maxlength="6"
			class="w-full rounded-xl border-[3px] border-90s-cyan bg-black/50 px-4 py-3 text-center font-mono text-2xl tracking-widest text-90s-yellow uppercase placeholder-gray-400 ring-90s-cyan focus:ring-2 focus:outline-none"
		/>
	</div>

	{#if error}
		<p class="text-sm font-bold text-90s-pink">{error}</p>
	{/if}

	<ButtonCyan type="submit" disabled={loading}>
		{loading ? 'Joining...' : 'Join Room'}
	</ButtonCyan>
</form>
