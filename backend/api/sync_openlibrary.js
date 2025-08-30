// load environment variables
import "dotenv/config";

// libraries we need
import axios from "axios";
import axiosRetry from "axios-retry";
import { pool } from "../database/conexion_db.js";
import { sleep } from "../utils/utils.js";

// variables that we will use throughout the code
const BOOKS_API_URL = process.env.BOOKS_API_URL;
const GENRES = process.env.GENRES.split(",").map((g) => g.trim());

// Configure Axios to retry on failure
axiosRetry(axios, {
    retries: 3,
    retryDelay: axiosRetry.exponentialDelay,
    retryCondition: (error) => {
        return (
            error.code === "EAI_AGAIN" ||
            error.code === "ECONNABORTED" ||
            axiosRetry.isNetworkError(error)
        );
    },
});

// Function to create a book description
function crearDescripcion(titulo, autor, año) {
    const autorFinal = autor || "Autor desconocido";
    const añoFinal = año || "un año no especificado";
    return `"${titulo}" es una obra escrita por ${autorFinal}, publicada por primera vez en ${añoFinal}.`;
}

// Function to check if a book is valid
function esLibroValido(libro) {
    // The book must have these mandatory data
    if (!libro) return false;
    if (!libro.key) return false;
    if (!libro.title || libro.title.trim() === "") return false;
    if (!libro.authors || libro.authors.length === 0) return false;
    
    return true;
}

// Function to clean the data of a workbook
function limpiarDatosLibro(libroSucio) {
    // If the book is not valid, return null
    if (!esLibroValido(libroSucio)) {
        return null;
    }

    // Extract and clean the data
    const titulo = libroSucio.title.trim();
    const autor = libroSucio.authors[0].name?.trim() || "Desconocido";
    const año = libroSucio.first_publish_year || null;
    const coverId = libroSucio.cover_id || null;
    
    // Only create cover URL if the ID exists
    let urlPortada = null;
    if (coverId) {
        urlPortada = `https://covers.openlibrary.org/b/id/${coverId}-L.jpg`;
    }

    // Return clean data
    return {
        clave: libroSucio.key,
        titulo: titulo,
        autor: autor,
        año: año,
        urlPortada: urlPortada,
        descripcion: crearDescripcion(titulo, autor, año)
    };
}

// Function to save a genre in the database
async function guardarGenero(conexion, nombreGenero) {
    // Insert or update gender
    await conexion.query(
        `INSERT INTO genres (genre_name) VALUES (?)
        ON DUPLICATE KEY UPDATE genre_name = VALUES(genre_name)`,
        [nombreGenero]
    );

    // Get the genre ID
    const [[resultado]] = await conexion.query(
        "SELECT genre_id FROM genres WHERE genre_name = ?",
        [nombreGenero]
    );
    
    return resultado.genre_id;
}

// Function to save a book in the database
async function guardarLibro(conexion, datosLibro) {
    const { clave, titulo, autor, descripcion, urlPortada, año } = datosLibro;
    
    // Insert or update the workbook
    await conexion.query(
        `INSERT INTO books (google_id, title, author, description, cover_url, published_year, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())
        ON DUPLICATE KEY UPDATE 
            title = VALUES(title), 
            author = VALUES(author), 
            description = VALUES(description),
            cover_url = VALUES(cover_url), 
            published_year = VALUES(published_year), 
            updated_at = NOW()`,
        [clave, titulo, autor, descripcion, urlPortada, año]
    );

    // Get the book ID
    const [[resultado]] = await conexion.query(
        "SELECT book_id FROM books WHERE google_id = ?",
        [clave]
    );
    
    return resultado.book_id;
}

// Function to connect a book with a genre
async function conectarLibroConGenero(conexion, idLibro, idGenero) {
    await conexion.query(
        "INSERT IGNORE INTO books_genres (book_id, genre_id) VALUES (?, ?)",
        [idLibro, idGenero]
    );
}

