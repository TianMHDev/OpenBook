// utils.js

/**
 * Pauses execution for the specified number of milliseconds.
* This is used to avoid overloading the Open Library API with multiple requests.
 * @param {number} ms - Milliseconds to wait
 * @returns {Promise<void>}
 */
export function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
