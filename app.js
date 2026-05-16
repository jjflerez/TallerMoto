/* ============================================================
   app.js  –  Lógica principal de la aplicación
   ============================================================ */

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
  };
  document.getElementById('topbar-title').textContent = titles[name] || name;
  
  // Cerrar sidebar en móvil tras click
  const sb = document.getElementById('sidebar');
  if (sb.classList.contains('open')) toggleSidebar();

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
}

function updateBadges() {
  const lowStock  = state.inventario.filter(r => r.stock <= r.min).length;

  const bInv = document.getElementById('badge-inv');
  if (bInv) {
    bInv.textContent    = lowStock;
    bInv.style.display  = lowStock  ? '' : 'none';
  }
}

function checkCredits() {
  const alertDiv = document.getElementById('alertas-credito');
  if (!alertDiv) return;

  const hoy = new Date().toISOString().split('T')[0];
  const pendientes = state.ventas.filter(v => v.pago === 'Crédito' && v.estadoPago === 'Pendiente');
  
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
}

function renderCreditRow(v, color) {
  const c = state.clientes.find(x => x.id === v.clienteId);
  const hoy = new Date().toISOString().split('T')[0];
  const msgLabel = v.fechaVencimiento === hoy ? 'Vence HOY' : (v.fechaVencimiento < hoy ? 'Atrasado' : 'Vence pronto');
  
  return `
    <div style="display:flex; justify-content:space-between; align-items:center; background:var(--bg2); padding:10px; border-radius:8px; font-size:13px; border-left:4px solid var(--${color})">
      <div>
        <strong>${c ? c.nombre : 'Cliente Desconocido'}</strong> <br/>
        <span style="color:var(--text3)">${msgLabel}: ${v.fechaVencimiento}</span>
      </div>
      <div style="display:flex; gap:5px; align-items:center">
        <strong style="color:var(--${color}); margin-right:10px">${fmt(v.total)}</strong>
        <button class="btn btn-primary btn-sm" style="background:#25D366; border:0" onclick="sendWhatsAppReminder('${v.id}')">📱 WA</button>
        <button class="btn btn-primary btn-sm" style="background:#007AFF; border:0" onclick="sendSMSReminder('${v.id}')">💬 SMS</button>
        <button class="btn btn-ghost btn-sm" onclick="marcarPagado('${v.id}')">✅</button>
      </div>
    </div>
  `;
}

