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
   - `POST /auth/register` { username, password }
   - `POST /auth/login` { username, password }
   - `POST /auth/logout`
   - `GET /perfil` (protegido)
