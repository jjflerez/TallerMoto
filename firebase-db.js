/* ============================================================
   firebase-db.js – Conexión y Sincronización con Firebase
   ============================================================ */

const firebaseConfig = {
  apiKey: "AIzaSyDBC-BsuW9vMxW1XPyaZYsqnyV11pfYPdg",
  authDomain: "taller-7dbc9.firebaseapp.com",
  projectId: "taller-7dbc9",
  storageBucket: "taller-7dbc9.firebasestorage.app",
  messagingSenderId: "143216838510",
  appId: "1:143216838510:web:a45e4baafe665a1a03637f",
  measurementId: "G-5XG4LHFQ70"
};

// Inicializar Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

let isDataLoaded = false; // Llave de seguridad: No guardar hasta que cargue todo

/**
 * Guarda el estado actual en Firebase
 * Agrupamos por colecciones para que sea una base de datos real
 */
async function saveToFirebase() {
  if (!currentUser || !isDataLoaded) return; // No guardar si no hay sesión o si no ha cargado los datos previos

  try {
    const batch = db.batch();

    // Guardar colecciones principales
    // Nota: Para simplificar en esta etapa, guardamos el array completo en un documento
    // En una fase avanzada, guardaríamos cada cliente/venta como un documento individual
    batch.set(db.collection('config').doc('state'), {
      clientes: state.clientes,
      motos: state.motos,
      inventario: state.inventario,
      ventas: state.ventas,
      nextIds: state.nextIds,
      loginHistory: state.loginHistory || [],
      usuarios: typeof USERS !== 'undefined' ? USERS : []
    });

    await batch.commit();
    console.log("Sincronizado con Firebase ✅");
  } catch (error) {
    console.error("Error al sincronizar con Firebase:", error);
  }
}

/**
 * Carga los datos desde Firebase
 */
async function loadFromFirebase() {
  try {
    const doc = await db.collection('config').doc('state').get();
    
    if (doc.exists) {
      const data = doc.data();
      
      // Actualizar estado global
      state.clientes = data.clientes || [];
      state.motos = data.motos || [];
      state.inventario = data.inventario || [];
      state.ventas = data.ventas || [];
      state.nextIds = data.nextIds || { c: 1, m: 1, r: 1, o: 1, f: 1 };
      state.loginHistory = data.loginHistory || [];
      
      // Actualizar usuarios si existen
      if (data.usuarios && data.usuarios.length > 0) {
        if (typeof setUsers === 'function') {
          setUsers(data.usuarios);
        } else {
          USERS = data.usuarios;
        }
      }
      
      console.log("Datos cargados desde Firebase ✅");
      isDataLoaded = true;
      return true;
    } else {
      console.log("No hay datos en Firebase, se usarán datos locales.");
      isDataLoaded = true;
      return false;
    }
  } catch (error) {
    console.error("Error al cargar desde Firebase:", error);
    isDataLoaded = true; // Evitamos bloqueos, pero con precaución
    return false;
  }
}
