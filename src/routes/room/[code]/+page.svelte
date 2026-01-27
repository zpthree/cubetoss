<script lang="ts">
	import type { Room, Die, Player } from '$lib/types';
	import { onMount, onDestroy } from 'svelte';
	import confetti from 'canvas-confetti';
	import ButtonPink from '$lib/components/ButtonPink.svelte';
	import ButtonCyan from '$lib/components/ButtonCyan.svelte';
	import ButtonYellow from '$lib/components/ButtonYellow.svelte';
	import Logo from '$lib/components/Logo.svelte';

	let { data } = $props();

	let room: Room | null = $state(null);
	let playerId: string | null = $state(null);
	let error = $state('');
	let loading = $state(true);
	let rolling = $state(false);
	let busted = $state(false);
	let showingRoll = $state(false); // True when showing cube results before separating greens
	let previouslyLockedIds: number[] = $state([]); // Track cube that were locked before the roll
	let lastRolledDice: Die[] = $state([]); // The cube that were just rolled (snapshot)
	let revealedDiceCount = $state(0); // For staggered cube reveal animation
	let displayedTurnScore = $state(0); // Delayed score display for animation
	let copied = $state(false); // Track clipboard copy feedback
	let copiedLink = $state(false); // Track shareable link copy feedback
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
		};

		eventSource.onopen = () => {};

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
			displayedTurnScore = 0;
		});

		eventSource.addEventListener('dice-rolled', (e) => {
			const eventData = JSON.parse(e.data);

			// Capture which cube were just rolled (prefer server snapshot to avoid mismatch
			// when the backend resets cube after an all-green roll or a bust)
			const rolledDice: Die[] = Array.isArray(eventData.rolledDiceSnapshot)
				? eventData.rolledDiceSnapshot
				: eventData.room.gameState.dice.filter((d: Die) => !previouslyLockedIds.includes(d.id));
			lastRolledDice = rolledDice;

			room = eventData.room;

			// Show the roll results with staggered reveal animation
			if (!eventData.busted) {
				showingRoll = true;
				revealedDiceCount = 0;

				// Reveal cube one at a time with 150ms delay each
				const totalDice = rolledDice.length;
				for (let i = 0; i < totalDice; i++) {
					setTimeout(() => {
						revealedDiceCount = i + 1;
					}, i * 150);
				}

				// After all cube revealed + 1 second pause, separate greens
				setTimeout(
					() => {
						showingRoll = false;
						revealedDiceCount = 0;
						// Update displayed score after animation completes
						displayedTurnScore = room?.gameState.turnScore ?? 0;
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
						// Update displayed score after animation completes (will be 0 on bust)
						displayedTurnScore = room?.gameState.turnScore ?? 0;
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
			displayedTurnScore = 0;
		});

		eventSource.addEventListener('game-ended', (e) => {
			const eventData = JSON.parse(e.data);
			room = eventData.room;
			// Celebrate with confetti!
			fireConfetti();
		});
	}

	function fireConfetti() {
		// Respect user's motion preferences
		if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
			return;
		}

		// Fire confetti from both sides
		const duration = 10000;
		const end = Date.now() + duration;

		const colors = ['#FF1493', '#00CED1', '#FFD700']; // pink, cyan, yellow

		(function frame() {
			confetti({
				particleCount: 3,
				angle: 60,
				spread: 55,
				origin: { x: 0, y: 0.7 },
				colors
			});
			confetti({
				particleCount: 3,
				angle: 120,
				spread: 55,
				origin: { x: 1, y: 0.7 },
				colors
			});

			if (Date.now() < end) {
				requestAnimationFrame(frame);
			}
		})();
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
		copied = true;
		setTimeout(() => (copied = false), 2000);
	}

	function copyShareLink() {
		const shareUrl = `${window.location.origin}/join/${data.roomCode}`;
		navigator.clipboard.writeText(shareUrl);
		copiedLink = true;
		setTimeout(() => (copiedLink = false), 2000);
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
</svelte:head>

<div class="w-full p-4">
	{#if loading}
		<div class="flex flex-col items-center justify-center gap-3">
			<div class="text-xl font-bold text-white" style="text-shadow: 2px 2px 0 #FF1493;">
				Loading game...
			</div>
			<!-- go home link -->
			<p><a href="/" class="font-bold text-90s-cyan hover:!text-white">← Back to Home</a></p>
		</div>
	{:else if !room}
		<div class="flex flex-col items-center justify-center">
			<div class="mb-4 text-xl font-bold text-white" style="text-shadow: 2px 2px 0 #FF1493;">
				Room not found
			</div>
			<a href="/" class="font-bold text-90s-yellow hover:text-white">← Back to Home</a>
		</div>
	{:else}
		<div class="mx-auto w-full max-w-4xl">
			<!-- Header -->
			<div class="mb-6 flex flex-wrap items-center justify-between gap-4">
				<div>
					<a href="/">
						<h1 class="text-2xl font-bold text-white" style="text-shadow: 2px 2px 0 #FF1493;">
							<Logo />
						</h1>
					</a>
					<button
						onclick={copyRoomCode}
						class="flex cursor-pointer items-center gap-2 font-mono text-lg font-bold text-90s-yellow hover:text-white"
					>
						Room: {data.roomCode}
						<span class="text-xs">{copied ? '✓' : '📋'}</span>
					</button>
				</div>

				{#if room.gameState.phase === 'final-round'}
					<div
						class="animate-pulse rounded-lg border-[3px] border-black bg-90s-yellow px-4 py-2 font-bold text-black"
					>
						⚡ FINAL ROUND!
					</div>
				{/if}
			</div>

			<!-- Error Display -->
			{#if error}
				<div
					class="mb-6 rounded-lg border-[3px] border-90s-yellow bg-90s-yellow/20 p-4 text-center font-bold text-90s-yellow shadow-[0_0_20px_rgba(255,20,147,0.5)] shadow-90s-yellow"
				>
					{error}
					<button onclick={() => (error = '')} class="ml-4 text-white hover:text-90s-yellow"
						>✕</button
					>
				</div>
			{/if}

			<!-- Game Area -->
			<div class="grid gap-6 md:grid-cols-3">
				<!-- Main Game Board -->
				<div
					class="rounded-xl border-4 border-90s-pink bg-black/80 p-6 shadow-[0_0_20px_rgba(255,20,147,0.5)] backdrop-blur md:col-span-2"
				>
					{#if room.gameState.phase === 'waiting'}
						<!-- Waiting Room -->
						<div class="text-center">
							<h2 class="mb-4 text-2xl font-bold text-90s-pink">Waiting for Players</h2>
							<p class="mb-2 text-white">Share this link with your friends:</p>
							<button
								onclick={copyShareLink}
								class="mb-6 flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-90s-yellow bg-90s-yellow/10 px-4 py-2 font-mono text-sm text-90s-yellow transition-all hover:bg-90s-yellow/20"
							>
								<span class="truncate"
									>{typeof window !== 'undefined'
										? window.location.origin.replace(/^https?:\/\/(www\.)?/, '')
										: ''}/join/{data.roomCode}</span
								>
								<span class="shrink-0 text-lg">{copiedLink ? '✓' : '📋'}</span>
							</button>

							<div class="mb-6 text-90s-cyan">
								{room.players.length} player{room.players.length !== 1 ? 's' : ''} in lobby
							</div>

							{#if isHost}
								{#if room.players.length < 2}
									<p class="mb-4 font-bold text-90s-yellow">Need at least 2 players to start</p>
								{/if}
								<ButtonPink onclick={startGame} disabled={!canStart} _class="!w-auto"
									>Start Game</ButtonPink
								>
							{:else}
								<p class="text-90s-cyan">Waiting for host to start the game...</p>
							{/if}
						</div>
					{:else if room.gameState.phase === 'ended'}
						<!-- Game Over -->
						<div class="text-center">
							<h2 class="mb-4 text-3xl font-bold text-90s-yellow">Game Over!</h2>
							{#if winner}
								<p class="mb-6 text-2xl font-bold text-90s-pink">
									{winner.name}
									<span class="font-semibold text-white">wins with {winner.score} points!</span>
								</p>
							{/if}

							<div class="mb-6 space-y-2">
								{#each [...room.players].sort((a, b) => b.score - a.score) as player, i}
									<div
										class="flex items-center justify-between rounded-lg border border-90s-pink bg-90s-pink/10 p-3"
									>
										<span class="font-bold text-white">
											{#if i === 0}🥇{:else if i === 1}🥈{:else if i === 2}🥉{:else}{i + 1}.{/if}
											{player.name}
										</span>
										<span class="font-bold text-90s-yellow">{player.score}</span>
									</div>
								{/each}
							</div>

							<a
								href="/"
								class="inline-block rounded-xl border-b-4 border-teal-700 bg-90s-cyan px-8 py-4 font-bold text-black transition-all hover:brightness-110"
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
										<span class="text-xl font-bold text-90s-pink">Your turn!</span>
									{:else}
										<span class="font-bold text-white">{currentPlayer?.name}'s turn</span>
									{/if}
								</p>
								<p class="mt-2 text-3xl font-bold text-90s-yellow">
									Turn Score: {showingRoll ? displayedTurnScore : room.gameState.turnScore}
								</p>
							</div>

							<div class="h-[280px]">
								<!-- Always show banked dice at the top -->
								{#if (showingRoll ? previouslyLockedIds.length : lockedDice.length) > 0}
									{@const lockedCount = showingRoll
										? previouslyLockedIds.length
										: lockedDice.length}
									<div class="mb-4 transition-all duration-500">
										<p class="mb-2 text-center text-sm font-bold text-90s-cyan">
											🔒 Locked this round ({lockedCount} point{lockedCount !== 1 ? 's' : ''})
										</p>
										<div class="flex flex-wrap justify-center gap-2">
											{#each Array(lockedCount) as _, i (i)}
												<div
													class="flex h-10 w-10 items-center justify-center rounded-lg border-[3px] border-90s-cyan bg-90s-cyan/30 text-lg font-bold text-90s-cyan transition-all duration-500"
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
										<p class="mb-3 text-center text-sm font-bold text-90s-yellow">Rolling...</p>
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
														class="animate-spin-slow flex h-12 w-12 items-center justify-center rounded-xl border-[3px] border-white bg-90s-purple text-2xl font-bold text-white shadow-lg sm:h-14 sm:w-14"
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
											<p class="mb-2 text-center text-sm font-bold text-white">
												{activeDice.length} cubes remaining
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
											class="mb-4 rounded-xl border-[3px] border-90s-cyan bg-90s-cyan/20 p-4 text-center"
										>
											<p class="text-lg font-bold text-90s-cyan">🎉 All 10 dice are blue!</p>
											<p class="text-sm text-white">
												Roll again to keep scoring, or bank your {room.gameState.turnScore} points!
											</p>
										</div>
									{/if}
								{/if}
							</div>

							<!-- Bust notification -->
							{#if busted}
								<div class="mb-4 text-center">
									<span class="animate-pulse text-2xl font-bold text-90s-pink">
										💥 BUSTED! No points this turn!
									</span>
								</div>
							{/if}

							<!-- Action Buttons -->
							{#if isMyTurn}
								<div class="mx-auto grid max-w-sm grid-cols-2 gap-4">
									<ButtonCyan onclick={rollDice} disabled={!canRoll || showingRoll}>
										{showingRoll ? 'Rolling...' : 'Roll'}
									</ButtonCyan>
									<ButtonYellow onclick={bankPoints} disabled={!canBank || showingRoll}>
										Bank {showingRoll ? displayedTurnScore : room.gameState.turnScore} pts
									</ButtonYellow>
								</div>
							{:else}
								<p class="text-center text-90s-purple">
									Watching {currentPlayer?.name}...
								</p>
							{/if}
						</div>
					{/if}
				</div>

				<!-- Players List -->
				<div
					class="rounded-xl border-4 border-90s-cyan bg-black/80 p-4 shadow-[0_0_20px_rgba(255,20,147,0.5)] shadow-90s-cyan backdrop-blur"
				>
					<!-- show target score -->
					<div class="mb-4 text-center">
						<h2 class="text-sm font-semibold text-white">Target Score</h2>
						<p class="text-2xl font-bold text-90s-yellow">{room.gameState.targetScore} points</p>
					</div>
					<h2 class="mb-3 font-bold text-90s-cyan">Players</h2>
					<div class="space-y-2">
						{#each room.players as player, i}
							<div
								class="flex items-center justify-between rounded-lg p-3 transition-all {currentPlayer?.id ===
								player.id
									? 'bg-90s-pink/30 ring-2 ring-90s-pink'
									: 'bg-black/40'}"
							>
								<div class="flex items-center gap-2">
									{#if player.isHost}
										<span class="text-90s-yellow">👑</span>
									{/if}
									<span class="text-white {player.id === playerId ? 'font-bold' : ''}">
										{player.name}
										{#if player.id === playerId}
											<span class="text-xs text-90s-cyan">(you)</span>
										{/if}
									</span>
								</div>
								<div class="font-bold text-90s-yellow">{player.score}</div>
							</div>
						{/each}
					</div>
				</div>
			</div>

			<!-- How to Play (collapsible) -->
			<details
				class="mt-6 rounded-xl border-[3px] border-90s-purple bg-black p-4 shadow-[0_0_20px_rgba(255,20,147,0.5)] shadow-90s-purple"
			>
				<summary class="cursor-pointer font-bold text-90s-yellow">How to Play</summary>
				<div class="mt-3 space-y-2 text-sm text-white">
					<p>
						<span class="inline-block size-4 rounded-full bg-90s-cyan align-middle"></span>
						<strong class="text-90s-cyan">Blue dice</strong> = +1 point. These get locked and you keep
						rolling!
					</p>
					<p>
						<span class="inline-block size-4 rounded-full bg-90s-yellow align-middle"></span>
						<strong class="text-90s-yellow">Yellow dice</strong> = Neutral. Roll again (unless you rolled
						pink and no blues) or bank your points.
					</p>
					<p>
						<span class="inline-block size-4 rounded-full bg-90s-pink align-middle"></span>
						<strong class="text-90s-pink">Pink dice</strong> = Danger! If you roll ANY pink without rolling
						at least one blue, you BUST and lose all unbanked points for this turn.
					</p>
					<p>💰 <strong>Bank</strong> your points to add them to your score safely.</p>
					<p>
						🏆 First player to reach <strong class="text-90s-cyan"
							>{room.gameState.targetScore} points</strong
						> triggers the final round!
					</p>
					<p>⚡ In the final round, everyone gets one last turn to beat the high score.</p>
				</div>
			</details>
		</div>
	{/if}
</div>

<style>
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
