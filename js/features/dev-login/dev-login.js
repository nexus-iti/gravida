/*
 * Pill de usuarios de prueba para el login (solo entorno de prueba).
 *
 * Boton flotante abajo a la izquierda (a la derecha vive el panel de la API del servidor de desarrollo):
 * lista las cuentas ficticias por rol; un click entra directo, el lapiz solo completa el formulario.
 * Para los administradores con 2FA calcula el codigo TOTP y lo manda solo (WebCrypto, necesita https
 * o localhost).
 *
 * Es inerte salvo que exista /dev-usuarios.json: solo lo publica la imagen del front de Podman
 * (containers/front/Containerfile) y el servidor de desarrollo local (scripts/servidor-dev.mjs). En
 * cualquier otro despliegue la peticion da 404 y no se dibuja nada, asi que ninguna credencial viaja
 * con el codigo de produccion.
 *
 * Estilos: solo tokens del design system (css/global.css), asi sigue el tema claro y oscuro.
 * Iconos: Lucide (data-lucide), como el resto del portal.
 */
(function iniciarPillUsuariosPrueba() {
  'use strict';

  const formLogin = document.getElementById('form-login');
  const formSegundoFactor = document.getElementById('form-2fa');
  const campoIdentificador = document.getElementById('login-identificador');
  const campoContrasena = document.getElementById('login-contrasena');
  const campoCodigo = document.getElementById('codigo-2fa');
  if (!formLogin || !formSegundoFactor || !campoIdentificador || !campoContrasena || !campoCodigo) {
    return;
  }

  const ROLES = [
    { clave: 'Administrador', etiqueta: 'Administrador' },
    { clave: 'Tecnico_Asistente', etiqueta: 'Técnico asistente' },
    { clave: 'Solicitante', etiqueta: 'Solicitante' },
  ];
  const ESTADOS = { inactivo: 'Dado de baja', pendiente: 'Sin acceso' };

  // ---- TOTP (RFC 6238: SHA1, 30 s, 6 digitos), mismo calculo que seguridad/totp.php ----
  function base32ABytes(texto) {
    const alfabeto = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    let bits = '';
    for (const letra of texto.replace(/=+$/, '').toUpperCase()) {
      const valor = alfabeto.indexOf(letra);
      if (valor < 0) throw new Error('secreto TOTP invalido');
      bits += valor.toString(2).padStart(5, '0');
    }
    const bytes = new Uint8Array(Math.floor(bits.length / 8));
    for (let i = 0; i < bytes.length; i += 1) bytes[i] = parseInt(bits.slice(i * 8, i * 8 + 8), 2);
    return bytes;
  }

  async function codigoTotp(secreto) {
    if (!window.crypto || !window.crypto.subtle) {
      throw new Error('WebCrypto no disponible (hace falta https)');
    }
    const paso = Math.floor(Date.now() / 1000 / 30);
    const mensaje = new Uint8Array(8);
    new DataView(mensaje.buffer).setUint32(4, paso);
    const clave = await crypto.subtle.importKey(
      'raw',
      base32ABytes(secreto),
      { name: 'HMAC', hash: 'SHA-1' },
      false,
      ['sign'],
    );
    const hmac = new Uint8Array(await crypto.subtle.sign('HMAC', clave, mensaje));
    const desde = hmac[hmac.length - 1] & 0x0f;
    const numero =
      ((hmac[desde] & 0x7f) << 24) |
      (hmac[desde + 1] << 16) |
      (hmac[desde + 2] << 8) |
      hmac[desde + 3];
    return String(numero % 1000000).padStart(6, '0');
  }

  // ---- Formulario ----
  function escribir(campo, valor) {
    campo.value = valor;
    campo.dispatchEvent(new Event('input', { bubbles: true }));
  }

  function completar(usuario) {
    escribir(campoIdentificador, usuario.cedula);
    escribir(campoContrasena, usuario.password);
  }

  // Cuando login.js muestra el paso del codigo, completa el TOTP y lo envia.
  function esperarPasoCodigo(secreto) {
    const observador = new MutationObserver(async () => {
      if (formSegundoFactor.hidden) return;
      observador.disconnect();
      try {
        escribir(campoCodigo, await codigoTotp(secreto));
        formSegundoFactor.requestSubmit();
      } catch (error) {
        console.warn('[dev-login] no se pudo completar el 2FA:', error);
      }
    });
    observador.observe(formSegundoFactor, { attributes: true, attributeFilter: ['hidden'] });
    // Si no aparece el paso (contrasena mal, cuenta inactiva...) no queda observando para siempre.
    setTimeout(() => observador.disconnect(), 15000);
  }

  function entrar(usuario) {
    completar(usuario);
    if (usuario.totp) esperarPasoCodigo(usuario.totp);
    formLogin.requestSubmit();
  }

  // ---- UI ----
  function el(etiqueta, atributos, hijos) {
    const nodo = document.createElement(etiqueta);
    Object.entries(atributos || {}).forEach(([clave, valor]) => {
      if (clave === 'texto') nodo.textContent = valor;
      else nodo.setAttribute(clave, valor);
    });
    (hijos || []).forEach((hijo) => nodo.appendChild(hijo));
    return nodo;
  }

  // Los nombres van literales para que `bun run iconos` los meta en el subconjunto de Lucide.
  function icono(nombre) {
    return el('i', { 'data-lucide': nombre, class: 'icon icon-sm', 'aria-hidden': 'true' });
  }

  function dibujarIconosPill() {
    if (typeof dibujarIconos === 'function') dibujarIconos();
    else if (window.lucide) window.lucide.createIcons();
  }

  // Solo tokens de css/global.css (con el valor claro como respaldo): sigue el tema oscuro solo.
  const ESTILOS = `
    .dev-login{position:fixed;left:16px;bottom:16px;z-index:900;display:flex;flex-direction:column;align-items:flex-start;gap:8px;font-family:var(--fuente-principal,system-ui,sans-serif)}
    .dev-login button{font:inherit;color:inherit;cursor:pointer}
    .dev-login button:focus-visible{outline:none;box-shadow:var(--anillo-foco,0 0 0 2px #ffe5e5,0 0 0 4px #5d12d2)}
    .dev-login__pill{display:inline-flex;align-items:center;gap:8px;min-height:40px;padding:0 14px;border:1px solid var(--color-borde-medio,#8c809d);border-radius:var(--radio-pildora,999px);background:var(--color-fondo-tarjeta,#fff);color:var(--color-texto-principal,#1b0b3a);font-size:13px;font-weight:600;box-shadow:var(--sombra-tarjeta,0 1px 2px #1b0b3a0d)}
    .dev-login__pill:hover{background:var(--color-fondo-hover,#f6eaf0)}
    .dev-login__pill .icon{color:var(--color-primario-texto,#5d12d2)}
    .dev-login__panel{width:min(22rem,calc(100vw - 32px));max-height:min(70vh,36rem);overflow:auto;padding:16px;border:1px solid var(--color-borde-suave,#e9bfd3);border-radius:var(--radio-borde-grande,24px);background:var(--color-fondo-tarjeta,#fff);color:var(--color-texto-principal,#1b0b3a);box-shadow:var(--sombra-modal,0 20px 40px -8px #5d12d23d)}
    .dev-login__panel[hidden]{display:none}
    .dev-login__cabecera{display:flex;align-items:flex-start;justify-content:space-between;gap:8px}
    .dev-login__titulo{margin:0;font-family:var(--fuente-titulos,inherit);font-size:16px;font-weight:600;line-height:1.3}
    .dev-login__ayuda{margin:4px 0 0;font-size:12px;line-height:1.4;color:var(--color-texto-secundario,#5b4a73)}
    .dev-login__cerrar{display:inline-flex;align-items:center;justify-content:center;width:44px;height:44px;margin:-8px -8px 0 0;border:0;border-radius:var(--radio-borde-medio,12px);background:transparent;color:var(--color-texto-secundario,#5b4a73)}
    .dev-login__cerrar:hover{background:var(--color-fondo-hover,#f6eaf0);color:var(--color-texto-principal,#1b0b3a)}
    .dev-login__rol{display:flex;align-items:center;justify-content:space-between;gap:8px;margin:16px 0 8px}
    .dev-login__chip{display:inline-block;padding:2px 10px;border-radius:var(--radio-pildora,999px);background:var(--color-primario-suave,#efe4ff);color:var(--color-primario-texto,#5d12d2);font-size:12px;font-weight:600}
    .dev-login__cuenta{font-size:12px;color:var(--color-texto-secundario,#5b4a73)}
    .dev-login__fila{display:flex;gap:8px;margin-bottom:8px}
    .dev-login__entrar{flex:1;min-width:0;min-height:44px;padding:8px 12px;border:1px solid var(--color-borde-suave,#e9bfd3);border-radius:var(--radio-borde-medio,12px);background:var(--color-fondo-tarjeta,#fff);text-align:left}
    .dev-login__entrar:hover{background:var(--color-fondo-hover,#f6eaf0)}
    .dev-login__nombre{display:flex;align-items:center;gap:8px;font-size:13px;font-weight:600}
    .dev-login__aviso{padding:1px 8px;border-radius:var(--radio-pildora,999px);background:var(--color-peligro-fondo,#fde4ea);color:var(--color-peligro-texto,#b3123b);font-size:11px;font-weight:600}
    .dev-login__datos{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-family:var(--fuente-mono,ui-monospace,monospace);font-size:12px;color:var(--color-texto-secundario,#5b4a73)}
    .dev-login__nota{display:block;font-size:11px;color:var(--color-texto-secundario,#5b4a73)}
    .dev-login__completar{display:inline-flex;align-items:center;justify-content:center;flex:none;width:44px;border:1px solid var(--color-borde-suave,#e9bfd3);border-radius:var(--radio-borde-medio,12px);background:var(--color-fondo-tarjeta,#fff);color:var(--color-texto-secundario,#5b4a73)}
    .dev-login__completar:hover{background:var(--color-fondo-hover,#f6eaf0);color:var(--color-texto-principal,#1b0b3a)}
    .dev-login__todos{width:100%;min-height:44px;margin-top:8px;border:1px solid var(--color-borde-medio,#8c809d);border-radius:var(--radio-borde-medio,12px);background:transparent;font-size:13px;font-weight:600}
    .dev-login__todos:hover{background:var(--color-fondo-hover,#f6eaf0)}
  `;

  function construir(usuarios) {
    let abierto = false;
    let verTodos = false;

    const contenedor = el('div', { class: 'dev-login', id: 'dev-login' });
    const panel = el('div', {
      class: 'dev-login__panel',
      id: 'dev-login-panel',
      role: 'dialog',
      'aria-label': 'Usuarios de prueba',
      hidden: '',
    });
    const pill = el(
      'button',
      {
        type: 'button',
        class: 'dev-login__pill',
        'aria-expanded': 'false',
        'aria-controls': 'dev-login-panel',
      },
      [icono('flask-conical'), el('span', { texto: 'Usuarios de prueba' })],
    );

    function cerrar() {
      abierto = false;
      panel.hidden = true;
      pill.setAttribute('aria-expanded', 'false');
    }

    function pintar() {
      const cerrarBtn = el(
        'button',
        { type: 'button', class: 'dev-login__cerrar', 'aria-label': 'Cerrar' },
        [icono('x')],
      );
      cerrarBtn.addEventListener('click', () => {
        cerrar();
        pill.focus();
      });
      panel.replaceChildren(
        el('div', { class: 'dev-login__cabecera' }, [
          el('div', {}, [
            el('h2', { class: 'dev-login__titulo', texto: 'Usuarios de prueba' }),
            el('p', {
              class: 'dev-login__ayuda',
              texto:
                'Entorno de prueba. Tocá un usuario para entrar; el lápiz solo completa el formulario.',
            }),
          ]),
          cerrarBtn,
        ]),
      );

      ROLES.forEach(({ clave, etiqueta }) => {
        const delRol = usuarios.filter((u) => u.rol === clave);
        if (!delRol.length) return;
        const visibles = verTodos ? delRol : delRol.slice(0, 1);
        panel.appendChild(
          el('div', { class: 'dev-login__rol' }, [
            el('span', { class: 'dev-login__chip', texto: etiqueta }),
            el('span', {
              class: 'dev-login__cuenta',
              texto: verTodos ? `${delRol.length} usuarios` : `1 de ${delRol.length}`,
            }),
          ]),
        );
        visibles.forEach((usuario) => {
          const nombre = el('span', { class: 'dev-login__nombre' }, [
            el('span', { texto: usuario.nombre }),
          ]);
          if (ESTADOS[usuario.estado]) {
            nombre.appendChild(
              el('span', { class: 'dev-login__aviso', texto: ESTADOS[usuario.estado] }),
            );
          }
          const cuerpo = [
            nombre,
            el('span', {
              class: 'dev-login__datos',
              texto: `${usuario.cedula} · ${usuario.password}`,
            }),
          ];
          if (usuario.nota)
            cuerpo.push(el('span', { class: 'dev-login__nota', texto: usuario.nota }));

          const entrarBtn = el(
            'button',
            {
              type: 'button',
              class: 'dev-login__entrar',
              'aria-label': `Entrar como ${usuario.nombre}`,
            },
            cuerpo,
          );
          entrarBtn.addEventListener('click', () => {
            cerrar();
            entrar(usuario);
          });

          const completarBtn = el(
            'button',
            {
              type: 'button',
              class: 'dev-login__completar',
              title: 'Solo completar el formulario',
              'aria-label': `Completar el formulario con ${usuario.nombre}`,
            },
            [icono('pencil')],
          );
          completarBtn.addEventListener('click', () => {
            cerrar();
            completar(usuario);
          });

          panel.appendChild(el('div', { class: 'dev-login__fila' }, [entrarBtn, completarBtn]));
        });
      });

      const todos = el('button', {
        type: 'button',
        class: 'dev-login__todos',
        texto: verTodos ? 'Ver uno por rol' : `Ver los ${usuarios.length} usuarios`,
      });
      todos.addEventListener('click', () => {
        verTodos = !verTodos;
        pintar();
      });
      panel.appendChild(todos);
      dibujarIconosPill();
    }

    pill.addEventListener('click', () => {
      abierto = !abierto;
      panel.hidden = !abierto;
      pill.setAttribute('aria-expanded', String(abierto));
      if (abierto) pintar();
    });
    document.addEventListener('keydown', (evento) => {
      if (evento.key === 'Escape' && abierto) {
        cerrar();
        pill.focus();
      }
    });
    document.addEventListener('click', (evento) => {
      // composedPath se fija al despachar: sirve aunque el boton clickeado ya se haya reemplazado al repintar.
      if (abierto && !evento.composedPath().includes(contenedor)) cerrar();
    });

    contenedor.append(panel, pill);
    document.head.appendChild(el('style', { texto: ESTILOS }));
    document.body.appendChild(contenedor);
    dibujarIconosPill();
  }

  fetch('/dev-usuarios.json', { cache: 'no-store', credentials: 'omit' })
    .then((respuesta) => (respuesta.ok ? respuesta.json() : null))
    .then((datos) => {
      if (datos && Array.isArray(datos.usuarios) && datos.usuarios.length) {
        construir(datos.usuarios);
      }
    })
    .catch(() => {
      /* sin archivo: no es el entorno de prueba, no se dibuja nada */
    });
})();
