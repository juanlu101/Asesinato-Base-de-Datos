// Simula el entorno Web Worker y ejecuta el flujo completo del juego
// usando el MISMO motor (scripts/worker.sql.js) que carga la página.
const fs = require('fs');
const path = require('path');

// --- shims de Web Worker ---
global.self = global;
global.importScripts = () => {};
const listeners = [];
global.addEventListener = () => {};
let onmessageHandler = null;
Object.defineProperty(global, 'onmessage', {
  set(fn) { onmessageHandler = fn; },
  get() { return onmessageHandler; }
});
const responses = [];
global.postMessage = (msg) => { responses.push(msg); };

// Cargar el worker tal cual
const code = fs.readFileSync(path.join(__dirname, 'scripts/worker.sql.js'), 'utf-8');
eval(code);

if (typeof onmessageHandler !== 'function') {
  console.error('El worker no registró onmessage'); process.exit(1);
}

function send(data) {
  responses.length = 0;
  onmessageHandler({ data });
  return responses[0];
}

// 1. Abrir la base de datos (igual que loadData en main.js)
const buf = new Uint8Array(fs.readFileSync(path.join(__dirname, 'sql-murder-mystery.db')));
let r = send({ id: 1, action: 'open', buffer: buf });
console.log('open →', JSON.stringify(r));
if (!r || !r.ready) { console.error('FALLO al abrir la BD'); process.exit(1); }

const exec = (sql) => send({ id: 2, action: 'exec', sql });

function check(nombre, sql, validar) {
  const res = exec(sql);
  if (res.error) { console.error(`✗ ${nombre}: ERROR SQL →`, res.error); process.exit(1); }
  const ok = validar(res.results || []);
  console.log(`${ok ? '✓' : '✗'} ${nombre}`);
  if (!ok) { console.error('   resultados:', JSON.stringify(res.results).slice(0, 400)); process.exit(1); }
  return res.results;
}

// 2. Consulta de arranque del original
check('SELECT 1 (inicialización)', 'SELECT 1', d => d.length === 1);

// 3. Listado de tablas (consulta típica de exploración)
check('sqlite_master', "SELECT name FROM sqlite_master WHERE type='table'",
  d => d[0].values.flat().includes('crime_scene_report'));

// 4. Informe del crimen
const informe = check('informe del crimen',
  "SELECT description FROM crime_scene_report WHERE city='SQL City' AND type='asesinato' AND date=20180115",
  d => d.length === 1 && d[0].values.length === 1 && /Northwestern Dr/.test(d[0].values[0][0]) && /cámaras/.test(d[0].values[0][0]));
console.log('   »', informe[0].values[0][0]);

// 5. Testigos y entrevistas
check('testigo 1 (Morty)',
  "SELECT p.name, i.transcript FROM person p JOIN interview i ON i.person_id=p.id WHERE p.address_street_name='Northwestern Dr' ORDER BY p.address_number DESC LIMIT 1",
  d => d[0].values[0][0] === 'Morty Schapiro' && /48Z/.test(d[0].values[0][1]) && /oro/.test(d[0].values[0][1]) && /H42W/.test(d[0].values[0][1]));

check('testigo 2 (Annabel)',
  "SELECT p.name, i.transcript FROM person p JOIN interview i ON i.person_id=p.id WHERE p.name LIKE 'Annabel%' AND p.address_street_name='Franklin Ave'",
  d => d[0].values[0][0] === 'Annabel Miller' && /9 de enero/.test(d[0].values[0][1]));

// 6. El asesino (se compara el id, no el nombre: la respuesta no se escribe en ningún archivo)
const ID_ASESINO = 67318, ID_CEREBRO = 99716;
const asesino = check('identificación del asesino',
  `SELECT p.id, p.name FROM get_fit_now_member m
     JOIN get_fit_now_check_in c ON c.membership_id=m.id
     JOIN person p ON p.id=m.person_id
     JOIN drivers_license d ON d.id=p.license_id
    WHERE m.id LIKE '48Z%' AND m.membership_status='oro'
      AND c.check_in_date=20180109 AND d.plate_number LIKE '%H42W%'`,
  d => d[0].values.length === 1 && d[0].values[0][0] === ID_ASESINO);
