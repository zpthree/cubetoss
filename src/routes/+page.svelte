<script lang="ts">
	import ButtonCyan from '$lib/components/ButtonCyan.svelte';
	import ButtonPink from '$lib/components/ButtonPink.svelte';

	let mode: 'home' | 'create' | 'join' = $state('home');
	let hostName = $state('');
	let playerName = $state('');
	let roomCode = $state('');
	let targetScore = $state(100);
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

		<!-- Main Card -->
		<div
			class="h-full w-full rounded-2xl border-4 border-90s-pink bg-black/80 p-8 shadow-[0_0_20px_rgba(255,20,147,0.5)] shadow-90s-pink md:h-[440px] md:w-[400px]"
		>
			{#if mode === 'home'}
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
							<strong class="text-90s-cyan">Green</strong> = +1 point (keep rolling!)
						</li>
						<li class="inline-block">
							<span class="inline-block size-4 rounded-full bg-90s-yellow align-middle"></span>
							<strong class="text-90s-yellow">Yellow</strong> = neutral (roll again)
						</li>
						<li class="inline-block">
							<span class="inline-block size-4 rounded-full bg-90s-pink align-middle"></span>
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

					<div>
						<label for="targetScore" class="mb-1 block text-sm font-bold text-90s-cyan">
							Points to Win
						</label>
						<select
							id="targetScore"
							bind:value={targetScore}
							class="w-full rounded-xl border-[3px] border-90s-pink bg-black/50 px-4 py-3 text-white ring-90s-pink focus:ring-2 focus:outline-none"
						>
							<option value={50}>50 points (lighting round)</option>
							<option value={100}>100 points (standard)</option>
							<option value={150}>150 points (whoa man)</option>
							<option value={200}>200 points (what are ya nuts)</option>
						</select>
					</div>

					{#if error}
						<p class="text-sm font-bold text-90s-pink">{error}</p>
					{/if}

					<ButtonPink type="submit" disabled={loading} onclick={() => (mode = 'create')}
						>{loading ? 'Creating...' : 'Create Room'}</ButtonPink
					>
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

					<ButtonCyan type="submit" disabled={loading}>
						{loading ? 'Joining...' : 'Join Room'}
					</ButtonCyan>
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
		<footer class="mt-4 text-center text-sm text-white/50">
			&copy; 2026 A game by <a
				href="https://zachpatrick.com"
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
