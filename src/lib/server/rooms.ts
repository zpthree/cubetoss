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
export function createInitialGameState(): GameState {
	return {
		phase: 'waiting',
		currentPlayerIndex: 0,
		dice: createDice(),
		turnScore: 0,
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
	console.log(`[rollDie] faceIndex=${faceIndex}, result=${result}`);
	return result;
}

// Create a new room
export function createRoom(hostName: string): { room: Room; playerId: string } {
	const code = generateRoomCode();
	const playerId = generatePlayerId();

	const host: Player = {
		id: playerId,
		name: hostName,
		isHost: true,
		score: 0,
		isConnected: true,
		turnScore: 0
	};

	const room: Room = {
		code,
		players: [host],
		gameState: createInitialGameState(),
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

	// If no dice to roll, something is wrong - reset dice (this is the "all 10 green" case)
	if (unlockedDice.length === 0) {
		gameState.dice = createDice();
	}

	// Roll all unlocked dice
	let rolledAnyGreen = false;
	let rolledAnyRed = false;
	const rollResults: string[] = [];

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
		}
	}

	// Debug logging - show each die's color
	console.log(
		`[ROLL] Player ${currentPlayer.name}: dice colors = [${gameState.dice.map((d) => `${d.id}:${d.color}:${d.locked}`).join(', ')}]`
	);
	console.log(`[ROLL] Roll results: [${rollResults.join(', ')}]`);
	console.log(`[ROLL] Flags - rolledAnyGreen: ${rolledAnyGreen}, rolledAnyRed: ${rolledAnyRed}`);

	// Check if busted (rolled red without any green)
	// ONLY bust if there was at least one red AND zero greens
	const isBusted = rolledAnyRed && !rolledAnyGreen;

	console.log(`[ROLL] isBusted: ${isBusted} (red:${rolledAnyRed} && !green:${!rolledAnyGreen})`);

	if (isBusted) {
		// Busted! Lose all turn points
		console.log(`[ROLL] BUSTING - ending turn`);
		gameState.turnScore = 0;
		endTurn(room);
		broadcastToRoom(code, 'dice-rolled', { room, busted: true });
		return { success: true, busted: true, room };
	}

	// NOT busted - player can continue rolling or bank
	console.log(`[ROLL] NOT busted - player continues. Turn score: ${gameState.turnScore}`);

	// Check if all dice are green (locked) - if so, reset for another roll
	const allLocked = gameState.dice.every((d: Die) => d.locked);
	if (allLocked) {
		// Reset all dice to roll again, keeping the score
		console.log(`[ROLL] All 10 dice locked! Resetting dice.`);
		gameState.dice = createDice();
	}

	broadcastToRoom(code, 'dice-rolled', { room, busted: false });
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
	if (currentPlayer.score >= 100 && !gameState.finalRoundTriggeredBy) {
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
		} else {
			gameState.playersHadFinalTurn.push(nextPlayer.id);
		}
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
