<script lang="ts">
	import type { Room, Die, Player } from '$lib/types';
	import { onMount, onDestroy } from 'svelte';

	let { data } = $props();

	let room: Room | null = $state(null);
	let playerId: string | null = $state(null);
	let error = $state('');
	let loading = $state(true);
	let rolling = $state(false);
	let busted = $state(false);
	let showingRoll = $state(false); // True when showing dice results before separating greens
	let previouslyLockedIds: number[] = $state([]); // Track dice that were locked before the roll
	let lastRolledDice: Die[] = $state([]); // The dice that were just rolled (snapshot)
	let revealedDiceCount = $state(0); // For staggered dice reveal animation
	let eventSource: EventSource | null = null;

	// Derived state
	let currentPlayer = $derived(room ? room.players[room.gameState.currentPlayerIndex] : null);
	let isMyTurn = $derived(currentPlayer?.id === playerId);
	let me = $derived(room ? room.players.find((p: Player) => p.id === playerId) : null);
	let isHost = $derived(me?.isHost ?? false);
	let canStart = $derived(
		isHost && room?.gameState.phase === 'waiting' && (room?.players.length ?? 0) >= 2
	);
	let canRoll = $derived(
		isMyTurn &&
			(room?.gameState.phase === 'playing' || room?.gameState.phase === 'final-round') &&
			!rolling
	);
	let canBank = $derived(
		isMyTurn &&
			(room?.gameState.phase === 'playing' || room?.gameState.phase === 'final-round') &&
			(room?.gameState.turnScore ?? 0) > 0 &&
			!rolling
	);
	let winner = $derived(
		room?.gameState.winner
			? room.players.find((p: Player) => p.id === room?.gameState.winner)
			: null
	);
	let lockedDice = $derived(room?.gameState.dice.filter((d) => d.locked) ?? []);
	let activeDice = $derived(room?.gameState.dice.filter((d) => !d.locked) ?? []);

	onMount(() => {
		// Get player info from sessionStorage
		playerId = sessionStorage.getItem('playerId');
		const storedRoomCode = sessionStorage.getItem('roomCode');

		// Case-insensitive comparison for room codes
		if (!playerId || storedRoomCode?.toUpperCase() !== data.roomCode.toUpperCase()) {
			// Redirect to home if not authenticated for this room
			window.location.href = '/';
			return;
		}

		// Connect to SSE for real-time updates
		connectToEvents();
	});

	onDestroy(() => {
		eventSource?.close();
	});

	function connectToEvents() {
		eventSource = new EventSource(`/api/room/${data.roomCode}/events`);

		eventSource.onmessage = (e) => {
			// Generic message handler as fallback
			console.log('SSE message:', e.data);
		};

		eventSource.onopen = () => {
			console.log('SSE connected');
		};

		eventSource.onerror = (e) => {
			console.error('SSE error:', e);
			error = 'Lost connection to server. Reconnecting...';
			eventSource?.close();
			setTimeout(connectToEvents, 2000);
		};

		eventSource.addEventListener('state-update', (e) => {
			const eventData = JSON.parse(e.data);
			// Only update from state-update if we're not in the middle of showing a roll
			// (to prevent SSE reconnection from disrupting the animation)
			if (!showingRoll) {
				room = eventData.room;
			}
			loading = false;
		});

		eventSource.addEventListener('player-joined', (e) => {
			const eventData = JSON.parse(e.data);
			room = eventData.room;
		});

		eventSource.addEventListener('player-left', (e) => {
			const eventData = JSON.parse(e.data);
			room = eventData.room;
		});

		eventSource.addEventListener('game-started', (e) => {
			const eventData = JSON.parse(e.data);
			room = eventData.room;
		});

		eventSource.addEventListener('dice-rolled', (e) => {
			const eventData = JSON.parse(e.data);

			// Debug logging
			console.log('[DICE-ROLLED] busted:', eventData.busted);
			console.log('[DICE-ROLLED] currentPlayerIndex:', eventData.room.gameState.currentPlayerIndex);
			console.log('[DICE-ROLLED] turnScore:', eventData.room.gameState.turnScore);

			// Capture which dice were just rolled (prefer server snapshot to avoid mismatch
			// when the backend resets dice after an all-green roll or a bust)
			const rolledDice: Die[] = Array.isArray(eventData.rolledDiceSnapshot)
				? eventData.rolledDiceSnapshot
				: eventData.room.gameState.dice.filter((d: Die) => !previouslyLockedIds.includes(d.id));
			lastRolledDice = rolledDice;

			room = eventData.room;

			// Show the roll results with staggered reveal animation
			if (!eventData.busted) {
				showingRoll = true;
				revealedDiceCount = 0;

				// Reveal dice one at a time with 150ms delay each
				const totalDice = rolledDice.length;
				for (let i = 0; i < totalDice; i++) {
					setTimeout(() => {
						revealedDiceCount = i + 1;
					}, i * 150);
				}

				// After all dice revealed + 1 second pause, separate greens
				setTimeout(
					() => {
						showingRoll = false;
						revealedDiceCount = 0;
						// Update previouslyLockedIds after the animation
						previouslyLockedIds =
							room?.gameState.dice.filter((d) => d.locked).map((d) => d.id) ?? [];
					},
					totalDice * 150 + 1000
				);
			} else {
				// On bust, still show staggered reveal
				showingRoll = true;
				revealedDiceCount = 0;
				const totalDice = rolledDice.length;
				for (let i = 0; i < totalDice; i++) {
					setTimeout(() => {
						revealedDiceCount = i + 1;
					}, i * 150);
				}
				setTimeout(
					() => {
						showingRoll = false;
						revealedDiceCount = 0;
						previouslyLockedIds = [];
					},
					totalDice * 150 + 1000
				);
			}

			if (eventData.busted && currentPlayer?.id === playerId) {
				busted = true;
				setTimeout(() => (busted = false), 2000);
			}
		});

		eventSource.addEventListener('turn-ended', (e) => {
			const eventData = JSON.parse(e.data);
			room = eventData.room;
		});

		eventSource.addEventListener('game-ended', (e) => {
			const eventData = JSON.parse(e.data);
			room = eventData.room;
		});
	}

	async function startGame() {
		try {
			const response = await fetch(`/api/room/${data.roomCode}/start`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ playerId })
			});

			const result = await response.json();
			if (!result.success) {
				error = result.error;
			}
		} catch {
			error = 'Failed to start game';
		}
	}

	async function rollDice() {
		if (!canRoll || rolling) return;

		rolling = true;
		busted = false;

		// Remember which dice are already locked before rolling
		previouslyLockedIds = room?.gameState.dice.filter((d) => d.locked).map((d) => d.id) ?? [];

		try {
			const response = await fetch(`/api/room/${data.roomCode}/roll`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ playerId })
			});

			const result = await response.json();
			if (!result.success) {
				error = result.error;
			}
		} catch {
			error = 'Failed to roll cubes';
		} finally {
			rolling = false;
		}
	}

	async function bankPoints() {
		if (!canBank) return;

		try {
			const response = await fetch(`/api/room/${data.roomCode}/bank`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ playerId })
			});

			const result = await response.json();
			if (!result.success) {
				error = result.error;
			}
		} catch {
			error = 'Failed to bank points';
		}
	}

	function copyRoomCode() {
		navigator.clipboard.writeText(data.roomCode);
	}

	function getDieClasses(die: Die): string {
		const baseClasses =
			'w-12 h-12 sm:w-14 sm:h-14 rounded-xl flex items-center justify-center text-2xl font-bold shadow-lg transition-all duration-300 ring-2 ring-white';

		if (die.locked) {
			return `${baseClasses} bg-90s-cyan text-black`;
		}

		switch (die.color) {
			case 'green':
				return `${baseClasses} bg-90s-cyan text-black`;
			case 'yellow':
				return `${baseClasses} bg-90s-yellow text-black`;
			case 'red':
				return `${baseClasses} bg-90s-pink text-white`;
			default:
				return `${baseClasses} bg-90s-purple text-white`;
		}
	}

	function getDieEmoji(die: Die): string {
		if (die.locked) return '✓';
		switch (die.color) {
			case 'green':
				return '●';
			case 'yellow':
				return '●';
			case 'red':
				return '●';
			default:
				return '?';
		}
	}
