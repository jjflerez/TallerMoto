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
  ventas:    [],
  nextIds:   { c: 1, m: 1, r: 1, o: 1, f: 1 },
  loginHistory: [],

  /* Contabilidad básica */
  chartOfAccounts: {
    cash: { code: '1010', name: 'Caja', type: 'asset' },
    bank: { code: '1020', name: 'Banco - Cuenta Corriente', type: 'asset' },
    accountsReceivable: { code: '1100', name: 'Clientes - Cuentas x Cobrar', type: 'asset' },
    inventory: { code: '1200', name: 'Inventario', type: 'asset' },
    cogs: { code: '5000', name: 'Costo de Ventas', type: 'expense' },
    sales: { code: '4000', name: 'Ventas (Ingresos)', type: 'revenue' },
    vatPayable: { code: '2100', name: 'IVA por Pagar', type: 'liability' },
    equity: { code: '3000', name: 'Patrimonio / Utilidades Acumuladas', type: 'equity' }
  },
  journalEntries: [],
  bankAccounts: [
    { id: 'B001', name: 'Banco - Cuenta Principal', balance: 0, transactions: [] }
  ],

  /* Extras de UI */
  editingRepuesto: null,
};

/**
 * Carga registros desde Firebase o locales si no hay conexión.
 */
async function loadSampleData() {
  // Intentar cargar desde Firebase primero
  const loaded = await loadFromFirebase();
  if (loaded) return;

  const savedData = localStorage.getItem('motoTallerState');
  if (savedData) {
    try {
      Object.assign(state, JSON.parse(savedData));
      return;
    } catch(e) {}
  }

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
    { id: 'R001', codigo: 'R001', desc: 'Aceite Motor 10W-40 / 1L',         cat: 'Lubricantes', stock: 24, min: 5, costo: 12000,  venta: 25000  },
    { id: 'R002', codigo: 'R002', desc: 'Filtro Aceite Original Yamaha',     cat: 'Filtros',     stock: 12, min: 5, costo: 8500,   venta: 18000  },
    { id: 'R003', codigo: 'R003', desc: 'Kit Arrastre Pulsar NS200',         cat: 'Transmisión', stock: 5,  min: 2, costo: 85000,  venta: 135000 },
    { id: 'R004', codigo: 'R004', desc: 'Pastillas Freno NMAX Delanteras',   cat: 'Frenos',      stock: 8,  min: 4, costo: 25000,  venta: 45000  },
    { id: 'R005', codigo: 'R005', desc: 'Bujía NGK CR7HSA Original',         cat: 'Motor',       stock: 50, min: 10, costo: 4500,   venta: 12000  },
    { id: 'R006', codigo: 'R006', desc: 'Bombillo Principal LED H4',         cat: 'Eléctrico',   stock: 15, min: 5, costo: 18000,  venta: 35000  },
    { id: 'R007', codigo: 'R007', desc: 'Guaya Acelerador Boxer CT100',      cat: 'Guayas',      stock: 10, min: 3, costo: 7500,   venta: 15000  },
    { id: 'R008', codigo: 'R008', desc: 'Kit Empaques Motor GN125',          cat: 'Motor',       stock: 4,  min: 2, costo: 12000,  venta: 28000  },
    { id: 'R009', codigo: 'R009', desc: 'Espejos Universales Lujo (Par)',    cat: 'Accesorios',  stock: 6,  min: 2, costo: 15000,  venta: 38000  },
    { id: 'R010', codigo: 'R010', desc: 'Bandas Freno Traseras AKT 125',     cat: 'Frenos',      stock: 12, min: 5, costo: 9000,   venta: 22000  },
    { id: 'R011', codigo: 'R011', desc: 'Cadena 428H Reforzada 132L',        cat: 'Transmisión', stock: 10, min: 3, costo: 22000,  venta: 48000  },
    { id: 'R012', codigo: 'R012', desc: 'Filtro Aire Discover 125 ST',       cat: 'Filtros',     stock: 8,  min: 3, costo: 11000,  venta: 24000  },
    { id: 'R013', codigo: 'R013', desc: 'Llanta 90/90-18 Pistera',           cat: 'Llantas',     stock: 6,  min: 2, costo: 95000,  venta: 145000, compat: 'Boxer, NKD, RX115' },
    { id: 'R014', codigo: 'R014', desc: 'Biela Motor Original Boxer',        cat: 'Motor',       stock: 3,  min: 1, costo: 65000,  venta: 98000,  compat: 'Boxer CT100, Boxer Platino' },
    { id: 'R015', codigo: 'R015', desc: 'Kit Cilindro Completo NKD',         cat: 'Motor',       stock: 4,  min: 1, costo: 120000, venta: 185000, compat: 'AKT NKD 125, EVO NE' },
    { id: 'R016', codigo: 'R016', desc: 'Rines de Aluminio 1.60x17 (Par)',   cat: 'Accesorios',  stock: 2,  min: 1, costo: 110000, venta: 165000, compat: 'Boxer, AX100, Viva R' },
  ];

  state.ventas = [
    { 
      id: 'FAC-001', 
      clienteId: 'C001', 
      items: [
        { id: 'R001', desc: 'Aceite Motor 10W-40 / 1L', precio: 18500, qty: 1 },
        { id: 'R002', desc: 'Filtro de aceite Honda CB', precio: 14000, qty: 1 }
      ],
      rep: 32500, desc: 500, total: 32000, pago: 'Efectivo', obs: 'Venta inicial de prueba', fecha: '2025-05-01' 
    },
  ];

  state.nextIds = { c: 4, m: 4, r: 17, f: 2 };
}
