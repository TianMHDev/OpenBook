// Cargar variables de entorno
import "dotenv/config";

// Librerías que necesitamos
import axios from "axios";
import axiosRetry from "axios-retry";
import { pool } from "../database/conexion_db.js";
import { sleep } from "../utils/utils.js";

// Variables que usaremos en todo el código
const BOOKS_API_URL = process.env.BOOKS_API_URL;
const GENRES = process.env.GENRES.split(",").map((g) => g.trim());

// Configurar axios para que reintente cuando falle
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

// Función para crear una descripción del libro
function crearDescripcion(titulo, autor, año) {
    const autorFinal = autor || "Autor desconocido";
    const añoFinal = año || "un año no especificado";
    return `"${titulo}" es una obra escrita por ${autorFinal}, publicada por primera vez en ${añoFinal}.`;
}

// Función para verificar si un libro es válido
function esLibroValido(libro) {
    // El libro debe tener estos datos obligatorios
    if (!libro) return false;
    if (!libro.key) return false;
    if (!libro.title || libro.title.trim() === "") return false;
    if (!libro.authors || libro.authors.length === 0) return false;
    
    return true;
}

// Función para limpiar los datos de un libro
function limpiarDatosLibro(libroSucio) {
    // Si el libro no es válido, devolver null
    if (!esLibroValido(libroSucio)) {
        return null;
    }

    // Extraer y limpiar los datos
    const titulo = libroSucio.title.trim();
    const autor = libroSucio.authors[0].name?.trim() || "Desconocido";
    const año = libroSucio.first_publish_year || null;
    const coverId = libroSucio.cover_id || null;
    
    // Solo crear URL de portada si existe el ID
    let urlPortada = null;
    if (coverId) {
        urlPortada = `https://covers.openlibrary.org/b/id/${coverId}-L.jpg`;
    }

    // Devolver datos limpios
    return {
        clave: libroSucio.key,
        titulo: titulo,
        autor: autor,
        año: año,
        urlPortada: urlPortada,
        descripcion: crearDescripcion(titulo, autor, año)
    };
}

// Función para guardar un género en la base de datos
async function guardarGenero(conexion, nombreGenero) {
    // Insertar o actualizar el género
    await conexion.query(
        `INSERT INTO genres (genre_name) VALUES (?)
        ON DUPLICATE KEY UPDATE genre_name = VALUES(genre_name)`,
        [nombreGenero]
    );

    // Obtener el ID del género
    const [[resultado]] = await conexion.query(
        "SELECT genre_id FROM genres WHERE genre_name = ?",
        [nombreGenero]
    );
    
    return resultado.genre_id;
}

// Función para guardar un libro en la base de datos
async function guardarLibro(conexion, datosLibro) {
    const { clave, titulo, autor, descripcion, urlPortada, año } = datosLibro;
    
    // Insertar o actualizar el libro
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

    // Obtener el ID del libro
    const [[resultado]] = await conexion.query(
        "SELECT book_id FROM books WHERE google_id = ?",
        [clave]
    );
    
    return resultado.book_id;
}

// Función para conectar un libro con un género
async function conectarLibroConGenero(conexion, idLibro, idGenero) {
    await conexion.query(
        "INSERT IGNORE INTO books_genres (book_id, genre_id) VALUES (?, ?)",
        [idLibro, idGenero]
    );
}

// Función principal para obtener libros de la API
async function obtenerLibrosDeAPI(genero, cantidad = 20, desde = 0) {
    console.log(`📚 Obteniendo libros de "${genero}" - cantidad: ${cantidad}, desde: ${desde}`);

    // Crear la URL para la API
    const url = `${BOOKS_API_URL}/subjects/${encodeURIComponent(genero)}.json?limit=${cantidad}&offset=${desde}`;
    
    // Obtener conexión a la base de datos
    const conexion = await pool.getConnection();

    try {
        // Hacer petición a la API
        console.log(`🌐 Consultando API: ${genero}`);
        const respuesta = await axios.get(url, { timeout: 60000 });
        const librosSucios = respuesta.data?.works || [];
        
        if (librosSucios.length === 0) {
            console.log(`⚠️ No hay más libros para "${genero}"`);
            return 0;
        }

        // Empezar transacción de base de datos
        await conexion.beginTransaction();

        // Guardar el género primero
        const idGenero = await guardarGenero(conexion, genero);

        let librosGuardados = 0;
        let librosOmitidos = 0;

        // Procesar cada libro uno por uno
        for (let i = 0; i < librosSucios.length; i++) {
            const libroSucio = librosSucios[i];
            
            try {
                // Limpiar los datos del libro
                const libroLimpio = limpiarDatosLibro(libroSucio);
                
                // Si el libro no es válido, saltarlo
                if (!libroLimpio) {
                    librosOmitidos++;
                    console.log(`⚠️ Libro omitido: ${libroSucio?.title || 'Sin título'} (datos incompletos)`);
                    continue;
                }

                // Guardar el libro en la base de datos
                const idLibro = await guardarLibro(conexion, libroLimpio);
                
                // Conectar el libro con el género
                await conectarLibroConGenero(conexion, idLibro, idGenero);
                
                librosGuardados++;
                
                // Pausa pequeña cada 5 libros para no saturar la BD
                if (librosGuardados % 5 === 0) {
                    await sleep(200);
                }
                
            } catch (errorLibro) {
                librosOmitidos++;
                console.log(`❌ Error con libro "${libroSucio?.title || 'Sin título'}": ${errorLibro.message}`);
                // Continuar con el siguiente libro
                continue;
            }
        }

        // Confirmar todos los cambios
        await conexion.commit();
        
        console.log(`✅ "${genero}" completado: ${librosGuardados} guardados, ${librosOmitidos} omitidos`);
        return librosGuardados;
        
    } catch (error) {
        // Si algo falla, deshacer todos los cambios
        await conexion.rollback();
        console.log(`❌ Error con género "${genero}": ${error.message}`);
        throw error;
    } finally {
        // Siempre liberar la conexión
        conexion.release();
    }
}

