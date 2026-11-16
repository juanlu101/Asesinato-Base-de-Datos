// Comprobación de la solución sin escribir la respuesta en ningún archivo.
//
// La respuesta correcta no aparece en la página ni en la base de datos.
// Lo que se guarda (en scripts/final.js) es:
//   - un "comprobante": una huella SHA-256 derivada del nombre correcto;
//   - el mensaje y la escena final de cada fase, cifrados con una clave que
//     también se deriva del nombre correcto.
// Solo quien escribe el nombre correcto obtiene la clave que descifra la escena.
//
// Funciona igual en el navegador (aunque la página no se sirva por HTTPS)
// y en Node (lo usa test_worker.js).

(function (global) {
  'use strict';

  // ---------- SHA-256 (implementación compacta, sin dependencias) ----------
  var K = new Uint32Array([
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
  ]);
  var W = new Uint32Array(64);

  function sha256(bytes) {
    var len = bytes.length;
    var total = ((len + 9 + 63) >> 6) << 6;
    var m = new Uint8Array(total);
    m.set(bytes);
    m[len] = 0x80;
    var bits = len * 8;
    m[total - 4] = (bits >>> 24) & 0xff;
    m[total - 3] = (bits >>> 16) & 0xff;
    m[total - 2] = (bits >>> 8) & 0xff;
    m[total - 1] = bits & 0xff;
    m[total - 5] = Math.floor(bits / 0x100000000) & 0xff;

    var h0 = 0x6a09e667, h1 = 0xbb67ae85, h2 = 0x3c6ef372, h3 = 0xa54ff53a,
        h4 = 0x510e527f, h5 = 0x9b05688c, h6 = 0x1f83d9ab, h7 = 0x5be0cd19;

    for (var off = 0; off < total; off += 64) {
      for (var i = 0; i < 16; i++) {
        var j = off + i * 4;
        W[i] = (m[j] << 24) | (m[j + 1] << 16) | (m[j + 2] << 8) | m[j + 3];
      }
      for (i = 16; i < 64; i++) {
        var x = W[i - 15], y = W[i - 2];
        var s0 = ((x >>> 7) | (x << 25)) ^ ((x >>> 18) | (x << 14)) ^ (x >>> 3);
        var s1 = ((y >>> 17) | (y << 15)) ^ ((y >>> 19) | (y << 13)) ^ (y >>> 10);
        W[i] = (W[i - 16] + s0 + W[i - 7] + s1) | 0;
      }
      var a = h0, b = h1, c = h2, d = h3, e = h4, f = h5, g = h6, h = h7;
      for (i = 0; i < 64; i++) {
        var S1 = ((e >>> 6) | (e << 26)) ^ ((e >>> 11) | (e << 21)) ^ ((e >>> 25) | (e << 7));
        var ch = (e & f) ^ (~e & g);
        var t1 = (h + S1 + ch + K[i] + W[i]) | 0;
        var S0 = ((a >>> 2) | (a << 30)) ^ ((a >>> 13) | (a << 19)) ^ ((a >>> 22) | (a << 10));
        var maj = (a & b) ^ (a & c) ^ (b & c);
        var t2 = (S0 + maj) | 0;
        h = g; g = f; f = e; e = (d + t1) | 0;
        d = c; c = b; b = a; a = (t1 + t2) | 0;
      }
      h0 = (h0 + a) | 0; h1 = (h1 + b) | 0; h2 = (h2 + c) | 0; h3 = (h3 + d) | 0;
      h4 = (h4 + e) | 0; h5 = (h5 + f) | 0; h6 = (h6 + g) | 0; h7 = (h7 + h) | 0;
    }
    var out = new Uint8Array(32);
    [h0, h1, h2, h3, h4, h5, h6, h7].forEach(function (v, k) {
      out[k * 4] = (v >>> 24) & 0xff;
      out[k * 4 + 1] = (v >>> 16) & 0xff;
      out[k * 4 + 2] = (v >>> 8) & 0xff;
      out[k * 4 + 3] = v & 0xff;
    });
    return out;
  }

  // ---------- utilidades ----------
  function utf8(texto) {
    if (typeof TextEncoder !== 'undefined') { return new TextEncoder().encode(texto); }
    return Uint8Array.from(Buffer.from(texto, 'utf8'));
  }

  function desdeUtf8(bytes) {
    if (typeof TextDecoder !== 'undefined') { return new TextDecoder().decode(bytes); }
    return Buffer.from(bytes).toString('utf8');
  }

  function unir(a, b) {
    var r = new Uint8Array(a.length + b.length);
    r.set(a); r.set(b, a.length);
    return r;
  }

  function hex(bytes) {
    var s = '';
    for (var i = 0; i < bytes.length; i++) { s += (bytes[i] < 16 ? '0' : '') + bytes[i].toString(16); }
    return s;
  }

  function desdeBase64(b64) {
    if (typeof atob === 'function') {
      var bin = atob(b64);
      var r = new Uint8Array(bin.length);
      for (var i = 0; i < bin.length; i++) { r[i] = bin.charCodeAt(i); }
      return r;
    }
    return Uint8Array.from(Buffer.from(b64, 'base64'));
  }

  // Mayúsculas, tildes y espacios de más no importan.
  function normalizar(nombre) {
    return String(nombre)
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .toLowerCase().replace(/\s+/g, ' ').trim();
  }

  // Clave = SHA-256 aplicado muchas veces (hace lento probar nombres a ciegas).
  function derivarClave(nombre, sal, vueltas) {
    var n = utf8(normalizar(nombre));
    var k = sha256(unir(utf8(sal + '|'), n));
    for (var i = 0; i < vueltas; i++) { k = sha256(unir(k, n)); }
    return k;
  }

  function comprobante(clave) {
    return hex(sha256(unir(utf8('comprobante|'), clave)));
  }

  // Cifrado de flujo: XOR con SHA-256(clave || contador).
  function descifrar(b64, clave) {
    var datos = desdeBase64(b64);
    var salida = new Uint8Array(datos.length);
    var contador = new Uint8Array(4);
    for (var bloque = 0; bloque * 32 < datos.length; bloque++) {
      contador[0] = (bloque >>> 24) & 0xff; contador[1] = (bloque >>> 16) & 0xff;
      contador[2] = (bloque >>> 8) & 0xff; contador[3] = bloque & 0xff;
      var flujo = sha256(unir(clave, contador));
      for (var i = 0; i < 32 && bloque * 32 + i < datos.length; i++) {
        salida[bloque * 32 + i] = datos[bloque * 32 + i] ^ flujo[i];
      }
    }
    return desdeUtf8(salida);
  }

  // Devuelve { fase, mensaje, html } si el nombre es correcto, o null.
  function comprobarRespuesta(nombre, final) {
    if (!final || !nombre) { return null; }
    var clave = derivarClave(nombre, final.sal, final.vueltas);
    var huella = comprobante(clave);
    for (var i = 0; i < final.fases.length; i++) {
      if (final.fases[i].comprobante === huella) {
        return JSON.parse(descifrar(final.fases[i].datos, clave));
      }
    }
    return null;
  }

  var api = {
    sha256: sha256, normalizar: normalizar, derivarClave: derivarClave,
    comprobante: comprobante, descifrar: descifrar, comprobarRespuesta: comprobarRespuesta, hex: hex
  };
  if (typeof module !== 'undefined' && module.exports) { module.exports = api; }
  global.Cifrado = api;
})(typeof window !== 'undefined' ? window : globalThis);
