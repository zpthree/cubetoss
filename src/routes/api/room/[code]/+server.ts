import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getRoom } from '$lib/server/rooms';

export const GET: RequestHandler = async ({ params }) => {
	const room = getRoom(params.code);

	if (!room) {
		return json({ success: false, error: 'Room not found' }, { status: 404 });
	}

	return json({ success: true, room });
};
