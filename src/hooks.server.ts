import type { Handle } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
	const response = await resolve(event);

	// Prevent Cloudflare (and browsers) from caching HTML pages
	// This ensures users always get fresh HTML that references the correct JS chunks
	if (response.headers.get('content-type')?.includes('text/html')) {
		response.headers.set('Cache-Control', 'no-store, must-revalidate');
	}

	return response;
};
