import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createRoom } from '$lib/server/rooms';
import type { CreateRoomRequest } from '$lib/types';

export const POST: RequestHandler = async ({ request }) => {
	try {
		const body: CreateRoomRequest = await request.json();

		if (!body.hostEmail || !body.hostName) {
			return json({ success: false, error: 'Email and name are required' }, { status: 400 });
		}

		// Basic email validation
		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		if (!emailRegex.test(body.hostEmail)) {
			return json({ success: false, error: 'Invalid email address' }, { status: 400 });
		}

		const { room, playerId } = createRoom(body.hostEmail, body.hostName);

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
