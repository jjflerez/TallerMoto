/* ============================================================
   data.js  –  Estado global y datos de ejemplo
   ============================================================ */

/**
 * Estado central de la aplicación.
 * Todos los módulos leen y escriben aquí.
 */
const state = {
  clientes:  [],
  motos:     [],
  inventario:[],
  ordenes:   [],
  ventas:    [],
  nextIds:   { c: 1, m: 1, r: 1, o: 1, f: 1 },

  /* Extras de UI */
  editingRepuesto: null,
  currentOrdenId:  null,
  ordenFiltro:     '',
};

/**
 * Carga registros de ejemplo para demostración.
 * Llama esta función una sola vez al iniciar sesión.
 */
function loadSampleData() {
  state.clientes = [
    { id: 'C001', nombre: 'Carlos Martínez López', cedula: '10.234.567', tel: '315 234 5678', ciudad: 'Medellín', email: 'carlos.m@mail.com' },
    { id: 'C002', nombre: 'María Fernanda Gómez',  cedula: '52.345.678', tel: '312 987 6543', ciudad: 'Bello',    email: 'mfgomez@mail.com'  },
    { id: 'C003', nombre: 'Andrés Felipe Ruiz',    cedula: '71.456.789', tel: '300 111 2233', ciudad: 'Envigado', email: 'afruiz@mail.com'    },
  ];

  state.motos = [
    { id: 'M001', clienteId: 'C001', placa: 'ABJ-12C', marca: 'Honda',  modelo: 'CB 150',       anio: '2021', cc: '150 cc', color: 'Negro', km: 18500 },
    { id: 'M002', clienteId: 'C002', placa: 'MZC-35D', marca: 'Yamaha', modelo: 'FZ 25',         anio: '2022', cc: '250 cc', color: 'Azul',  km: 9200  },
    { id: 'M003', clienteId: 'C003', placa: 'XYZ-88E', marca: 'Bajaj',  modelo: 'Pulsar NS200',  anio: '2020', cc: '200 cc', color: 'Rojo',  km: 32000 },
  ];

  state.inventario = [
    { id: 'R001', codigo: 'R001', desc: 'Aceite Motor 10W-40 / 1L',         cat: 'Lubricantes', stock: 24, min: 5, costo: 12000,  venta: 18500  },
    { id: 'R002', codigo: 'R002', desc: 'Filtro de aceite Honda CB',         cat: 'Filtros',     stock: 3,  min: 3, costo: 8000,   venta: 14000  },
    { id: 'R003', codigo: 'R003', desc: 'Kit de arrastre 428 estándar',      cat: 'Transmisión', stock: 6,  min: 2, costo: 45000,  venta: 72000  },
    { id: 'R004', codigo: 'R004', desc: 'Pastillas de freno delantero',      cat: 'Frenos',      stock: 2,  min: 4, costo: 22000,  venta: 35000  },
    { id: 'R005', codigo: 'R005', desc: 'Bujía NGK CR7HSA',                  cat: 'Encendido',   stock: 30, min: 8, costo: 4500,   venta: 8000   },
    { id: 'R006', codigo: 'R006', desc: 'Llanta trasera 3.00-17',            cat: 'Llantas',     stock: 4,  min: 2, costo: 85000,  venta: 130000 },
  ];

  state.ordenes = [
    {
      id: 'OS-001', clienteId: 'C001', motoId: 'M001', mecanico: 'Juan C.', km: 18500,
      falla: 'Cambio de aceite y filtro', diag: 'Mantenimiento preventivo',
      fecha: '2025-05-01', estado: 'Entregada',
      items: [
        { desc: 'Aceite Motor 10W-40', tipo: 'Repuesto',      qty: 2, precio: 18500 },
        { desc: 'Filtro de aceite',    tipo: 'Repuesto',      qty: 1, precio: 14000 },
        { desc: 'Mano de obra',        tipo: 'Mano de obra',  qty: 1, precio: 25000 },
      ],
    },
    {
      id: 'OS-002', clienteId: 'C002', motoId: 'M002', mecanico: 'Pedro L.', km: 9200,
      falla: 'Freno delantero no agarra bien', diag: 'Pastillas de freno desgastadas',
      fecha: '2025-05-02', estado: 'En proceso',
      items: [
        { desc: 'Pastillas de freno delantero', tipo: 'Repuesto',     qty: 1, precio: 35000 },
        { desc: 'Mano de obra',                 tipo: 'Mano de obra', qty: 1, precio: 40000 },
      ],
    },
    {
      id: 'OS-003', clienteId: 'C003', motoId: 'M003', mecanico: 'Carlos M.', km: 32000,
      falla: 'Cadena suelta y desgastada', diag: 'Cambio kit de arrastre',
      fecha: '2025-05-04', estado: 'En espera',
      items: [
        { desc: 'Kit de arrastre 428',   tipo: 'Repuesto',     qty: 1, precio: 72000 },
        { desc: 'Mano de obra kit',      tipo: 'Mano de obra', qty: 1, precio: 55000 },
      ],
    },
  ];

  state.ventas = [
    { id: 'FAC-001', ordenId: 'OS-001', rep: 32000, mo: 25000, desc: 0, total: 57000, pago: 'Efectivo', obs: '', fecha: '2025-05-01' },
  ];

  state.nextIds = { c: 4, m: 4, r: 7, o: 4, f: 2 };
}
