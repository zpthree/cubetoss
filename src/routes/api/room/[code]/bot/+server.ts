import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { addBot, removeBot, getRoom } from '$lib/server/rooms';

// POST - Add a bot to the room
export const POST: RequestHandler = async ({ params }) => {
	const { code } = params;

	const result = addBot(code);

	if (!result) {
		return json({ success: false, error: 'Could not add bot (room full or game started)' });
	}

	return json({ success: true, room: result.room });
};

// DELETE - Remove a bot from the room
export const DELETE: RequestHandler = async ({ params, request }) => {
	const { code } = params;
	const { botId } = await request.json();

	if (!botId) {
		return json({ success: false, error: 'Bot ID required' });
	}

	const success = removeBot(code, botId);

	if (!success) {
		return json({ success: false, error: 'Could not remove bot' });
	}

	const room = getRoom(code);
	return json({ success: true, room });
};
