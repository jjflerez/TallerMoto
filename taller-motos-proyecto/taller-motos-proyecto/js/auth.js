/* ============================================================
   auth.js  –  Autenticación de usuarios
   ============================================================ */

/**
 * Lista de usuarios del sistema.
 * En producción esto debe ser validado en el servidor.
 */
const USERS = [
  { user: 'admin',    pass: 'admin123',  role: 'Administrador', name: 'Admin General' },
  { user: 'mecanico', pass: 'moto2025',  role: 'Mecánico',      name: 'Juan Pérez'    },
  { user: 'ventas',   pass: 'ventas123', role: 'Ventas',        name: 'María López'   },
];

let currentUser = null;

/**
 * Intenta iniciar sesión con las credenciales del formulario.
 */
function doLogin() {
  const u = document.getElementById('login-user').value.trim();
  const p = document.getElementById('login-pass').value;
  const found = USERS.find(x => x.user === u && x.pass === p);
  const err = document.getElementById('login-error');

  if (!found) {
    err.classList.add('show');
    document.getElementById('login-pass').value = '';
    document.getElementById('login-pass').focus();
    setTimeout(() => err.classList.remove('show'), 3000);
    return;
  }

  currentUser = found;

  /* Animación de salida */
  const loginScreen = document.getElementById('login-screen');
  loginScreen.style.transition = 'opacity .4s ease';
  loginScreen.style.opacity = '0';

  setTimeout(() => {
    loginScreen.classList.add('app-hidden');
    document.getElementById('app-shell').classList.remove('app-hidden');

    /* Actualizar datos del usuario en sidebar */
    document.getElementById('sidebar-user-name').textContent = found.name;
    document.getElementById('sidebar-user-role').textContent = found.role;

    /* Cargar datos iniciales */
    loadSampleData();
    refresh();
  }, 400);
}

/**
 * Cierra la sesión actual y vuelve a la pantalla de login.
 */
function doLogout() {
  currentUser = null;

  document.getElementById('app-shell').classList.add('app-hidden');

  const loginScreen = document.getElementById('login-screen');
  loginScreen.classList.remove('app-hidden');
  loginScreen.style.opacity = '1';

  /* Limpiar formulario */
  document.getElementById('login-user').value = '';
  document.getElementById('login-pass').value = '';
  document.getElementById('login-user').focus();
}
