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
    ordenes:    'Órdenes de servicio',
    ventas:     'Ventas y facturación',
  };
  document.getElementById('topbar-title').textContent = titles[name] || name;
  refresh();
}

/* ── Refresh global ─────────────────────────────────────────── */

function refresh() {
  updateBadges();
  renderDashboard();
  renderClientes();
  renderMotos();
  renderInventario();
  renderOrdenes();
  renderVentas();
}

function updateBadges() {
  const lowStock  = state.inventario.filter(r => r.stock <= r.min).length;
  const activeOrd = state.ordenes.filter(o => o.estado !== 'Entregada').length;

  const bInv = document.getElementById('badge-inv');
  const bOrd = document.getElementById('badge-ord');
  bInv.textContent    = lowStock;
  bOrd.textContent    = activeOrd;
  bInv.style.display  = lowStock  ? '' : 'none';
  bOrd.style.display  = activeOrd ? '' : 'none';
}

/* ── Dashboard ──────────────────────────────────────────────── */

function renderDashboard() {
  const totalV    = state.ventas.reduce((s, v) => s + v.total, 0);
  const activeOrd = state.ordenes.filter(o => o.estado !== 'Entregada').length;
  const lowStock  = state.inventario.filter(r => r.stock <= r.min).length;

  document.getElementById('dash-ventas').textContent     = fmt(totalV);
  document.getElementById('dash-ventas-sub').textContent = state.ventas.length + ' facturas emitidas';
  document.getElementById('dash-ordenes').textContent    = activeOrd;
  document.getElementById('dash-clientes').textContent   = state.clientes.length;
  document.getElementById('dash-stock').textContent      = lowStock;

  /* Órdenes recientes */
  const orList  = document.getElementById('dash-ordenes-list');
  const recents = [...state.ordenes].reverse().slice(0, 4);
  if (!recents.length) {
    orList.innerHTML = '<div class="empty-state"><div class="icon">🔩</div>Sin órdenes</div>';
  } else {
    orList.innerHTML = recents.map(o => {
      const c = state.clientes.find(x => x.id === o.clienteId);
      return `<div style="display:flex;align-items:center;justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--border)">
        <div>
          <div style="font-weight:600;font-size:13px">${o.id} · ${c ? c.nombre : '?'}</div>
          <div style="color:var(--text3);font-size:12px">${o.mecanico} · ${o.fecha}</div>
        </div>
        ${estadoBadge(o.estado)}
      </div>`;
    }).join('');
  }

  /* Alertas de stock */
  const alertDiv = document.getElementById('dash-alertas');
  const alerts   = state.inventario.filter(r => r.stock <= r.min);
  if (!alerts.length) {
    alertDiv.innerHTML = '<div class="empty-state"><div class="icon">✅</div>Todo en orden</div>';
  } else {
    alertDiv.innerHTML = alerts.map(r => `
      <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border)">
        <div>
          <div style="font-size:13px;font-weight:500">${r.desc}</div>
          <div style="font-size:11px;color:var(--text3)">${r.codigo} · ${r.cat}</div>
        </div>
        <div style="text-align:right">
          <span class="badge badge-red">Stock: ${r.stock}</span>
          <div style="font-size:11px;color:var(--text3);margin-top:2px">Mín: ${r.min}</div>
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
        <button class="btn btn-danger btn-sm" onclick="deleteCliente('${c.id}')">🗑️</button>
      </td>
    </tr>`;
  }).join('');
}

