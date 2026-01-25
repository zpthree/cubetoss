import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { rollDice } from '$lib/server/rooms';

export const POST: RequestHandler = async ({ params, request }) => {
	try {
		const { playerId } = await request.json();

		if (!playerId) {
			return json({ success: false, error: 'Player ID is required' }, { status: 400 });
		}

		const result = rollDice(params.code, playerId);

		if (!result.success) {
			return json(
				{ success: false, error: 'Cannot roll dice - not your turn or game not in progress' },
				{ status: 400 }
			);
		}

		return json({ success: true, busted: result.busted, room: result.room });
	} catch {
		return json({ success: false, error: 'Failed to roll dice' }, { status: 500 });
	}
};
