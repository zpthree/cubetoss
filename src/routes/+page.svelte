<script lang="ts">
	import type { Room } from '$lib/types';

	let mode: 'home' | 'create' | 'join' = $state('home');
	let hostName = $state('');
	let playerName = $state('');
	let roomCode = $state('');
	let error = $state('');
	let loading = $state(false);

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
				body: JSON.stringify({ hostName })
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

<svelte:head>
	<title>Cube Toss! - Online Cube Game</title>
</svelte:head>

<div class="flex items-center justify-center p-4">
	<div class="w-full max-w-md">
		<!-- Logo/Title -->
		<div class="mb-8 text-center">
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

		<!-- Main Card -->
		<div class="rounded-2xl border-4 border-90s-pink bg-black/80 p-8 shadow-2xl backdrop-blur-lg">
			{#if mode === 'home'}
				<!-- Home Screen -->
				<div class="space-y-4">
					<button
						onclick={() => (mode = 'create')}
						class="w-full transform cursor-pointer rounded-xl border-b-4 border-pink-800 bg-90s-pink px-6 py-4 font-bold text-white shadow-lg transition-all hover:scale-[1.02] hover:brightness-110"
					>
						Create a Room
					</button>
					<button
						onclick={() => (mode = 'join')}
						class="w-full transform cursor-pointer rounded-xl border-b-4 border-teal-700 bg-90s-cyan px-6 py-4 font-bold text-black shadow-lg transition-all hover:scale-[1.02] hover:brightness-110"
					>
						Join a Room
					</button>
				</div>

				<!-- How to Play -->
				<div class="mt-8 rounded-xl border-[3px] border-90s-pink bg-90s-purple/30 p-4">
					<h3 class="mb-2 font-bold text-90s-yellow">How to Play</h3>
					<ul class="space-y-1 text-sm text-white">
						<li class="flex items-center gap-1">
							<span class="inline-block size-4 rounded-full bg-90s-cyan"></span>
							<strong class="text-90s-cyan">Green</strong> = +1 point (keep rolling!)
						</li>
						<li class="flex items-center gap-1">
							<span class="inline-block size-4 rounded-full bg-90s-yellow"></span>
							<strong class="text-90s-yellow">Yellow</strong> = neutral (roll again)
						</li>
						<li class="flex items-center gap-1">
							<span class="inline-block size-4 rounded-full bg-90s-pink"></span>
							<strong class="text-90s-pink">Red</strong> without green = BUST!
						</li>
						<li>🏆 First to 100 triggers final round!</li>
					</ul>
					<a
						href="/rules"
						class="mt-3 inline-block text-sm font-bold text-90s-cyan hover:text-90s-yellow"
					>
						📖 Learn more →
					</a>
				</div>
			{:else if mode === 'create'}
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
						<label for="hostName" class="mb-1 block text-sm font-bold text-90s-cyan">
							Your Name
						</label>
						<input
							id="hostName"
							type="text"
							bind:value={hostName}
							placeholder="Enter your name"
							class="w-full rounded-xl border-[3px] border-90s-pink bg-black/50 px-4 py-3 text-white placeholder-gray-400 ring-90s-pink focus:ring-2 focus:outline-none"
						/>
					</div>

					{#if error}
						<p class="text-sm font-bold text-90s-pink">{error}</p>
					{/if}

					<button
						type="submit"
						disabled={loading}
						class="w-full cursor-pointer rounded-xl border-b-4 border-pink-800 bg-90s-pink px-6 py-4 font-bold text-white shadow-lg transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
					>
						{loading ? 'Creating...' : 'Create Room'}
					</button>
				</form>
			{:else if mode === 'join'}
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
						<label for="playerName" class="mb-1 block text-sm font-bold text-90s-pink">
							Your Name
						</label>
						<input
							id="playerName"
							type="text"
							bind:value={playerName}
							placeholder="Enter your name"
							class="w-full rounded-xl border-[3px] border-90s-cyan bg-black/50 px-4 py-3 text-white placeholder-gray-400 ring-90s-cyan focus:ring-2 focus:outline-none"
						/>
					</div>

					<div>
						<label for="roomCode" class="mb-1 block text-sm font-bold text-90s-pink">
							Room Code
						</label>
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

					<button
						type="submit"
						disabled={loading}
						class="w-full cursor-pointer rounded-xl border-b-4 border-teal-700 bg-90s-cyan px-6 py-4 font-bold text-black shadow-lg transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
					>
						{loading ? 'Joining...' : 'Join Room'}
					</button>
				</form>
			{/if}
		</div>

		<!-- Footer -->
		<p
			class="mt-6 text-center text-sm font-bold text-white"
			style="text-shadow: 1px 1px 0 #FF1493;"
		>
			No account needed • Rooms expire after 2 hours
		</p>
	</div>
</div>
