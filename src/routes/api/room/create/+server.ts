import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createRoom } from '$lib/server/rooms';
import type { CreateRoomRequest } from '$lib/types';

export const POST: RequestHandler = async ({ request }) => {
	try {
		const body: CreateRoomRequest = await request.json();

		if (!body.hostName) {
			return json({ success: false, error: 'Name is required' }, { status: 400 });
		}

		const targetScore = body.targetScore ?? 100;
		const { room, playerId } = createRoom(body.hostName, targetScore);

		return json({
			success: true,
			roomCode: room.code,
			playerId,
			room
		});
	} catch {
		return json({ success: false, error: 'Failed to create room' }, { status: 500 });
	}
};
