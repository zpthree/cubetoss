import type { RequestHandler } from './$types';
import { subscribeToRoom, getRoom } from '$lib/server/rooms';

export const GET: RequestHandler = async ({ params }) => {
	const roomCode = params.code.toUpperCase();
	const room = getRoom(roomCode);

	if (!room) {
		return new Response('Room not found', { status: 404 });
	}

	let unsubscribe: (() => void) | null = null;
	let heartbeatInterval: ReturnType<typeof setInterval> | null = null;

	const stream = new ReadableStream({
		start(controller) {
			const encoder = new TextEncoder();

			const send = (event: string, data: unknown) => {
				try {
					const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
					controller.enqueue(encoder.encode(message));
				} catch {
					// Stream closed
					cleanup();
				}
			};

			const cleanup = () => {
				if (heartbeatInterval) clearInterval(heartbeatInterval);
				if (unsubscribe) unsubscribe();
			};

			// Send initial room state immediately
			send('state-update', { room: getRoom(roomCode) });

			// Subscribe to room events
			unsubscribe = subscribeToRoom(roomCode, (event, data) => {
				send(event, data);
			});

			// Keep connection alive with heartbeat every 15 seconds
			heartbeatInterval = setInterval(() => {
				try {
					controller.enqueue(encoder.encode(': heartbeat\n\n'));
				} catch {
					cleanup();
				}
			}, 15000);
		},
		cancel() {
			if (heartbeatInterval) clearInterval(heartbeatInterval);
			if (unsubscribe) unsubscribe();
		}
	});

	return new Response(stream, {
		headers: {
			'Content-Type': 'text/event-stream',
			'Cache-Control': 'no-cache, no-store, must-revalidate',
			Connection: 'keep-alive',
			'X-Accel-Buffering': 'no'
		}
	});
};
