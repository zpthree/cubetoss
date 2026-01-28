// In-memory room storage - ephemeral, no database needed
import type { Room, Player, GameState, Die, DieColor } from '$lib/types';

// Store rooms in memory
const rooms = new Map<string, Room>();

// Store SSE connections for real-time updates
const connections = new Map<string, Set<(event: string, data: unknown) => void>>();

// Room cleanup interval (clean up rooms inactive for 2 hours)
const ROOM_TIMEOUT_MS = 2 * 60 * 60 * 1000;

// Generate a random 6-character room code
export function generateRoomCode(): string {
	const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Excluding confusing chars like 0, O, I, 1
	let code = '';
	for (let i = 0; i < 6; i++) {
		code += chars[Math.floor(Math.random() * chars.length)];
	}
	// Make sure it's unique
	if (rooms.has(code)) {
		return generateRoomCode();
	}
	return code;
}

// Generate a player ID
export function generatePlayerId(): string {
	return crypto.randomUUID();
}

// Create initial game state
export function createInitialGameState(targetScore: number = 100): GameState {
	return {
		phase: 'waiting',
		currentPlayerIndex: 0,
		dice: createDice(),
		turnScore: 0,
		targetScore,
		finalRoundTriggeredBy: null,
		playersHadFinalTurn: [],
		winner: null
	};
}

// Create 10 dice (initially all showing a neutral state)
export function createDice(): Die[] {
	return Array.from({ length: 10 }, (_, i) => ({
		id: i,
		color: 'yellow' as DieColor,
		locked: false
	}));
}

// Roll a single die
// Each die has 6 faces: 3 green, 2 yellow, 1 red
export function rollDie(): DieColor {
	const dieFaces: DieColor[] = ['green', 'green', 'green', 'yellow', 'yellow', 'red'];
	const faceIndex = Math.floor(Math.random() * 6);
	const result = dieFaces[faceIndex];
	return result;
}

// Create a new room
export function createRoom(
	hostName: string,
	targetScore: number = 100
): { room: Room; playerId: string } {
	const code = generateRoomCode();
	const playerId = generatePlayerId();

	const host: Player = {
		id: playerId,
		name: hostName,
		isHost: true,
		isBot: false,
		score: 0,
		isConnected: true,
		turnScore: 0
	};

	const room: Room = {
		code,
		players: [host],
		gameState: createInitialGameState(targetScore),
		createdAt: Date.now(),
		lastActivity: Date.now()
	};

	rooms.set(code, room);
	connections.set(code, new Set());

	return { room, playerId };
}

// Get a room by code
export function getRoom(code: string): Room | undefined {
	const room = rooms.get(code.toUpperCase());
	if (room) {
		room.lastActivity = Date.now();
	}
	return room;
}

// Join a room
export function joinRoom(code: string, playerName: string): { player: Player; room: Room } | null {
	const room = getRoom(code.toUpperCase());
	if (!room) return null;

	// Check if game already started
	if (room.gameState.phase !== 'waiting') {
		return null;
	}

	const playerId = generatePlayerId();
	const player: Player = {
		id: playerId,
		name: playerName,
		isHost: false,
		isBot: false,
		score: 0,
		isConnected: true,
		turnScore: 0
	};

	room.players.push(player);
	room.lastActivity = Date.now();

	// Notify all connected clients
	broadcastToRoom(code, 'player-joined', { player, room });

	return { player, room };
}

// Start the game
export function startGame(code: string, playerId: string): boolean {
	const room = getRoom(code);
	if (!room) return false;

	// Only host can start
	const host = room.players.find((p: Player) => p.id === playerId && p.isHost);
	if (!host) return false;

	// Need at least 2 players
	if (room.players.length < 2) return false;

	room.gameState.phase = 'playing';
	room.gameState.currentPlayerIndex = 0;
	room.gameState.dice = createDice();
	room.gameState.turnScore = 0;

	broadcastToRoom(code, 'game-started', { room });

	return true;
}

