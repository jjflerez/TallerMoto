/* ============================================================
   auth.js  –  Autenticación de usuarios
   ============================================================ */

/**
 * Lista de usuarios del sistema.
 */
let USERS = [
  { user: 'admin',    pass: 'admin123',  role: 'Administrador', name: 'Admin General' },
  { user: 'ventas',   pass: 'ventas123', role: 'Ventas',        name: 'María López'   },
];

// Cargar usuarios personalizados si existen
const savedUsers = localStorage.getItem('motoTallerUsersList');
if (savedUsers) {
  try {
    USERS = JSON.parse(savedUsers);
  } catch(e) {}
}

let currentUser = null;

/**
 * Intenta iniciar sesión con las credenciales del formulario.
 */
function doLogin() {
  const u = document.getElementById('login-user').value.trim();
  const p = document.getElementById('login-pass').value;
  const found = USERS.find(x => x.user.toLowerCase() === u.toLowerCase() && x.pass === p);
  const err = document.getElementById('login-error');

  if (!found) {
    err.classList.add('show');
    document.getElementById('login-pass').value = '';
    document.getElementById('login-pass').focus();
    setTimeout(() => err.classList.remove('show'), 3000);
    return;
  }

  currentUser = found;
  localStorage.setItem('motoTallerUser', JSON.stringify(found));

  /* Animación de salida */
  const loginScreen = document.getElementById('login-screen');
  loginScreen.style.transition = 'opacity .4s ease';
  loginScreen.style.opacity = '0';

  setTimeout(async () => {
    loginScreen.classList.add('app-hidden');
    document.getElementById('app-shell').classList.remove('app-hidden');

    /* Actualizar datos del usuario en sidebar */
    document.getElementById('sidebar-user-name').textContent = found.name;
    document.getElementById('sidebar-user-role').textContent = found.role;

    /* Cargar datos iniciales */
    await loadSampleData();
    refresh();
  }, 400);
}

/**
 * Cierra la sesión actual y vuelve a la pantalla de login.
 */
function doLogout() {
  currentUser = null;
  localStorage.removeItem('motoTallerUser');

  document.getElementById('app-shell').classList.add('app-hidden');

  const loginScreen = document.getElementById('login-screen');
  loginScreen.classList.remove('app-hidden');
  loginScreen.style.opacity = '1';

  /* Limpiar formulario */
  document.getElementById('login-user').value = '';
  document.getElementById('login-pass').value = '';
  document.getElementById('login-user').focus();
}

/**
 * Restaurar sesión automáticamente
 */
async function restoreSession() {
  const savedUser = localStorage.getItem('motoTallerUser');
  if (savedUser) {
    try {
      currentUser = JSON.parse(savedUser);
      document.getElementById('login-screen').classList.add('app-hidden');
      document.getElementById('login-screen').style.opacity = '0';
      document.getElementById('app-shell').classList.remove('app-hidden');
      
      document.getElementById('sidebar-user-name').textContent = currentUser.name;
      document.getElementById('sidebar-user-role').textContent = currentUser.role;

      await loadSampleData();
      refresh();
    } catch(e) {
      localStorage.removeItem('motoTallerUser');
    }
  }
}

/**
 * Abre el modal de perfil con los datos actuales
 */
function openModalPerfil() {
  if (!currentUser) return;
  document.getElementById('p-nombre').value = currentUser.name;
  document.getElementById('p-pass').value = currentUser.pass;
  document.getElementById('modal-perfil').classList.add('open');
}

/**
 * Guarda los cambios del perfil
 */
function saveProfile() {
  const nuevoNombre = document.getElementById('p-nombre').value.trim();
  const nuevaPass = document.getElementById('p-pass').value.trim();

  if (!nuevoNombre || !nuevaPass) {
    return toast('Nombre y contraseña son obligatorios', 'error');
  }

  // Actualizar en la lista global de usuarios
  const u = USERS.find(x => x.user === currentUser.user);
  if (u) {
    u.name = nuevoNombre;
    u.pass = nuevaPass;
  }

  // Actualizar el usuario actual
  currentUser.name = nuevoNombre;
  currentUser.pass = nuevaPass;

  // Persistir cambios
  localStorage.setItem('motoTallerUsersList', JSON.stringify(USERS));
  localStorage.setItem('motoTallerUser', JSON.stringify(currentUser));

  // Actualizar UI
  document.getElementById('sidebar-user-name').textContent = nuevoNombre;
  
  closeModal('modal-perfil');
  toast('Perfil actualizado correctamente', 'success');
}

/**
 * Función de recuperación de contraseña (Modo Taller)
 */
function forgotPassword() {
  const user = document.getElementById('login-user').value.trim();
  if (!user) {
    alert("Por favor, escribe primero tu nombre de usuario en el campo de arriba.");
    return;
  }
  
  const found = USERS.find(x => x.user.toLowerCase() === user.toLowerCase());
  if (!found) {
    alert("El usuario '" + user + "' no existe en el sistema.");
    return;
  }

  // Clave maestra para el dueño del taller
  const masterKey = "12345"; 
  const input = prompt("Para recuperar la clave de '" + user + "', ingresa la CLAVE MAESTRA (o contacta al administrador):");
  
  if (input === masterKey) {
    alert("¡ACCESO CONCEDIDO!\n\nLa contraseña para el usuario '" + user + "' es: " + found.pass);
  } else if (input !== null) {
    alert("Clave Maestra incorrecta. No se puede recuperar la contraseña.");
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', restoreSession);
} else {
  restoreSession();
}
