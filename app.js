/* ============================================================
   app.js  –  Lógica principal de la aplicación
   ============================================================ */
const MORA_DIARIA = 1000; // Valor de la mora por día de retraso (COP)

/* ── CONFIGURACIÓN DE CORREO (EmailJS) ───────────────────────
   Pega aquí tus llaves de emailjs.com para activar el envío real
   ────────────────────────────────────────────────────────── */
const EMAILJS_PUBLIC_KEY = "rWEvC-53wQrarZij8";
const EMAILJS_SERVICE_ID = "service_2p9bbl3";
const EMAILJS_TEMPLATE_ID = "template_z9v1z0s";

// Opción A: URL de Google Apps Script para correo 100% gratis
const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzaIh7q3CvVVT09Ow086xmQk2aQllCjLUEb4DklOuQ/exec";

/* ── Navegación ─────────────────────────────────────────────── */

function showPage(name, btn) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById('page-' + name).classList.add('active');
  if (btn) btn.classList.add('active');

  const titles = {
    dashboard:  'Dashboard',
    clientes:   'Clientes',
    motos:      'Motos registradas',
    inventario: 'Inventario',
    ventas:     'Ventas y facturación',
    usuarios:   'Gestión de Usuarios',
  };
  document.getElementById('topbar-title').textContent = titles[name] || name;
  
  // Cerrar sidebar en móvil tras click
  const sb = document.getElementById('sidebar');
  if (sb.classList.contains('open')) toggleSidebar();

  // Auto-foco en lector de barras si es ventas
  if (name === 'ventas') {
    setTimeout(() => {
      const inp = document.getElementById('pos-barcode-input');
      if (inp) inp.focus();
    }, 300);
  }

  if (name === 'usuarios') {
    if (typeof renderUsuarios === 'function') {
      renderUsuarios();
    }
  }

  if (name === 'ventas') {
    setTimeout(() => {
      document.getElementById('pos-barcode-input')?.focus();
    }, 100);
  }

  refresh();
}

function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
  document.getElementById('sidebar-overlay').classList.toggle('show');
}

/* ── Refresh global ─────────────────────────────────────────── */

function refresh() {
  localStorage.setItem('motoTallerState', JSON.stringify(state));
  saveToFirebase(); // Sincronizar con la nube
  updateBadges();
  renderDashboard();
  renderClientes();
  renderMotos();
  renderInventario();
  renderVentas();
  checkCredits();
  inyectarNuevosProductos();
  renderInsights();
}

function inyectarNuevosProductos() {
  const nuevos = [
    { id: 'R013', codigo: 'R013', desc: 'Llanta 90/90-18 Pistera',           cat: 'Llantas',     stock: 6,  min: 2, costo: 95000,  venta: 145000, compat: 'Boxer, NKD, RX115' },
    { id: 'R014', codigo: 'R014', desc: 'Biela Motor Original Boxer',        cat: 'Motor',       stock: 3,  min: 1, costo: 65000,  venta: 98000,  compat: 'Boxer CT100, Boxer Platino' },
    { id: 'R015', codigo: 'R015', desc: 'Kit Cilindro Completo NKD',         cat: 'Motor',       stock: 4,  min: 1, costo: 120000, venta: 185000, compat: 'AKT NKD 125, EVO NE' },
    { id: 'R016', codigo: 'R016', desc: 'Rines de Aluminio 1.60x17 (Par)',   cat: 'Accesorios',  stock: 2,  min: 1, costo: 110000, venta: 165000, compat: 'Boxer, AX100, Viva R' },
  ];

  let agregados = false;
  nuevos.forEach(n => {
    if (!state.inventario.find(r => r.codigo === n.codigo)) {
      state.inventario.push(n);
      agregados = true;
    }
  });

  if (agregados) {
    if (state.nextIds.r < 17) state.nextIds.r = 17;
    toast('Nuevos productos sincronizados con la nube', 'info');
    refresh();
  }
}

function updateBadges() {
  const lowStock  = state.inventario.filter(r => r.stock <= r.min).length;

  const bInv = document.getElementById('badge-inv');
  if (bInv) {
    bInv.textContent    = lowStock;
    bInv.style.display  = lowStock  ? '' : 'none';
  }
}

function renderDashboard() {
  const alertDiv = document.getElementById('alertas-credito');
  if (!alertDiv) return;

  const hoy = new Date().toISOString().split('T')[0];
  const mesActual = hoy.substring(0, 7); // YYYY-MM
  
  const ventasMes = state.ventas.filter(v => v.fecha.startsWith(mesActual));
  const totalMes = ventasMes.reduce((s, v) => s + v.total, 0);
  
  // Actualizar Cards
  const dVent = document.getElementById('dash-ventas');
  const dVentSub = document.getElementById('dash-ventas-sub');
  const dCli = document.getElementById('dash-clientes');
  const dStock = document.getElementById('dash-stock');

  if (dVent) dVent.textContent = fmt(totalMes);
  if (dVentSub) dVentSub.textContent = `${ventasMes.length} facturas este mes`;
  if (dCli) dCli.textContent = state.clientes.length;

  const bajoStock = state.inventario.filter(r => r.stock <= r.min);
  if (dStock) dStock.textContent = bajoStock.length;

  // Cálculo de Utilidad (Solo Admin)
  const dUtil = document.getElementById('dash-utilidad');
  const dUtilCard = document.getElementById('card-utilidad');
  
  if (currentUser?.role === 'Administrador' && dUtil) {
    let costoTotalMes = 0;
    ventasMes.forEach(v => {
      v.items.forEach(item => {
        const p = state.inventario.find(r => r.id === item.id);
        if (p) costoTotalMes += (p.costo * item.qty);
      });
    });
    const utilidad = totalMes - costoTotalMes;
    dUtil.textContent = fmt(utilidad);
    if (dUtilCard) dUtilCard.style.display = 'flex';
  } else if (dUtilCard) {
    dUtilCard.style.display = 'none';
  }

  const loginHistoryCard = document.getElementById('dash-login-history');
  const loginHistoryList = document.getElementById('dash-login-history-list');
  if (loginHistoryCard && loginHistoryList) {
    if (currentUser?.role === 'Administrador') {
      const history = (state.loginHistory || []).slice(0, 5);
      loginHistoryCard.style.display = 'block';
      if (!history.length) {
        loginHistoryList.innerHTML = '<div class="empty-state" style="padding:14px;">No hay registros de ingreso aún.</div>';
      } else {
        loginHistoryList.innerHTML = history.map(item => `
          <div style="display:flex; justify-content:space-between; align-items:center; padding:10px 0; border-bottom:1px solid var(--border);">
            <div>
              <div style="font-weight:700; color:var(--text)">${item.name} <small style="color:var(--text3)">(${item.user})</small></div>
              <div style="font-size:12px; color:var(--text3)">${item.role}</div>
            </div>
            <div style="font-size:12px; color:var(--text2); text-align:right">${formatDateTime(item.when)}</div>
          </div>
        `).join('');
      }
    } else {
      loginHistoryCard.style.display = 'none';
    }
  }

  // Alertas de Stock
  const alertInv = document.getElementById('dash-alertas');
  if (alertInv) {
    if (bajoStock.length === 0) {
      alertInv.innerHTML = '<div class="empty-state"><div class="icon">✅</div>Todo el stock está al día</div>';
    } else {
      alertInv.innerHTML = bajoStock.map(r => `
        <div style="display:flex; justify-content:space-between; align-items:center; background:rgba(255,65,108,0.05); padding:12px; border-radius:10px; margin-bottom:8px; border:1px solid rgba(255,65,108,0.2)">
          <div>
            <div style="font-weight:700; color:var(--red)">${r.desc}</div>
            <div style="font-size:11px; color:var(--text3)">Quedan solo ${r.stock} unidades</div>
          </div>
          <button class="btn btn-ghost btn-sm" onclick="showPage('inventario'); editRepuesto('${r.id}')">Pedir</button>
        </div>
      `).join('');
    }
  }

  const pendientes = state.ventas.filter(v => v.pago === 'Crédito' && v.estadoPago !== 'Pagado');
  if (pendientes.length === 0) {
    alertDiv.innerHTML = '';
    return;
  }

  const vencidos = pendientes.filter(v => v.fechaVencimiento <= hoy);
  const proximos = pendientes.filter(v => v.fechaVencimiento > hoy && v.fechaVencimiento <= getNextDate(3));
  
  if (vencidos.length === 0 && proximos.length === 0) {
    alertDiv.innerHTML = '';
    return;
  }

  let html = '';

  // Bloque de Vencidos
  if (vencidos.length > 0) {
    html += `
      <div style="background:rgba(255,107,107,0.1); border:1px solid var(--red); padding:15px; border-radius:12px; margin-bottom:15px">
        <h4 style="margin:0 0 10px 0; color:var(--red)">⚠️ Cuentas VENCIDAS (${vencidos.length})</h4>
        <div style="display:flex; flex-direction:column; gap:8px">
          ${vencidos.map(v => renderCreditRow(v, 'red')).join('')}
        </div>
      </div>
    `;
  }

  // Bloque de Próximos
  if (proximos.length > 0) {
    html += `
      <div style="background:rgba(255,165,0,0.1); border:1px solid var(--orange); padding:15px; border-radius:12px; margin-bottom:15px">
        <h4 style="margin:0 0 10px 0; color:var(--orange)">⏳ Próximos a vencer (${proximos.length})</h4>
        <div style="display:flex; flex-direction:column; gap:8px">
          ${proximos.map(v => renderCreditRow(v, 'orange')).join('')}
        </div>
      </div>
    `;
  }

  alertDiv.innerHTML = html;

  // Calcular los más vendidos
  const repMasVendidos = {};
  state.ventas.forEach(v => {
    v.items.forEach(item => {
      if (!repMasVendidos[item.desc]) {
        repMasVendidos[item.desc] = { qty: 0, total: 0 };
      }
      repMasVendidos[item.desc].qty += item.qty;
      repMasVendidos[item.desc].total += (item.price * item.qty);
    });
  });

  const topVendidos = Object.keys(repMasVendidos)
    .map(name => ({ name, ...repMasVendidos[name] }))
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 5);

  const containerTop = document.getElementById('dash-top-vendidos');
  if (containerTop) {
    if (!topVendidos.length) {
      containerTop.innerHTML = '<div class="empty-state">No hay ventas registradas aún</div>';
    } else {
      containerTop.innerHTML = topVendidos.map((item, idx) => `
        <div style="display:flex; justify-content:space-between; align-items:center; padding:10px 0; border-bottom:1px solid var(--border)">
          <div style="display:flex; align-items:center; gap:10px">
            <span style="font-weight:700; color:var(--orange); width:20px">${idx + 1}.</span>
            <div>
              <div style="font-weight:600">${item.name}</div>
              <div style="font-size:11px; color:var(--text3)">${item.qty} uds. vendidas</div>
            </div>
          </div>
          <div style="font-weight:700; color:var(--green)">${fmt(item.total)}</div>
        </div>
      `).join('');
    }
  }
}

