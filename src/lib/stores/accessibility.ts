import { writable } from 'svelte/store';
import { browser } from '$app/environment';

// Create a writable store for reduced effects
const storedReducedEffects = browser ? localStorage.getItem('reducedEffects') === 'true' : false;
export const reducedEffects = writable(storedReducedEffects);

// Create a writable store for high contrast mode
const storedHighContrast = browser ? localStorage.getItem('highContrast') === 'true' : false;
export const highContrast = writable(storedHighContrast);

// Subscribe to changes and persist to localStorage
if (browser) {
	reducedEffects.subscribe((value) => {
		localStorage.setItem('reducedEffects', String(value));
	});
	highContrast.subscribe((value) => {
		localStorage.setItem('highContrast', String(value));
	});
}