function getNextDate(days) {
  const d = new Date();
  // Usar mediodía para evitar problemas de zona horaria al cambiar de día
  d.setHours(12, 0, 0, 0);
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

/* ── Dashboard ──────────────────────────────────────────────── */

function renderDashboard() {
  const totalV    = state.ventas.reduce((s, v) => s + v.total, 0);
  const lowStock  = state.inventario.filter(r => r.stock <= r.min).length;

  document.getElementById('dash-ventas').textContent     = fmt(totalV);
  document.getElementById('dash-ventas-sub').textContent = state.ventas.length + ' facturas emitidas';
  document.getElementById('dash-clientes').textContent   = state.clientes.length;
  document.getElementById('dash-stock').textContent      = lowStock;

  /* Alertas de stock */
  const alertDiv = document.getElementById('dash-alertas');
  const alerts   = state.inventario.filter(r => r.stock <= r.min);
  if (!alerts.length) {
    alertDiv.innerHTML = '<div class="empty-state"><div class="icon">✅</div>Todo en orden</div>';
  } else {
    alertDiv.innerHTML = alerts.map(r => `
      <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--border)">
        <div>
          <div style="font-size:13px;font-weight:600">${r.desc}</div>
          <div style="font-size:11px;color:var(--text3)">${r.codigo} · ${r.cat}</div>
        </div>
        <div style="display:flex;align-items:center;gap:12px">
          <div style="text-align:right">
            <span class="badge badge-red">Stock: ${r.stock}</span>
            <div style="font-size:11px;color:var(--text3);margin-top:2px">Mín: ${r.min}</div>
          </div>
          <button class="btn btn-ghost btn-sm" onclick="editRepuesto('${r.id}')" title="Actualizar stock">✏️</button>
        </div>
      </div>`).join('');
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
  document.getElementById(id).classList.add('open');
  if (id === 'modal-cliente')  { clearClienteForm();  populateSelects(); }
  if (id === 'modal-moto')     { clearMotoForm();      populateSelects(); }
  if (id === 'modal-repuesto') { clearRepuestoForm(); }
  if (id === 'modal-factura')  { clearFacturaForm();   populateSelects(); }
}
function closeModal(id) { document.getElementById(id).classList.remove('open'); }

function clearClienteForm() {
  ['c-nombre','c-cedula','c-tel','c-ciudad','c-email'].forEach(id => document.getElementById(id).value = '');
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
        <button class="btn btn-ghost btn-sm" onclick="editMoto('${m.id}')">✏️</button>
        ${currentUser?.role === 'Administrador' ? `
        <button class="btn btn-danger btn-sm" onclick="deleteMoto('${m.id}')">🗑️</button>
        ` : ''}
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
  if (!filtered.length) {
    tb.innerHTML = `<tr><td colspan="9"><div class="empty-state"><div class="icon">📦</div>Sin repuestos</div></td></tr>`;
    return;
  }
  tb.innerHTML = filtered.map(r => {
    const bajo = r.stock <= r.min;
    const pct  = Math.min(100, Math.round(r.stock / Math.max(r.min * 2, 1) * 100));
    return `<tr>
      <td><span class="tag">${r.codigo}</span></td>
      <td><strong>${r.desc}</strong></td>
      <td><span class="badge badge-gray">${r.cat}</span></td>
      <td>
        <div style="display:flex;align-items:center;gap:8px">
          <strong style="color:${bajo ? 'var(--red)' : 'var(--text)'}">${r.stock}</strong>
          <div class="progress" style="width:60px">
            <div class="progress-bar" style="width:${pct}%;background:${bajo ? 'var(--red)' : 'var(--green)'}"></div>
          </div>
        </div>
      </td>
      <td>${r.min}</td>
      <td>${r.costo ? fmt(r.costo) : '–'}</td>
      <td><strong>${fmt(r.venta)}</strong></td>
      <td>${bajo
        ? '<span class="badge badge-red">⚠ Stock bajo</span>'
        : '<span class="badge badge-green">OK</span>'}</td>
      <td>
        <button class="btn btn-ghost btn-sm" onclick="editRepuesto('${r.id}')" title="Editar / Actualizar stock">✏️</button>
        ${currentUser?.role === 'Administrador' ? `
        <button class="btn btn-danger btn-sm" onclick="deleteRepuesto('${r.id}')" title="Eliminar">🗑️</button>
        ` : ''}
      </td>
    </tr>`;
  }).join('');
}

function clearRepuestoForm() {
  ['r-codigo','r-desc','r-cat','r-stock','r-min','r-costo','r-venta'].forEach(id => document.getElementById(id).value = '');
  state.editingRepuesto = null;
  document.getElementById('modal-rep-title').textContent = 'Nuevo repuesto';
}

function saveRepuesto() {
  const codigo = document.getElementById('r-codigo').value.trim();
  const desc   = document.getElementById('r-desc').value.trim();
  const cat    = document.getElementById('r-cat').value.trim();
  const stock  = parseInt(document.getElementById('r-stock').value) || 0;
  const min    = parseInt(document.getElementById('r-min').value)   || 0;
  const venta  = parseInt(document.getElementById('r-venta').value) || 0;
  if (!codigo || !desc || !cat || !venta) { toast('Completa los campos obligatorios', 'error'); return; }

  if (state.editingRepuesto) {
    const r = state.inventario.find(x => x.id === state.editingRepuesto);
    Object.assign(r, { codigo, desc, cat, stock, min, costo: parseInt(document.getElementById('r-costo').value) || 0, venta });
    toast('Repuesto actualizado', 'success');
    state.editingRepuesto = null;
  } else {
    if (state.inventario.find(r => r.codigo === codigo)) { toast('El código ya existe', 'error'); return; }
    const id = 'R' + String(state.nextIds.r++).padStart(3, '0');
    state.inventario.push({ id, codigo, desc, cat, stock, min,
      costo: parseInt(document.getElementById('r-costo').value) || 0, venta,
    });
    toast('Repuesto agregado', 'success');
  }
  closeModal('modal-repuesto');
  refresh();
}

function editRepuesto(id) {
  const r = state.inventario.find(x => x.id === id);
  document.getElementById('r-codigo').value = r.codigo;
  document.getElementById('r-desc').value   = r.desc;
  document.getElementById('r-cat').value    = r.cat;
  document.getElementById('r-stock').value  = r.stock;
  document.getElementById('r-min').value    = r.min;
  document.getElementById('r-costo').value  = r.costo || '';
  document.getElementById('r-venta').value  = r.venta;
  state.editingRepuesto = id;
  document.getElementById('modal-rep-title').textContent = 'Editar repuesto';
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
  document.getElementById('btn-tab-pos').className  = tab === 'pos'  ? 'btn btn-primary' : 'btn btn-ghost';
  document.getElementById('btn-tab-hist').className = tab === 'hist' ? 'btn btn-primary' : 'btn btn-ghost';
  document.getElementById('view-pos').style.display  = tab === 'pos'  ? 'flex' : 'none';
  document.getElementById('view-hist').style.display = tab === 'hist' ? 'flex' : 'none';
  if (tab === 'pos') renderPosCatalog();
}

function renderVentas() {
  /* Historial */
  const total = state.ventas.reduce((s, v) => s + v.total, 0);
  const rep   = state.ventas.reduce((s, v) => s + v.rep,   0);
  document.getElementById('v-total').textContent = fmt(total);
  document.getElementById('v-rep').textContent   = fmt(rep);

  const tb = document.getElementById('tabla-ventas');
  if (!state.ventas.length) {
    tb.innerHTML = `<tr><td colspan="8"><div class="empty-state"><div class="icon">🧾</div>Sin ventas</div></td></tr>`;
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
          <button class="btn btn-ghost btn-sm" onclick="imprimirFactura('${v.id}')">🖨️</button>
          ${currentUser?.role === 'Administrador' ? `
          <button class="btn btn-danger btn-sm" onclick="deleteVenta('${v.id}')">🗑️</button>
          ` : ''}
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
  const filtered = state.inventario.filter(r => r.desc.toLowerCase().includes(q) || r.codigo.toLowerCase().includes(q));
  
  const container = document.getElementById('pos-catalog');
  if (!filtered.length) {
    container.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:20px;color:var(--text3)">No se encontraron repuestos</div>';
    return;
  }
  
  container.innerHTML = filtered.map(r => {
    const bajo = r.stock <= r.min;
    return `
      <div class="pos-item" onclick="addPosItem('${r.id}')">
        <div class="code">${r.codigo}</div>
        <div class="desc">${r.desc}</div>
        <div class="bottom">
          <div class="price">${fmt(r.venta)}</div>
          <div class="stock" style="color:${bajo ? 'var(--red)' : 'var(--text2)'}">Stock: ${r.stock}</div>
        </div>
      </div>
    `;
  }).join('');
}

function addPosItem(id) {
  const r = state.inventario.find(x => x.id === id);
  if (!r) return;
  
  const exist = posItems.find(i => i.id === id);
  if (exist) {
    if (r.stock <= exist.qty) return toast('No hay más stock disponible', 'error');
    exist.qty++;
  } else {
    if (r.stock < 1) return toast('Stock agotado', 'error');
    posItems.push({ id: r.id, desc: r.desc, precio: r.venta, qty: 1 });
  }
  renderPosCart();
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
        <div class="price">${fmt(item.precio)}</div>
      </div>
      <div class="controls">
        <button class="btn-qty" onclick="updatePosItemQty('${item.id}', -1)">-</button>
        <div class="qty">${item.qty}</div>
        <button class="btn-qty" onclick="updatePosItemQty('${item.id}', 1)">+</button>
      </div>
      <button class="close-btn" style="margin-left:8px;color:var(--red)" onclick="removePosItem('${item.id}')">✕</button>
    </div>
  `).join('');

  const rep = posItems.reduce((s, i) => s + (i.qty * i.precio), 0);
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
  const rep = posItems.reduce((s, i) => s + (i.qty * i.precio), 0);
  const iva = rep * 0.19;
  const desc = parseInt(document.getElementById('cobro-desc').value) || 0;
  document.getElementById('cobro-total-view').textContent = fmt(Math.max(0, rep + iva - desc));
}

function savePosSale() {
  const rep = posItems.reduce((s, i) => s + (i.qty * i.precio), 0);
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

function sendWhatsAppReminder(ventaId) {
  const v = state.ventas.find(x => x.id === ventaId);
  const c = state.clientes.find(x => x.id === v.clienteId);
  if (!c || !c.tel) return toast('El cliente no tiene teléfono registrado', 'error');

  const tel = c.tel.replace(/\D/g,'');
  const msg = encodeURIComponent(`Hola ${c.nombre}, te saludamos de MotoTaller. Te recordamos amablemente que tienes un saldo pendiente de ${fmt(v.total)} que vence el ${v.fechaVencimiento}. ¡Gracias!`);
  window.open(`https://wa.me/57${tel}?text=${msg}`, '_blank');
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

  const html = `
    <div style="text-align:center;margin-bottom:10px">
      <h2 style="margin:0;font-size:18px">MotoTaller</h2>
      <div style="font-size:12px">Sistema de Ventas</div>
      <div style="font-size:12px;margin-top:4px">----------------------</div>
    </div>
    <div style="font-size:12px;margin-bottom:10px">
      <div><strong>Factura N°:</strong> ${v.id}</div>
      <div><strong>Fecha:</strong> ${v.fecha}</div>
      <div><strong>Cliente:</strong> ${c ? c.nombre : 'Venta directa'}</div>
      ${c && c.cedula ? `<div><strong>CC/NIT:</strong> ${c.cedula}</div>` : ''}
    </div>
    <div style="font-size:12px;margin-bottom:10px">----------------------</div>
    <table style="width:100%;font-size:12px;border-collapse:collapse;margin-bottom:10px">
      <tr>
        <th style="text-align:left;padding-bottom:4px">Cant. Concepto</th>
        <th style="text-align:right;padding-bottom:4px">Total</th>
      </tr>
      ${(v.items || []).map(item => `
      <tr>
        <td style="padding:4px 0">${item.qty}x ${item.desc}</td>
        <td style="padding:4px 0;text-align:right">${fmt(item.qty * item.precio)}</td>
      </tr>
      `).join('')}
      ${v.desc ? `
      <tr>
        <td style="padding:4px 0">Descuento</td>
        <td style="padding:4px 0;text-align:right">- ${fmt(v.desc)}</td>
      </tr>` : ''}
      <tr>
        <td style="padding:4px 0">Subtotal</td>
        <td style="padding:4px 0;text-align:right">${fmt(v.rep)}</td>
      </tr>
      <tr>
        <td style="padding:4px 0">IVA (19%)</td>
        <td style="padding:4px 0;text-align:right">${fmt(v.iva || 0)}</td>
      </tr>
    </table>
    <div style="font-size:12px;margin-bottom:10px">----------------------</div>
    <div style="font-size:14px;text-align:right;font-weight:bold;margin-bottom:10px">
      Total a Pagar: ${fmt(v.total)}
    </div>
    <div style="font-size:12px;margin-bottom:15px">
      <strong>Forma de pago:</strong> ${v.pago}
    </div>
    ${v.obs ? `<div style="font-size:11px;margin-bottom:10px">Nota: ${v.obs}</div>` : ''}
    <div style="text-align:center;font-size:11px;padding-top:10px">
      ¡Gracias por su compra!<br>
      Este es un comprobante no fiscal.
    </div>
  `;

  const container = document.getElementById('ticket-print');
  container.innerHTML = html;
  window.print();
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
      <h2 style="margin:0;font-size:18px">MotoTaller</h2>
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
  return '$' + Math.round(n).toLocaleString('es-CO');
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
