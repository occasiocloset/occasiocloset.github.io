# Occasio · app web con cuentas

Web app real: cada usuaria crea su cuenta, sube su ropa, invita a sus amigas, ve sus armarios, se piden prendas prestadas, planifica looks y los publica.

- **Datos, cuentas y fotos:** Supabase (gratis para empezar).
- **La web:** archivos estáticos (HTML, CSS y JS sin compilar). Se publica en cualquier hosting estático, por ejemplo Netlify.

## Puesta en marcha (unos 20 minutos, una sola vez)

### 1. Crear el proyecto en Supabase
1. Entra en https://supabase.com y crea una cuenta.
2. **New project** → nombre `occasio`, una contraseña de base de datos (guárdala) y región **Central EU (Frankfurt)**.
3. Cuando esté listo, abre **SQL Editor** → **New query**, pega todo `supabase/esquema.sql` y pulsa **Run**. Tiene que terminar con «Success».

### 2. Conectar la web
1. En Supabase: **Project Settings → API**. Copia la **Project URL** y la clave **anon public**.
2. Pégalas en `config.js` (`supabaseUrl` y `supabaseAnonKey`).

La clave «anon» es pública por diseño. Lo que protege los datos son las reglas de `esquema.sql`. **Nunca** pongas en la web la clave `service_role`.

### 3. Publicar la web
1. Entra en https://app.netlify.com/drop y arrastra la carpeta `occasio-web`.
2. Netlify te da una dirección del tipo `https://nombre.netlify.app`. Puedes cambiarla en *Site configuration*.

### 4. Decirle a Supabase cuál es tu web
En Supabase: **Authentication → URL Configuration**:
- **Site URL:** tu dirección de Netlify (por ejemplo `https://occasio.netlify.app`).
- **Redirect URLs:** añade la misma dirección.

Sin esto, los enlaces de confirmación y de «he olvidado mi contraseña» no llevan a tu web.

### 5. Correos (importante antes de lanzar)
Supabase envía los correos de confirmación y de contraseña con un servidor de pruebas **limitado a muy pocos correos por hora**. Para usuarias reales:
- **Opción A (recomendada):** conecta un servicio de correo en **Authentication → Emails → SMTP Settings**. Por ejemplo, Resend o Brevo tienen planes gratuitos.
- **Opción B:** desactiva **Confirm email** en **Authentication → Sign In / Providers → Email**. Las usuarias entran nada más registrarse. Solo «he olvidado mi contraseña» enviará correos.

Los textos de los correos se cambian en **Authentication → Emails → Templates**. Vienen en inglés: conviene traducirlos.

### 6. Política de privacidad
Rellena los huecos entre corchetes de `privacidad.html` (nombre, NIF, dirección, correo, fecha y hosting). Revísala con alguien de legal antes de lanzar.

## Probarla
1. Crea una cuenta desde la web.
2. En otro navegador o en el móvil, crea una segunda cuenta.
3. Con la primera: *Perfil → Invitar*. Abre ese enlace con la segunda cuenta y acepta la invitación.
4. Ya podéis ver vuestros armarios, pediros prendas (la otra recibe el aviso al momento), crear looks, apuntarlos en el calendario y publicarlos.

## Cambios después de publicar
Edita los archivos y vuelve a arrastrar la carpeta a Netlify (*Deploys → arrastra aquí*). Si cambias la base de datos, el SQL nuevo se ejecuta en el SQL Editor.

## Archivos
| Archivo | Qué es |
| --- | --- |
| `index.html` | Estructura de la app |
| `config.js` | Conexión con Supabase |
| `app.js` | Pantallas, cuentas, datos y tiempo real |
| `estilos.css` | Estética |
| `ilustraciones.js` | Iconos, logo y dibujos de prendas sin foto |
| `privacidad.html` | Política de privacidad |
| `supabase/esquema.sql` | Tablas, permisos, fotos y funciones |
