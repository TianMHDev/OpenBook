// utils.js

/**
 * Pausa la ejecución por la cantidad de milisegundos indicada.
 * Sirve para evitar saturar la API de Open Library con muchas peticiones.
 * @param {number} ms - Milisegundos a esperar
 * @returns {Promise<void>}
 */
export function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
