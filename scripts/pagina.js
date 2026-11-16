// Interacciones propias de esta página:
//  1. Pestañas de la carpeta del expediente (Caso, Esquema, Informe).
//  2. Esquema: resaltar relaciones y verlo a pantalla completa.
//  3. Informe del detective: cada consulta se anota y el alumno la explica.
//  4. Comprobación de la solución (sin la respuesta escrita en ningún archivo).
//  5. Escena final: un foco de linterna recorre un callejón a oscuras.

(function () {
  'use strict';

  // Nada se guarda en el navegador: así, cuando otro grupo use el mismo ordenador,
  // empieza siempre con la página en blanco. Se borra también lo que pudiera haber
  // dejado una versión anterior de la página.
  try {
    localStorage.removeItem('asesinato-informe-v1');
    localStorage.removeItem('asesinato-pestana');
  } catch (e) { /* sin acceso al almacenamiento: no hay nada que borrar */ }
  var horaActual = function () {
    return new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  };

  // =====================================================================
  // 1. Pestañas
  // =====================================================================
  var pestanas = Array.prototype.slice.call(document.querySelectorAll('.pestanas [role="tab"]'));

  var abrirPestana = function (nombre, enfocar) {
    pestanas.forEach(function (tab) {
      var activa = tab.id === 'tab-' + nombre;
      tab.setAttribute('aria-selected', activa ? 'true' : 'false');
      tab.tabIndex = activa ? 0 : -1;
      document.getElementById(tab.getAttribute('aria-controls')).hidden = !activa;
      if (activa && enfocar) { tab.focus(); }
    });
  };

  pestanas.forEach(function (tab, i) {
    tab.addEventListener('click', function () { abrirPestana(tab.id.replace('tab-', '')); });
    tab.addEventListener('keydown', function (e) {
      var destino = null;
      if (e.key === 'ArrowRight') { destino = pestanas[(i + 1) % pestanas.length]; }
      if (e.key === 'ArrowLeft') { destino = pestanas[(i - 1 + pestanas.length) % pestanas.length]; }
      if (e.key === 'Home') { destino = pestanas[0]; }
      if (e.key === 'End') { destino = pestanas[pestanas.length - 1]; }
      if (destino) { e.preventDefault(); abrirPestana(destino.id.replace('tab-', ''), true); }
    });
  });

  document.querySelectorAll('[data-ir]').forEach(function (b) {
    b.addEventListener('click', function () { abrirPestana(b.dataset.ir, true); });
  });


  // =====================================================================
  // 2. Esquema
  // =====================================================================
  var activarEsquema = function (svg) {
    var limpiar = function () {
      svg.classList.remove('enfoque');
      svg.querySelectorAll('.activa').forEach(function (el) { el.classList.remove('activa'); });
    };
    var resaltar = function (nombre) {
      limpiar();
      svg.classList.add('enfoque');
      svg.querySelector('[data-tabla="' + nombre + '"]').classList.add('activa');
      svg.querySelectorAll('.relacion').forEach(function (rel) {
        var tablas = rel.dataset.tablas.split(' ');
        if (tablas.indexOf(nombre) !== -1) {
          rel.classList.add('activa');
          tablas.forEach(function (t) { svg.querySelector('[data-tabla="' + t + '"]').classList.add('activa'); });
        }
      });
    };
    svg.querySelectorAll('.tabla').forEach(function (tabla) {
      var nombre = tabla.dataset.tabla;
      tabla.addEventListener('mouseenter', function () { resaltar(nombre); });
      tabla.addEventListener('focus', function () { resaltar(nombre); });
      tabla.addEventListener('mouseleave', limpiar);
      tabla.addEventListener('blur', limpiar);
    });
  };

  var esquema = document.querySelector('#esquema-marco .esquema-svg');
  if (esquema) { activarEsquema(esquema); }

  var dialogoEsquema = document.getElementById('esquema-dialogo');
  document.getElementById('ampliar-esquema').addEventListener('click', function () {
    var cuerpo = document.getElementById('esquema-dialogo-cuerpo');
    if (!cuerpo.firstChild) {
      var copia = esquema.cloneNode(true);
      copia.querySelectorAll('[id]').forEach(function (el) { el.removeAttribute('id'); });
      copia.removeAttribute('aria-labelledby');
      copia.setAttribute('aria-label', 'Esquema de la base de datos ampliado');
      cuerpo.appendChild(copia);
      activarEsquema(copia);
    }
    dialogoEsquema.showModal();
  });
  dialogoEsquema.querySelector('[data-cerrar]').addEventListener('click', function () { dialogoEsquema.close(); });
  dialogoEsquema.addEventListener('click', function (e) { if (e.target === dialogoEsquema) { dialogoEsquema.close(); } });

  // =====================================================================
  // 3. Informe del detective
  // =====================================================================
  // El informe solo vive mientras la página está abierta.
  var informe = { nombre: '', grupo: '', pasos: [], conclusion: '', comprobaciones: [] };

  var listaPasos = document.getElementById('inf-pasos');
  var vacio = document.getElementById('inf-vacio');
  var contador = document.getElementById('contador-pasos');
  var campoNombre = document.getElementById('inf-nombre');
  var campoGrupo = document.getElementById('inf-grupo');
  var campoConclusion = document.getElementById('inf-conclusion');

  // Si el informe tiene algo escrito, el navegador avisa antes de cerrar o recargar la página
  var hayTrabajo = function () {
    return informe.pasos.length > 0 || informe.conclusion.trim() !== '' ||
      informe.nombre.trim() !== '' || informe.comprobaciones.length > 0;
  };
  window.addEventListener('beforeunload', function (e) {
    if (hayTrabajo()) { e.preventDefault(); e.returnValue = ''; }
  });
  var guardarInforme = function () { /* nada que guardar: el informe vive solo en memoria */ };

  var nuevoId = function () { return 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); };

  var pintarPasos = function () {
    listaPasos.innerHTML = '';
    informe.pasos.forEach(function (paso, i) {
      var li = document.createElement('li');
      li.className = 'inf-paso' + (paso.sql ? '' : ' inf-paso-nota');
      li.dataset.id = paso.id;

      var cab = document.createElement('div');
      cab.className = 'inf-paso-cab';
      var num = document.createElement('span');
      num.className = 'inf-num';
      num.textContent = 'Paso ' + (i + 1);
      cab.appendChild(num);
      var meta = document.createElement('span');
      meta.className = 'inf-meta';
      meta.textContent = paso.sql
        ? (paso.filas === 1 ? '1 fila' : paso.filas + ' filas') + ', ' + paso.hora
        : 'Paso sin consulta, ' + paso.hora;
      cab.appendChild(meta);
      var quitar = document.createElement('button');
      quitar.type = 'button';
      quitar.className = 'inf-quitar';
      quitar.textContent = 'Quitar';
      quitar.setAttribute('aria-label', 'Quitar el paso ' + (i + 1));
      quitar.addEventListener('click', function () {
        informe.pasos = informe.pasos.filter(function (p) { return p.id !== paso.id; });
        pintarPasos();
        guardarInforme();
      });
      cab.appendChild(quitar);
      li.appendChild(cab);

      if (paso.sql) {
        var pre = document.createElement('pre');
        pre.className = 'inf-sql';
        pre.textContent = paso.sql;
        li.appendChild(pre);
      }

      var etiqueta = document.createElement('label');
      etiqueta.className = 'inf-etiqueta';
      etiqueta.htmlFor = 'nota-' + paso.id;
      etiqueta.textContent = paso.sql ? '¿Qué buscabas y qué has descubierto?' : '¿Qué has pensado o deducido?';
      li.appendChild(etiqueta);

      var nota = document.createElement('textarea');
      nota.id = 'nota-' + paso.id;
      nota.rows = 3;
      nota.value = paso.nota || '';
      nota.addEventListener('input', function () { paso.nota = nota.value; guardarInforme(); });
      li.appendChild(nota);

      listaPasos.appendChild(li);
    });
    vacio.hidden = informe.pasos.length > 0;
    contador.textContent = informe.pasos.length;
  };

  var pintarComprobaciones = function () {
    var lista = document.getElementById('inf-comprobaciones');
    lista.innerHTML = '';
    informe.comprobaciones.forEach(function (c) {
      var li = document.createElement('li');
      li.className = c.resultado === 'incorrecto' ? 'inf-fallo' : 'inf-acierto';
      li.textContent = c.hora + ': «' + c.valor + '», ' + DESCRIPCION_RESULTADO[c.resultado];
      lista.appendChild(li);
    });
    document.getElementById('inf-comprobaciones-vacio').hidden = informe.comprobaciones.length > 0;
  };

  var DESCRIPCION_RESULTADO = {
    incorrecto: 'respuesta incorrecta',
    1: 'correcto: es quien cometió el asesinato',
    2: 'correcto: es el cerebro del crimen'
  };

  campoNombre.value = informe.nombre;
  campoGrupo.value = informe.grupo;
  campoConclusion.value = informe.conclusion;
  campoNombre.addEventListener('input', function () { informe.nombre = campoNombre.value; guardarInforme(); });
  campoGrupo.addEventListener('input', function () { informe.grupo = campoGrupo.value; guardarInforme(); });
  campoConclusion.addEventListener('input', function () { informe.conclusion = campoConclusion.value; guardarInforme(); });
  pintarPasos();
  pintarComprobaciones();

  var irAPaso = function (id) {
    abrirPestana('informe');
    var nota = document.getElementById('nota-' + id);
    if (nota) {
      nota.scrollIntoView({ block: 'center', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
      nota.focus({ preventScroll: true });
    }
  };

  document.getElementById('inf-nota').addEventListener('click', function () {
    var paso = { id: nuevoId(), sql: '', filas: 0, hora: horaActual(), nota: '' };
    informe.pasos.push(paso);
    pintarPasos();
    guardarInforme();
    irAPaso(paso.id);
  });

  // Cada consulta del editor se anota como un paso
  var aviso = document.getElementById('aviso-informe');
  document.getElementById('editor').addEventListener('sql-resultado', function (e) {
    var sql = (e.detail.sql || '').trim();
    if (!sql) { return; }
    var datos = e.detail.resultados || [];
    var filas = datos.length ? datos[datos.length - 1].values.length : 0;
    var ultimo = informe.pasos[informe.pasos.length - 1];
    var paso;
    if (ultimo && ultimo.sql === sql) {
      // La misma consulta otra vez: no se duplica, solo se actualiza
      paso = ultimo;
      paso.filas = filas;
      paso.hora = horaActual();
    } else {
      paso = { id: nuevoId(), sql: sql, filas: filas, hora: horaActual(), nota: '' };
      informe.pasos.push(paso);
    }
    pintarPasos();
    guardarInforme();

    var n = informe.pasos.indexOf(paso) + 1;
    aviso.innerHTML = '';
    aviso.appendChild(document.createTextNode('Anotada en tu informe como paso ' + n + '. '));
    var boton = document.createElement('button');
    boton.type = 'button';
    boton.className = 'enlace';
    boton.textContent = 'Explicar este paso';
    boton.addEventListener('click', function () { irAPaso(paso.id); });
    aviso.appendChild(boton);
    aviso.hidden = false;
  });

  // Texto plano del informe (para descargar)
  var informeEnTexto = function () {
    var l = [];
    l.push('INFORME DEL DETECTIVE: El misterio del asesinato en SQL');
    l.push('');
    l.push('Nombre: ' + (informe.nombre || '—'));
    l.push('Grupo: ' + (informe.grupo || '—'));
    l.push('Fecha: ' + new Date().toLocaleDateString('es-ES'));
    l.push('');
    l.push('PASOS DE LA INVESTIGACIÓN');
    informe.pasos.forEach(function (p, i) {
      l.push('');
      l.push('Paso ' + (i + 1) + (p.sql ? ' (' + p.filas + (p.filas === 1 ? ' fila' : ' filas') + ')' : ''));
      if (p.sql) { l.push(p.sql.split('\n').map(function (x) { return '    ' + x; }).join('\n')); }
      l.push('Explicación: ' + (p.nota || '(sin explicar)'));
    });
    l.push('');
    l.push('CONCLUSIÓN');
    l.push(informe.conclusion || '(sin escribir)');
    l.push('');
    l.push('COMPROBACIONES');
    if (!informe.comprobaciones.length) { l.push('(ninguna)'); }
    informe.comprobaciones.forEach(function (c) {
      l.push(c.hora + ': «' + c.valor + '», ' + DESCRIPCION_RESULTADO[c.resultado]);
    });
    return l.join('\n') + '\n';
  };

  document.getElementById('inf-descargar').addEventListener('click', function () {
    var blob = new Blob([informeEnTexto()], { type: 'text/plain;charset=utf-8' });
    var a = document.createElement('a');
    var nombre = (informe.nombre || 'detective').toLowerCase().normalize('NFD')
      .replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    a.href = URL.createObjectURL(blob);
    a.download = 'informe-' + (nombre || 'detective') + '.txt';
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  });

  // Versión para imprimir
  var prepararImpresion = function () {
    var art = document.getElementById('informe-impresion');
    art.innerHTML = '';
    var add = function (etiqueta, texto, clase) {
      var el = document.createElement(etiqueta);
      if (texto !== undefined) { el.textContent = texto; }
      if (clase) { el.className = clase; }
      art.appendChild(el);
      return el;
    };
    add('p', 'Expediente nº 20180115, Departamento de Policía de SQL City', 'imp-expediente');
    add('h1', 'Informe del detective');
    var datos = add('dl', undefined, 'imp-datos');
    [['Nombre', informe.nombre || '—'], ['Grupo', informe.grupo || '—'],
     ['Fecha', new Date().toLocaleDateString('es-ES')]].forEach(function (par) {
      var dt = document.createElement('dt'); dt.textContent = par[0]; datos.appendChild(dt);
      var dd = document.createElement('dd'); dd.textContent = par[1]; datos.appendChild(dd);
    });
    add('h2', 'Pasos de la investigación');
    if (!informe.pasos.length) { add('p', 'No hay pasos anotados.'); }
    informe.pasos.forEach(function (p, i) {
      var div = add('section', undefined, 'imp-paso');
      var h = document.createElement('h3');
      h.textContent = 'Paso ' + (i + 1) + (p.sql ? ' (' + p.filas + (p.filas === 1 ? ' fila' : ' filas') + ')' : '');
      div.appendChild(h);
      if (p.sql) { var pre = document.createElement('pre'); pre.textContent = p.sql; div.appendChild(pre); }
      var nota = document.createElement('p');
      nota.textContent = p.nota || '(sin explicar)';
      if (!p.nota) { nota.className = 'imp-vacio'; }
      div.appendChild(nota);
    });
    add('h2', 'Conclusión');
    add('p', informe.conclusion || '(sin escribir)', informe.conclusion ? 'imp-conclusion' : 'imp-vacio');
    add('h2', 'Comprobaciones');
    var ul = add('ul');
    if (!informe.comprobaciones.length) { add('p', 'Ninguna.', 'imp-vacio'); }
    informe.comprobaciones.forEach(function (c) {
      var li = document.createElement('li');
      li.textContent = c.hora + ': «' + c.valor + '», ' + DESCRIPCION_RESULTADO[c.resultado];
      ul.appendChild(li);
    });
  };
  window.addEventListener('beforeprint', prepararImpresion);
  document.getElementById('inf-imprimir').addEventListener('click', function () {
    prepararImpresion();
    window.print();
  });

  var botonBorrar = document.getElementById('inf-borrar');
  var confirmando = null;
  botonBorrar.addEventListener('click', function () {
    if (!confirmando) {
      botonBorrar.textContent = 'Pulsa otra vez para borrarlo todo';
      botonBorrar.classList.add('confirmar');
      confirmando = setTimeout(function () {
        botonBorrar.textContent = 'Empezar un informe nuevo';
        botonBorrar.classList.remove('confirmar');
        confirmando = null;
      }, 4000);
      return;
    }
    clearTimeout(confirmando);
    confirmando = null;
    botonBorrar.textContent = 'Empezar un informe nuevo';
    botonBorrar.classList.remove('confirmar');
    informe = { nombre: '', grupo: '', pasos: [], conclusion: '', comprobaciones: [] };
    campoNombre.value = '';
    campoGrupo.value = '';
    campoConclusion.value = '';
    pintarPasos();
    pintarComprobaciones();
    guardarInforme();
    aviso.hidden = true;
  });

  // =====================================================================
  // 4. Comprobación de la solución
  // =====================================================================
  var sello = document.getElementById('sello');
  var comprobar = document.getElementById('comprobar');
  var veredicto = document.getElementById('veredicto');
  var botonFinal = document.getElementById('ver-final');
  var mejorResultado = null;   // { fase, mensaje, html } de la fase más alta alcanzada

  var ponerSello = function (texto, cerrado) {
    if (sello.textContent === texto) { return; }
    sello.textContent = texto;
    sello.classList.toggle('cerrado', cerrado);
    sello.classList.remove('reestampar');
    void sello.offsetWidth; // reinicia la animación
    sello.classList.add('reestampar');
  };

  var mostrarVeredicto = function (clase, texto) {
    veredicto.className = 'veredicto ' + clase;
    veredicto.textContent = texto;
    veredicto.hidden = false;
    comprobar.classList.remove('acierto', 'fallo');
    if (clase) { comprobar.classList.add(clase); }
  };

  comprobar.addEventListener('sql-resultado', function () {
    // Leemos la respuesta guardada en la tabla solution, haya o no SELECT en la consulta
    query('SELECT value FROM solution', function (datos) {
      var valor = (datos && datos.length && datos[0].values.length) ? String(datos[0].values[0][0]) : '';
      if (!valor.trim()) {
        mostrarVeredicto('fallo', 'No hay ninguna respuesta guardada. Usa la sentencia INSERT con el nombre de tu sospechoso.');
        return;
      }
      var r = window.Cifrado.comprobarRespuesta(valor, window.FINAL);
      informe.comprobaciones.push({ hora: horaActual(), valor: valor, resultado: r ? r.fase : 'incorrecto' });
      pintarComprobaciones();
      guardarInforme();

      if (!r) {
        mostrarVeredicto('fallo', 'Esa no es la persona correcta. ¡Inténtalo de nuevo!');
        return;
      }
      mostrarVeredicto('acierto', r.mensaje);
      ponerSello(r.fase === 2 ? 'Caso cerrado' : 'Asesino identificado', true);
      if (!mejorResultado || r.fase >= mejorResultado.fase) { mejorResultado = r; }
      botonFinal.hidden = false;
      setTimeout(function () { abrirEscena(r); }, 700);
    });
  });

  botonFinal.addEventListener('click', function () { if (mejorResultado) { abrirEscena(mejorResultado); } });

  // =====================================================================
  // 5. Escena final (se descifra con la respuesta correcta)
  // =====================================================================
  var sinMovimiento = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var temporizadores = [];
  var animacionFoco = null;
  var dialogo = null;
  var foco = null;

  var CARA_1 = { x: 324, y: 400 };   // primer plano
  var CARA_2 = { x: 639, y: 276 };   // ventana del fondo
  var RECORRIDO_1 = [
    { t: 0, x: -150, y: 180, r: 90 },
    { t: 900, x: 190, y: 150, r: 100 },      // el letrero del gimnasio
    { t: 1700, x: 430, y: 250, r: 95 },      // la pared
    { t: 2450, x: 660, y: 460, r: 90 },      // el coche
    { t: 3250, x: CARA_1.x, y: CARA_1.y - 6, r: 95 },
    { t: 3850, x: CARA_1.x, y: CARA_1.y, r: 175 }
  ];
  var RECORRIDO_2 = [
    { t: 0, x: CARA_1.x, y: CARA_1.y, r: 175 },
    { t: 500, x: CARA_1.x, y: CARA_1.y, r: 150 },
    { t: 1600, x: CARA_2.x, y: CARA_2.y, r: 120 },
    { t: 2500, x: CARA_2.x, y: CARA_2.y, r: 130 },
    { t: 3600, x: 400, y: 300, r: 900 }
  ];
  var CLASES = ['texto', 'ventana', 'revelar', 'todo', 'estampado'];

  var limpiarEscena = function () {
    temporizadores.forEach(clearTimeout);
    temporizadores = [];
    if (animacionFoco) { cancelAnimationFrame(animacionFoco); animacionFoco = null; }
  };
  var despues = function (ms, fn) { temporizadores.push(setTimeout(fn, ms)); };

  var ponerFoco = function (k) {
    foco.setAttribute('cx', k.x);
    foco.setAttribute('cy', k.y);
    foco.setAttribute('r', k.r);
  };
  var suavizar = function (p) { return p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2; };

  var recorrer = function (puntos) {
    var inicio = performance.now();
    var fin = puntos[puntos.length - 1];
    var paso = function (ahora) {
      var t = ahora - inicio;
      if (t >= fin.t) { ponerFoco(fin); animacionFoco = null; return; }
      var i = 1;
      while (puntos[i].t < t) { i++; }
      var a = puntos[i - 1], b = puntos[i];
      var p = suavizar((t - a.t) / (b.t - a.t));
      ponerFoco({ x: a.x + (b.x - a.x) * p, y: a.y + (b.y - a.y) * p, r: a.r + (b.r - a.r) * p });
      animacionFoco = requestAnimationFrame(paso);
    };
    animacionFoco = requestAnimationFrame(paso);
  };

  var saltarAlFinal = function (fase) {
    limpiarEscena();
    if (fase === 1) {
      ponerFoco(RECORRIDO_1[RECORRIDO_1.length - 1]);
      dialogo.classList.add('texto', 'ventana');
    } else {
      ponerFoco(RECORRIDO_2[RECORRIDO_2.length - 1]);
      dialogo.classList.add('texto', 'ventana', 'revelar', 'todo', 'estampado');
    }
  };

  var montarEscena = function (resultado) {
    if (dialogo && dialogo.open) { dialogo.close(); }
    var contenedor = document.getElementById('escena-final');
    contenedor.innerHTML = resultado.html;
    dialogo = contenedor.querySelector('dialog');
    foco = dialogo.querySelector('.foco');
    dialogo.querySelectorAll('[data-cerrar]').forEach(function (b) {
      b.addEventListener('click', function () { dialogo.close(); });
    });
    dialogo.addEventListener('close', function () { limpiarEscena(); botonFinal.focus(); });
    dialogo.querySelector('.linterna-escenario').addEventListener('click', function () {
      saltarAlFinal(resultado.fase);
    });
  };

  var abrirEscena = function (resultado) {
    limpiarEscena();
    montarEscena(resultado);
    var fase = resultado.fase;
    CLASES.forEach(function (c) { dialogo.classList.remove(c); });
    dialogo.showModal();
    if (sinMovimiento) { saltarAlFinal(fase); return; }
    if (fase === 1) {
      ponerFoco(RECORRIDO_1[0]);
      recorrer(RECORRIDO_1);
      despues(3900, function () { dialogo.classList.add('texto'); });
      despues(4500, function () { dialogo.classList.add('ventana'); });
    } else {
      // Empieza donde acabó la fase 1: foco en el primer plano y sombra en la ventana
      dialogo.classList.add('ventana');
      ponerFoco(RECORRIDO_2[0]);
      recorrer(RECORRIDO_2);
      despues(1650, function () { dialogo.classList.add('revelar'); });
      despues(2200, function () { dialogo.classList.add('texto'); });
      despues(2700, function () { dialogo.classList.add('todo'); });
      despues(3400, function () { dialogo.classList.add('estampado'); });
    }
  };
})();