function renderCreditRow(v, color) {
  const c = state.clientes.find(x => x.id === v.clienteId);
  const hoy = new Date().toISOString().split('T')[0];
  const msgLabel = v.fechaVencimiento === hoy ? 'Vence HOY' : (v.fechaVencimiento < hoy ? 'Atrasado' : 'Vence pronto');
  
  let totalMora = 0;
  let dias = 0;
  if (v.fechaVencimiento < hoy) {
    const diffTime = Math.abs(new Date(hoy) - new Date(v.fechaVencimiento));
    dias = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    totalMora = dias * MORA_DIARIA;
  }
  const totalActual = v.total + totalMora;

  return `
    <div style="display:flex; justify-content:space-between; align-items:center; background:var(--bg2); padding:10px; border-radius:8px; font-size:13px; border-left:4px solid var(--${color})">
      <div style="flex:1">
        <strong>${c ? c.nombre : 'Cliente Desconocido'}</strong> <br/>
        <span style="color:var(--text3)">${msgLabel}: ${v.fechaVencimiento} ${dias > 0 ? `(${dias}d de mora)` : ''}</span>
      </div>
      <div style="display:flex; gap:5px; align-items:center">
        <div style="text-align:right; margin-right:10px">
          <strong style="color:var(--${color}); display:block">${fmt(totalActual)}</strong>
          ${totalMora > 0 ? `<small style="font-size:10px; color:var(--text3)">Base: ${fmt(v.total)}</small>` : ''}
        </div>
        <button class="btn btn-primary btn-sm" style="background:#25D366; border:0" onclick="sendWhatsAppReminder('${v.id}', ${totalActual}, ${dias})">📱 WA</button>
        ${currentUser?.role !== 'Administrador' ? `<button class="btn btn-ghost btn-sm" onclick="marcarPagado('${v.id}')">✅</button>` : ''}
      </div>
    </div>
  `;
}