function openModal(id) {
  document.getElementById(id).classList.add('open');
  if (id === 'modal-cliente')  { clearClienteForm();  populateSelects(); }
  if (id === 'modal-moto')     { clearMotoForm();      populateSelects(); }
  if (id === 'modal-repuesto') { clearRepuestoForm(); }
  if (id === 'modal-orden')    { clearOrdenForm();     populateSelects(); }
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
      <td><button class="btn btn-danger btn-sm" onclick="deleteMoto('${m.id}')">🗑️</button></td>
    </tr>`;
  }).join('');
}

function clearMotoForm() {
  ['m-placa','m-marca','m-modelo','m-anio','m-cc','m-color','m-km'].forEach(id => document.getElementById(id).value = '');
  const sel = document.getElementById('m-cliente');
  sel.innerHTML = '<option value="">Seleccionar cliente...</option>';
  state.clientes.forEach(c => { sel.innerHTML += `<option value="${c.id}">${c.nombre}</option>`; });
}

function saveMoto() {
  const clienteId = document.getElementById('m-cliente').value;
  const placa     = document.getElementById('m-placa').value.trim().toUpperCase();
  const marca     = document.getElementById('m-marca').value.trim();
  const modelo    = document.getElementById('m-modelo').value.trim();
  if (!clienteId || !placa || !marca || !modelo) { toast('Completa los campos obligatorios', 'error'); return; }

  const id = 'M' + String(state.nextIds.m++).padStart(3, '0');
  state.motos.push({ id, clienteId, placa, marca, modelo,
    anio:  document.getElementById('m-anio').value,
    cc:    document.getElementById('m-cc').value,
    color: document.getElementById('m-color').value,
    km:    parseInt(document.getElementById('m-km').value) || 0,
  });
  toast('Moto registrada', 'success');
  closeModal('modal-moto');
  refresh();
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
        <button class="btn btn-ghost btn-sm" onclick="editRepuesto('${r.id}')">✏️</button>
        <button class="btn btn-danger btn-sm" onclick="deleteRepuesto('${r.id}')">🗑️</button>
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

/* ── Órdenes ────────────────────────────────────────────────── */

function renderOrdenes() {
  let filtered = state.ordenes;
  if (state.ordenFiltro) filtered = filtered.filter(o => o.estado === state.ordenFiltro);

  const tb = document.getElementById('tabla-ordenes');
  if (!filtered.length) {
    tb.innerHTML = `<tr><td colspan="7"><div class="empty-state"><div class="icon">🔩</div>Sin órdenes</div></td></tr>`;
    return;
  }
  tb.innerHTML = [...filtered].reverse().map(o => {
    const c     = state.clientes.find(x => x.id === o.clienteId);
    const m     = state.motos.find(x => x.id === o.motoId);
    const total = calcOrdenTotal(o.items);
    return `<tr>
      <td><strong>${o.id}</strong></td>
      <td>${o.fecha}</td>
      <td>
        <div>${c ? c.nombre : '?'}</div>
        <div style="font-size:11px;color:var(--text3)">${m ? m.marca + ' ' + m.modelo + ' · ' + m.placa : '?'}</div>
      </td>
      <td>${o.mecanico}</td>
      <td><strong>${fmt(total)}</strong></td>
      <td>${estadoBadge(o.estado)}</td>
      <td>
        <button class="btn btn-ghost btn-sm" onclick="verOrden('${o.id}')">👁️</button>
        <button class="btn btn-ghost btn-sm" onclick="cambiarEstado('${o.id}')">🔄</button>
        <button class="btn btn-danger btn-sm" onclick="deleteOrden('${o.id}')">🗑️</button>
      </td>
    </tr>`;
  }).join('');
}

function filterOrd(estado) {
  state.ordenFiltro = estado;
  renderOrdenes();
}

function calcOrdenTotal(items = []) {
  return items.reduce((s, i) => s + (i.qty * i.precio), 0);
}

function loadMotosCliente() {
  const cid = document.getElementById('o-cliente').value;
  const sel = document.getElementById('o-moto');
  sel.innerHTML = '<option value="">Seleccionar moto...</option>';
  state.motos.filter(m => m.clienteId === cid).forEach(m => {
    sel.innerHTML += `<option value="${m.id}">${m.placa} – ${m.marca} ${m.modelo}</option>`;
  });
}

function clearOrdenForm() {
  ['o-mecanico','o-km','o-falla','o-diag'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('o-fecha').value  = new Date().toISOString().split('T')[0];
  document.getElementById('o-estado').value = 'Recibida';
  document.getElementById('o-items').innerHTML = '';
  ordenItems = [];
  updateOrdenTotals();
}

let ordenItems = [];

function addOrdenItem() {
  ordenItems.push({ desc: '', tipo: 'Mano de obra', qty: 1, precio: 0 });
  renderOrdenItems();
}

function renderOrdenItems() {
  const container = document.getElementById('o-items');
  container.innerHTML = ordenItems.map((item, i) => `
    <div style="display:grid;grid-template-columns:1fr 130px 60px 100px 32px;gap:8px;margin-bottom:8px;align-items:center">
      <input style="background:var(--bg3);border:1px solid var(--border2);border-radius:6px;padding:7px 10px;color:var(--text);font-family:var(--font);font-size:12px;outline:none"
             placeholder="Descripción" value="${item.desc}" oninput="updateItem(${i},'desc',this.value)"/>
      <select style="background:var(--bg3);border:1px solid var(--border2);border-radius:6px;padding:7px 8px;color:var(--text);font-family:var(--font);font-size:12px;outline:none"
              onchange="updateItem(${i},'tipo',this.value)">
        <option ${item.tipo === 'Mano de obra' ? 'selected' : ''}>Mano de obra</option>
        <option ${item.tipo === 'Repuesto'     ? 'selected' : ''}>Repuesto</option>
      </select>
      <input type="number" style="background:var(--bg3);border:1px solid var(--border2);border-radius:6px;padding:7px 8px;color:var(--text);font-family:var(--font);font-size:12px;outline:none"
             value="${item.qty}" min="1" oninput="updateItem(${i},'qty',+this.value)"/>
      <input type="number" style="background:var(--bg3);border:1px solid var(--border2);border-radius:6px;padding:7px 8px;color:var(--text);font-family:var(--font);font-size:12px;outline:none"
             placeholder="Precio" value="${item.precio || ''}" oninput="updateItem(${i},'precio',+this.value)"/>
      <button style="background:var(--red-dim);border:1px solid #5a1a1a;border-radius:6px;color:var(--red);cursor:pointer;font-size:14px;padding:4px 8px"
              onclick="removeItem(${i})">✕</button>
    </div>`).join('');
  updateOrdenTotals();
}

function updateItem(i, key, val) { ordenItems[i][key] = val; updateOrdenTotals(); }
function removeItem(i) { ordenItems.splice(i, 1); renderOrdenItems(); }

function updateOrdenTotals() {
  const mo  = ordenItems.filter(i => i.tipo === 'Mano de obra').reduce((s, i) => s + i.qty * i.precio, 0);
  const rep = ordenItems.filter(i => i.tipo === 'Repuesto').reduce((s, i) => s + i.qty * i.precio, 0);
  document.getElementById('o-subtotal-mo').textContent    = fmt(mo);
  document.getElementById('o-subtotal-rep').textContent   = fmt(rep);
  document.getElementById('o-total-display').textContent  = fmt(mo + rep);
}

function saveOrden() {
  const clienteId = document.getElementById('o-cliente').value;
  const motoId    = document.getElementById('o-moto').value;
  const mecanico  = document.getElementById('o-mecanico').value.trim();
  const falla     = document.getElementById('o-falla').value.trim();
  if (!clienteId || !motoId || !mecanico || !falla) { toast('Completa los campos obligatorios', 'error'); return; }

  const id = 'OS-' + String(state.nextIds.o++).padStart(3, '0');
  state.ordenes.push({
    id, clienteId, motoId, mecanico,
    km:     parseInt(document.getElementById('o-km').value) || 0,
    falla,
    diag:   document.getElementById('o-diag').value.trim(),
    fecha:  document.getElementById('o-fecha').value,
    estado: document.getElementById('o-estado').value,
    items:  [...ordenItems],
  });
  ordenItems = [];
  toast('Orden creada: ' + id, 'success');
  closeModal('modal-orden');
  refresh();
}

function cambiarEstado(id) {
  const o      = state.ordenes.find(x => x.id === id);
  const ciclo  = ['Recibida', 'En proceso', 'En espera', 'Entregada'];
  o.estado     = ciclo[(ciclo.indexOf(o.estado) + 1) % ciclo.length];
  toast('Estado → ' + o.estado, 'success');
  refresh();
}

function deleteOrden(id) {
  if (!confirm('¿Eliminar esta orden?')) return;
  state.ordenes = state.ordenes.filter(o => o.id !== id);
  refresh();
}

function verOrden(id) {
  const o   = state.ordenes.find(x => x.id === id);
  const c   = state.clientes.find(x => x.id === o.clienteId);
  const m   = state.motos.find(x => x.id === o.motoId);
  const mo  = (o.items || []).filter(i => i.tipo === 'Mano de obra').reduce((s, i) => s + i.qty * i.precio, 0);
  const rep = (o.items || []).filter(i => i.tipo === 'Repuesto').reduce((s, i) => s + i.qty * i.precio, 0);
  state.currentOrdenId = id;

  document.getElementById('vor-titulo').textContent = o.id;
  document.getElementById('vor-body').innerHTML = `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px">
      <div>
        <div style="font-size:11px;color:var(--text3);text-transform:uppercase;letter-spacing:1px;margin-bottom:4px">Cliente</div>
        <strong>${c ? c.nombre : '?'}</strong><br>
        <span style="font-size:12px;color:var(--text3)">${c ? c.tel : ''}</span>
      </div>
      <div>
        <div style="font-size:11px;color:var(--text3);text-transform:uppercase;letter-spacing:1px;margin-bottom:4px">Moto</div>
        <strong>${m ? m.marca + ' ' + m.modelo : '–'}</strong><br>
        <span style="font-size:12px;color:var(--text3)">${m ? 'Placa: ' + m.placa : ''}</span>
      </div>
      <div>
        <div style="font-size:11px;color:var(--text3);text-transform:uppercase;letter-spacing:1px;margin-bottom:4px">Mecánico</div>
        ${o.mecanico}
      </div>
      <div>
        <div style="font-size:11px;color:var(--text3);text-transform:uppercase;letter-spacing:1px;margin-bottom:4px">Estado</div>
        ${estadoBadge(o.estado)}
      </div>
      <div style="grid-column:1/-1">
        <div style="font-size:11px;color:var(--text3);text-transform:uppercase;letter-spacing:1px;margin-bottom:4px">Falla reportada</div>
        ${o.falla}
      </div>
      ${o.diag ? `<div style="grid-column:1/-1">
        <div style="font-size:11px;color:var(--text3);text-transform:uppercase;letter-spacing:1px;margin-bottom:4px">Diagnóstico</div>
        ${o.diag}
      </div>` : ''}
    </div>
    <div class="divider"></div>
    <table style="width:100%;font-size:13px;border-collapse:collapse">
      <thead><tr style="background:var(--bg3)">
        <th style="padding:8px 12px;text-align:left;color:var(--text3);font-size:11px;text-transform:uppercase">Descripción</th>
        <th style="padding:8px 12px;text-align:center;color:var(--text3);font-size:11px;text-transform:uppercase">Tipo</th>
        <th style="padding:8px 12px;text-align:center;color:var(--text3);font-size:11px;text-transform:uppercase">Cant.</th>
        <th style="padding:8px 12px;text-align:right;color:var(--text3);font-size:11px;text-transform:uppercase">Precio</th>
        <th style="padding:8px 12px;text-align:right;color:var(--text3);font-size:11px;text-transform:uppercase">Subtotal</th>
      </tr></thead>
      <tbody>
        ${(o.items || []).map(item => `
          <tr style="border-bottom:1px solid var(--border)">
            <td style="padding:9px 12px">${item.desc}</td>
            <td style="padding:9px 12px;text-align:center">
              <span class="badge ${item.tipo === 'Repuesto' ? 'badge-blue' : 'badge-orange'}">${item.tipo}</span>
            </td>
            <td style="padding:9px 12px;text-align:center">${item.qty}</td>
            <td style="padding:9px 12px;text-align:right">${fmt(item.precio)}</td>
            <td style="padding:9px 12px;text-align:right"><strong>${fmt(item.qty * item.precio)}</strong></td>
          </tr>`).join('')}
      </tbody>
    </table>
    <div style="display:flex;justify-content:flex-end;gap:24px;margin-top:16px;padding-top:12px;border-top:1px solid var(--border)">
      <div style="font-size:13px;color:var(--text2)">Mano de obra: <strong>${fmt(mo)}</strong></div>
      <div style="font-size:13px;color:var(--text2)">Repuestos: <strong>${fmt(rep)}</strong></div>
      <div style="font-size:16px;color:var(--orange)">Total: <strong>${fmt(mo + rep)}</strong></div>
    </div>`;
  document.getElementById('modal-ver-orden').classList.add('open');
}

function facturarOrden() {
  closeModal('modal-ver-orden');
  openModal('modal-factura');
  const o = state.ordenes.find(x => x.id === state.currentOrdenId);
  if (o) {
    const mo  = o.items.filter(i => i.tipo === 'Mano de obra').reduce((s, i) => s + i.qty * i.precio, 0);
    const rep = o.items.filter(i => i.tipo === 'Repuesto').reduce((s, i) => s + i.qty * i.precio, 0);
    document.getElementById('f-mo').value    = mo;
    document.getElementById('f-rep').value   = rep;
    document.getElementById('f-orden').value = state.currentOrdenId;
    calcFactura();
  }
}

/* ── Ventas ─────────────────────────────────────────────────── */

function renderVentas() {
  const total = state.ventas.reduce((s, v) => s + v.total, 0);
  const mo    = state.ventas.reduce((s, v) => s + v.mo,    0);
  const rep   = state.ventas.reduce((s, v) => s + v.rep,   0);
  document.getElementById('v-total').textContent = fmt(total);
  document.getElementById('v-mo').textContent    = fmt(mo);
  document.getElementById('v-rep').textContent   = fmt(rep);

  const tb = document.getElementById('tabla-ventas');
  if (!state.ventas.length) {
    tb.innerHTML = `<tr><td colspan="10"><div class="empty-state"><div class="icon">🧾</div>Sin ventas</div></td></tr>`;
    return;
  }
  tb.innerHTML = [...state.ventas].reverse().map(v => {
    const o = state.ordenes.find(x => x.id === v.ordenId);
    const c = o ? state.clientes.find(x => x.id === o.clienteId) : null;
    return `<tr>
      <td><strong>${v.id}</strong></td>
      <td>${v.fecha}</td>
      <td>${v.ordenId || '–'}</td>
      <td>${c ? c.nombre : 'Venta directa'}</td>
      <td>${fmt(v.rep)}</td>
      <td>${fmt(v.mo)}</td>
      <td>${v.desc ? '- ' + fmt(v.desc) : '–'}</td>
      <td><strong style="color:var(--orange)">${fmt(v.total)}</strong></td>
      <td><span class="badge badge-green">${v.pago}</span></td>
      <td><button class="btn btn-danger btn-sm" onclick="deleteVenta('${v.id}')">🗑️</button></td>
    </tr>`;
  }).join('');
}

function clearFacturaForm() {
  ['f-rep','f-mo','f-desc','f-obs'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('f-total').value = '$0';
  document.getElementById('f-pago').value  = 'Efectivo';
}

function calcFactura() {
  const rep  = parseInt(document.getElementById('f-rep').value)  || 0;
  const mo   = parseInt(document.getElementById('f-mo').value)   || 0;
  const desc = parseInt(document.getElementById('f-desc').value) || 0;
  document.getElementById('f-total').value = fmt(rep + mo - desc);
}

function saveFactura() {
  const rep   = parseInt(document.getElementById('f-rep').value)  || 0;
  const mo    = parseInt(document.getElementById('f-mo').value)   || 0;
  const desc  = parseInt(document.getElementById('f-desc').value) || 0;
  const total = rep + mo - desc;
  if (total <= 0) { toast('El total debe ser mayor a $0', 'error'); return; }

  const id = 'FAC-' + String(state.nextIds.f++).padStart(3, '0');
  state.ventas.push({
    id,
    ordenId: document.getElementById('f-orden').value || null,
    rep, mo, desc, total,
    pago:  document.getElementById('f-pago').value,
    obs:   document.getElementById('f-obs').value,
    fecha: new Date().toISOString().split('T')[0],
  });
  toast('Factura emitida: ' + id, 'success');
  closeModal('modal-factura');
  refresh();
}

function deleteVenta(id) {
  if (!confirm('¿Eliminar esta factura?')) return;
  state.ventas = state.ventas.filter(v => v.id !== id);
  refresh();
}

/* ── Selects helpers ────────────────────────────────────────── */

function populateSelects() {
  const oCliente = document.getElementById('o-cliente');
  if (oCliente) {
    oCliente.innerHTML = '<option value="">Seleccionar cliente...</option>';
    state.clientes.forEach(c => { oCliente.innerHTML += `<option value="${c.id}">${c.nombre}</option>`; });
  }
  const mCli = document.getElementById('m-cliente');
  if (mCli) {
    mCli.innerHTML = '<option value="">Seleccionar cliente...</option>';
    state.clientes.forEach(c => { mCli.innerHTML += `<option value="${c.id}">${c.nombre}</option>`; });
  }
  const fOrden = document.getElementById('f-orden');
  if (fOrden) {
    fOrden.innerHTML = '<option value="">Sin orden (venta directa)</option>';
    state.ordenes.forEach(o => {
      const nombre = state.clientes.find(c => c.id === o.clienteId)?.nombre || '?';
      fOrden.innerHTML += `<option value="${o.id}">${o.id} – ${nombre}</option>`;
    });
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
