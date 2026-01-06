# Guía de Despliegue: Render + Aiven (MySQL)

Esta guía te ayudará a desplegar tu proyecto OpenBook utilizando Aiven para la base de datos MySQL y Render para el hosting de la aplicación Node.js.

## Paso 1: Configurar la Base de Datos en Aiven

1.  Crea una cuenta en [Aiven.io](https://aiven.io/).
2.  Crea un nuevo servicio:
    *   **Product**: MySQL
    *   **Cloud**: Selecciona la nube y región que prefieras (ej. Google Cloud, AWS).
    *   **Plan**: Elige un plan (el nivel "Free" si está disponible, o "Startup").
3.  Una vez creado el servicio, ve a la pestaña **Overview** y busca la sección **Connection information**.
4.  Copia la **Service URI** (se ve como `mysql://avnadmin:password@host:port/defaultdb?ssl-mode=REQUIRED`).
    *   *Nota: Aiven requiere conexión SSL por defecto.*

## Paso 2: Preparar el Código en GitHub

1.  Asegúrate de que tus últimos cambios (incluyendo la actualización de la conexión a base de datos que acabamos de hacer) estén subidos a tu repositorio en GitHub.

```bash
git add .
git commit -m "Preparar conexión DB para producción"
git push origin main
```

## Paso 3: Configurar el Servicio Web en Render

1.  Crea una cuenta en [Render.com](https://render.com/).
2.  Haz clic en **New +** y selecciona **Web Service**.
3.  Conecta tu repositorio de GitHub (`OpenBook`).
4.  Render detectará automáticamente la configuración, pero verifica lo siguiente:
    *   **Runtime**: Node
    *   **Build Command**: `npm install`
    *   **Start Command**: `npm start`
5.  Desplázate hacia abajo hasta la sección **Environment Variables** y añade las siguientes variables:

    | Variable | Valor |
    | :--- | :--- |
    | `DATABASE_URL` | Pega la **Service URI** que copiaste de Aiven. |
    | `NODE_ENV` | `production` |
    | `PORT` | `3000` (Opcional, Render lo asigna automáticamente pero es bueno definirlo). |
    | `JWT_SECRET` | Tu clave secreta para JWT (inventa una segura). |

    *Alternativamente, si prefieres usar variables individuales:*
    *   `DB_HOST`: Host de Aiven
    *   `DB_PORT`: Puerto de Aiven
    *   `DB_USER`: Usuario (ej. avnadmin)
    *   `DB_PASSWORD`: Contraseña
    *   `DB_NAME`: Nombre de la base de datos (defaultdb)
    *   `DB_SSL`: `true`

6.  Haz clic en **Create Web Service**.

## Paso 4: Inicialización

Tu aplicación intentará conectarse a la base de datos al iniciar.
*   El código actual verifica si la base de datos está vacía e intenta sincronizar libros desde OpenLibrary.
*   Revisa los **Logs** en Render para ver si la conexión es exitosa (`✅ Connection to MySQL established`).

## Solución de Problemas

*   **Error de conexión SSL**: Si ves errores relacionados con SSL, asegúrate de haber copiado correctamente la URI que incluye `ssl-mode=REQUIRED` o que la variable `DB_SSL` esté en `true`.
*   **Timeouts**: Las bases de datos en la nube gratuitas a veces son lentas en despertar. Render intentará reiniciar si falla.