function getNextDate(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

function marcarPagado(ventaId) {
  const v = state.ventas.find(x => x.id === ventaId);
  if (v) {
    v.estadoPago = 'Pagado';
    toast('Cobro registrado exitosamente', 'success');
    refresh();
  }
}

/* ── Clientes ───────────────────────────────────────────────── */

function renderClientes() {
  const q        = (document.getElementById('search-clientes')?.value || '').toLowerCase();
  const filtered = state.clientes.filter(c =>
    c.nombre.toLowerCase().includes(q) || c.cedula.includes(q) || c.tel.includes(q)
  );
  const tb = document.getElementById('tabla-clientes');
  if (!filtered.length) {
    tb.innerHTML = `<tr><td colspan="7"><div class="empty-state"><div class="icon">👤</div>Sin clientes</div></td></tr>`;
    return;
  }
  tb.innerHTML = filtered.map(c => {
    const motoCount = state.motos.filter(m => m.clienteId === c.id).length;
    return `<tr>
      <td><span class="tag">${c.id}</span></td>
      <td><strong>${c.nombre}</strong></td>
      <td>${c.cedula}</td>
      <td>${c.tel}</td>
      <td>${c.ciudad || '–'}</td>
      <td><span class="badge badge-blue">${motoCount} moto${motoCount !== 1 ? 's' : ''}</span></td>
      <td>
        <button class="btn btn-ghost btn-sm" onclick="editCliente('${c.id}')">✏️</button>
        ${currentUser?.role === 'Administrador' ? `
        <button class="btn btn-danger btn-sm" onclick="deleteCliente('${c.id}')">🗑️</button>
        ` : ''}
      </td>
    </tr>`;
  }).join('');
}

function openModal(id) {
  const modal = document.getElementById(id);
  if (!modal) return;

  // Limpieza inteligente según el modal
  if (id === 'modal-cliente')  { clearClienteForm(); }
  if (id === 'modal-moto')     { clearMotoForm();      populateSelects(); }
  if (id === 'modal-repuesto') { clearRepuestoForm(); }
  if (id === 'modal-factura')  { clearFacturaForm();   populateSelects(); }
  if (id === 'modal-usuario')  { clearUsuarioForm(); }
  
  modal.classList.add('open');
}
function closeModal(id) { document.getElementById(id).classList.remove('open'); }

function clearClienteForm() {
  ['c-nombre','c-cedula','c-tel','c-ciudad','c-email'].forEach(id => {
    const el = document.getElementById(id);
    if(el) el.value = '';
  });
  document.getElementById('modal-cliente-title').textContent = 'Nuevo cliente';
  window._editingClienteId = null;
}

function saveCliente() {
  const nombre = document.getElementById('c-nombre').value.trim();
  const cedula = document.getElementById('c-cedula').value.trim();
  const tel    = document.getElementById('c-tel').value.trim();
  if (!nombre || !cedula || !tel) { toast('Completa los campos obligatorios', 'error'); return; }

  if (window._editingClienteId) {
    const c = state.clientes.find(x => x.id === window._editingClienteId);
    c.nombre = nombre; c.cedula = cedula; c.tel = tel;
    c.ciudad = document.getElementById('c-ciudad').value.trim();
    c.email  = document.getElementById('c-email').value.trim();
    toast('Cliente actualizado', 'success');
  } else {
    const id = 'C' + String(state.nextIds.c++).padStart(3, '0');
    state.clientes.push({ id, nombre, cedula, tel,
      ciudad: document.getElementById('c-ciudad').value.trim(),
      email:  document.getElementById('c-email').value.trim(),
    });
    toast('Cliente registrado', 'success');
  }
  closeModal('modal-cliente');
  refresh();
}

function editCliente(id) {
  const c = state.clientes.find(x => x.id === id);
  document.getElementById('c-nombre').value = c.nombre;
  document.getElementById('c-cedula').value = c.cedula;
  document.getElementById('c-tel').value    = c.tel;
  document.getElementById('c-ciudad').value = c.ciudad || '';
  document.getElementById('c-email').value  = c.email  || '';
  document.getElementById('modal-cliente-title').textContent = 'Editar cliente';
  window._editingClienteId = id;
  document.getElementById('modal-cliente').classList.add('open');
}

function deleteCliente(id) {
  if (!confirm('¿Eliminar este cliente?')) return;
  state.clientes = state.clientes.filter(c => c.id !== id);
  toast('Cliente eliminado', 'success');
  refresh();
}

/* ── Motos ──────────────────────────────────────────────────── */

function renderMotos() {
  const q        = (document.getElementById('search-motos')?.value || '').toLowerCase();
  const filtered = state.motos.filter(m =>
    m.placa.toLowerCase().includes(q) || m.marca.toLowerCase().includes(q) || m.modelo.toLowerCase().includes(q)
  );
  const tb = document.getElementById('tabla-motos');
  if (!filtered.length) {
    tb.innerHTML = `<tr><td colspan="7"><div class="empty-state"><div class="icon">🏍️</div>Sin motos</div></td></tr>`;
    return;
  }
  tb.innerHTML = filtered.map(m => {
    const c = state.clientes.find(x => x.id === m.clienteId);
    return `<tr>
      <td><span class="tag">${m.id}</span></td>
      <td><strong>${m.placa}</strong></td>
      <td>${m.marca} ${m.modelo}</td>
      <td>${m.anio || '–'}</td>
      <td>${m.cc   || '–'}</td>
      <td>${c ? c.nombre : '–'}</td>
      <td>
        <div style="display:flex; gap:4px">
          <button class="btn btn-primary btn-sm" onclick="verHojaDeVida('${m.placa}')" title="Ver Historial / Hoja de Vida">📋 Historia</button>
          <button class="btn btn-ghost btn-sm" onclick="editMoto('${m.id}')">✏️</button>
          ${currentUser?.role === 'Administrador' ? `
          <button class="btn btn-danger btn-sm" onclick="deleteMoto('${m.id}')">🗑️</button>
          ` : ''}
        </div>
      </td>
    </tr>`;
  }).join('');
}

function clearMotoForm() {
  ['m-placa','m-marca','m-modelo','m-anio','m-cc','m-color','m-km'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('modal-moto-title').textContent = 'Nueva moto';
  window._editingMotoId = null;
}

function saveMoto() {
  const clienteId = document.getElementById('m-cliente').value;
  const placa     = document.getElementById('m-placa').value.trim().toUpperCase();
  const marca     = document.getElementById('m-marca').value.trim();
  const modelo    = document.getElementById('m-modelo').value.trim();
  if (!clienteId || !placa || !marca || !modelo) { toast('Completa los campos obligatorios', 'error'); return; }

  if (window._editingMotoId) {
    const m = state.motos.find(x => x.id === window._editingMotoId);
    m.clienteId = clienteId; m.placa = placa; m.marca = marca; m.modelo = modelo;
    m.anio  = document.getElementById('m-anio').value;
    m.cc    = document.getElementById('m-cc').value;
    m.color = document.getElementById('m-color').value;
    m.km    = parseInt(document.getElementById('m-km').value) || 0;
    toast('Moto actualizada', 'success');
  } else {
    const id = 'M' + String(state.nextIds.m++).padStart(3, '0');
    state.motos.push({ id, clienteId, placa, marca, modelo,
      anio:  document.getElementById('m-anio').value,
      cc:    document.getElementById('m-cc').value,
      color: document.getElementById('m-color').value,
      km:    parseInt(document.getElementById('m-km').value) || 0,
    });
    toast('Moto registrada', 'success');
  }
  closeModal('modal-moto');
  refresh();
}

function editMoto(id) {
  const m = state.motos.find(x => x.id === id);
  populateSelects(); // Asegurar que los clientes están cargados
  document.getElementById('m-cliente').value = m.clienteId;
  document.getElementById('m-placa').value   = m.placa;
  document.getElementById('m-marca').value   = m.marca;
  document.getElementById('m-modelo').value  = m.modelo;
  document.getElementById('m-anio').value    = m.anio  || '';
  document.getElementById('m-cc').value      = m.cc    || '';
  document.getElementById('m-color').value   = m.color || '';
  document.getElementById('m-km').value      = m.km    || 0;
  
  document.getElementById('modal-moto-title').textContent = 'Editar moto';
  window._editingMotoId = id;
  document.getElementById('modal-moto').classList.add('open');
}

function deleteMoto(id) {
  if (!confirm('¿Eliminar esta moto?')) return;
  state.motos = state.motos.filter(m => m.id !== id);
  refresh();
}

/* ── Inventario ─────────────────────────────────────────────── */

function exportarInventarioExcel() {
  const wb = XLSX.utils.book_new();
  const datos = state.inventario.map(r => ({
    Codigo: r.codigo,
    Descripcion: r.desc,
    Categoria: r.cat,
    Stock: r.stock,
    Minimo: r.min,
    Costo: r.costo,
    Venta: r.venta,
    Compatibilidad: r.compat || ''
  }));
  const ws = XLSX.utils.json_to_sheet(datos);
  XLSX.utils.book_append_sheet(wb, ws, "Inventario");
  XLSX.writeFile(wb, "Inventario_MotoTaller.xlsx");
}

function renderInventario() {
  const q   = (document.getElementById('search-inv')?.value || '').toLowerCase();
  const cat = document.getElementById('filter-cat')?.value || '';

  /* Actualizar categorías */
  const cats = [...new Set(state.inventario.map(r => r.cat))];
  const sel  = document.getElementById('filter-cat');
  if (sel) {
    const cur = sel.value;
    sel.innerHTML = '<option value="">Todas las categorías</option>' +
      cats.map(c => `<option value="${c}" ${c === cur ? 'selected' : ''}>${c}</option>`).join('');
  }

  const filtered = state.inventario.filter(r =>
    (r.desc.toLowerCase().includes(q) || r.codigo.toLowerCase().includes(q)) &&
    (!cat || r.cat === cat)
  );
  const tb = document.getElementById('tabla-inv');
  if (!tb) return;
  if (!filtered.length) {
    tb.innerHTML = `<tr><td colspan="10"><div class="empty-state"><div class="icon">📦</div>Sin repuestos</div></td></tr>`;
    return;
  }
  tb.innerHTML = filtered.map(r => {
    const bajo = r.stock <= r.min;
    const pct  = Math.min(100, Math.round(r.stock / Math.max(r.min * 2, 1) * 100));
    return `<tr>
      <td><span class="tag">#${r.codigo}</span></td>
      <td><strong>${r.desc}</strong></td>
      <td style="font-size:11px;color:var(--text2)">${r.compat || '–'}</td>
      <td><span class="badge badge-gray">${r.cat}</span></td>
      <td>
        <div style="display:flex;align-items:center;gap:8px">
          <span class="badge ${bajo ? 'badge-red' : 'badge-green'}">${r.stock}</span>
        </div>
      </td>
      <td>${r.min}</td>
      <td>${fmt(r.costo)}</td>
      <td><strong style="color:var(--orange)">${fmt(r.venta)}</strong></td>
      <td>${bajo
        ? '<span class="badge badge-red">⚠️ Pedir</span>'
        : '<span class="badge badge-green">✅ Ok</span>'}</td>
      <td>
        <button class="btn btn-ghost btn-sm" onclick="editRepuesto('${r.id}')">✏️</button>
        <button class="btn btn-danger btn-sm" onclick="deleteRepuesto('${r.id}')">🗑️</button>
      </td>
    </tr>`;
  }).join('');
}

function clearRepuestoForm() {
  ['r-codigo','r-desc','r-cat','r-compat','r-stock','r-min','r-costo','r-venta'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  document.getElementById('modal-rep-title').textContent = 'Nuevo repuesto';
  window._editingRepuestoId = null;
}

function saveRepuesto() {
  const codigo = document.getElementById('r-codigo').value.trim();
  const desc   = document.getElementById('r-desc').value.trim();
  const compat = document.getElementById('r-compat').value.trim();
  const cat    = document.getElementById('r-cat').value.trim();
  const stock  = parseInt(document.getElementById('r-stock').value) || 0;
  const min    = parseInt(document.getElementById('r-min').value) || 0;
  const costo  = parseInt(document.getElementById('r-costo').value) || 0;
  const venta  = parseInt(document.getElementById('r-venta').value) || 0;

  if (!codigo || !desc || !cat || venta <= 0) { toast('Completa los campos obligatorios', 'error'); return; }

  if (window._editingRepuestoId) {
    const r = state.inventario.find(x => x.id === window._editingRepuestoId);
    r.codigo = codigo; r.desc = desc; r.cat = cat; r.compat = compat;
    r.stock = stock; r.min = min; r.costo = costo; r.venta = venta;
    toast('Repuesto actualizado', 'success');
  } else {
    const id = 'R' + String(state.nextIds.r++).padStart(3, '0');
    state.inventario.push({ id, codigo, desc, cat, compat, stock, min, costo, venta });
    toast('Repuesto registrado', 'success');
  }
  closeModal('modal-repuesto');
  refresh();
}

function editRepuesto(id) {
  const r = state.inventario.find(x => x.id === id);
  document.getElementById('r-codigo').value = r.codigo;
  document.getElementById('r-desc').value   = r.desc;
  document.getElementById('r-cat').value    = r.cat;
  document.getElementById('r-compat').value = r.compat || '';
  document.getElementById('r-stock').value  = r.stock;
  document.getElementById('r-min').value    = r.min;
  document.getElementById('r-costo').value  = r.costo || 0;
  document.getElementById('r-venta').value  = r.venta;
  
  document.getElementById('modal-rep-title').textContent = 'Editar repuesto';
  window._editingRepuestoId = id;
  document.getElementById('modal-repuesto').classList.add('open');
}

function deleteRepuesto(id) {
  if (!confirm('¿Eliminar este repuesto?')) return;
  state.inventario = state.inventario.filter(r => r.id !== id);
  refresh();
}


/* ── Ventas (POS y Historial) ────────────────────────────────── */

let posItems = [];

function switchVentasTab(tab) {
  const tabs = ['pos', 'hist', 'cot'];
  tabs.forEach(t => {
    const view = document.getElementById('view-' + t);
    const btn = document.getElementById('btn-tab-' + t);
    if (view) view.style.display = (t === tab) ? 'flex' : 'none';
    if (btn) btn.className = (t === tab) ? 'btn btn-primary' : 'btn btn-ghost';
  });
  
  if (tab === 'hist') renderVentas();
  if (tab === 'cot') renderCotizaciones();
  if (tab === 'pos') renderPosCatalog();
}

function generarCotizacion() {
  if (!posItems.length) return toast('Agrega repuestos primero', 'warning');
  
  const clienteId = document.getElementById('pos-cliente-id')?.value || null;
  const c = state.clientes.find(x => x.id === clienteId);
  
  // Pre-llenar el modal con datos si existen
  document.getElementById('cot-nombre-manual').value = c ? c.nombre : '';
  document.getElementById('cot-tel-manual').value = c ? c.tel : '';
  
  openModal('modal-cot-info');
}

async function confirmarGenerarCotizacion() {
  const nombreManual = document.getElementById('cot-nombre-manual').value.trim();
  const telManual = document.getElementById('cot-tel-manual').value.trim();
  
  if (!nombreManual) return toast('El nombre es obligatorio', 'warning');

  const id = 'COT-' + Date.now().toString().slice(-6);
  const clienteId = document.getElementById('pos-cliente-id')?.value || null;
  
  const subtotal = posItems.reduce((acc, i) => acc + (i.price * i.qty), 0);
  const iva = subtotal * 0.19;
  const total = subtotal + iva;

  const cot = {
    id,
    fecha: new Date().toISOString().split('T')[0],
    clienteId,
    nombreManual,
    telManual,
    items: [...posItems],
    subtotal,
    iva,
    total,
    validez: '48 Horas'
  };

  try {
    if (typeof db !== 'undefined' && db) {
      await db.collection('cotizaciones').doc(id).set(cot);
    }
    
    if (!state.cotizaciones) state.cotizaciones = [];
    state.cotizaciones.push(cot);
    
    closeModal('modal-cot-info');
    toast('¡Cotización generada!', 'success');
    
    posItems = [];
    renderPos();
    switchVentasTab('cot');
  } catch (e) {
    console.error(e);
    toast('Error al guardar', 'error');
  }
}

function renderCotizaciones() {
  const tb = document.getElementById('tabla-cotizaciones');
  const cots = state.cotizaciones || [];
  
  if (!cots.length) {
    tb.innerHTML = `<tr><td colspan="6"><div class="empty-state">Sin cotizaciones</div></td></tr>`;
    return;
  }

  tb.innerHTML = [...cots].reverse().map(cot => {
    const cli = state.clientes.find(x => x.id === cot.clienteId);
    const nombreAMostrar = cot.nombreManual || (cli ? cli.nombre : 'Cliente General');
    return `<tr>
      <td><strong>${cot.id}</strong></td>
      <td>${cot.fecha}</td>
      <td>${nombreAMostrar}</td>
      <td style="color:var(--orange);font-weight:700">${fmt(cot.total)}</td>
      <td>${cot.validez}</td>
      <td>
        <div style="display:flex; gap:4px">
          <button class="btn btn-primary btn-sm" onclick="convertirCotizacion('${cot.id}')" title="Convertir a Venta">🛒</button>
          <button class="btn btn-ghost btn-sm" onclick="descargarPDFCotizacion('${cot.id}')" title="Descargar PDF">📄</button>
          <button class="btn btn-ghost btn-sm" onclick="enviarCotizacionWS('${cot.id}')" title="Enviar WhatsApp">📱</button>
          <button class="btn btn-danger btn-sm" onclick="eliminarCotizacion('${cot.id}')">🗑️</button>
        </div>
      </td>
    </tr>`;
  }).join('');
}

function convertirCotizacion(id) {
  const cot = state.cotizaciones.find(x => x.id === id);
  if (!cot) return;
  
  posItems = [...cot.items];
  document.getElementById('pos-cliente-id').value = cot.clienteId || '';
  switchVentasTab('pos');
  renderPos();
  toast('Cotización cargada en el Punto de Venta', 'info');
}

function enviarCotizacionWS(id) {
  const cot = state.cotizaciones.find(x => x.id === id);
  const c = state.clientes.find(x => x.id === cot.clienteId);
  
  const nombre = cot.nombreManual || (c ? c.nombre : 'cliente');
  const itemsText = cot.items.map(i => `- ${i.desc} x${i.qty}: ${fmt(i.price * i.qty)}`).join('\n');
  const msg = `🌴 *COTIZACIÓN MOTO CARIBE* 🏍️\n\nHola *${nombre}*,\nadjuntamos el presupuesto solicitado:\n\n${itemsText}\n\n➕ *Subtotal:* ${fmt(cot.subtotal)}\n🧾 *IVA (19%):* ${fmt(cot.iva)}\n💰 *TOTAL:* ${fmt(cot.total)}\n⏳ *Validez:* ${cot.validez}\n\nQuedamos atentos a tu pedido.`;
  
  const tel = cot.telManual || (c && c.tel ? c.tel.replace(/\D/g,'') : '');
  window.open(`https://wa.me/57${tel}?text=${encodeURIComponent(msg)}`, '_blank');
}

async function eliminarCotizacion(id) {
  if (!confirm('¿Eliminar esta cotización?')) return;
  try {
    if (window.db) await db.collection('cotizaciones').doc(id).delete();
    state.cotizaciones = state.cotizaciones.filter(x => x.id !== id);
    renderCotizaciones();
    toast('Cotización eliminada', 'success');
  } catch (e) { toast('Error al eliminar', 'error'); }
}

function renderVentas() {
  /* Historial */
  const total = state.ventas.reduce((s, v) => s + v.total, 0);
  const rep   = state.ventas.reduce((s, v) => s + v.rep,   0);
  document.getElementById('v-total').textContent = fmt(total);
  document.getElementById('v-rep').textContent   = fmt(rep);

  const tb = document.getElementById('tabla-ventas');
  if (!state.ventas.length) {
    tb.innerHTML = `<tr><td colspan="9"><div class="empty-state"><div class="icon">🧾</div>Sin ventas</div></td></tr>`;
  } else {
    tb.innerHTML = [...state.ventas].reverse().map(v => {
      const c = state.clientes.find(x => x.id === v.clienteId);
      return `<tr>
        <td><strong>${v.id}</strong></td>
        <td>${v.fecha}</td>
        <td>${c ? c.nombre : 'Venta directa'}</td>
        <td>${fmt(v.rep)}</td>
        <td>${v.iva ? fmt(v.iva) : '$0'}</td>
        <td>${v.desc ? '- ' + fmt(v.desc) : '–'}</td>
        <td><strong style="color:var(--orange)">${fmt(v.total)}</strong></td>
        <td><span class="badge badge-green">${v.pago}</span></td>
        <td>
          <div style="display:flex; gap:4px">
            <button class="btn btn-ghost btn-sm" onclick="imprimirFactura('${v.id}')" title="Imprimir">🖨️</button>
            <button class="btn btn-ghost btn-sm" onclick="descargarPDF('${v.id}')" title="Descargar PDF">📄</button>
            <button class="btn btn-ghost btn-sm" onclick="enviarEmail('${v.id}')" title="Enviar por Correo">📧</button>
            <button class="btn btn-ghost btn-sm" style="color:#25D366" onclick="enviarWhatsAppFactura('${v.id}')" title="Enviar por WhatsApp">📱</button>
            ${currentUser?.role === 'Administrador' ? `
            <button class="btn btn-danger btn-sm" onclick="deleteVenta('${v.id}')" title="Eliminar">🗑️</button>
            ` : ''}
          </div>
        </td>
      </tr>`;
    }).join('');
  }

  if (document.getElementById('view-pos').style.display !== 'none') {
    renderPosCatalog();
  }
}

function renderPosCatalog() {
  const q = (document.getElementById('pos-search')?.value || '').toLowerCase();
  const qc = (document.getElementById('pos-compat-search')?.value || '').toLowerCase();
  const selectedCat = state.selectedPosCategory || '';
  
  const filtered = state.inventario.filter(r => {
    const matchName = r.desc.toLowerCase().includes(q) || r.codigo.toLowerCase().includes(q);
    const matchCompat = !qc || (r.compat && r.compat.toLowerCase().includes(qc));
    const matchCat = !selectedCat || r.cat === selectedCat;
    return matchName && matchCompat && matchCat;
  });
  
  const container = document.getElementById('pos-catalog');
  if (!filtered.length) {
    container.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:20px;color:var(--text3)">No se encontraron repuestos</div>';
    return;
  }
  
  container.innerHTML = filtered.map(r => {
    const bajo = r.stock <= r.min;
    return `
      <div class="pos-item" onclick="addToCart('${r.id}')">
        <div class="code">#${r.codigo}</div>
        <div class="desc">${r.desc}</div>
        <div style="font-size:10px; color:var(--text3); margin-top:4px">${r.compat || 'Universal'}</div>
        <div class="price">${fmt(r.venta)}</div>
        <div class="stock" style="margin-top:8px">${r.stock > 0 ? `Stock: ${r.stock}` : '<span style="color:var(--red)">Agotado</span>'}</div>
      </div>
    `;
  }).join('');

  renderPosCategories();
}

function addToCart(id) {
  const r = state.inventario.find(x => x.id === id);
  if (!r) return;
  
  if (r.stock <= 0) {
    return toast('Este producto está agotado', 'error');
  }

  const existing = posItems.find(x => x.id === id);
  if (existing) {
    if (existing.qty >= r.stock) {
      return toast('No hay más stock disponible', 'warning');
    }
    existing.qty++;
  } else {
    posItems.push({ 
      id: r.id, 
      desc: r.desc, 
      price: r.venta, // Unificado a 'price'
      qty: 1 
    });
  }
  renderPosCart();
}

function handleBarcode(e) {
  if (e.key === 'Enter') {
    const code = e.target.value.trim();
    if (!code) return;

    // Buscar por código exacto
    const r = state.inventario.find(x => x.codigo.toLowerCase() === code.toLowerCase());
    if (r) {
      addToCart(r.id);
      e.target.value = ''; // Limpiar para el siguiente escaneo
      toast('Agregado: ' + r.desc);
    } else {
      toast('Código no encontrado: ' + code, 'error');
      e.target.value = '';
    }
  }
}

function updatePosItemQty(id, delta) {
  const r = state.inventario.find(x => x.id === id);
  const item = posItems.find(i => i.id === id);
  if (!item) return;

  const newQty = item.qty + delta;
  if (newQty <= 0) {
    posItems = posItems.filter(i => i.id !== id);
  } else {
    if (r.stock < newQty) return toast('No hay más stock disponible', 'error');
    item.qty = newQty;
  }
  renderPosCart();
}

function removePosItem(id) {
  posItems = posItems.filter(i => i.id !== id);
  renderPosCart();
}

function renderPosCart() {
  const container = document.getElementById('pos-cart');
  if (!posItems.length) {
    container.innerHTML = '<div class="empty-state" style="padding:20px"><div class="icon" style="font-size:24px">🛒</div>Carrito vacío</div>';
    document.getElementById('pos-subtotal').textContent = '$0';
    document.getElementById('pos-iva').textContent = '$0';
    document.getElementById('pos-total').textContent = '$0';
    return;
  }

  container.innerHTML = posItems.map(item => `
    <div class="pos-cart-item">
      <div class="info">
        <div class="desc">${item.desc}</div>
        <div class="price">${fmt(item.price)}</div>
      </div>
      <div class="controls">
        <button class="btn-qty" onclick="updatePosItemQty('${item.id}', -1)">-</button>
        <div class="qty">${item.qty}</div>
        <button class="btn-qty" onclick="updatePosItemQty('${item.id}', 1)">+</button>
      </div>
      <button class="close-btn" style="margin-left:8px;color:var(--red)" onclick="removePosItem('${item.id}')">✕</button>
    </div>
  `).join('');

  const rep = posItems.reduce((s, i) => s + (i.qty * i.price), 0);
  const iva = rep * 0.19;
  document.getElementById('pos-subtotal').textContent = fmt(rep);
  document.getElementById('pos-iva').textContent = fmt(iva);
  document.getElementById('pos-total').textContent = fmt(rep + iva);
}

function onCobroClienteChange() {
  const id = document.getElementById('cobro-cliente').value;
  const inputTel = document.getElementById('cobro-tel');
  if (id) {
    const c = state.clientes.find(x => x.id === id);
    if (c) inputTel.value = c.tel || '';
  } else {
    inputTel.value = '';
  }
}

function openModalCobro() {
  if (!posItems.length) return toast('El carrito está vacío', 'error');
  
  const sel = document.getElementById('cobro-cliente');
  sel.innerHTML = '<option value="">Venta Directa / Mostrador</option>';
  state.clientes.forEach(c => { sel.innerHTML += `<option value="${c.id}">${c.nombre}</option>`; });

  document.getElementById('cobro-desc').value = '';
  document.getElementById('cobro-obs').value = '';
  document.getElementById('cobro-pago').value = 'Efectivo';
  document.getElementById('cobro-tel').value = '';
  
  calcCobro();
  document.getElementById('modal-cobro').classList.add('open');
}

function calcCobro() {
  const rep = posItems.reduce((s, i) => s + (i.qty * i.price), 0);
  const iva = rep * 0.19;
  const desc = parseInt(document.getElementById('cobro-desc').value) || 0;
  document.getElementById('cobro-total-view').textContent = fmt(Math.max(0, rep + iva - desc));
}

function savePosSale() {
  const rep = posItems.reduce((s, i) => s + (i.qty * i.price), 0);
  const iva = rep * 0.19;
  const desc = parseInt(document.getElementById('cobro-desc').value) || 0;
  const total = Math.max(0, rep + iva - desc);
  const clienteId = document.getElementById('cobro-cliente').value || null;
  const tel = document.getElementById('cobro-tel').value.trim();
  
  if (total <= 0 && rep <= 0) { toast('El total debe ser mayor a $0', 'error'); return; }

  const pago = document.getElementById('cobro-pago').value;
  const fechaPago = document.getElementById('cobro-fecha-pago').value;

  if (pago === 'Crédito') {
    if (!clienteId) {
      toast('Para fiar debes seleccionar un cliente registrado', 'error');
      return;
    }
    if (!fechaPago) {
      toast('Debes elegir una fecha de pago para el crédito', 'error');
      return;
    }
    if (!tel) {
      toast('Se requiere el teléfono para los recordatorios', 'error');
      return;
    }
  }

  // Actualizar teléfono del cliente si se cambió
  if (clienteId) {
    const c = state.clientes.find(x => x.id === clienteId);
    if (c && tel) c.tel = tel;
  }

  // Descontar inventario
  for (let item of posItems) {
    const r = state.inventario.find(x => x.id === item.id);
    if (r) r.stock -= item.qty;
  }


  if (pago === 'Crédito' && !fechaPago) {
    toast('Debes elegir una fecha de pago para el crédito', 'error');
    return;
  }

  const id = 'FAC-' + String(state.nextIds.f++).padStart(3, '0');
  state.ventas.push({
    id,
    clienteId: document.getElementById('cobro-cliente').value || null,
    items: [...posItems],
    rep, iva, desc, total,
    pago,
    obs:   document.getElementById('cobro-obs').value,
    fecha: new Date().toISOString().split('T')[0],
    fechaVencimiento: pago === 'Crédito' ? fechaPago : null,
    estadoPago: pago === 'Crédito' ? 'Pendiente' : 'Pagado'
  });

  // Generar asiento contable automático por la venta
  try {
    const ventaRecien = state.ventas[state.ventas.length - 1];
    generateJournalEntryForSale(ventaRecien);

    // Si la forma de pago es transferencia o nequi, registrar en la cuenta bancaria
    if (pago === 'Transferencia' || pago === 'Nequi / Daviplata') {
      const bank = state.bankAccounts && state.bankAccounts[0];
      if (bank) {
        bank.balance = (bank.balance || 0) + total;
        bank.transactions = bank.transactions || [];
        bank.transactions.push({ id: 'T' + Date.now(), date: new Date().toISOString(), type: pago, amount: total, ref: id });
      }
    }
  } catch (e) {
    console.error('Error generando asiento contable:', e);
  }

  posItems = [];
  renderPosCart();
  closeModal('modal-cobro');
  toast('Cobro exitoso: ' + id, 'success');
  refresh();
  
  // Opcional: imprimir factura automáticamente al cobrar
  imprimirFactura(id);
}

function deleteVenta(id) {
  if (!confirm('¿Eliminar esta factura?')) return;
  state.ventas = state.ventas.filter(v => v.id !== id);
  refresh();
}

function toggleFechaCredito() {
  const pago = document.getElementById('cobro-pago').value;
  const field = document.getElementById('field-fecha-pago');
  if (field) field.style.display = (pago === 'Crédito') ? 'block' : 'none';
}

function sendWhatsAppReminder(ventaId, totalConMora = null, dias = 0) {
  const v = state.ventas.find(x => x.id === ventaId);
  const c = state.clientes.find(x => x.id === v.clienteId);
  if (!c || !c.tel) return toast('El cliente no tiene teléfono registrado', 'error');

  const tel = c.tel.replace(/\D/g,'');
  let texto = `Hola ${c.nombre}, te saludamos de MotoTaller. Te recordamos amablemente que tienes un saldo pendiente de ${fmt(v.total)} que venció el ${v.fechaVencimiento}. ¡Gracias!`;
  
  if (totalConMora && dias > 0) {
    texto = `Hola ${c.nombre}, te saludamos de MotoTaller. Tu pago de ${fmt(v.total)} presenta ${dias} días de retraso. El total a pagar hoy con intereses de mora es de ${fmt(totalConMora)}. Por favor acercarse al taller para ponerse al día.`;
  }

  window.open(`https://wa.me/57${tel}?text=${encodeURIComponent(texto)}`, '_blank');
}

function sendSMSReminder(ventaId) {
  const v = state.ventas.find(x => x.id === ventaId);
  const c = state.clientes.find(x => x.id === v.clienteId);
  if (!c || !c.tel) return toast('El cliente no tiene teléfono registrado', 'error');

  const tel = c.tel.replace(/\D/g,'');
  const msg = `Hola ${c.nombre}, te recordamos tu saldo pendiente en MotoTaller por ${fmt(v.total)} que vence el ${v.fechaVencimiento}.`;
  
  // Abrir app de SMS nativa
  window.location.href = `sms:+57${tel}?body=${encodeURIComponent(msg)}`;
}

function imprimirFactura(id) {
  const v = state.ventas.find(x => x.id === id);
  const c = state.clientes.find(x => x.id === v.clienteId);
  
  // Generar un CUFE ficticio pero realista para el diseño
  const cufe = Array.from({length:40}, () => Math.floor(Math.random() * 16).toString(16)).join('');
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=Factura:${v.id}|Total:${v.total}|CUFE:${cufe}`;

  const html = `
    <div style="text-align:center;font-family:monospace;padding:10px;color:#000;background:#fff">
      <div style="font-size:18px;font-weight:bold">TALLER MOTO CARIBE</div>
      <div style="font-size:11px">NIT: 900.123.456-7</div>
      <div style="font-size:10px">Res. DIAN No. 1876400000123 de 2026-01-01</div>
      <div style="font-size:10px">Prefijo: MT - Rango: 1 al 5000</div>
      <div style="font-size:14px;margin:10px 0;border-top:1px solid #000;border-bottom:1px solid #000;padding:5px 0;font-weight:bold">
        FACTURA ELECTRÓNICA DE VENTA: ${v.id}
      </div>
      
      <div style="text-align:left;font-size:11px">
        Fecha: ${v.fecha} ${new Date().toLocaleTimeString()}<br>
        Cliente: ${c ? c.nombre : 'Venta Directa'}<br>
        CC/NIT: ${c ? c.cedula : '222222222'}<br>
        Forma de Pago: ${v.pago}
      </div>

      <div style="margin:10px 0;border-bottom:1px dashed #000"></div>
      <table style="width:100%;font-size:11px;border-collapse:collapse">
        <thead>
          <tr style="border-bottom:1px solid #000">
            <th style="text-align:left">Cant</th>
            <th style="text-align:left">Descripción</th>
            <th style="text-align:right">Total</th>
          </tr>
        </thead>
        <tbody>
          ${v.items.map(i => `
            <tr>
              <td>${i.qty}</td>
              <td>${i.desc}</td>
              <td style="text-align:right">${fmt(i.qty * (i.price || i.precio))}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      <div style="margin:10px 0;border-bottom:1px dashed #000"></div>

      <div style="text-align:right;font-size:11px">
        Subtotal (Base): ${fmt(v.total / 1.19)}<br>
        IVA (19%): ${fmt(v.total - (v.total / 1.19))}<br>
        ${v.desc ? `Descuento: -${fmt(v.desc)}<br>` : ''}
        <span style="font-size:15px;font-weight:bold">TOTAL A PAGAR: ${fmt(v.total)}</span>
      </div>

      <div style="margin:15px 0; text-align:center">
        <div style="font-size:8px;word-break:break-all;margin-bottom:5px">CUFE: ${cufe}</div>
        <img src="${qrUrl}" width="100" height="100" style="margin:5px auto; display:block">
        <div style="font-size:9px;margin-top:5px">Representación gráfica de la factura electrónica</div>
      </div>

      <div style="font-size:9px;text-align:center;margin-top:15px;border-top:1px solid #eee;padding-top:10px">
        Esta factura se asimila en todos sus efectos a una letra de cambio.<br>
        Gracias por preferir a MotoTaller Pro.
      </div>
    </div>
  `;

  const container = document.getElementById('ticket-print');
  container.innerHTML = html;
  window.print();
}

async function descargarPDF(id) {
  const v = state.ventas.find(x => x.id === id);
  const c = state.clientes.find(x => x.id === v.clienteId);
  toast('Generando PDF...', 'info');
  imprimirFactura(id); 
  const elemento = document.getElementById('ticket-print');
  const opt = {
    margin: [10, 10],
    filename: `Factura_${v.id}_${c ? c.nombre.replace(/ /g,'_') : 'Cliente'}.pdf`,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
  };
  try {
    await html2pdf().set(opt).from(elemento).save();
    toast('PDF descargado', 'success');
  } catch (err) {
    toast('Error al generar PDF', 'error');
  }
}

async function enviarEmail(id) {
  const v = state.ventas.find(x => x.id === id);
  const c = state.clientes.find(x => x.id === v.clienteId);
  if (!c || !c.email) return toast('El cliente no tiene correo registrado', 'warning');

  // Si hay URL de Google, usamos el método 100% Gratis
  if (GOOGLE_SCRIPT_URL) {
    toast('Enviando vía Google Mail (Gratis)...', 'info');
    try {
      const resp = await fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST',
        mode: 'no-cors',
        body: JSON.stringify({
          to: c.email,
          subject: `Factura ${v.id} - Taller Moto Caribe`,
          body: `Hola ${c.nombre},\n\nGracias por confiar en Taller Moto Caribe. Tu factura N° ${v.id} por un total de ${fmt(v.total)} ha sido generada.\n\nPuedes descargarla en el sistema.`
        })
      });
      toast(`📧 Factura enviada a ${c.email} (Google)`, 'success');
      return;
    } catch (e) {
      console.error(e);
      toast('Error con servidor Google. Revisa la URL.', 'error');
    }
  }

  // De lo contrario, usar EmailJS (Limitado)
  if (!EMAILJS_PUBLIC_KEY) return toast('Configura una opción de envío', 'error');
  toast('Generando PDF y enviando (EmailJS)...', 'info');
  try {
    imprimirFactura(id);
    const pdfBase64 = await html2pdf().from(document.getElementById('ticket-print')).outputPdf('datauristring');
    const base64Content = pdfBase64.split(',')[1];
    emailjs.init(EMAILJS_PUBLIC_KEY);
    await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, {
      to_name: c.nombre, to_email: c.email, invoice_id: v.id, total_amount: fmt(v.total), content: base64Content
    });
    toast(`📧 Enviada con éxito a ${c.email}`, 'success');
  } catch (e) { toast('Error en envío', 'error'); }
}

async function enviarWhatsAppFactura(id) {
  const v = state.ventas.find(x => x.id === id);
  const c = state.clientes.find(x => x.id === v.clienteId);
  if (!c || !c.tel) return toast('El cliente no tiene teléfono', 'error');

  // 1. Generar y descargar el PDF automáticamente
  toast('Generando PDF para enviar...', 'info');
  await descargarPDF(id);

  // 2. Preparar mensaje y abrir WhatsApp
  const tel = c.tel.replace(/\D/g,'');
  const msg = `🌴 *TALLER MOTO CARIBE* 🏍️\n\nHola *${c.nombre}*, adjunto te envío tu factura electrónica *${v.id}*.\n\n💰 *Total:* ${fmt(v.total)}\n✅ *Estado:* Pagado\n\n_El PDF se ha descargado en tu equipo. Por favor adjúntalo a este chat._`;
  
  setTimeout(() => {
    window.open(`https://wa.me/57${tel}?text=${encodeURIComponent(msg)}`, '_blank');
    toast('Abriendo WhatsApp...', 'success');
  }, 1500);
}

/**
 * Genera el resumen de caja del día de hoy
 */
function generarCierreCaja() {
  const hoy = new Date().toISOString().split('T')[0];
  const ventasHoy = state.ventas.filter(v => v.fecha === hoy);
  
  if (!ventasHoy.length) return toast('No hay ventas registradas el día de hoy', 'error');

  const resumen = {
    'Efectivo': 0,
    'Transferencia': 0,
    'Nequi / Daviplata': 0,
    'Crédito': 0
  };
  
  let totalDia = 0;
  ventasHoy.forEach(v => {
    resumen[v.pago] = (resumen[v.pago] || 0) + v.total;
    totalDia += v.total;
  });

  const body = document.getElementById('cierre-body');
  body.innerHTML = `
    <div style="text-align:center;margin-bottom:15px">
      <div style="font-size:12px;color:var(--text3)">Fecha: ${hoy}</div>
      <div style="font-size:24px;font-weight:700;color:var(--green);margin-top:5px">${fmt(totalDia)}</div>
      <div style="font-size:12px;color:var(--text3)">Total recaudado hoy</div>
    </div>
    <div style="background:var(--bg3);border-radius:8px;padding:15px">
      ${Object.keys(resumen).map(medio => `
        <div style="display:flex;justify-content:space-between;margin-bottom:8px;font-size:14px">
          <span style="color:var(--text2)">${medio}:</span>
          <span style="font-weight:600">${fmt(resumen[medio])}</span>
        </div>
      `).join('')}
      <div style="margin-top:10px;padding-top:10px;border-top:1px solid var(--border);display:flex;justify-content:space-between;font-weight:700">
        <span>Total Ventas:</span>
        <span>${ventasHoy.length} facturas</span>
      </div>
    </div>
  `;
  
  window._ultimoCierre = { hoy, resumen, totalDia, cant: ventasHoy.length };
  document.getElementById('modal-cierre').classList.add('open');
}

function imprimirCierre() {
  const c = window._ultimoCierre;
  if (!c) return;

  const html = `
    <div style="text-align:center;margin-bottom:10px">
      <h2 style="margin:0;font-size:18px">Taller Moto Caribe</h2>
      <div style="font-size:12px">CIERRE DE CAJA DIARIO</div>
      <div style="font-size:12px;margin-top:4px">----------------------</div>
    </div>
    <div style="font-size:12px;margin-bottom:10px">
      <div><strong>Fecha:</strong> ${c.hoy}</div>
      <div><strong>Ventas Totales:</strong> ${c.cant} facturas</div>
    </div>
    <div style="font-size:12px;margin-bottom:10px">----------------------</div>
    <div style="font-size:13px;margin-bottom:10px">
      ${Object.keys(c.resumen).map(m => `
        <div style="display:flex;justify-content:space-between;margin-bottom:4px">
          <span>${m}:</span>
          <span>${fmt(c.resumen[m])}</span>
        </div>
      `).join('')}
    </div>
    <div style="font-size:12px;margin-bottom:10px">----------------------</div>
    <div style="font-size:16px;text-align:right;font-weight:bold;margin-top:10px">
      TOTAL DÍA: ${fmt(c.totalDia)}
    </div>
    <div style="text-align:center;font-size:11px;padding-top:20px;margin-top:20px;border-top:1px dashed #ccc">
      Firma Responsable
    </div>
  `;

  const container = document.getElementById('ticket-print');
  container.innerHTML = html;
  window.print();
}

/* ── Selects helpers ────────────────────────────────────────── */

function populateSelects() {
  const mCli = document.getElementById('m-cliente');
  if (mCli) {
    mCli.innerHTML = '<option value="">Seleccionar cliente...</option>';
    state.clientes.forEach(c => { mCli.innerHTML += `<option value="${c.id}">${c.nombre}</option>`; });
  }
}

/* ── Utilidades ─────────────────────────────────────────────── */

function fmt(n) {
  const val = parseFloat(n) || 0;
  return '$' + Math.round(val).toLocaleString('es-CO');
}

function formatDateTime(iso) {
  if (!iso) return '–';
  const dt = new Date(iso);
  return dt.toLocaleString('es-CO', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit'
  });
}

function estadoBadge(estado) {
  const map   = { 'Recibida': 'badge-yellow', 'En proceso': 'badge-orange', 'En espera': 'badge-blue', 'Entregada': 'badge-green' };
  const icons = { 'Recibida': '🟡', 'En proceso': '🔧', 'En espera': '⏳', 'Entregada': '✅' };
  return `<span class="badge ${map[estado] || 'badge-gray'}">${icons[estado] || ''} ${estado}</span>`;
}

function toast(msg, type = 'success') {
  const container = document.getElementById('toasts');
  const el = document.createElement('div');
  el.className = 'toast ' + type;
  el.innerHTML = `<span>${type === 'success' ? '✅' : '❌'}</span> ${msg}`;
  container.appendChild(el);
  setTimeout(() => el.remove(), 3000);
}

/* Cerrar modal al hacer clic en el overlay */
document.querySelectorAll('.modal-overlay').forEach(overlay => {
  overlay.addEventListener('click', e => {
    if (e.target === overlay) overlay.classList.remove('open');
  });
});

function verHojaDeVida(placa) {
  const modal = document.getElementById('modal-hoja-vida');
  if (!modal) return;
  
  document.getElementById('hj-placa-title').textContent = 'Hoja de Vida: ' + placa;
  
  const moto = state.motos.find(m => m.placa === placa);
  const historial = state.ventas.filter(v => v.clienteId === moto?.clienteId);

  const tb = document.getElementById('tabla-hoja-vida');
  if (historial.length === 0) {
    tb.innerHTML = `<tr><td colspan="4"><div class="empty-state">No hay servicios registrados para esta placa</div></td></tr>`;
  } else {
    tb.innerHTML = historial.map(v => `
      <tr>
        <td>${v.fecha}</td>
        <td><strong>${v.id}</strong></td>
        <td>${v.items.map(i => i.desc).join(', ')}</td>
        <td><strong style="color:var(--orange)">${fmt(v.total)}</strong></td>
      </tr>
    `).join('');
  }
  
  openModal('modal-hoja-vida');
}

/* ── Business Intelligence ──────────────────────────────────── */

function renderInsights() {
  const container = document.getElementById('dash-insights');
  if (!container) return;

  const insights = [];
  const hoyStr = new Date().toISOString().split('T')[0];
  
  // 1. Predicción de stock
  const agotandose = state.inventario.filter(r => r.stock <= r.min && r.stock > 0);
  if (agotandose.length > 0) {
    insights.push(`🟠 <strong>Reabastecimiento urgente:</strong> Tienes ${agotandose.length} productos casi agotados. Se recomienda pedir hoy.`);
  }

  // 2. Análisis de Clientes
  const sinVen = state.clientes.length - new Set(state.ventas.map(v => v.clienteId)).size;
  if (sinVen > 0) {
    insights.push(`👥 <strong>Oportunidad:</strong> Tienes ${sinVen} clientes que aún no han realizado su primera compra. ¡Lánzales una promo!`);
  }

  // 3. Flujo de Caja
  const totalCreditos = state.ventas.filter(v => v.pago === 'Crédito' && v.estadoPago !== 'Pagado').reduce((s, v) => s + v.total, 0);
  if (totalCreditos > 0) {
    insights.push(`💰 <strong>Cartera:</strong> Tienes ${fmt(totalCreditos)} pendientes por cobrar. Recuperar este dinero mejorará tu flujo.`);
  }

  if (insights.length === 0) {
    container.innerHTML = 'El sistema está analizando datos... No hay recomendaciones por ahora.';
  } else {
    container.innerHTML = insights.map(i => `<div style="margin-bottom:12px">${i}</div>`).join('');
  }
}

/* ── Global Search ─────────────────────────────────────────── */

function handleGlobalSearch() {
  const q = document.getElementById('global-search').value.toLowerCase().trim();
  const resDiv = document.getElementById('global-search-results');
  
  if (!q) {
    resDiv.style.display = 'none';
    return;
  }

  const results = [];
  
  // Buscar Clientes
  state.clientes.forEach(c => {
    if (c.nombre.toLowerCase().includes(q) || c.cedula.includes(q)) {
      results.push({ type: 'Cliente', text: c.nombre, icon: '👤', action: `showPage('clientes')` });
    }
  });

  // Buscar Motos
  state.motos.forEach(m => {
    if (m.placa.toLowerCase().includes(q)) {
      results.push({ type: 'Moto', text: `Placa: ${m.placa} (${m.marca})`, icon: '🏍️', action: `verHojaDeVida('${m.placa}')` });
    }
  });

  // Buscar Inventario
  state.inventario.forEach(r => {
    if (r.desc.toLowerCase().includes(q) || r.codigo.toLowerCase().includes(q)) {
      results.push({ type: 'Repuesto', text: `${r.desc} - Stock: ${r.stock}`, icon: '📦', action: `showPage('inventario')` });
    }
  });

  if (results.length === 0) {
    resDiv.innerHTML = '<div style="text-align:center; padding:10px; color:var(--text3)">No se encontró nada</div>';
  } else {
    resDiv.innerHTML = results.map(r => `
      <div class="nav-item" onclick="${r.action}; document.getElementById('global-search-results').style.display='none'; document.getElementById('global-search').value=''" style="margin:2px 0; border-radius:4px; padding:8px; width:auto; text-align:left">
        <span style="margin-right:8px">${r.icon}</span>
        <div style="flex:1">
          <div style="font-size:12px; font-weight:700">${r.text}</div>
          <div style="font-size:10px; color:var(--text3)">${r.type}</div>
        </div>
      </div>
    `).join('');
  }
  
  resDiv.style.display = 'block';
}

/**
 * Exporta el inventario completo a un archivo Excel profesional
 */
function exportarInventarioExcel() {
  toast('Generando archivo Excel...', 'info');
  
  // 1. Preparar los datos
  const data = state.inventario.map(r => ({
    'Código': r.codigo,
    'Descripción': r.desc,
    'Compatibilidad': r.compat || 'Universal',
    'Categoría': r.cat,
    'Stock Actual': r.stock,
    'Stock Mínimo': r.min,
    'Precio Costo': r.costo,
    'Precio Venta': r.venta,
    'Margen (Ganancia)': r.venta - r.costo,
    'Valorización Inventario': r.stock * r.costo
  }));

  // 2. Crear el libro de Excel
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Inventario Moto Caribe");

  // 3. Descargar
  const fecha = new Date().toISOString().split('T')[0];
  XLSX.writeFile(wb, `Inventario_Moto_Caribe_${fecha}.xlsx`);
  
  toast('Excel descargado con éxito', 'success');
}

function descargarPDFCotizacion(id) {
  const cot = state.cotizaciones.find(x => x.id === id);
  const c = state.clientes.find(x => x.id === cot.clienteId);
  
  const html = `
    <div style="text-align:center;font-family:sans-serif;padding:20px;color:#000;background:#fff">
      <div style="font-size:22px;font-weight:bold">TALLER MOTO CARIBE</div>
      <div style="font-size:12px;margin-bottom:15px">COTIZACIÓN DE REPUESTOS</div>
      
      <div style="text-align:left;font-size:14px;margin-bottom:20px;border:1px solid #eee;padding:15px;border-radius:8px;background:#fcfcfc">
        <div style="font-size:16px;color:var(--orange);margin-bottom:5px"><strong>CLIENTE:</strong> ${(cot.nombreManual || (c ? c.nombre : 'CLIENTE GENERAL')).toUpperCase()}</div>
        ${cot.telManual ? `<strong>Teléfono:</strong> ${cot.telManual}<br>` : ''}
        <strong>Cotización N°:</strong> ${cot.id}<br>
        <strong>Fecha de Emisión:</strong> ${cot.fecha}<br>
        <strong>Validez de Oferta:</strong> ${cot.validez}
      </div>

      <table style="width:100%;border-collapse:collapse;font-size:12px">
        <thead style="background:#f9f9f9">
          <tr>
            <th style="border:1px solid #eee;padding:8px;text-align:left">Repuesto</th>
            <th style="border:1px solid #eee;padding:8px;text-align:center">Cant.</th>
            <th style="border:1px solid #eee;padding:8px;text-align:right">IVA (19%)</th>
            <th style="border:1px solid #eee;padding:8px;text-align:right">Subtotal</th>
          </tr>
        </thead>
        <tbody>
          ${cot.items.map(i => `
            <tr>
              <td style="border:1px solid #eee;padding:8px">${i.desc}</td>
              <td style="border:1px solid #eee;padding:8px;text-align:center">${i.qty}</td>
              <td style="border:1px solid #eee;padding:8px;text-align:right">${fmt(i.price * i.qty * 0.19)}</td>
              <td style="border:1px solid #eee;padding:8px;text-align:right">${fmt(i.price * i.qty)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <div style="text-align:right;margin-top:20px;font-size:14px">
        <div style="margin-bottom:5px">Subtotal: ${fmt(cot.subtotal)}</div>
        <div style="margin-bottom:5px;color:#666">IVA (19%): ${fmt(cot.iva)}</div>
        <div style="font-size:18px;font-weight:bold;color:var(--orange);border-top:1px solid #eee;padding-top:10px;margin-top:5px">
          TOTAL: ${fmt(cot.total)}
        </div>
      </div>

      <div style="margin-top:40px;font-size:11px;color:#666">
        * Esta cotización no garantiza la reserva de los repuestos hasta que se realice el pago.<br>
        * Precios sujetos a cambio sin previo aviso.
      </div>
    </div>
  `;

  const worker = html2pdf().from(html).set({
    margin: 10,
    filename: `Cotizacion_${cot.id}.pdf`,
    html2canvas: { scale: 2 },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
  }).save();
  
  toast('Generando PDF de Cotización...', 'info');
}

  // Cargar Cotizaciones
  if (typeof db !== 'undefined' && db) {
    db.collection('cotizaciones').onSnapshot(snap => {
      state.cotizaciones = snap.docs.map(doc => doc.data());
      if (document.getElementById('view-cot')?.style.display !== 'none') renderCotizaciones();
    });
  }

function renderPosCategories() {
  const container = document.getElementById('pos-category-filters');
  if (!container) return;

  const cats = [...new Set(state.inventario.map(r => r.cat))].filter(Boolean);
  const active = state.selectedPosCategory || '';

  let html = `<button class="btn btn-sm ${active === '' ? 'btn-primary' : 'btn-ghost'}" onclick="setPosCategory('')" style="white-space:nowrap; border-radius:20px; padding:4px 14px">Todos</button>`;
  
  html += cats.map(c => `
    <button class="btn btn-sm ${active === c ? 'btn-primary' : 'btn-ghost'}" onclick="setPosCategory('${c}')" style="white-space:nowrap; border-radius:20px; padding:4px 14px">${c}</button>
  `).join('');

  container.innerHTML = html;
}

/* =========================
   Contabilidad - Asientos, reportes y exportes
   ========================= */

function getInventoryCostForSale(sale) {
  return (sale.items || []).reduce((s, i) => {
    const p = state.inventario.find(x => x.id === i.id);
    return s + (p ? (Number(p.costo || 0) * Number(i.qty || 1)) : 0);
  }, 0);
}

function generateJournalEntryForSale(sale) {
  if (!sale || !state.chartOfAccounts) return;
  const when = new Date().toISOString();
  const costTotal = getInventoryCostForSale(sale);
  const iva = Number(sale.iva || 0);
  const total = Number(sale.total || 0);
  const revenueNet = Math.max(0, total - iva);

  const pago = sale.pago || 'Efectivo';
  let debitAccount = 'cash';
  if (pago === 'Crédito') debitAccount = 'accountsReceivable';
  if (pago === 'Transferencia' || pago === 'Nequi / Daviplata') debitAccount = 'bank';

  const lines = [];
  // Débito: caja / banco / cuentas por cobrar por el total
  lines.push({ account: debitAccount, code: state.chartOfAccounts[debitAccount].code, name: state.chartOfAccounts[debitAccount].name, debit: total, credit: 0, desc: `Venta ${sale.id}` });

  // Crédito: ventas (neto)
  lines.push({ account: 'sales', code: state.chartOfAccounts.sales.code, name: state.chartOfAccounts.sales.name, debit: 0, credit: revenueNet, desc: `Venta ${sale.id}` });

  // Crédito: IVA por pagar
  if (iva > 0) {
    lines.push({ account: 'vatPayable', code: state.chartOfAccounts.vatPayable.code, name: state.chartOfAccounts.vatPayable.name, debit: 0, credit: iva, desc: `IVA venta ${sale.id}` });
  }

  // Asiento por Costo de Ventas: Debitar COGS y acreditar Inventario
  if (costTotal > 0) {
    lines.push({ account: 'cogs', code: state.chartOfAccounts.cogs.code, name: state.chartOfAccounts.cogs.name, debit: costTotal, credit: 0, desc: `Costo venta ${sale.id}` });
    lines.push({ account: 'inventory', code: state.chartOfAccounts.inventory.code, name: state.chartOfAccounts.inventory.name, debit: 0, credit: costTotal, desc: `Salida inventario ${sale.id}` });
  }

  const totalDebit = lines.reduce((s, l) => s + Number(l.debit || 0), 0);
  const totalCredit = lines.reduce((s, l) => s + Number(l.credit || 0), 0);

  const entry = {
    id: 'JE-' + Date.now(),
    number: getNextJournalNumber(),
    date: when,
    ref: sale.id,
    description: `Asiento por venta ${sale.id}`,
    lines,
    totalDebit,
    totalCredit
  };

  state.journalEntries = state.journalEntries || [];
  state.journalEntries.unshift(entry);
  // Mantener histórico razonable
  if (state.journalEntries.length > 1000) state.journalEntries = state.journalEntries.slice(0, 1000);
  localStorage.setItem('motoTallerState', JSON.stringify(state));
  if (typeof saveToFirebase === 'function') saveToFirebase();
  toast('Asiento contable generado (automático)', 'info');
}

function getNextJournalNumber() {
  if (!state.nextJournalNumber) state.nextJournalNumber = 1;
  const n = state.nextJournalNumber;
  state.nextJournalNumber = n + 1;
  localStorage.setItem('motoTallerState', JSON.stringify(state));
  if (typeof saveToFirebase === 'function') saveToFirebase();
  return n;
}

function exportJournalSIE() {
  // Simple SIE-like exporter (tab-separated, minimal fields)
  const lines = [];
  lines.push(';FLAGGA 0');
  lines.push(`;PROGRAM "MotoTaller" "1.0"`);
  (state.journalEntries || []).forEach(entry => {
    lines.push(`#VER 1`);
    lines.push(`#TRAN ${entry.number} ${entry.date} "${entry.description}"`);
    entry.lines.forEach(l => {
      const accCode = (state.chartOfAccounts.assets[l.account]?.code) || (state.chartOfAccounts.revenue && state.chartOfAccounts.revenue[l.account]?.code) || l.code || l.account;
      lines.push(`#TRANS ${accCode} ${Number(l.debit || 0)} ${Number(l.credit || 0)} "${l.desc || ''}"`);
    });
  });
  const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `asientos_sie_${new Date().toISOString().slice(0,10)}.sie.txt`;
  a.click();
  URL.revokeObjectURL(url);
  toast('Export SIE generado', 'success');
}

