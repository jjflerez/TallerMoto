# 🔧 MotoTaller – Sistema de Ventas

Sistema de gestión para taller de motos. Aplicación web completa que corre directamente en el navegador, sin necesidad de servidor ni base de datos.

---

## 📁 Estructura del proyecto

```
taller-motos-proyecto/
│
├── index.html          ← Punto de entrada principal
│
├── css/
│   └── styles.css      ← Todos los estilos (variables, login, layout, componentes)
│
├── js/
│   ├── data.js         ← Estado global y datos de ejemplo
│   ├── auth.js         ← Lógica de autenticación (login / logout)
│   └── app.js          ← Lógica principal (módulos, tablas, modales, utils)
│
└── README.md           ← Este archivo
```

---

## 🚀 Cómo abrir el sistema

1. Descarga la carpeta completa `taller-motos-proyecto/`.
2. Abre el archivo **`index.html`** con cualquier navegador moderno (Chrome, Firefox, Edge).
3. Inicia sesión con uno de los usuarios de prueba (ver abajo).

> ⚠️ No requiere instalar nada ni conexión a internet (excepto para cargar la fuente de Google Fonts).

---

## 👥 Usuarios de prueba

| Rol           | Usuario    | Contraseña  |
|---------------|------------|-------------|
| Administrador | `admin`    | `admin123`  |
| Mecánico      | `mecanico` | `moto2025`  |
| Ventas        | `ventas`   | `ventas123` |

---

## 📦 Módulos incluidos

### 📊 Dashboard
- Resumen de ventas del mes
- Órdenes activas
- Total de clientes
- Alertas de stock bajo
- Listado de órdenes recientes

### 👤 Clientes
- Registro, edición y eliminación de clientes
- Búsqueda en tiempo real por nombre, cédula o teléfono
- Contador de motos por cliente

### 🏍️ Motos
- Registro de motos vinculadas a clientes
- Datos: placa, marca, modelo, año, cilindraje, color, kilometraje

### 📦 Inventario
- Control de repuestos con código y categoría
- Barra visual de nivel de stock
- Alertas automáticas cuando el stock llega al mínimo
- Filtro por categoría
- Precio de costo y venta

### 🔩 Órdenes de Servicio
- Creación de órdenes con ítems de mano de obra y repuestos
- Cálculo automático de totales
- Cambio de estado con un clic: Recibida → En proceso → En espera → Entregada
- Vista de detalle de cada orden
- Botón directo para facturar una orden

### 🧾 Ventas y Facturación
- Emisión de facturas vinculadas a órdenes o como venta directa
- Registro de forma de pago (Efectivo, Transferencia, Nequi/Daviplata, Crédito)
- Totales por período: total facturado, mano de obra, repuestos

---

## 🛠️ Tecnologías usadas

- **HTML5** – Estructura semántica
- **CSS3** – Variables CSS, Grid, Flexbox, animaciones
- **JavaScript (Vanilla)** – Sin frameworks, sin dependencias
- **Google Fonts** – Fuente Barlow / Barlow Condensed

---

## 💾 Persistencia de datos

Los datos se guardan **en memoria** mientras el navegador está abierto. Al recargar la página los datos de ejemplo se cargan nuevamente.

Para persistencia real, conecta el sistema a un backend (Node.js, PHP, Firebase, etc.) reemplazando las funciones en `js/data.js`.

---

## 📝 Personalización rápida

| Qué cambiar                         | Dónde                          |
|--------------------------------------|-------------------------------|
| Colores del sistema                  | `:root` en `css/styles.css`   |
| Usuarios y contraseñas               | `USERS` en `js/auth.js`       |
| Datos de ejemplo iniciales           | `loadSampleData()` en `js/data.js` |
| Nombre del taller                    | `index.html` (sidebar y login)|

---

## 📄 Licencia

Uso libre para el taller. Puedes modificar y distribuir según necesites.
