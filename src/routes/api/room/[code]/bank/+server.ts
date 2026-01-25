import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { bankPoints } from '$lib/server/rooms';

export const POST: RequestHandler = async ({ params, request }) => {
	try {
		const { playerId } = await request.json();

		if (!playerId) {
			return json({ success: false, error: 'Player ID is required' }, { status: 400 });
		}

		const result = bankPoints(params.code, playerId);

		if (!result.success) {
			return json({ success: false, error: 'Cannot bank points - not your turn' }, { status: 400 });
		}

		return json({ success: true, room: result.room });
	} catch {
		return json({ success: false, error: 'Failed to bank points' }, { status: 500 });
	}
};