</script>

<svelte:head>
	<title>Room {data.roomCode} - Cube Toss!</title>
	<style>
		.bg-90s {
			background: linear-gradient(135deg, #00ced1 0%, #ff1493 50%, #ffd700 100%);
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
			color: #9b59b6;
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
			background-color: #9b59b6;
		}
		.border-90s-pink {
			border-color: #ff1493;
		}
		.border-90s-cyan {
			border-color: #00ced1;
		}
		.border-90s-yellow {
			border-color: #ffd700;
		}

		/* Staggered dice reveal animations */
		@keyframes pop-in {
			0% {
				transform: scale(0) rotate(-180deg);
				opacity: 0;
			}
			60% {
				transform: scale(1.2) rotate(10deg);
			}
			100% {
				transform: scale(1.1) rotate(0deg);
				opacity: 1;
			}
		}
		.animate-pop-in {
			animation: pop-in 0.3s ease-out forwards;
		}
		@keyframes spin-slow {
			0% {
				transform: rotate(0deg);
			}
			100% {
				transform: rotate(360deg);
			}
		}
		.animate-spin-slow {
			animation: spin-slow 0.5s linear infinite;
		}
	</style>
</svelte:head>

<div class="p-4">
	{#if loading}
		<div class="flex items-center justify-center">
			<div class="text-xl font-bold text-white" style="text-shadow: 2px 2px 0 #FF1493;">
				Loading game...
			</div>
		</div>
	{:else if !room}
		<div class="flex flex-col items-center justify-center">
			<div class="mb-4 text-xl font-bold text-white" style="text-shadow: 2px 2px 0 #FF1493;">
				Room not found
			</div>
			<a href="/" class="text-90s-yellow font-bold hover:text-white">← Back to Home</a>
		</div>
	{:else}
		<div class="mx-auto max-w-4xl">
			<!-- Header -->
			<div class="mb-6 flex flex-wrap items-center justify-between gap-4">
				<div>
					<a href="/">
						<h1 class="text-2xl font-bold text-white" style="text-shadow: 2px 2px 0 #FF1493;">
							🎲 Cube Toss!
						</h1>
					</a>
					<button
						onclick={copyRoomCode}
						class="text-90s-yellow flex items-center gap-2 font-mono text-lg font-bold hover:text-white"
					>
						Room: {data.roomCode}
						<span class="text-xs">📋</span>
					</button>
				</div>

				{#if room.gameState.phase === 'final-round'}
					<div
						class="bg-90s-yellow animate-pulse rounded-lg border-2 border-black px-4 py-2 font-bold text-black"
					>
						⚡ FINAL ROUND!
					</div>
				{/if}
			</div>

			<!-- Game Area -->
			<div class="grid gap-6 md:grid-cols-3">
				<!-- Players List -->
				<div class="border-90s-cyan rounded-xl border-4 bg-black/80 p-4 backdrop-blur">
					<h2 class="text-90s-cyan mb-3 font-bold">Players</h2>
					<div class="space-y-2">
						{#each room.players as player, i}
							<div
								class="flex items-center justify-between rounded-lg p-3 transition-all {currentPlayer?.id ===
								player.id
									? 'bg-90s-pink/30 ring-90s-pink ring-2'
									: 'bg-black/40'}"
							>
								<div class="flex items-center gap-2">
									{#if player.isHost}
										<span class="text-90s-yellow">👑</span>
									{/if}
									<span class="text-white {player.id === playerId ? 'font-bold' : ''}">
										{player.name}
										{#if player.id === playerId}
											<span class="text-90s-cyan text-xs">(you)</span>
										{/if}
									</span>
								</div>
								<div class="text-90s-yellow font-bold">{player.score}</div>
							</div>
						{/each}
					</div>
				</div>

				<!-- Main Game Board -->
				<div
					class="border-90s-pink rounded-xl border-4 bg-black/80 p-6 backdrop-blur md:col-span-2"
				>
					{#if room.gameState.phase === 'waiting'}
						<!-- Waiting Room -->
						<div class="text-center">
							<h2 class="text-90s-pink mb-4 text-2xl font-bold">Waiting for Players</h2>
							<p class="mb-6 text-white">
								Share the room code with your friends:
								<span class="text-90s-yellow font-mono text-xl">{data.roomCode}</span>
							</p>

							<div class="text-90s-cyan mb-6">
								{room.players.length} player{room.players.length !== 1 ? 's' : ''} in lobby
							</div>

							{#if isHost}
								{#if room.players.length < 2}
									<p class="text-90s-yellow mb-4 font-bold">Need at least 2 players to start</p>
								{/if}
								<button
									onclick={startGame}
									disabled={!canStart}
									class="bg-90s-pink rounded-xl border-b-4 border-pink-800 px-8 py-4 text-xl font-bold text-white transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:bg-gray-600"
								>
									Start Game
								</button>
							{:else}
								<p class="text-90s-cyan">Waiting for host to start the game...</p>
							{/if}
						</div>
					{:else if room.gameState.phase === 'ended'}
						<!-- Game Over -->
						<div class="text-center">
							<h2 class="text-90s-yellow mb-4 text-3xl font-bold">🏆 Game Over!</h2>
							{#if winner}
								<p class="text-90s-pink mb-6 text-2xl font-bold">
									{winner.name} wins with {winner.score} points!
								</p>
							{/if}

							<div class="mb-6 space-y-2">
								{#each [...room.players].sort((a, b) => b.score - a.score) as player, i}
									<div
										class="bg-90s-purple/30 border-90s-pink flex items-center justify-between rounded-lg border p-3"
									>
										<span class="font-bold text-white">
											{#if i === 0}🥇{:else if i === 1}🥈{:else if i === 2}🥉{:else}{i + 1}.{/if}
											{player.name}
										</span>
										<span class="text-90s-yellow font-bold">{player.score}</span>
									</div>
								{/each}
							</div>

							<a
								href="/"
								class="bg-90s-cyan inline-block rounded-xl border-b-4 border-teal-700 px-8 py-4 font-bold text-black transition-all hover:brightness-110"
							>
								Play Again
							</a>
						</div>
					{:else}
						<!-- Active Game -->
						<div>
							<!-- Current Turn Info -->
							<div class="mb-6 text-center">
								<p class="text-white">
									{#if isMyTurn}
										<span class="text-90s-pink text-xl font-bold">Your turn!</span>
									{:else}
										<span class="font-bold text-white">{currentPlayer?.name}'s turn</span>
									{/if}
								</p>
								<p class="text-90s-yellow mt-2 text-3xl font-bold">
									Turn Score: {room.gameState.turnScore}
								</p>
							</div>

							<!-- Always show banked dice at the top -->
							{#if lockedDice.length > 0 && !showingRoll}
								<div class="mb-4 transition-all duration-500">
									<p class="text-90s-cyan mb-2 text-center text-sm font-bold">
										🏦 Banked this turn ({lockedDice.length} point{lockedDice.length !== 1
											? 's'
											: ''})
									</p>
									<div class="flex flex-wrap justify-center gap-2">
										{#each lockedDice as die (die.id)}
											<div
												class="bg-90s-cyan/30 border-90s-cyan text-90s-cyan flex h-10 w-10 items-center justify-center rounded-lg border-2 text-lg font-bold transition-all duration-500"
											>
												✓
											</div>
										{/each}
									</div>
								</div>
							{:else if previouslyLockedIds.length > 0}
								<!-- Show previously banked dice while displaying roll results -->
								<div class="mb-4 transition-all duration-500">
									<p class="text-90s-cyan mb-2 text-center text-sm font-bold">
										🏦 Banked this turn ({previouslyLockedIds.length} point{previouslyLockedIds.length !==
										1
											? 's'
											: ''})
									</p>
									<div class="flex flex-wrap justify-center gap-3">
										{#each previouslyLockedIds as dieId (dieId)}
											<div
												class="bg-90s-cyan/30 border-90s-cyan text-90s-cyan flex h-10 w-10 items-center justify-center rounded-lg border-2 text-lg font-bold transition-all duration-500"
											>
												✓
											</div>
										{/each}
									</div>
								</div>
							{/if}

							{#if showingRoll && lastRolledDice.length > 0}
								<!-- Show only the just-rolled dice in the play area with staggered reveal -->
								<div class="mb-6">
									<p class="text-90s-yellow mb-3 text-center text-sm font-bold">🎲 Rolling...</p>
									<div class="mx-auto flex max-w-[400px] flex-wrap justify-center gap-5">
										{#each lastRolledDice as die, index (die.id)}
											{#if index < revealedDiceCount}
												<!-- Revealed die -->
												<div
													class={getDieClasses(die) +
														' animate-pop-in transform transition-all duration-300'}
												>
													{getDieEmoji(die)}
												</div>
											{:else}
												<!-- Unrevealed die (spinning) -->
												<div
													class="bg-90s-purple animate-spin-slow flex h-12 w-12 items-center justify-center rounded-xl border-2 border-white text-2xl font-bold text-white shadow-lg sm:h-14 sm:w-14"
												>
													?
												</div>
											{/if}
										{/each}
									</div>
								</div>
							{:else}
								<!-- Active Dice (to roll) -->
								{#if activeDice.length > 0}
									<div class="mb-4">
										<p class="text-90s-purple mb-2 text-center text-sm font-bold">
											🎲 Dice to roll ({activeDice.length} remaining)
										</p>
										<div class="mx-auto flex max-w-[340px] flex-wrap justify-center gap-3">
											{#each activeDice as die (die.id)}
												<div
													class={getDieClasses(die) +
														(rolling && !die.locked ? ' animate-bounce' : '')}
												>
													{getDieEmoji(die)}
												</div>
											{/each}
										</div>
									</div>
								{:else if lockedDice.length === 10}
									<div
										class="bg-90s-cyan/20 border-90s-cyan mb-4 rounded-xl border-2 p-4 text-center"
									>
										<p class="text-90s-cyan text-lg font-bold">🎉 All 10 dice are green!</p>
										<p class="text-sm text-white">
											Roll again to keep scoring, or bank your {room.gameState.turnScore} points!
										</p>
									</div>
								{/if}
							{/if}

							<!-- Bust notification -->
							{#if busted}
								<div class="mb-4 text-center">
									<span class="text-90s-pink animate-pulse text-2xl font-bold">
										💥 BUSTED! No points this turn!
									</span>
								</div>
							{/if}

							<!-- Action Buttons -->
							{#if isMyTurn}
								<div class="flex justify-center gap-4">
									<button
										onclick={rollDice}
										disabled={!canRoll}
										class="bg-90s-cyan hover:bg-90s-cyan/80 transform rounded-xl border-2 border-white px-8 py-4 text-xl font-bold text-black transition-all hover:scale-105 disabled:cursor-not-allowed disabled:bg-gray-600"
									>
										{rolling ? '🎲 Rolling...' : '🎲 Roll Cubes'}
									</button>
									<button
										onclick={bankPoints}
										disabled={!canBank}
										class="bg-90s-yellow hover:bg-90s-yellow/80 transform rounded-xl border-2 border-white px-8 py-4 text-xl font-bold text-black transition-all hover:scale-105 disabled:cursor-not-allowed disabled:bg-gray-600"
									>
										💰 Bank {room.gameState.turnScore} pts
									</button>
								</div>
							{:else}
								<p class="text-90s-purple text-center">
									Waiting for {currentPlayer?.name} to play...
								</p>
							{/if}
						</div>
					{/if}
				</div>
			</div>

			<!-- Error Display -->
			{#if error}
				<div
					class="bg-90s-pink/20 border-90s-pink text-90s-pink mt-4 rounded-lg border-2 p-4 text-center font-bold"
				>
					{error}
					<button onclick={() => (error = '')} class="hover:text-90s-yellow ml-4 text-white"
						>✕</button
					>
				</div>
			{/if}

			<!-- How to Play (collapsible) -->
			<details class="border-90s-purple mt-6 rounded-xl border-2 bg-black/30 p-4">
				<summary class="text-90s-yellow cursor-pointer font-bold">📖 How to Play</summary>
				<div class="mt-3 space-y-2 text-sm text-white">
					<p class="flex items-center gap-1">
						<span class="bg-90s-cyan inline-block size-4 rounded-full"></span>
						<strong class="text-90s-cyan">Green dice</strong> = +1 point. These get locked and you keep
						rolling!
					</p>
					<p class="flex items-center gap-1">
						<span class="bg-90s-yellow inline-block size-4 rounded-full"></span>
						<strong class="text-90s-yellow">Yellow dice</strong> = Neutral. Roll again or bank your points.
					</p>
					<p class="flex items-center gap-1">
						<span class="bg-90s-pink inline-block size-4 rounded-full"></span>
						<strong class="text-90s-pink">Red dice</strong> = Danger! If you roll ANY red without rolling
						at least one green, you BUST and lose all unbanked points for this turn.
					</p>
					<p>💰 <strong>Bank</strong> your points to add them to your score safely.</p>
					<p>
						🏆 First player to reach <strong class="text-90s-cyan">100 points</strong> triggers the final
						round!
					</p>
					<p>⚡ In the final round, everyone gets one last turn to beat the high score.</p>
				</div>
			</details>
		</div>
	{/if}
</div>
