<script lang="ts">
	import ButtonPink from '$lib/components/ButtonPink.svelte';

	let { data } = $props();

	let playerName = $state('');
	let error = $state('');
	let loading = $state(false);

	async function joinRoom() {
		if (!playerName) {
			error = 'Please enter your name';
			return;
		}

		loading = true;
		error = '';

		try {
			const response = await fetch('/api/room/join', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ roomCode: data.roomCode, playerName })
			});

			const result = await response.json();

			if (result.success) {
				// Store player info in sessionStorage
				sessionStorage.setItem('playerId', result.playerId);
				sessionStorage.setItem('roomCode', result.room.code);
				sessionStorage.setItem('playerName', playerName);
				// Navigate to game room
				window.location.href = `/room/${result.room.code}`;
			} else {
				error = result.error || 'Failed to join room';
			}
		} catch {
			error = 'Failed to join room. Please try again.';
		} finally {
			loading = false;
		}
	}
</script>

<svelte:head>
	<title>Join Room {data.roomCode} - Cube Toss!</title>
</svelte:head>

<div class="flex items-center justify-center p-4">
	<div class="flex w-full max-w-md flex-col items-center">
		<!-- Logo/Title -->
		<div class="relative mb-8 text-center">
			<a href="/">
				<h1
					class="mb-2 text-5xl font-bold text-white drop-shadow-lg"
					style="text-shadow: 3px 3px 0 #FF1493, 6px 6px 0 #00CED1;"
				>
					🎲 Cube Toss!
				</h1>
			</a>
			<p class="text-lg font-bold text-white" style="text-shadow: 2px 2px 0 #9B59B6;">
				The cube game of risk and reward
			</p>
		</div>

		<!-- Join Card -->
		<div
			class="w-full rounded-2xl border-4 border-90s-pink bg-black/80 p-8 shadow-[0_0_20px_rgba(255,20,147,0.5)] shadow-90s-pink md:w-[400px]"
		>
			<a
				href="/"
				class="mb-4 flex items-center gap-1 font-bold text-90s-cyan hover:text-90s-yellow"
			>
				← Back
			</a>

			<h2 class="mb-2 text-2xl font-bold text-90s-pink">Join Game</h2>
			<p class="mb-6 text-90s-cyan">
				Room: <span class="font-mono text-xl font-bold text-90s-yellow">{data.roomCode}</span>
			</p>

			{#if error}
				<div
					class="mb-4 rounded-lg border-[3px] border-90s-yellow bg-90s-yellow/20 p-3 text-center font-bold text-90s-yellow"
				>
					{error}
				</div>
			{/if}

			<form
				onsubmit={(e) => {
					e.preventDefault();
					joinRoom();
				}}
				class="space-y-4"
			>
				<div>
					<label for="playerName" class="mb-2 block font-bold text-90s-yellow">Your Name</label>
					<input
						id="playerName"
						type="text"
						bind:value={playerName}
						placeholder="Enter your name"
						maxlength="20"
						class="w-full rounded-xl border-[3px] border-90s-pink bg-black/50 p-3 font-bold text-white placeholder-gray-400 focus:border-90s-cyan focus:outline-none"
					/>
				</div>

				<ButtonPink onclick={joinRoom} disabled={loading}>
					{loading ? 'Joining...' : 'Join Game'}
				</ButtonPink>
			</form>
		</div>
	</div>
</div>