const nombreAsesino = asesino[0].values[0][1];

// 7. Entrevista del asesino
check('entrevista del asesino',
  `SELECT transcript FROM interview WHERE person_id = ${ID_ASESINO}`,
  d => /pelirroja/.test(d[0].values[0][0]) && /SQL Symphony Concert/.test(d[0].values[0][0]) && /Tesla/.test(d[0].values[0][0]));

// 8. El cerebro del crimen
const cerebro = check('identificación del cerebro',
  `SELECT p.id, p.name FROM drivers_license d
     JOIN person p ON p.license_id=d.id
     JOIN facebook_event_checkin f ON f.person_id=p.id
    WHERE d.height BETWEEN 65 AND 67 AND d.hair_color='pelirrojo' AND d.gender='mujer'
      AND d.car_make='Tesla' AND d.car_model='Model S'
      AND f.event_name='SQL Symphony Concert' AND f.date BETWEEN 20171201 AND 20171231
    GROUP BY p.id HAVING COUNT(*)=3`,
  d => d[0].values.length === 1 && d[0].values[0][0] === ID_CEREBRO);
const nombreCerebro = cerebro[0].values[0][1];

// 9. La base de datos no contiene la respuesta y la tabla solution guarda solo el último intento
check('sin triggers con respuestas',
  "SELECT sql FROM sqlite_master WHERE type='trigger'",
  d => d.length === 1 && d[0].values.length === 1 && !/hex|CASE/i.test(d[0].values[0][0]));
check('solution guarda solo la última respuesta',
  "INSERT INTO solution VALUES (1, 'uno'); INSERT INTO solution VALUES (1, 'dos'); SELECT value FROM solution;",
  d => d[d.length - 1].values.length === 1 && d[d.length - 1].values[0][0] === 'dos');

// 10. Comprobación y escenas cifradas (scripts/cifrado.js + scripts/final.js), igual que la página
global.window = global;
require('./scripts/final.js');
const Cifrado = require('./scripts/cifrado.js');
const r1 = Cifrado.comprobarRespuesta(nombreAsesino.toUpperCase() + '  ', window.FINAL);
const r2 = Cifrado.comprobarRespuesta(nombreCerebro, window.FINAL);
const r0 = Cifrado.comprobarRespuesta('Cualquier Otro', window.FINAL);
if (!r1 || r1.fase !== 1 || !/has encontrado al asesino/.test(r1.mensaje) || !/<dialog/.test(r1.html)) {
  console.error('✗ fase 1 no se descifra'); process.exit(1);
}
if (r1.html.indexOf(nombreCerebro) !== -1) { console.error('✗ la fase 1 revela el nombre de la fase 2'); process.exit(1); }
console.log('✓ fase 1 descifrada con el nombre del asesino (sin distinguir mayúsculas ni espacios)');
if (!r2 || r2.fase !== 2 || !/cerebro del asesinato/.test(r2.mensaje)) { console.error('✗ fase 2 no se descifra'); process.exit(1); }
console.log('✓ fase 2 descifrada con el nombre del cerebro');
if (r0 !== null) { console.error('✗ un nombre cualquiera no debería valer'); process.exit(1); }
console.log('✓ un nombre incorrecto no descifra nada');

// 11. Errores SQL: el worker lanza una excepción que en el navegador
//     captura worker.onerror y la página muestra en rojo.
try {
  exec('SELECT * FROM tabla_inexistente');
  console.error('✗ se esperaba un error SQL'); process.exit(1);
} catch (e) {
  console.log('✓ error controlado →', e.message || e);
}

console.log('\nTODAS LAS PRUEBAS CON EL MOTOR REAL (worker.sql.js) SUPERADAS ✔');