/* Bank reconciliation UI helpers */
function renderBankReconciliation() {
  const container = document.getElementById('acct-bank-recon');
  if (!container) return;
  const banks = state.bankAccounts || [];
  container.innerHTML = banks.map(b => `
    <div style="margin-bottom:12px">
      <div style="display:flex;justify-content:space-between;align-items:center">
        <div><strong>${b.name}</strong> — Saldo: ${fmt(b.balance)}</div>
        <div><button class="btn btn-ghost btn-sm" onclick="exportBankTransactions('${b.id}')">Exportar</button></div>
      </div>
      <div style="margin-top:8px">${(b.transactions || []).map(tx => `
        <div style="display:flex;justify-content:space-between;align-items:center;padding:6px;border-bottom:1px solid var(--border)">
          <div style="font-size:13px">${tx.date.split('T')[0]} — ${tx.type} — ${fmt(tx.amount)} <small style="color:var(--text3)">(${tx.ref || ''})</small></div>
          <div style="display:flex;gap:8px;align-items:center">
            <div style="font-size:12px;color:${(tx.reconciled ? 'var(--green)' : 'var(--text3)')}">${tx.reconciled ? 'Conciliado' : 'Pendiente'}</div>
            <button class="btn btn-ghost btn-sm" onclick="toggleTransactionReconciled('${b.id}','${tx.id}')">Marcar</button>
          </div>
        </div>
      `).join('')}
      </div>
    </div>
  `).join('');
}