// Roll dice
export function rollDice(
	code: string,
	playerId: string
): { success: boolean; busted?: boolean; room?: Room } {
	const room = getRoom(code);
	if (!room) return { success: false };

	const { gameState, players } = room;

	// Check it's this player's turn
	const currentPlayer = players[gameState.currentPlayerIndex];
	if (currentPlayer.id !== playerId) return { success: false };

	// Check game is in progress
	if (gameState.phase !== 'playing' && gameState.phase !== 'final-round') {
		return { success: false };
	}

	// Get unlocked dice to roll
	const unlockedDice = gameState.dice.filter((d: Die) => !d.locked);

	// If no cube to roll, something is wrong - reset cube (this is the "all 10 green" case)
	if (unlockedDice.length === 0) {
		gameState.dice = createDice();
	}

	// Roll all unlocked dice
	let rolledAnyGreen = false;
	let rolledAnyRed = false;
	const rollResults: string[] = [];
	const rolledDiceSnapshot: Die[] = [];
	for (const die of gameState.dice) {
		if (!die.locked) {
			die.color = rollDie();
			rollResults.push(die.color);
			// Use explicit string comparison
			if (die.color === 'green') {
				rolledAnyGreen = true;
				die.locked = true;
				gameState.turnScore += 1;
			}
			if (die.color === 'red') {
				rolledAnyRed = true;
			}
			rolledDiceSnapshot.push({ id: die.id, color: die.color, locked: die.locked });
		}
	}

	// Check if busted (rolled red without any green)
	// ONLY bust if there was at least one red AND zero greens
	const isBusted = rolledAnyRed && !rolledAnyGreen;

	if (isBusted) {
		// Busted! Lose all turn points
		gameState.turnScore = 0;
		endTurn(room);
		broadcastToRoom(code, 'dice-rolled', { room, busted: true, rolledDiceSnapshot });
		return { success: true, busted: true, room };
	}

	// NOT busted - player can continue rolling or bank

	// Check if all cube are green (locked) - if so, reset for another roll
	const allLocked = gameState.dice.every((d: Die) => d.locked);
	if (allLocked) {
		// Reset all cube to roll again, keeping the score
		gameState.dice = createDice();
	}

	broadcastToRoom(code, 'dice-rolled', { room, busted: false, rolledDiceSnapshot });
	return { success: true, busted: false, room };
}

// Bank points and end turn
export function bankPoints(code: string, playerId: string): { success: boolean; room?: Room } {
	const room = getRoom(code);
	if (!room) return { success: false };

	const { gameState, players } = room;

	// Check it's this player's turn
	const currentPlayer = players[gameState.currentPlayerIndex];
	if (currentPlayer.id !== playerId) return { success: false };

	// Add turn score to player's total
	currentPlayer.score += gameState.turnScore;

	// Check for final round trigger
	if (currentPlayer.score >= gameState.targetScore && !gameState.finalRoundTriggeredBy) {
		gameState.finalRoundTriggeredBy = currentPlayer.id;
		gameState.phase = 'final-round';
		gameState.playersHadFinalTurn.push(currentPlayer.id);
	}

	endTurn(room);
	broadcastToRoom(code, 'turn-ended', { room });

	return { success: true, room };
}

// End the current turn
function endTurn(room: Room): void {
	const { gameState, players } = room;

	// Reset turn score and dice
	gameState.turnScore = 0;
	gameState.dice = createDice();

	// Move to next player
	gameState.currentPlayerIndex = (gameState.currentPlayerIndex + 1) % players.length;

	// If in final round, track who has had their turn
	if (gameState.phase === 'final-round') {
		const nextPlayer = players[gameState.currentPlayerIndex];

		// Check if everyone has had their final turn
		if (gameState.playersHadFinalTurn.includes(nextPlayer.id)) {
			// Game over! Find winner
			const winner = players.reduce((best: Player, player: Player) =>
				player.score > best.score ? player : best
			);
			gameState.winner = winner.id;
			gameState.phase = 'ended';
			broadcastToRoom(room.code, 'game-ended', { room, winner });
			return; // Don't trigger bot turn if game ended
		} else {
			gameState.playersHadFinalTurn.push(nextPlayer.id);
		}
	}

	// If next player is a bot, trigger their turn
	const nextPlayer = players[gameState.currentPlayerIndex];
	if (nextPlayer.isBot && (gameState.phase === 'playing' || gameState.phase === 'final-round')) {
		setTimeout(() => {
			executeBotTurn(room.code, nextPlayer.id);
		}, 2000);
	}
}

// Subscribe to room events (SSE)
export function subscribeToRoom(
	code: string,
	callback: (event: string, data: unknown) => void
): () => void {
	const roomCode = code.toUpperCase();
	if (!connections.has(roomCode)) {
		connections.set(roomCode, new Set());
	}
	connections.get(roomCode)!.add(callback);

	// Return unsubscribe function
	return () => {
		connections.get(roomCode)?.delete(callback);
	};
}

// Broadcast event to all connected clients in a room
export function broadcastToRoom(code: string, event: string, data: unknown): void {
	const roomCode = code.toUpperCase();
	const roomConnections = connections.get(roomCode);
	if (roomConnections) {
		for (const callback of roomConnections) {
			callback(event, data);
		}
	}
}

// Remove a player from a room
export function removePlayer(code: string, playerId: string): void {
	const room = getRoom(code);
	if (!room) return;

	const playerIndex = room.players.findIndex((p: Player) => p.id === playerId);
	if (playerIndex === -1) return;

	const player = room.players[playerIndex];
	player.isConnected = false;

	// If host leaves and game hasn't started, delete room
	if (player.isHost && room.gameState.phase === 'waiting') {
		rooms.delete(code.toUpperCase());
		connections.delete(code.toUpperCase());
		return;
	}

	broadcastToRoom(code, 'player-left', { playerId, room });
}

