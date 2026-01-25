import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { joinRoom, getRoom } from '$lib/server/rooms';
import type { JoinRoomRequest } from '$lib/types';

export const POST: RequestHandler = async ({ request }) => {
	try {
		const body: JoinRoomRequest = await request.json();

		if (!body.roomCode || !body.playerName) {
			return json({ success: false, error: 'Room code and name are required' }, { status: 400 });
		}

		const result = joinRoom(body.roomCode, body.playerName);

		if (!result) {
			// Check if room exists
			const room = getRoom(body.roomCode);
			if (!room) {
				return json({ success: false, error: 'Room not found' }, { status: 404 });
			}
			return json(
				{ success: false, error: 'Cannot join - game already in progress' },
				{ status: 400 }
			);
		}

		return json({
			success: true,
			playerId: result.player.id,
			room: result.room
		});
	} catch {
		return json({ success: false, error: 'Failed to join room' }, { status: 500 });
	}
};
