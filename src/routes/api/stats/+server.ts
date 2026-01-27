import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getTotalPlayerCount } from '$lib/server/rooms';

export const GET: RequestHandler = async () => {
	const totalPlayers = getTotalPlayerCount();
	return json({ totalPlayers });
};
