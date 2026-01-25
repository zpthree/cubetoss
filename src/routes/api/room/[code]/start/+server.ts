import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { startGame, getRoom } from '$lib/server/rooms';

export const POST: RequestHandler = async ({ params, request }) => {
	try {
		const { playerId } = await request.json();

		if (!playerId) {
			return json({ success: false, error: 'Player ID is required' }, { status: 400 });
		}

		const room = getRoom(params.code);
		if (!room) {
			return json({ success: false, error: 'Room not found' }, { status: 404 });
		}

		if (room.players.length < 2) {
			return json({ success: false, error: 'Need at least 2 players to start' }, { status: 400 });
		}

		const success = startGame(params.code, playerId);

		if (!success) {
			return json({ success: false, error: 'Only the host can start the game' }, { status: 403 });
		}

		return json({ success: true, room: getRoom(params.code) });
	} catch {
		return json({ success: false, error: 'Failed to start game' }, { status: 500 });
	}
};
