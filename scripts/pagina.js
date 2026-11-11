// Interacciones propias de esta página:
//  1. En el esquema, al señalar una tabla se resaltan sus relaciones.
//  2. Al comprobar la solución, el sello de la portada cambia de estado.

(function () {
  // ---------- 1. Esquema ----------
  var svg = document.querySelector('.esquema-svg');
  if (svg) {
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
          tablas.forEach(function (t) {
            svg.querySelector('[data-tabla="' + t + '"]').classList.add('activa');
          });
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
  }

  // ---------- 2. Sello ----------
  var sello = document.getElementById('sello');
  var comprobar = document.getElementById('comprobar');
  if (!sello || !comprobar) { return; }

  var ponerSello = function (texto, cerrado) {
    if (sello.textContent === texto) { return; }
    sello.textContent = texto;
    sello.classList.toggle('cerrado', cerrado);
    sello.classList.remove('reestampar');
    void sello.offsetWidth; // reinicia la animación
    sello.classList.add('reestampar');
  };

  // ---------- 3. Escena final ----------
  // Un foco de linterna recorre un callejón a oscuras.
  // Fase 1 (Jeremy): el foco lo encuentra y aparece una silueta en la ventana.
  // Fase 2 (Miranda): el foco salta a la ventana y la silueta resulta ser ella.
  var botonFinal = document.getElementById('ver-final');
  var faseAlcanzada = 0;
  var sinMovimiento = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var temporizadores = [];
  var animacionFoco = null;

  var limpiar = function () {
    temporizadores.forEach(clearTimeout);
    temporizadores = [];
    if (animacionFoco) { cancelAnimationFrame(animacionFoco); animacionFoco = null; }
  };
  var despues = function (ms, fn) { temporizadores.push(setTimeout(fn, ms)); };

  var prepararDialogo = function (dlg) {
    dlg.querySelectorAll('[data-cerrar]').forEach(function (b) {
      b.addEventListener('click', function () { dlg.close(); });
    });
    dlg.addEventListener('close', function () { limpiar(); if (botonFinal) { botonFinal.focus(); } });
  };

  var linterna = document.getElementById('linterna');
  var foco = linterna && linterna.querySelector('.foco');
  var CARA_JEREMY = { x: 324, y: 400 };
  var CARA_MIRANDA = { x: 639, y: 276 };
  var RECORRIDO_1 = [
    { t: 0, x: -150, y: 180, r: 90 },
    { t: 900, x: 190, y: 150, r: 100 },      // el letrero del gimnasio
    { t: 1700, x: 430, y: 250, r: 95 },      // la pared
    { t: 2450, x: 660, y: 460, r: 90 },      // el coche
    { t: 3250, x: CARA_JEREMY.x, y: CARA_JEREMY.y - 6, r: 95 },
    { t: 3850, x: CARA_JEREMY.x, y: CARA_JEREMY.y, r: 175 }
  ];
  var RECORRIDO_2 = [
    { t: 0, x: CARA_JEREMY.x, y: CARA_JEREMY.y, r: 175 },
    { t: 500, x: CARA_JEREMY.x, y: CARA_JEREMY.y, r: 150 },
    { t: 1600, x: CARA_MIRANDA.x, y: CARA_MIRANDA.y, r: 120 },
    { t: 2500, x: CARA_MIRANDA.x, y: CARA_MIRANDA.y, r: 130 },
    { t: 3600, x: 400, y: 300, r: 900 }
  ];

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

  var CLASES = ['texto', 'ventana', 'revelar', 'todo', 'estampado'];
  var finalLinterna = function (fase) {
    limpiar();
    if (fase === 1) {
      ponerFoco(RECORRIDO_1[RECORRIDO_1.length - 1]);
      linterna.classList.add('texto', 'ventana');
    } else {
      ponerFoco(RECORRIDO_2[RECORRIDO_2.length - 1]);
      linterna.classList.add('texto', 'ventana', 'revelar', 'todo', 'estampado');
    }
  };

  var abrirLinterna = function (fase) {
    if (linterna.open) { linterna.close(); }
    limpiar();
    linterna.dataset.fase = fase;
    CLASES.forEach(function (c) { linterna.classList.remove(c); });
    linterna.showModal();
    if (sinMovimiento) { finalLinterna(fase); return; }
    if (fase === 1) {
      ponerFoco(RECORRIDO_1[0]);
      recorrer(RECORRIDO_1);
      despues(3900, function () { linterna.classList.add('texto'); });
      despues(4500, function () { linterna.classList.add('ventana'); });
    } else {
      // Empieza donde acabó la fase 1: foco en Jeremy y sombra en la ventana
      linterna.classList.add('ventana');
      ponerFoco(RECORRIDO_2[0]);
      recorrer(RECORRIDO_2);
      despues(1650, function () { linterna.classList.add('revelar'); });
      despues(2200, function () { linterna.classList.add('texto'); });
      despues(2700, function () { linterna.classList.add('todo'); });
      despues(3400, function () { linterna.classList.add('estampado'); });
    }
  };

  if (linterna) {
    prepararDialogo(linterna);
    // Clic en la escena: salta al final de la animación
    linterna.querySelector('.linterna-escenario').addEventListener('click', function () {
      finalLinterna(Number(linterna.dataset.fase));
    });
  }

  var abrirFinal = function (fase) {
    if (linterna) { abrirLinterna(fase); }
  };

  var mostrarFinal = function (fase) {
    faseAlcanzada = Math.max(faseAlcanzada, fase);
    if (!botonFinal) { return; }
    botonFinal.hidden = false;
    setTimeout(function () { abrirFinal(fase); }, 700);
  };

  if (botonFinal) {
    botonFinal.addEventListener('click', function () { abrirFinal(faseAlcanzada); });
  }

  comprobar.addEventListener('sql-resultado', function (e) {
    var datos = e.detail;
    var mensaje = (datos && datos.length && datos[0].values.length) ? String(datos[0].values[0][0]) : '';
    comprobar.classList.remove('acierto', 'fallo');

    if (/cerebro del asesinato/.test(mensaje)) {
      comprobar.classList.add('acierto');
      ponerSello('Caso cerrado', true);
      mostrarFinal(2);
    } else if (/has encontrado al asesino/.test(mensaje)) {
      comprobar.classList.add('acierto');
      ponerSello('Asesino identificado', true);
      mostrarFinal(1);
    } else if (/no es la persona correcta/.test(mensaje)) {
      comprobar.classList.add('fallo');
    }
  });
})();
