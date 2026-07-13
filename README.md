# El Misterio del Asesinato en SQL (versión en español)

Adaptación al español y simplificación del [SQL Murder Mystery](https://github.com/NUKnightLab/sql-mysteries)
del Knight Lab (Universidad Northwestern). Todo funciona en el navegador, sin servidor:
la base de datos SQLite se ejecuta con [SQL.js](https://github.com/sql-js/sql.js/).

## Qué contiene la página

1. **El caso**: el enunciado del crimen, en español.
2. **Esquema de la base de datos**: el diagrama de tablas y relaciones, visible directamente.
3. **Editor SQL**: para escribir y ejecutar las consultas (botón *Ejecutar* o Mayús + Intro).
4. **Comprueba tu solución**: la sentencia `INSERT` que valida el nombre del sospechoso.

## Qué se ha traducido

- El enunciado, la interfaz (botones, mensajes) y los mensajes de verificación de la solución.
- El **contenido** de la base de datos: informes de la escena del crimen, entrevistas,
  tipos de delito (`asesinato`, `robo`...), estados de membresía (`oro`, `plata`, `normal`),
  género (`hombre`/`mujer`), colores de ojos y pelo (`pelirrojo`, `castaño`...) y nombres de eventos.
- Los **identificadores** (nombres de tablas y columnas), los nombres propios de personas,
  calles y ciudades (p. ej. `SQL City`) y los scripts se mantienen sin traducir para no romper nada.
- Las fechas siguen siendo enteros con formato `AAAAMMDD` (p. ej. `20180115`).

La solución del misterio es la misma que en el original y está verificada de principio a fin
(el archivo `test_worker.js` reproduce el flujo completo del juego con el mismo motor
`scripts/worker.sql.js` que usa la página; puede ejecutarse con `node test_worker.js`).

## Despliegue en GitHub Pages

1. Crea un repositorio nuevo en GitHub y sube **todo el contenido de esta carpeta** a la raíz
   (o arrástralo desde la web de GitHub con *Add file → Upload files*).
2. En el repositorio, ve a **Settings → Pages**.
3. En *Build and deployment*, elige **Deploy from a branch**, rama `main` y carpeta `/ (root)`.
4. Guarda. En uno o dos minutos la página estará en `https://TU_USUARIO.github.io/TU_REPOSITORIO/`.

No hace falta configurar nada más: la página no usa CDNs ni recursos externos.

> Nota: si abres `index.html` directamente desde el disco (`file://`), la base de datos no se
> cargará por las restricciones del navegador. Usa GitHub Pages o un servidor local
> (`python3 -m http.server`).

## Créditos y licencias

Creado originalmente por Joon Park y Cathy He (Knight Lab) y producido para la web por
Joe Germuska. Componentes del editor de Zi Chong Kao ([Select Star SQL](https://selectstarsql.com/)).
Ilustración de [Vecteezy](https://www.vecteezy.com/). Código bajo licencia
[MIT](LICENSE); textos y contenido bajo
[CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/deed.es).