function toggleTransactionReconciled(bankId, txId) {
  const bank = (state.bankAccounts || []).find(b => b.id === bankId);
  if (!bank) return;
  const tx = (bank.transactions || []).find(t => t.id === txId);
  if (!tx) return;
  tx.reconciled = !tx.reconciled;
  // track reconciled ids
  bank.reconciled = bank.reconciled || [];
  if (tx.reconciled) bank.reconciled.push(tx.id); else bank.reconciled = bank.reconciled.filter(x => x !== tx.id);
  localStorage.setItem('motoTallerState', JSON.stringify(state));
  if (typeof saveToFirebase === 'function') saveToFirebase();
  renderBankReconciliation();
  toast(tx.reconciled ? 'Transacción conciliada' : 'Marcada como pendiente', 'success');
}

function exportBankTransactions(bankId) {
  const bank = (state.bankAccounts || []).find(b => b.id === bankId);
  if (!bank) return;
  const rows = [];
  rows.push(['Fecha','ID','Tipo','Monto','Ref','Conciliado']);
  (bank.transactions || []).forEach(t => rows.push([t.date, t.id, t.type, t.amount, t.ref || '', t.reconciled ? 'Sí' : 'No']));
  const csv = rows.map(r => r.map(c => '"' + String(c).replace(/"/g,'""') + '"').join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `banco_${bankId}_transacciones_${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  toast('Exportado transacciones bancarias', 'success');
}

/* Reportes avanzados */
function renderPLByAccount(period = 'month') {
  const res = renderPLReport(period);
  const container = document.getElementById('acct-pl-by-account');
  if (!container) return;
  // Agrupar por cuenta de ingreso/expense usando journalEntries
  const totals = {};
  (state.journalEntries || []).forEach(entry => {
    if (!entry.date) return;
    // filter by period if needed (simple month/year)
    totals[entry.date] = totals[entry.date] || 0; // placeholder, but we will map by account
    entry.lines.forEach(l => {
      const key = l.account || l.code || l.name;
      totals[key] = (totals[key] || 0) + (Number(l.credit || 0) - Number(l.debit || 0));
    });
  });
  container.innerHTML = '<div style="font-weight:700">P&L por cuenta (resumido)</div>' + Object.keys(totals).map(k => `<div>${k}: <strong>${fmt(totals[k])}</strong></div>`).join('');
}

function renderCashFlow(period = 'month') {
  // Muy simple: sumar entradas/salidas desde bank.transactions
  const container = document.getElementById('acct-cashflow');
  if (!container) return;
  const banks = state.bankAccounts || [];
  let inflow = 0, outflow = 0;
  banks.forEach(b => (b.transactions || []).forEach(t => {
    const amt = Number(t.amount || 0);
    if (amt > 0) inflow += amt; else outflow += Math.abs(amt);
  }));
  container.innerHTML = `
    <div style="font-weight:700">Flujo de Caja (Periodo: ${period})</div>
    <div>Entradas: <strong>${fmt(inflow)}</strong></div>
    <div>Salidas: <strong>${fmt(outflow)}</strong></div>
    <div>Saldo Neto: <strong>${fmt(inflow - outflow)}</strong></div>
  `;
}

function exportJournalCSV() {
  const rows = [];
  rows.push(['Fecha','Ref','AsientoID','Cuenta','Código','Debe','Haber','Descripción']);
  (state.journalEntries || []).forEach(entry => {
    entry.lines.forEach(line => {
      rows.push([entry.date, entry.ref, entry.id, line.name, line.code, Number(line.debit || 0), Number(line.credit || 0), line.desc || entry.description || '']);
    });
  });

  const csv = rows.map(r => r.map(c => '"' + String(c).replace(/"/g,'""') + '"').join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `asientos_${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  toast('Exportado CSV de asientos', 'success');
}

function exportJournalSAI() {
  // Export simple SAI-like (semicolons) for contadores: fecha;asiento;cuenta;debe;haber;descripcion
  const lines = [];
  lines.push('SAI_EXPORT;MotoTaller');
  (state.journalEntries || []).forEach(entry => {
    entry.lines.forEach(line => {
      lines.push([entry.date, entry.id, line.code, Number(line.debit || 0), Number(line.credit || 0), (line.desc || entry.description || '')].join(';'));
    });
  });
  const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `asientos_sai_${new Date().toISOString().slice(0,10)}.sai.txt`;
  a.click();
  URL.revokeObjectURL(url);
  toast('Exportado SAI (formato simple)', 'success');
}

function renderPLReport(period = 'month') {
  // period: 'month' or 'year' or custom {from,to}
  const today = new Date();
  let start, end;
  if (period === 'month') {
    start = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
    end = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];
  } else if (period === 'year') {
    start = new Date(today.getFullYear(), 0, 1).toISOString().split('T')[0];
    end = new Date(today.getFullYear(), 11, 31).toISOString().split('T')[0];
  } else if (period.from && period.to) {
    start = period.from; end = period.to;
  }

  const ventas = (state.ventas || []).filter(v => v.fecha >= start && v.fecha <= end);
  const totalVenta = ventas.reduce((s, v) => s + Number(v.total || 0), 0);
  const totalIVA = ventas.reduce((s, v) => s + Number(v.iva || 0), 0);
  const costo = ventas.reduce((s, v) => s + getInventoryCostForSale(v), 0);
  const utilidadBruta = totalVenta - costo - totalIVA;

  const container = document.getElementById('acct-pl-report');
  if (container) {
    container.innerHTML = `
      <div style="font-weight:700">Reporte P&L (${start} → ${end})</div>
      <div>Ventas Totales: <strong>${fmt(totalVenta)}</strong></div>
      <div>IVA Recaudado: <strong>${fmt(totalIVA)}</strong></div>
      <div>Costo de Ventas: <strong>${fmt(costo)}</strong></div>
      <div style="margin-top:8px; font-size:16px">Utilidad Bruta: <strong>${fmt(utilidadBruta)}</strong></div>
    `;
  } else {
    console.log('P&L', { start, end, totalVenta, totalIVA, costo, utilidadBruta });
  }
  return { start, end, totalVenta, totalIVA, costo, utilidadBruta };
}

function renderBalanceSheet() {
  // Calcular saldos por cuentas usando journalEntries
  const balances = {};
  (state.journalEntries || []).forEach(entry => {
    entry.lines.forEach(l => {
      balances[l.account] = balances[l.account] || 0;
      balances[l.account] += (Number(l.debit || 0) - Number(l.credit || 0));
    });
  });

  // Añadir inventario valorizado directo
  const inventoryVal = (state.inventario || []).reduce((s, r) => s + (Number(r.stock || 0) * Number(r.costo || 0)), 0);
  balances['inventory'] = Math.max(balances['inventory'] || 0, inventoryVal);

  const assets = ['cash','bank','accountsReceivable','inventory'].reduce((s, k) => s + (balances[k] || 0), 0);
  const liabilities = ['vatPayable'].reduce((s, k) => s + Math.max(0, -(balances[k] || 0)), 0);
  const equity = assets - liabilities;

  const container = document.getElementById('acct-balance-report');
  if (container) {
    container.innerHTML = `
      <div style="font-weight:700">Balance General (Snapshot)</div>
      <div>Activos: <strong>${fmt(assets)}</strong></div>
      <div>Pasivos: <strong>${fmt(liabilities)}</strong></div>
      <div>Patrimonio (calculado): <strong>${fmt(equity)}</strong></div>
      <div style="margin-top:8px;font-size:12px;color:var(--text3)">Detalle: ${JSON.stringify(balances)}</div>
    `;
  } else {
    console.log('Balance', { assets, liabilities, equity, balances });
  }
  return { assets, liabilities, equity, balances };
}


function setPosCategory(cat) {
  state.selectedPosCategory = cat;
  renderPosCatalog();
}

function generarPedidoProveedor() {
  const bajoStock = state.inventario.filter(r => r.stock <= r.min);
  if (!bajoStock.length) {
    return toast('Todo tu inventario está al día. ¡No necesitas pedir stock!', 'success');
  }

  const itemsText = bajoStock.map(r => {
    const cantidadRecomendada = (r.min * 2) - r.stock;
    return `- ${r.desc} (Código: ${r.codigo}) - Solicitar: ${cantidadRecomendada} unidades (Stock actual: ${r.stock})`;
  }).join('\n');

  const msg = `🌴 *PEDIDO DE STOCK - TALLER MOTO CARIBE* 🏍️\n\nHola, necesito realizar un pedido de reposición para los siguientes repuestos:\n\n${itemsText}\n\nQuedo atento a la confirmación de disponibilidad y precios. ¡Gracias!`;

  window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
  toast('Generando lista y abriendo WhatsApp...', 'success');
}

// Estado temporal del carrito de ventas (declarado antes de init() para evitar TDZ)
let formVentasCarrito = [];

init();

// =======================================================
// LÓGICA DEL NUEVO FORMULARIO DE VENTAS CON BÚSQUEDA Y CARRITO
// =======================================================

function cargarClientesFormVentas() {
  const select = document.getElementById('v-form-cliente');
  if (!select) return;
  const currentVal = select.value;
  select.innerHTML = '<option value="">Venta Directa / Mostrador</option>' + 
    state.clientes.map(c => `<option value="${c.id}">${c.nombre} (${c.cedula})</option>`).join('');
  select.value = currentVal;
}

function buscarItemFormVenta() {
  const q = document.getElementById('v-form-item-search').value.toLowerCase().trim();
  const autoDiv = document.getElementById('v-form-autocomplete');
  
  if (q.length < 2) {
    autoDiv.style.display = 'none';
    document.getElementById('v-form-item-id').value = 'SERV';
    return;
  }
  
  const results = state.inventario.filter(r => r.desc.toLowerCase().includes(q) || r.codigo.toLowerCase().includes(q));
  
  if (results.length === 0) {
    autoDiv.innerHTML = '<div style="padding: 10px; color: var(--text3); font-size: 13px; text-align: center;">No se encontró en inventario (Se agregará como manual)</div>';
    autoDiv.style.display = 'block';
    document.getElementById('v-form-item-id').value = 'SERV';
    return;
  }
  
  autoDiv.innerHTML = results.map(r => `
    <div style="padding: 10px; border-bottom: 1px solid var(--border); cursor: pointer;" 
         onclick="seleccionarItemFormVenta('${r.id}', \`${r.desc.replace(/`/g, '')}\`, ${r.venta})"
         onmouseover="this.style.background='var(--bg3)'" 
         onmouseout="this.style.background=''">
      <div style="font-weight: 600;">${r.desc}</div>
      <div style="font-size: 11px; color: var(--text3); display: flex; justify-content: space-between;">
        <span>Código: ${r.codigo}</span>
        <span style="color: var(--orange); font-weight: bold;">${fmt(r.venta)}</span>
      </div>
    </div>
  `).join('');
  autoDiv.style.display = 'block';
}

function seleccionarItemFormVenta(id, desc, price) {
  document.getElementById('v-form-item-search').value = desc;
  document.getElementById('v-form-item-price').value = price;
  document.getElementById('v-form-item-id').value = id;
  document.getElementById('v-form-autocomplete').style.display = 'none';
  document.getElementById('v-form-item-qty').focus();
}

function agregarItemFormVenta() {
  try {
    const descEl = document.getElementById('v-form-item-search');
    const qtyEl = document.getElementById('v-form-item-qty');
    const priceEl = document.getElementById('v-form-item-price');
    const idEl = document.getElementById('v-form-item-id');

    if (!descEl || !qtyEl || !priceEl || !idEl) {
      console.error('agregarItemFormVenta: faltan elementos del formulario', { descEl, qtyEl, priceEl, idEl });
      toast('Error: formulario incompleto (elementos no encontrados)', 'error');
      return;
    }

    const desc = descEl.value.trim();
    const qty = parseFloat(qtyEl.value) || 1;
    const price = parseFloat(priceEl.value) || 0;
    const id = idEl.value;

    console.log('agregarItemFormVenta called', { desc, qty, price, id });

    if (!desc || price <= 0) {
      return toast('Ingresa una descripción válida y un precio mayor a 0', 'warning');
    }

    formVentasCarrito.push({ id, desc, qty, price });

    // Limpiar campos de entrada
    descEl.value = '';
    qtyEl.value = '1';
    priceEl.value = '';
    idEl.value = 'SERV';
    descEl.focus();

    renderCarritoFormVenta();
  } catch (err) {
    console.error('Error en agregarItemFormVenta', err);
    const msg = err && err.message ? err.message : String(err);
    toast('Error interno al añadir ítem: ' + msg, 'error');
  }
}

function eliminarItemFormVenta(index) {
  formVentasCarrito.splice(index, 1);
  renderCarritoFormVenta();
}

function renderCarritoFormVenta() {
  const tbody = document.getElementById('v-form-cart-body');
  const totalEl = document.getElementById('v-form-total');
  
  if (formVentasCarrito.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5"><div class="empty-state" style="padding:10px;">No hay ítems agregados</div></td></tr>';
    totalEl.textContent = '$0';
    return;
  }
  
  let total = 0;
  tbody.innerHTML = formVentasCarrito.map((item, index) => {
    const sub = item.qty * item.price;
    total += sub;
    return `
      <tr>
        <td><strong>${item.desc}</strong></td>
        <td>${item.qty}</td>
        <td>${fmt(item.price)}</td>
        <td style="font-weight:bold;">${fmt(sub)}</td>
        <td><button class="btn btn-ghost btn-sm" style="color:var(--red);" onclick="eliminarItemFormVenta(${index})">✕</button></td>
      </tr>
    `;
  }).join('');
  
  totalEl.textContent = fmt(total);
}

function procesarVentaCompleta() {
  if (formVentasCarrito.length === 0) {
    return toast('Agrega al menos un ítem a la venta', 'warning');
  }

  const clienteId = document.getElementById('v-form-cliente').value;
  const pago = document.getElementById('v-form-pago').value;
  const obs = document.getElementById('v-form-obs').value.trim();

  let total = 0;
  formVentasCarrito.forEach(i => total += (i.qty * i.price));

  const id = 'F' + Date.now().toString().slice(-6);

  const venta = {
    id,
    fecha: new Date().toISOString().split('T')[0],
    clienteId: clienteId || null,
    items: [...formVentasCarrito],
    subtotal: total,
    iva: 0,
    total: total,
    pago,
    estadoPago: pago === 'Crédito' ? 'Pendiente' : 'Pagado',
    fechaVencimiento: pago === 'Crédito' ? getNextDate(30) : null,
    rep: total,
    mo: 0,
    desc: 0,
    obs
  };

  try {
    if (typeof db !== 'undefined' && db) {
      db.collection('ventas').doc(id).set(venta);
    }
    
    // Descontar inventario
    venta.items.forEach(item => {
      if (item.id && item.id !== 'SERV') {
        const rep = state.inventario.find(r => r.id === item.id);
        if (rep) {
          rep.stock -= item.qty;
          if (rep.stock < 0) rep.stock = 0;
          if (typeof db !== 'undefined' && db) {
            db.collection('inventario').doc(rep.id).update({ stock: rep.stock });
          }
        }
      }
    });

    state.ventas.push(venta);
    toast('¡Venta registrada con éxito!', 'success');
    
    // Limpiar
    formVentasCarrito = [];
    renderCarritoFormVenta();
    document.getElementById('v-form-obs').value = '';
    document.getElementById('v-form-cliente').value = '';
    
    refresh();
  } catch (e) {
    console.error(e);
    toast('Error al guardar la venta', 'error');
  }
}

// Ocultar autocomplete si hace clic afuera
document.addEventListener('click', (e) => {
  if (!e.target.closest('.field')) {
    const autoDiv = document.getElementById('v-form-autocomplete');
    if (autoDiv) autoDiv.style.display = 'none';
  }
});

// Interceptar refresh global de manera segura
const oldRefresh = typeof refresh === 'function' ? refresh : null;
refresh = function() {
  if (oldRefresh) oldRefresh();
  cargarClientesFormVentas();
};

