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
	<title>Cube Toss! - Online Dice Game</title>
	<style>
		.bg-90s {
			background: #54276f;
		}
		.text-90s-pink {
			color: #ff1493;
		}
		.text-90s-cyan {
			color: #00ced1;
		}
		.text-90s-yellow {
			color: #ffd700;
		}
		.text-90s-purple {
			color: #54276f;
		}
		.bg-90s-pink {
			background-color: #ff1493;
		}
		.bg-90s-cyan {
			background-color: #00ced1;
		}
		.bg-90s-yellow {
			background-color: #ffd700;
		}
		.bg-90s-purple {
			background-color: #54276f;
		}
		.border-90s-pink {
			border-color: #ff1493;
		}
		.ring-90s-pink {
			--tw-ring-color: #ff1493;
		}
		.ring-90s-cyan {
			--tw-ring-color: #00ced1;
		}
	</style>
</svelte:head>

<div class="flex min-h-screen items-center justify-center bg-[#1a1a1a] p-4">
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
				The dice game of risk and reward
			</p>
		</div>

		<!-- Main Card -->
		<div class="border-90s-pink rounded-2xl border-4 bg-black/80 p-8 shadow-2xl backdrop-blur-lg">
			{#if mode === 'home'}
				<!-- Home Screen -->
				<div class="space-y-4">
					<button
						onclick={() => (mode = 'create')}
						class="bg-90s-pink w-full transform rounded-xl border-b-4 border-pink-800 px-6 py-4 font-bold text-white shadow-lg transition-all hover:scale-[1.02] hover:brightness-110"
					>
						Create a Room
					</button>
					<button
						onclick={() => (mode = 'join')}
						class="bg-90s-cyan w-full transform rounded-xl border-b-4 border-teal-700 px-6 py-4 font-bold text-black shadow-lg transition-all hover:scale-[1.02] hover:brightness-110"
					>
						Join a Room
					</button>
				</div>

				<!-- How to Play -->
				<div class="bg-90s-purple/30 border-90s-pink mt-8 rounded-xl border-2 p-4">
					<h3 class="text-90s-yellow mb-2 font-bold">How to Play</h3>
					<ul class="space-y-1 text-sm text-white">
						<li class="flex items-center gap-1">
							<span class="bg-90s-cyan inline-block size-4 rounded-full"></span>
							<strong class="text-90s-cyan">Green</strong> = +1 point (keep rolling!)
						</li>
						<li class="flex items-center gap-1">
							<span class="bg-90s-yellow inline-block size-4 rounded-full"></span>
							<strong class="text-90s-yellow">Yellow</strong> = neutral (roll again)
						</li>
						<li class="flex items-center gap-1">
							<span class="bg-90s-pink inline-block size-4 rounded-full"></span>
							<strong class="text-90s-pink">Red</strong> without green = BUST!
						</li>
						<li>🏆 First to 100 triggers final round!</li>
					</ul>
					<a
						href="/rules"
						class="text-90s-cyan hover:text-90s-yellow mt-3 inline-block text-sm font-bold"
					>
						📖 Learn more →
					</a>
				</div>
			{:else if mode === 'create'}
				<!-- Create Room Form -->
				<button
					onclick={() => (mode = 'home')}
					class="text-90s-cyan hover:text-90s-yellow mb-4 flex items-center gap-1 font-bold"
				>
					← Back
				</button>

				<h2 class="text-90s-pink mb-6 text-2xl font-bold">Create a Room</h2>

				<form
					onsubmit={(e) => {
						e.preventDefault();
						createRoom();
					}}
					class="space-y-4"
				>
					<div>
						<label for="hostName" class="text-90s-cyan mb-1 block text-sm font-bold">
							Your Name
						</label>
						<input
							id="hostName"
							type="text"
							bind:value={hostName}
							placeholder="Enter your name"
							class="border-90s-pink ring-90s-pink w-full rounded-xl border-2 bg-black/50 px-4 py-3 text-white placeholder-gray-400 focus:ring-2 focus:outline-none"
						/>
					</div>

					{#if error}
						<p class="text-90s-pink text-sm font-bold">{error}</p>
					{/if}

					<button
						type="submit"
						disabled={loading}
						class="bg-90s-pink w-full rounded-xl border-b-4 border-pink-800 px-6 py-4 font-bold text-white shadow-lg transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
					>
						{loading ? 'Creating...' : 'Create Room'}
					</button>
				</form>
			{:else if mode === 'join'}
				<!-- Join Room Form -->
				<button
					onclick={() => (mode = 'home')}
					class="text-90s-cyan hover:text-90s-yellow mb-4 flex items-center gap-1 font-bold"
				>
					← Back
				</button>

				<h2 class="text-90s-cyan mb-6 text-2xl font-bold">Join a Room</h2>

				<form
					onsubmit={(e) => {
						e.preventDefault();
						joinRoom();
					}}
					class="space-y-4"
				>
					<div>
						<label for="playerName" class="text-90s-pink mb-1 block text-sm font-bold">
							Your Name
						</label>
						<input
							id="playerName"
							type="text"
							bind:value={playerName}
							placeholder="Enter your name"
							class="border-90s-cyan ring-90s-cyan w-full rounded-xl border-2 bg-black/50 px-4 py-3 text-white placeholder-gray-400 focus:ring-2 focus:outline-none"
						/>
					</div>

					<div>
						<label for="roomCode" class="text-90s-pink mb-1 block text-sm font-bold">
							Room Code
						</label>
						<input
							id="roomCode"
							type="text"
							bind:value={roomCode}
							placeholder="XXXXXX"
							maxlength="6"
							class="border-90s-cyan text-90s-yellow ring-90s-cyan w-full rounded-xl border-2 bg-black/50 px-4 py-3 text-center font-mono text-2xl tracking-widest uppercase placeholder-gray-400 focus:ring-2 focus:outline-none"
						/>
					</div>

					{#if error}
						<p class="text-90s-pink text-sm font-bold">{error}</p>
					{/if}

					<button
						type="submit"
						disabled={loading}
						class="bg-90s-cyan w-full rounded-xl border-b-4 border-teal-700 px-6 py-4 font-bold text-black shadow-lg transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
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
