# Backend de OpenBook

¡Bienvenido al backend de OpenLibro! Este es el motor que da vida a la aplicación, una API RESTful construida con Node.js y Express que gestiona una completa biblioteca de libros, usuarios, interacciones y mucho más.

## ¿Qué hace este backend?

El backend de OpenLibro es responsable de:

-   **Servir datos de libros**: Proporciona endpoints para buscar, filtrar y consultar información detallada de los libros.
-   **Gestionar usuarios y autenticación**: Maneja el registro y login de usuarios a través de JSON Web Tokens (JWT).
-   **Procesar interacciones**: Registra las acciones de los usuarios, como "likes" y la adición de libros a "favoritos".
-   **Sincronizar datos externos**: Incluye un script especializado para poblar la base de datos local a partir de la [Open Library API](https://openlibrary.org/developers/api), asegurando un catálogo de libros rico y variado.
-   **Ofrecer estadísticas**: Calcula y expone métricas clave, como los libros más populares, los géneros con más títulos y estadísticas generales de la plataforma.

## Tecnologías Utilizadas

Este proyecto está construido con un conjunto de tecnologías modernas y robustas de JavaScript:

-   **Runtime**: Node.js
-   **Framework del Servidor**: Express.js
-   **Base de Datos**: MySQL
-   **Driver de Base de Datos**: `mysql2`
-   **Autenticación**: JSON Web Tokens (`jsonwebtoken`) para sesiones y `bcrypt` para el hashing seguro de contraseñas.
-   **Cliente HTTP**: `axios` y `axios-retry` para realizar peticiones fiables a APIs externas.
-   **Middleware**: `cors` para habilitar peticiones desde otros dominios y `dotenv` para una gestión segura de las variables de entorno.
-   **Módulos**: El proyecto utiliza `ESM` (ECMAScript Modules) para la gestión de módulos (`import`/`export`).

---

## Guía de Instalación y Puesta en Marcha

Sigue estos pasos para tener una copia del proyecto funcionando en tu máquina local.

### 1. Prerrequisitos

Asegúrate de tener instalado lo siguiente:
*   [Node.js](https://nodejs.org/) (versión 14 o superior)
*   [NPM](https://www.npmjs.com/) (normalmente se instala con Node.js)
*   Un servidor de [MySQL](https://www.mysql.com/) corriendo en tu máquina o en un contenedor Docker.

### 2. Clonar el Repositorio

```bash
git clone <URL_DEL_REPOSITORIO>
cd <NOMBRE_DEL_DIRECTORIO>
```

### 3. Instalar Dependencias

Instala todas las librerías y paquetes necesarios definidos en `package.json`.

```bash
npm install
```

### 4. Configurar la Base de Datos

El proyecto necesita una base de datos MySQL para funcionar.
1.  Conéctate a tu servidor MySQL.
2.  Crea la base de datos con el nombre `openbook`.
3.  Ejecuta el script `public/script.sql` en tu cliente de MySQL para crear todas las tablas y relaciones necesarias.

```sql
-- Ejemplo de cómo ejecutar el script desde la línea de comandos
mysql -u tu_usuario -p openbook < public/script.sql
```

### 5. Configurar Variables de Entorno

Crea un archivo llamado `.env` en la raíz del proyecto. Este archivo contendrá las credenciales y configuraciones sensibles. Copia y pega el siguiente contenido, reemplazando los valores con tu configuración local.

```env
# Configuración del Servidor
PORT=3000

# Configuración de la Base de Datos
DB_HOST=localhost
DB_USER=root
DB_PASS=tu_contraseña_de_mysql
DB_NAME=openbook

# Secret para JSON Web Token (JWT)
# Puedes generar una cadena segura aquí: https://www.grc.com/passwords.htm
JWT_SECRET=tu_clave_secreta_muy_larga_y_segura

# Configuración del script de sincronización con OpenLibrary
BOOKS_API_URL=https://openlibrary.org
GENRES=love, classic, fantasy, science_fiction, thriller, horror, history, biography
```

### 6. Poblar la Base de Datos (Paso Crucial)

La base de datos está vacía después de la instalación. Para llenarla con libros, debes ejecutar el script de sincronización. Este script se conectará a la API de OpenLibrary, descargará información sobre libros de los géneros definidos en la variable `GENRES` y los guardará en tu base de datos.

**Nota**: Este proceso puede tardar varios minutos, ya que realiza múltiples peticiones a la API externa con pausas para no saturarla.

```bash
node api/sync_openlibrary.js
```

---

## Cómo Ejecutar el Servidor

Una vez que la configuración esté completa y la base de datos poblada, puedes iniciar el servidor de la API.

```bash
npm start
```

Si todo ha ido bien, verás un mensaje en la consola indicando que el servidor está corriendo en `http://localhost:3000`.

---

## Endpoints de la API

A continuación se listan los principales endpoints disponibles.

### Endpoints Públicos

| Método | Ruta                      | Descripción                                                              |
| :----- | :------------------------ | :----------------------------------------------------------------------- |
| `GET`  | `/api/books`              | Obtiene una lista de libros. Acepta query params para paginación y filtros (`page`, `limit`, `search`, `genre`, `year`). |
| `GET`  | `/api/books/:id`          | Obtiene la información detallada de un libro específico y aumenta su contador de vistas. |
| `GET`  | `/api/genres`             | Devuelve una lista de todos los géneros que tienen libros asociados.      |
| `GET`  | `/api/stats`              | Proporciona estadísticas generales de la plataforma (total de libros, usuarios, libros populares, etc.). |

### Endpoints de Autenticación

_**Nota**: La implementación de estos endpoints no fue encontrada en los archivos analizados, pero el servidor espera que existan._

| Método | Ruta                 | Descripción                  |
| :----- | :------------------- | :--------------------------- |
| `POST` | `/api/auth/register` | Para registrar un nuevo usuario. |
| `POST` | `/api/auth/login`    | Para iniciar sesión y obtener un token JWT. |

### Endpoints Protegidos (Requieren Token JWT)

Para acceder a estos endpoints, se debe incluir el token en la cabecera de la petición: `Authorization: Bearer <tu_token_jwt>`.

| Método | Ruta                         | Descripción                                      |
| :----- | :--------------------------- | :----------------------------------------------- |
| `POST` | `/api/books/:id/like`        | Da "like" o quita el "like" a un libro.          |
| `POST` | `/api/books/:id/favorite`    | Agrega o quita un libro de la lista de favoritos del usuario. |
| `GET`  | `/api/user/favorites`        | Obtiene la lista de libros favoritos del usuario autenticado. |
| `GET`  | `/api/user/profile`          | Obtiene la información del perfil del usuario autenticado, incluyendo sus estadísticas. |