// Función para obtener todos los libros de un género (con paginación)
async function obtenerTodosLosLibros(genero, totalDeseado = 100) {
    console.log(`🎯 Empezando a sincronizar género: "${genero}" (meta: ${totalDeseado} libros)`);
    
    let desde = 0; // Desde qué libro empezar
    let totalProcesados = 0; // Cuántos libros hemos procesado
    let erroresConsecutivos = 0; // Cuántos errores seguidos hemos tenido
    let respuestasVacias = 0; // Cuántas veces no encontramos libros
    
    // Seguir hasta que tengamos suficientes libros o muchos errores
    while (totalProcesados < totalDeseado && erroresConsecutivos < 3) {
        try {
            // Obtener un lote de libros
            const librosProcesados = await obtenerLibrosDeAPI(genero, 20, desde);
            
            // Si no encontramos libros, tal vez ya no hay más
            if (librosProcesados === 0) {
                respuestasVacias++;
                if (respuestasVacias >= 3) {
                    console.log(`⚠️ No hay más libros disponibles para "${genero}"`);
                    break;
                }
            } else {
                respuestasVacias = 0; // Resetear contador si encontramos libros
            }
            
            // Actualizar nuestros contadores
            totalProcesados += librosProcesados;
            desde += 20; // Para la siguiente página
            erroresConsecutivos = 0; // Resetear errores porque funcionó
            
            // Pausa para no saturar la API
            await sleep(1000);
            
            console.log(`📈 Progreso "${genero}": ${totalProcesados}/${totalDeseado} libros`);
            
        } catch (error) {
            erroresConsecutivos++;
            console.log(`❌ Error en lote "${genero}" (intento ${erroresConsecutivos}/3): ${error.message}`);
            
            // Pausa más larga cuando hay error
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

// Función principal para procesar todos los géneros
async function sincronizarTodosLosGeneros() {
    console.log(`🚀 Empezando sincronización de ${GENRES.length} géneros`);
    
    const tiempoInicio = Date.now();
    let totalLibrosProcesados = 0;
    
    // Procesar géneros de a 2 para no saturar la API
    for (let i = 0; i < GENRES.length; i += 2) {
        // Tomar hasta 2 géneros
        const loteGeneros = GENRES.slice(i, i + 2);
        console.log(`\n🔄 Procesando lote: [${loteGeneros.join(", ")}]`);
        
        try {
            // Procesar estos géneros al mismo tiempo
            const promesas = loteGeneros.map(genero => 
                obtenerTodosLosLibros(genero, 100)
            );
            
            const resultados = await Promise.all(promesas);
            
            // Sumar cuántos libros procesamos en este lote
            const librosDeLote = resultados.reduce((suma, cantidad) => suma + cantidad, 0);
            totalLibrosProcesados += librosDeLote;
            
            console.log(`✅ Lote completado: ${librosDeLote} libros`);
            
            // Pausa entre lotes para no saturar la API
            if (i + 2 < GENRES.length) {
                console.log(`⏳ Esperando antes del siguiente lote...`);
                await sleep(3000);
            }
            
        } catch (error) {
            console.log(`❌ Error en el lote: ${error.message}`);
        }
    }
    
    // Mostrar estadísticas finales
    const tiempoTotal = Math.round((Date.now() - tiempoInicio) / 1000);
    console.log(`\n🎉 ¡SINCRONIZACIÓN COMPLETADA!`);
    console.log(`📊 Total de libros procesados: ${totalLibrosProcesados}`);
    console.log(`⏱️ Tiempo total: ${tiempoTotal} segundos`);
    console.log(`📈 Velocidad promedio: ${(totalLibrosProcesados / tiempoTotal).toFixed(1)} libros por segundo`);
}

// Exportar la función principal para poder llamarla desde otros archivos
export { sincronizarTodosLosGeneros };