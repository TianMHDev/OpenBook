# Backend de OpenLibro

Este repositorio contiene el código fuente del backend para **OpenLibro**, una plataforma de gestión y descubrimiento de libros. La API está construida con Node.js y Express, y se conecta a una base de datos MySQL para la persistencia de datos.

## 🚀 Características Principales

-   **Autenticación de Usuarios**: Sistema de registro e inicio de sesión seguro utilizando JSON Web Tokens (JWT) y hashing de contraseñas con Bcrypt.
-   **Gestión de Libros**: API para buscar, filtrar y obtener detalles de libros.
-   **Sincronización con OpenLibrary**: Un script que puebla la base de datos con información de libros y géneros desde la API de OpenLibrary.
-   **Interacciones de Usuario**: Los usuarios autenticados pueden marcar libros como `favoritos` y darles `like`.
-   **Perfiles y Estadísticas**: Endpoints para que los usuarios vean su perfil y para obtener estadísticas generales de la plataforma (libros más populares, total de usuarios, etc.).
-   **Servidor de Archivos Estáticos**: El backend también sirve el frontend de la aplicación.

## 🛠️ Tecnologías Utilizadas

-   **Backend**: Node.js, Express.js
-   **Base de Datos**: MySQL
-   **Autenticación**: JSON Web Tokens (`jsonwebtoken`)
-   **Seguridad**: `bcrypt` para hashing de contraseñas
-   **Gestión de Entorno**: `dotenv`
-   **Cliente HTTP**: `axios` para consumir APIs externas
-   **CORS**: `cors` para habilitar peticiones desde otros orígenes

## 🗄️ Base de Datos

El esquema completo de la base de datos se encuentra en el archivo `public/script.sql`. Este script creará todas las tablas, relaciones y datos iniciales necesarios.

**Tablas principales**: `users`, `roles`, `books`, `genres`, `institutions`.
**Tablas de relaciones e interacciones**: `books_genres`, `book_metrics`, `users_books`, `books_reactions`.

## ⚙️ Guía de Instalación y Puesta en Marcha

Sigue estos pasos para levantar el proyecto en tu entorno local.

### Prerrequisitos

-   Node.js (v18 o superior)
-   NPM
-   Un servidor de MySQL en funcionamiento

### Pasos

1.  **Clonar el repositorio:**
    ```bash
    git clone <URL_DEL_REPOSITORIO>
    cd <NOMBRE_DEL_DIRECTORIO>
    ```

2.  **Instalar dependencias:**
    ```bash
    npm install
    ```

3.  **Configurar la base de datos:**
    -   Abre tu cliente de MySQL.
    -   Ejecuta el script `public/script.sql` para crear la base de datos `openbook` y todas sus tablas.
    ```sql
    -- Ejemplo usando el cliente de línea de comandos de mysql
    mysql -u tu_usuario -p < public/script.sql
    ```

4.  **Configurar las variables de entorno:**
    -   Crea una copia del archivo `.env.example` que he creado en la raíz del proyecto y renómbrala a `.env`.
    ```bash
    cp .env.example .env
    ```
    -   Abre el archivo `.env` y rellena los valores correspondientes, especialmente los de la base de datos (`DB_USER`, `DB_PASSWORD`) y el `JWT_SECRET`.

5.  **Iniciar el servidor:**
    ```bash
    npm start
    ```
    El servidor debería estar corriendo en `http://localhost:3000` (o el puerto que hayas configurado en tu archivo `.env`).

## 📡 Endpoints de la API

Aquí hay un resumen de los endpoints más importantes.

| Verbo  | Ruta                        | Descripción                                     | Autenticación |
| :----- | :-------------------------- | :---------------------------------------------- | :------------ |
| `GET`  | `/api/books`                | Obtiene una lista de libros. Acepta filtros.    | No            |
| `GET`  | `/api/books/:id`            | Obtiene los detalles de un libro específico.    | No            |
| `GET`  | `/api/genres`               | Obtiene la lista de todos los géneros.          | No            |
| `GET`  | `/api/stats`                | Obtiene estadísticas generales de la plataforma.| No            |
| `POST` | `/api/auth/register`        | Registra un nuevo usuario.                      | No            |
| `POST` | `/api/auth/login`           | Inicia sesión y devuelve un JWT.                | No            |
| `GET`  | `/api/user/profile`         | Obtiene el perfil del usuario autenticado.      | **Sí**        |
| `POST` | `/api/books/:id/like`       | Da/quita un "like" a un libro.                  | **Sí**        |
| `POST` | `/api/books/:id/favorite`   | Añade/quita un libro de favoritos.              | **Sí**        |
| `GET`  | `/api/user/favorites`       | Obtiene la lista de libros favoritos del usuario.| **Sí**        |

## 🚧 Sugerencias y Próximos Pasos

Este es un backend funcional, pero aquí hay algunas áreas clave para mejorarlo y hacerlo más robusto y escalable:

-   **🧪 Implementar Pruebas (Testing)**:
    -   **Pruebas Unitarias**: Para la lógica de negocio en los servicios (ej. `auth.js`).
    -   **Pruebas de Integración**: Para los endpoints de la API, verificando que las rutas, middlewares y controladores funcionan juntos correctamente.
    -   *Herramientas sugeridas: Jest, Supertest.*

-   **📄 Documentación de la API**:
    -   Generar documentación interactiva y formal de la API para facilitar su consumo.
    -   *Herramientas sugeridas: Swagger, OpenAPI, Postman.*

-   **🛡️ Validación de Entradas (Input Validation)**:
    -   Añadir una capa de validación para los datos que llegan en `req.body`, `req.params` y `req.query` para prevenir datos maliciosos o malformados.
    -   *Librerías sugeridas: `joi`, `express-validator`.*

-   **🐳 Contenerización**:
    -   Crear un `Dockerfile` y un `docker-compose.yml` para facilitar el despliegue y la configuración del entorno de desarrollo, encapsulando la aplicación y la base de datos.

-   **🔄 Pipeline de CI/CD**:
    -   Configurar un flujo de trabajo de Integración Continua y Despliegue Continuo para automatizar las pruebas y los despliegues.
    -   *Plataformas sugeridas: GitHub Actions, GitLab CI.*
