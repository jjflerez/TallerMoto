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
function fillLogin(u, p) {
  document.getElementById('login-user').value = u;
  document.getElementById('login-pass').value = p;
  if (typeof toast === 'function') {
    toast('Cargando credenciales e ingresando...', 'success');
  }
  setTimeout(() => {
    doLogin();
  }, 300);
}

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
    
    /* FILTRO DE MENÚ POR ROL */
    const isAdmin = found.role === 'Administrador';
    
    // El Admin ve la gestión de usuarios
    document.getElementById('nav-usuarios').style.display   = isAdmin ? 'block' : 'none';
    
    // Todos ven Dashboard, Inventario, Clientes y Motos
    document.getElementById('nav-dashboard').style.display  = 'block';
    document.getElementById('nav-inventario').style.display = 'block';
    document.getElementById('nav-clientes').style.display   = 'block';
    document.getElementById('nav-motos').style.display      = 'block';
    
    // El Vendedor ve el POS (Ventas), el Admin también si lo desea (lo dejaré visible para ambos)
    document.getElementById('nav-ventas').style.display     = isAdmin ? 'none' : 'block';

    // Redirigir a la página correspondiente
    if (isAdmin) {
      showPage('dashboard', document.getElementById('nav-dashboard'));
    } else {
      showPage('ventas', document.getElementById('nav-ventas'));
    }

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

      /* FILTRO DE MENÚ POR ROL */
      const isAdmin = currentUser.role === 'Administrador';
      
      document.getElementById('nav-usuarios').style.display   = isAdmin ? 'block' : 'none';
      document.getElementById('nav-dashboard').style.display  = 'block';
      document.getElementById('nav-inventario').style.display = 'block';
      document.getElementById('nav-ventas').style.display     = isAdmin ? 'none' : 'block';

      if (isAdmin) {
        showPage('dashboard', document.getElementById('nav-dashboard'));
      } else {
        showPage('ventas', document.getElementById('nav-ventas'));
      }

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

/* ── Gestión de Usuarios (Admin) ─────────────────────────── */

function renderUsuarios() {
  const tb = document.getElementById('tabla-usuarios');
  if (!tb) return;

  tb.innerHTML = USERS.map(u => `
    <tr>
      <td><strong>${u.user}</strong><br><small>${u.name || ''}</small></td>
      <td><span class="badge ${u.role === 'Administrador' ? 'badge-red' : 'badge-gray'}">${u.role}</span></td>
      <td><code>${u.pass}</code></td>
      <td>
        <button class="btn btn-ghost btn-sm" onclick="editUsuario('${u.user}')">✏️</button>
        ${u.user !== 'admin' ? `<button class="btn btn-danger btn-sm" onclick="deleteUsuario('${u.user}')">🗑️</button>` : ''}
      </td>
    </tr>
  `).join('');
}

function clearUsuarioForm() {
  document.getElementById('u-user').value = '';
  document.getElementById('u-pass').value = '';
  document.getElementById('u-role').value = 'Empleado';
  document.getElementById('modal-user-title').textContent = 'Nuevo Usuario';
  window._editingUserId = null;
  document.getElementById('u-user').disabled = false;
}

function editUsuario(username) {
  const u = USERS.find(x => x.user === username);
  if (!u) return;

  document.getElementById('u-user').value = u.user;
  document.getElementById('u-pass').value = u.pass;
  document.getElementById('u-role').value = u.role;
  
  document.getElementById('modal-user-title').textContent = 'Editar Usuario';
  window._editingUserId = username;
  
  // No permitimos renombrar al 'admin' principal, pero sí a los demás
  document.getElementById('u-user').disabled = (username === 'admin'); 
  
  document.getElementById('modal-usuario').classList.add('open');
}

function saveUsuario() {
  const user = document.getElementById('u-user').value.trim().toLowerCase();
  const pass = document.getElementById('u-pass').value.trim();
  const role = document.getElementById('u-role').value;

  if (!user || !pass) return toast('Completa los campos obligatorios', 'error');

  if (window._editingUserId) {
    const u = USERS.find(x => x.user === window._editingUserId);
    if (u) {
      // Si cambió el nombre, verificamos que el nuevo no exista ya
      if (user !== window._editingUserId && USERS.find(x => x.user === user)) {
        return toast('El nuevo nombre de usuario ya está en uso', 'error');
      }
      u.user = user;
      u.pass = pass;
      u.role = role;
      toast('Usuario actualizado', 'success');
    }
  } else {
    if (USERS.find(x => x.user === user)) return toast('El nombre de usuario ya existe', 'error');
    USERS.push({ user, pass, role, name: user });
    toast('Usuario creado exitosamente', 'success');
  }

  localStorage.setItem('motoTallerUsersList', JSON.stringify(USERS));
  closeModal('modal-usuario');
  renderUsuarios();
}

function deleteUsuario(username) {
  if (username === 'admin') return;
  if (!confirm('¿Seguro que deseas eliminar al usuario ' + username + '?')) return;
  
  USERS = USERS.filter(x => x.user !== username);
  localStorage.setItem('motoTallerUsersList', JSON.stringify(USERS));
  renderUsuarios();
  toast('Usuario eliminado', 'success');
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', restoreSession);
} else {
  restoreSession();
}
