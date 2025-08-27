# Mi-proyecto (login + register básico)

Proyecto de ejemplo **para un programador principiante**:
- Node.js + Express
- MySQL (mysql2)
- Sesiones en memoria con express-session
- Rutas modularizadas (routes/, middleware/, db/)

## Pasos rápidos
1. Copia el proyecto.
2. Instala dependencias:
   ```
   npm install
   ```
3. Crea la tabla en tu MySQL:
   ```sql
   CREATE TABLE users (
     id INT AUTO_INCREMENT PRIMARY KEY,
     full_name VARCHAR(100) NOT NULL UNIQUE,
     password VARCHAR(100) NOT NULL
   );
   ```
4. Configura variables de entorno (opcional) o edita `db/connection.js`:
   - `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`
5. Ejecuta:
   ```
   npm start
   ```
6. Endpoints:
    - `POST /auth/register` — Registro de estudiantes. Solo acepta correos que terminen en `@estudiante.edu` y asigna automáticamente el rol de estudiante. Ejemplo de body:
       ```json
       {
          "full_name": "Nombre Estudiante",
          "national_id": "12345678",
          "email": "nombre@estudiante.edu",
          "password": "tu_contraseña",
          "institution_id": 1
       }
       ```
    - `POST /auth/login` — Login de estudiantes. Solo permite correos `@estudiante.edu`.
       ```json
       {
          "email": "nombre@estudiante.edu",
          "password": "tu_contraseña"
       }
       ```
    - `POST /auth/register-teacher` — Registro de maestros. Solo acepta correos que terminen en `@maestro.edu` y asigna automáticamente el rol de maestro. Ejemplo de body:
       ```json
       {
          "full_name": "Nombre Maestro",
          "national_id": "87654321",
          "email": "nombre@maestro.edu",
          "password": "tu_contraseña",
          "institution_id": 1
       }
       ```
    - `POST /auth/login-teacher` — Login de maestros. Solo permite correos `@maestro.edu` y valida que el usuario tenga el rol maestro.
       ```json
       {
          "email": "nombre@maestro.edu",
          "password": "tu_contraseña"
       }
       ```
    - `POST /auth/logout` — Cierra la sesión.
    - `GET /perfil` — Ruta protegida, muestra información del usuario autenticado.