// Clean up old rooms periodically
export function cleanupRooms(): void {
	const now = Date.now();
	for (const [code, room] of rooms) {
		if (now - room.lastActivity > ROOM_TIMEOUT_MS) {
			rooms.delete(code);
			connections.delete(code);
		}
	}
}

// Start cleanup interval
if (typeof setInterval !== 'undefined') {
	setInterval(cleanupRooms, 60 * 1000); // Check every minute
}

// Bot names pool
const BOT_NAMES = [
	'Robo Roller',
	'Dice Bot',
	'Cube King',
	'Lucky Bot',
	'Risk Taker',
	'Safe Player',
	'Turbo Toss',
	'Mega Roller'
];

// Add a bot to the room
export function addBot(code: string): { player: Player; room: Room } | null {
	const room = getRoom(code.toUpperCase());
	if (!room) return null;

	// Only allow bots in waiting phase
	if (room.gameState.phase !== 'waiting') {
		return null;
	}

	// Limit to 8 players total
	if (room.players.length >= 8) {
		return null;
	}

	// Pick a bot name not already in use
	const usedNames = room.players.map((p) => p.name);
	const availableNames = BOT_NAMES.filter((n) => !usedNames.includes(n));
	const botName =
		availableNames.length > 0
			? availableNames[Math.floor(Math.random() * availableNames.length)]
			: `Bot ${room.players.length}`;

	const playerId = generatePlayerId();
	const player: Player = {
		id: playerId,
		name: botName,
		isHost: false,
		isBot: true,
		score: 0,
		isConnected: true,
		turnScore: 0
	};

	room.players.push(player);
	room.lastActivity = Date.now();

	broadcastToRoom(code, 'player-joined', { player, room });

	return { player, room };
}

// Remove a bot from the room
export function removeBot(code: string, botId: string): boolean {
	const room = getRoom(code.toUpperCase());
	if (!room) return false;

	// Only allow removing bots in waiting phase
	if (room.gameState.phase !== 'waiting') {
		return false;
	}

	const botIndex = room.players.findIndex((p) => p.id === botId && p.isBot);
	if (botIndex === -1) return false;

	room.players.splice(botIndex, 1);
	broadcastToRoom(code, 'player-left', { playerId: botId, room });

	return true;
}

// Medium bot strategy: decides whether to bank or keep rolling
function botShouldBank(
	turnScore: number,
	diceRemaining: number,
	targetScore: number,
	currentScore: number
): boolean {
	// If banking would win or trigger final round, do it
	if (currentScore + turnScore >= targetScore) {
		return true;
	}

	// Medium strategy: aim for 15-25 points per turn
	// More aggressive with more dice, slightly conservative with fewer
	const baseThreshold = 15;
	const diceRiskFactor = (10 - diceRemaining) * 1; // 0 to 10 points added
	const threshold = baseThreshold + diceRiskFactor;

	// Add some randomness to make it less predictable
	const randomFactor = Math.random() * 6 - 3; // -3 to +3

	return turnScore >= threshold + randomFactor;
}

// Execute a bot's turn (called recursively until bank or bust)
export function executeBotTurn(code: string, playerId: string): void {
	const room = getRoom(code);
	if (!room) return;

	const { gameState, players } = room;
	const currentPlayer = players[gameState.currentPlayerIndex];

	// Verify it's this bot's turn
	if (currentPlayer.id !== playerId || !currentPlayer.isBot) return;

	// Check game is still in progress
	if (gameState.phase !== 'playing' && gameState.phase !== 'final-round') return;

	const diceRemaining = gameState.dice.filter((d) => !d.locked).length;
	const shouldBank =
		gameState.turnScore > 0 &&
		botShouldBank(gameState.turnScore, diceRemaining, gameState.targetScore, currentPlayer.score);

	if (shouldBank) {
		// Bot decides to bank
		setTimeout(() => {
			bankPoints(code, playerId);
		}, 1500);
	} else {
		// Bot decides to roll
		setTimeout(() => {
			const result = rollDice(code, playerId);

			// If not busted, continue the turn after a delay
			if (result.success && !result.busted) {
				// Check if game ended (e.g., all dice locked scenario handled in rollDice)
				const updatedRoom = getRoom(code);
				if (
					updatedRoom &&
					(updatedRoom.gameState.phase === 'playing' ||
						updatedRoom.gameState.phase === 'final-round') &&
					updatedRoom.players[updatedRoom.gameState.currentPlayerIndex].id === playerId
				) {
					// Still this bot's turn, continue
					setTimeout(() => {
						executeBotTurn(code, playerId);
					}, 2000);
				}
			}
		}, 1500);
	}
}

// Get total player count across all rooms
export function getTotalPlayerCount(): number {
	let total = 0;
	for (const room of rooms.values()) {
		total += room.players.filter((p: Player) => p.isConnected).length;
	}
	return total;
}
