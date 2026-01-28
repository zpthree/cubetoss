// Game Types for Cube Toss Cube

export type DieColor = 'green' | 'yellow' | 'red';

export interface Die {
	id: number;
	color: DieColor;
	locked: boolean; // Green dice get locked/set aside
}

export interface Player {
	id: string;
	name: string;
	isHost: boolean;
	isBot: boolean;
	score: number;
	isConnected: boolean;
	turnScore: number; // Points accumulated this turn (not yet banked)
}

export interface GameState {
	phase: 'waiting' | 'playing' | 'final-round' | 'ended';
	currentPlayerIndex: number;
	dice: Die[];
	turnScore: number;
	targetScore: number;
	finalRoundTriggeredBy: string | null; // Player ID who triggered final round
	playersHadFinalTurn: string[]; // Player IDs who have had their final turn
	winner: string | null; // Player ID of winner
}

export interface Room {
	code: string;
	players: Player[];
	gameState: GameState;
	createdAt: number;
	lastActivity: number;
}

export interface RoomEvent {
	type:
		| 'player-joined'
		| 'player-left'
		| 'game-started'
		| 'dice-rolled'
		| 'turn-ended'
		| 'game-ended'
		| 'state-update';
	data: unknown;
	timestamp: number;
}

// API Request/Response types
export interface CreateRoomRequest {
	hostName: string;
	targetScore?: number;
}

export interface CreateRoomResponse {
	success: boolean;
	roomCode?: string;
	playerId?: string;
	error?: string;
}

export interface JoinRoomRequest {
	roomCode: string;
	playerName: string;
}

export interface JoinRoomResponse {
	success: boolean;
	playerId?: string;
	room?: Room;
	error?: string;
}

export interface RollDiceRequest {
	roomCode: string;
	playerId: string;
}

export interface BankPointsRequest {
	roomCode: string;
	playerId: string;
}