// Main function to get books from the API
async function obtenerLibrosDeAPI(genero, cantidad = 20, desde = 0) {
    console.log(`📚 Obteniendo libros de "${genero}" - cantidad: ${cantidad}, desde: ${desde}`);

    // Create the URL for the API
    const url = `${BOOKS_API_URL}/subjects/${encodeURIComponent(genero)}.json?limit=${cantidad}&offset=${desde}`;
    
    // Get connection to the database
    const conexion = await pool.getConnection();

    try {
        // Make a request to the API
        console.log(`🌐 Consultando API: ${genero}`);
        const respuesta = await axios.get(url, { timeout: 60000 });
        const librosSucios = respuesta.data?.works || [];
        
        if (librosSucios.length === 0) {
            console.log(`⚠️ No hay más libros para "${genero}"`);
            return 0;
        }

        // Start database transaction
        await conexion.beginTransaction();

        // Save the genre first
        const idGenero = await guardarGenero(conexion, genero);

        let librosGuardados = 0;
        let librosOmitidos = 0;

        // Process each book one by one
        for (let i = 0; i < librosSucios.length; i++) {
            const libroSucio = librosSucios[i];
            
            try {
                // Clear workbook data
                const libroLimpio = limpiarDatosLibro(libroSucio);
                
                // If the book is not valid, skip it.
                if (!libroLimpio) {
                    librosOmitidos++;
                    console.log(`⚠️ Libro omitido: ${libroSucio?.title || 'Sin título'} (datos incompletos)`);
                    continue;
                }

                // Save the book to the database
                const idLibro = await guardarLibro(conexion, libroLimpio);
                
                // Connecting the book with the genre
                await conectarLibroConGenero(conexion, idLibro, idGenero);
                
                librosGuardados++;
                
                // Take a short break every 5 books to avoid overloading the database.
                if (librosGuardados % 5 === 0) {
                    await sleep(200);
                }
                
            } catch (errorLibro) {
                librosOmitidos++;
                console.log(`❌ Error con libro "${libroSucio?.title || 'Sin título'}": ${errorLibro.message}`);
                // Continue with the next book
                continue;
            }
        }

        // Confirm all changes
        await conexion.commit();
        
        console.log(`✅ "${genero}" completado: ${librosGuardados} guardados, ${librosOmitidos} omitidos`);
        return librosGuardados;
        
    } catch (error) {
        // If something goes wrong, undo all changes
        await conexion.rollback();
        console.log(`❌ Error con género "${genero}": ${error.message}`);
        throw error;
    } finally {
        // Always release the connection
        conexion.release();
    }
}

// Function to get all books of a genre (with pagination)
async function obtenerTodosLosLibros(genero, totalDeseado = 100) {
    console.log(`🎯 Empezando a sincronizar género: "${genero}" (meta: ${totalDeseado} libros)`);
    
    let desde = 0; // Which book to start from
    let totalProcesados = 0; // How many books have we processed?
    let erroresConsecutivos = 0; // How many mistakes in a row have we had?
    let respuestasVacias = 0; // How many times do we not find books?
    
    // Continue until we have enough books or many errors.
    while (totalProcesados < totalDeseado && erroresConsecutivos < 3) {
        try {
            // Get a batch of books
            const librosProcesados = await obtenerLibrosDeAPI(genero, 20, desde);
            
            // If we don't find books, maybe there are no more.
            if (librosProcesados === 0) {
                respuestasVacias++;
                if (respuestasVacias >= 3) {
                    console.log(`⚠️ No hay más libros disponibles para "${genero}"`);
                    break;
                }
            } else {
                respuestasVacias = 0; // Reset counter if we find books
            }
            
            // Update our counters
            totalProcesados += librosProcesados;
            desde += 20; // For the next page
            erroresConsecutivos = 0; // Reset errors because it worked
            
            // Pause to avoid saturating the API
            await sleep(1000);
            
            console.log(`📈 Progreso "${genero}": ${totalProcesados}/${totalDeseado} libros`);
            
        } catch (error) {
            erroresConsecutivos++;
            console.log(`❌ Error en lote "${genero}" (intento ${erroresConsecutivos}/3): ${error.message}`);
            
            // Longer pause when there is an error
            await sleep(3000);
        }
    }
    
    if (erroresConsecutivos >= 3) {
        console.log(`💥 "${genero}" FALLÓ después de 3 intentos`);
    } else {
        console.log(`🏁 "${genero}" COMPLETADO: ${totalProcesados} libros procesados`);
    }
    
    return totalProcesados;
}

// Main function to process all genres
async function sincronizarTodosLosGeneros() {
    console.log(`🚀 Empezando sincronización de ${GENRES.length} géneros`);
    
    const tiempoInicio = Date.now();
    let totalLibrosProcesados = 0;
    
    // Process genres in batches to avoid overloading the API
    for (let i = 0; i < GENRES.length; i += 2) {
        // Take up to 2 genres
        const loteGeneros = GENRES.slice(i, i + 2);
        console.log(`\n🔄 Procesando lote: [${loteGeneros.join(", ")}]`);
        
        try {
            // Process these genres at the same time
            const promesas = loteGeneros.map(genero => 
                obtenerTodosLosLibros(genero, 100)
            );
            
            const resultados = await Promise.all(promesas);
            
            // Add up how many books we processed in this batch
            const librosDeLote = resultados.reduce((suma, cantidad) => suma + cantidad, 0);
            totalLibrosProcesados += librosDeLote;
            
            console.log(`✅ Lote completado: ${librosDeLote} libros`);
            
            // Pause between batches to avoid saturating the API
            if (i + 2 < GENRES.length) {
                console.log(`⏳ Esperando antes del siguiente lote...`);
                await sleep(3000);
            }
            
        } catch (error) {
            console.log(`❌ Error en el lote: ${error.message}`);
        }
    }
    
    // Show final statistics
    const tiempoTotal = Math.round((Date.now() - tiempoInicio) / 1000);
    console.log(`\n🎉 ¡SINCRONIZACIÓN COMPLETADA!`);
    console.log(`📊 Total de libros procesados: ${totalLibrosProcesados}`);
    console.log(`⏱️ Tiempo total: ${tiempoTotal} segundos`);
    console.log(`📈 Velocidad promedio: ${(totalLibrosProcesados / tiempoTotal).toFixed(1)} libros por segundo`);
}

// Export the main function so that it can be called from other files
export { sincronizarTodosLosGeneros };