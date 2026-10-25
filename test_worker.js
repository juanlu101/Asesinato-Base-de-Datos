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

// 6. El asesino
check('identificación del asesino',
  `SELECT p.name FROM get_fit_now_member m
     JOIN get_fit_now_check_in c ON c.membership_id=m.id
     JOIN person p ON p.id=m.person_id
     JOIN drivers_license d ON d.id=p.license_id
    WHERE m.id LIKE '48Z%' AND m.membership_status='oro'
      AND c.check_in_date=20180109 AND d.plate_number LIKE '%H42W%'`,
  d => d[0].values.length === 1 && d[0].values[0][0] === 'Jeremy Bowers');

// 7. Comprobación de la solución EXACTAMENTE como la página:
//    INSERT + SELECT en una sola ejecución (multi-sentencia)
let res = exec("INSERT INTO solution VALUES (1, 'Jeremy Bowers');\n\nSELECT value FROM solution;");
let msg = res.results[0].values[0][0];
console.log('✓ trigger asesino →', msg.slice(0, 60) + '...');
if (!/Enhorabuena, has encontrado al asesino/.test(msg)) { console.error('FALLO trigger asesino'); process.exit(1); }

// 8. Entrevista del asesino
check('entrevista de Jeremy',
  "SELECT transcript FROM interview WHERE person_id = (SELECT id FROM person WHERE name='Jeremy Bowers')",
  d => /pelirroja/.test(d[0].values[0][0]) && /SQL Symphony Concert/.test(d[0].values[0][0]) && /Tesla/.test(d[0].values[0][0]));

// 9. El cerebro del crimen
check('identificación del cerebro',
  `SELECT p.name FROM drivers_license d
     JOIN person p ON p.license_id=d.id
     JOIN facebook_event_checkin f ON f.person_id=p.id
    WHERE d.height BETWEEN 65 AND 67 AND d.hair_color='pelirrojo' AND d.gender='mujer'
      AND d.car_make='Tesla' AND d.car_model='Model S'
      AND f.event_name='SQL Symphony Concert' AND f.date BETWEEN 20171201 AND 20171231
    GROUP BY p.id HAVING COUNT(*)=3`,
  d => d[0].values.length === 1 && d[0].values[0][0] === 'Miranda Priestly');

res = exec("INSERT INTO solution VALUES (1, 'Miranda Priestly');\n\nSELECT value FROM solution;");
msg = res.results[0].values[0][0];
console.log('✓ trigger cerebro →', msg.slice(0, 60) + '...');
if (!/cerebro del asesinato/.test(msg)) { console.error('FALLO trigger cerebro'); process.exit(1); }

res = exec("INSERT INTO solution VALUES (1, 'Cualquier Otro');\n\nSELECT value FROM solution;");
msg = res.results[0].values[0][0];
console.log('✓ trigger incorrecto →', msg);
if (!/Inténtalo de nuevo/.test(msg)) { console.error('FALLO trigger incorrecto'); process.exit(1); }

// 10. Errores SQL: el worker lanza una excepción que en el navegador
//     captura worker.onerror y la página muestra en rojo.
try {
  exec('SELECT * FROM tabla_inexistente');
  console.error('✗ se esperaba un error SQL'); process.exit(1);
} catch (e) {
  console.log('✓ error controlado →', e.message || e);
}

console.log('\nTODAS LAS PRUEBAS CON EL MOTOR REAL (worker.sql.js) SUPERADAS ✔');
