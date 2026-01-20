const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbzSa7ynDTRt4HOXjhISAp6FlSbeHxwmaojShScXJSCa_begSMSCtqV-YcHbM5yZmX7mYg/exec";

// --- CONFIGURACIÓN DE PERMISOS Y ROLES ---
const ENCARGADOS_DATA = {
    // --- AUTOMOTORES ---
    "MIGUEL CORDOBA": ["UNIDAD 1", "UNIDAD 2", "UNIDAD 6", "UNIDAD 12", "SOLO_AUTOMOTORES"],
    "ENEAS FTULI": ["UNIDAD 8", "UNIDAD 9", "UNIDAD 10", "UNIDAD 16", "SOLO_AUTOMOTORES"],
    
    // KEVIN: Ve todo automotores y puede cargar VTV (por tener SOLO_AUTOMOTORES)
    "KEVIN FTULI": ["VER_TODO_AUTOMOTORES", "SOLO_AUTOMOTORES"], 
    
    // FEDERICO: AHORA TAMBIÉN VE TODO Y PUEDE CARGAR VTV/ENGRASE
    "FEDERICO MAISTERRENA": ["VER_TODO_AUTOMOTORES", "SOLO_AUTOMOTORES"], 

    // --- MATERIALES ---
    "MAURO MARTINEZ": ["SOLO_MATERIALES"], 
    "CRISTIAN DEL CASTILLO": ["SOLO_MATERIALES"],
    "MARA CASTILLO": ["SOLO_MATERIALES"], 
    "SANTIAGO LUGONES": ["SOLO_MATERIALES"], 

    // --- JEFATURA (SUPER USUARIOS) ---
    "CRISTIAN BALEY": ["SUPER_USUARIO"],
    "DANIEL FARINACCIO": ["SUPER_USUARIO"],
    "MARCO ALFARO": ["SUPER_USUARIO"],   
    "MARCOS ALFARO": ["SUPER_USUARIO"],  
    "ROLANDO AVERSANO": ["SUPER_USUARIO"],
    "NELSON CECI": ["SUPER_USUARIO"],
    "ROLANDO MISHEVITCH": ["SUPER_USUARIO"],
    "CESAR MENDIONDO": ["SUPER_USUARIO"],
    "NORBERTO COLACCE": ["SUPER_USUARIO"],
    
    // --- ELECTRICIDAD ---
    "MIGUEL ALFARO": ["SUBOFICIAL_ELECTRICIDAD"] 
};

// LISTAS
const LISTA_IDS_UNIDADES = [1, 2, 3, 4, 5, 6, 8, 9, 10, 11, 12, 13, 15, 16];

// BASE DE DATOS LOCAL
let VTV_DATA = JSON.parse(localStorage.getItem("db_vtv")) || [
    { unidad: "UNIDAD 8", fecha: new Date(Date.now() - 86400000).toISOString().split('T')[0] },      
    { unidad: "UNIDAD 13", fecha: new Date(Date.now() + 432000000).toISOString().split('T')[0] } 
];
let TAREAS_GENERALES_AUTO = JSON.parse(localStorage.getItem("db_tareas_gral")) || [
    { tarea: "Engrase general de flota", fecha: new Date(Date.now() + 432000000).toISOString().split('T')[0] }
];
let DB_ELECTRICIDAD = JSON.parse(localStorage.getItem("db_electricidad")) || [];

// --- VARIABLES GLOBALES ---
let usuarioActivo = "";
let unidadSeleccionada = "";
let sectorActivo = ""; 
let combustibleSeleccionado = "";

// =========================================================
//  LÓGICA DE LOGIN
// =========================================================
function iniciarValidacionFaceID() {
    const nom = document.getElementById('nombre-login').value.trim();
    const ape = document.getElementById('apellido-login').value.trim();
    if (!nom || !ape) return alert("Ingrese datos completos.");
    usuarioActivo = (nom + " " + ape).toUpperCase(); 
    try { localStorage.setItem("usuarioBomberosConectado", usuarioActivo); } catch(e) {}
    ingresarAlSistema();
}

function ingresarAlSistema() {
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('homeScreen').style.display = 'block';
    const display = document.getElementById('user-display-name');
    if(display) display.innerText = usuarioActivo;
    
    generarGrillaUnidades();
    generarGrillaMateriales();

    const p = ENCARGADOS_DATA[usuarioActivo];
    if (p) {
        generarBotonesFiltroEncargado(p);
        mostrarPanelAdmin(); 
    }
}

function cerrarSesion() {
    if(confirm("¿Cerrar sesión?")) {
        try { localStorage.removeItem("usuarioBomberosConectado"); } catch(e) {}
        location.reload(); 
    }
}

// =========================================================
//  NAVEGACIÓN Y PERMISOS
// =========================================================

function mostrarBotonesUnidades() {
    const permisos = ENCARGADOS_DATA[usuarioActivo];
    if (permisos && (permisos.includes("SOLO_MATERIALES") || permisos.includes("SUBOFICIAL_ELECTRICIDAD"))) {
        return alert("⛔ Acceso denegado. Personal de otro sector.");
    }
    
    document.getElementById('homeScreen').style.display = 'none';
    document.getElementById('sistema-gestion').style.display = 'block';
    document.getElementById('grilla-unidades').style.display = 'grid';
    document.getElementById('grilla-materiales').style.display = 'none';
    document.getElementById('titulo-control').innerText = "AUTOMOTORES";
}

function mostrarBotonesMateriales() {
    const permisos = ENCARGADOS_DATA[usuarioActivo];
    if (permisos && (permisos.includes("SOLO_AUTOMOTORES") || permisos.includes("SUBOFICIAL_ELECTRICIDAD"))) {
        return alert("⛔ Acceso denegado. Personal de otro sector.");
    }

    document.getElementById('homeScreen').style.display = 'none';
    document.getElementById('sistema-gestion').style.display = 'block';
    document.getElementById('grilla-materiales').style.display = 'grid';
    document.getElementById('grilla-unidades').style.display = 'none';
    document.getElementById('titulo-control').innerText = "MATERIALES";
}

function entrarElectricidad() {
    let tieneAcceso = true;
    let esEncargadoElec = false;

    if (ENCARGADOS_DATA[usuarioActivo]) {
        const permisos = ENCARGADOS_DATA[usuarioActivo];
        
        if (permisos.includes("SOLO_AUTOMOTORES") || permisos.includes("SOLO_MATERIALES")) {
            tieneAcceso = false;
        }
        
        if (permisos.includes("SUBOFICIAL_ELECTRICIDAD") || permisos.includes("SUPER_USUARIO")) {
            esEncargadoElec = true;
            tieneAcceso = true; 
        }
    }
    
    if (!tieneAcceso) return alert("⛔ Acceso denegado.");

    document.getElementById('homeScreen').style.display = 'none';
    document.getElementById('sistema-electricidad').style.display = 'block';
    
    const panelAdmin = document.getElementById('admin-electricidad');
    if (panelAdmin) {
        panelAdmin.style.display = esEncargadoElec ? 'block' : 'none';
    }
    
    renderizarTareasElectricas();
}

// =========================================================
//  LÓGICA DE SELECCIÓN Y FORMULARIOS
// =========================================================

function seleccionarUnidad(num, tipo, btn) {
    sectorActivo = tipo;
    
    if (num === 'CENTRAL') unidadSeleccionada = "MAT CENTRAL";
    else if (num === 'DESTACAMENTO') unidadSeleccionada = "MAT DESTACAMENTO";
    else unidadSeleccionada = tipo === 'AUTO' ? "UNIDAD " + num : "MAT U-" + num;

    document.querySelectorAll('.btn-unidad').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    // --- LÓGICA DE REDIRECCIÓN PARA ENCARGADOS ---
    const permisos = ENCARGADOS_DATA[usuarioActivo];
    const esSuper = permisos?.includes("SUPER_USUARIO");
    const esJefeAuto = permisos?.includes("SOLO_AUTOMOTORES") || permisos?.includes("VER_TODO_AUTOMOTORES");
    const esJefeMat = permisos?.includes("SOLO_MATERIALES");

    if (esSuper || (tipo === 'AUTO' && esJefeAuto) || (tipo === 'MAT' && esJefeMat)) {
        document.getElementById('sistema-gestion').style.display = 'none'; 
        verHistorialEspecifico(unidadSeleccionada);
        return; 
    }

    // --- SI ES BOMBERO ---
    const cont = document.getElementById('campos-control');
    cont.innerHTML = "";
    document.getElementById('btn-nube').style.display = 'block';
    document.getElementById('titulo-control').innerText = unidadSeleccionada;
    document.getElementById('contenedor-km').style.display = tipo === 'AUTO' ? 'block' : 'none';

    let listaItems = [];
    if (sectorActivo === 'AUTO') {
        try {
            if(num === 1) listaItems = CONTROLES_U1_AUTO;
            else if(num === 2) listaItems = CONTROLES_U2_AUTO;
            else if(num === 3) listaItems = CONTROLES_U3_AUTO;
            else if(num === 4) listaItems = CONTROLES_U4_AUTO;
            else if(num === 5) listaItems = CONTROLES_U5_AUTO;
            else if(num === 6) listaItems = CONTROLES_U6_AUTO;
            else if(num === 8) listaItems = CONTROLES_U8_AUTO;
            else if(num === 9) listaItems = CONTROLES_U9_AUTO;
            else if(num === 10) listaItems = CONTROLES_U10_AUTO;
            else if(num === 11) listaItems = CONTROLES_U11_AUTO;
            else if(num === 12) listaItems = CONTROLES_U12_AUTO;
            else if(num === 13) listaItems = CONTROLES_U13_AUTO;
            else if(num === 15) listaItems = CONTROLES_U15_AUTO;
            else if(num === 16) listaItems = CONTROLES_U16_AUTO;
        } catch(e) { listaItems = []; }
    } else {
        try {
            if (unidadSeleccionada.includes('CENTRAL')) listaItems = CONTROLES_CENTRAL;
            else if (unidadSeleccionada.includes('DESTACAMENTO')) listaItems = CONTROLES_DESTACAMENTO;
            else if (unidadSeleccionada.includes('U-2')) listaItems = CONTROLES_U2_MAT;
            else if (unidadSeleccionada.includes('U-3')) listaItems = CONTROLES_U3_MAT;
            else if (unidadSeleccionada.includes('U-6')) listaItems = CONTROLES_U6_MAT;
            else if (unidadSeleccionada.includes('U-8')) listaItems = CONTROLES_U8_MAT;
            else if (unidadSeleccionada.includes('U-9')) listaItems = CONTROLES_U9_MAT;
            else if (unidadSeleccionada.includes('U-10')) listaItems = CONTROLES_U10_MAT;
            else if (unidadSeleccionada.includes('U-11')) listaItems = CONTROLES_U11_MAT;
            else if (unidadSeleccionada.includes('U-12')) listaItems = CONTROLES_U12_MAT;
            else if (unidadSeleccionada.includes('U-13')) listaItems = CONTROLES_U13_MAT;
            else if (unidadSeleccionada.includes('U-15')) listaItems = CONTROLES_U15_MAT;
            else if (unidadSeleccionada.includes('U-16')) listaItems = CONTROLES_U16_MAT;
        } catch(e) { listaItems = []; }
    }

    gestionarAlertas(tipo, unidadSeleccionada);

    let currentCat = "";
    listaItems.forEach((c, idx) => {
        if (c.cat && c.cat !== currentCat) {
            currentCat = c.cat;
            cont.innerHTML += `<h3 style="color:#b11217; margin: 25px 0 10px 0; border-bottom: 2px solid #333; padding-bottom:5px;">${currentCat}</h3>`;
        }
        
        if (c.tipo === "combustible") {
             cont.innerHTML += `
                <div class="check-item-container">
                    <div class="check-item-row" style="display:block;">
                        <span style="font-weight:bold; display:block; margin-bottom:10px;">${c.item}</span>
                        <div class="fuel-options">
                            <div class="fuel-btn" onclick="setFuel('VACIO', this)">VACIO</div>
                            <div class="fuel-btn" onclick="setFuel('1/4', this)">1/4</div>
                            <div class="fuel-btn" onclick="setFuel('1/2', this)">1/2</div>
                            <div class="fuel-btn" onclick="setFuel('3/4', this)">3/4</div>
                            <div class="fuel-btn" onclick="setFuel('LLENO', this)">LLENO</div>
                        </div>
                    </div>
                </div>`;
        } 
        else if (c.tipo === "escritura") {
             cont.innerHTML += `
                <div class="check-item-container" style="border-left-color: #27ae60;">
                    <div class="check-item-row" style="display:block;">
                        <div style="margin-bottom:5px; font-weight:bold;">${c.item}</div>
                        <input type="text" id="input-escritura-${idx}" placeholder="Escriba aquí..." class="form-input" style="width:100%;">
                    </div>
                </div>`;
        }
        else {
            cont.innerHTML += `
                <div class="check-item-container">
                    <div class="check-item-row">
                        <span>${c.item}</span>
                        <div class="item-actions">
                            <label><input type="radio" name="ctrl-${idx}" value="bien" onclick="toggleObs(${idx}, false)"> Bien</label>
                            <label><input type="radio" name="ctrl-${idx}" value="mal" onclick="toggleObs(${idx}, true)"> Mal</label>
                        </div>
                    </div>
                    <div id="obs-container-${idx}" style="display:none;">
                        <textarea id="obs-${idx}" class="form-input" placeholder="Detalle el problema..." style="margin-top:10px;"></textarea>
                        <input type="file" id="foto-${idx}" accept="image/*" style="margin-top:10px; color:#ccc;">
                    </div>
                </div>`;
        }
    });
}

// =========================================================
//  GESTIÓN DE ELECTRICIDAD
// =========================================================

function crearTareaElectrica() {
    const lugar = document.getElementById("elec-lugar").value;
    const tipo = document.getElementById("elec-tipo").value;
    const desc = document.getElementById("elec-desc").value;
    const mat = document.getElementById("elec-mat").value;
    const prio = document.getElementById("elec-prio").value;
    const fecha = document.getElementById("elec-fecha").value;
    const asignado = document.getElementById("elec-asignado").value;

    if(!lugar || !desc) return alert("Complete los campos obligatorios (Lugar y Descripción)");
    
    const nuevaTarea = {
        id: Date.now(),
        fecha: new Date().toLocaleDateString(),
        lugar: lugar,
        tipo: tipo,
        descripcion: desc,
        materiales: mat,
        prioridad: prio,
        fechaLimite: fecha,
        asignado: asignado || "Sin asignar",
        estado: "PENDIENTE",
        autor: usuarioActivo
    };
    
    DB_ELECTRICIDAD.push(nuevaTarea);
    localStorage.setItem("db_electricidad", JSON.stringify(DB_ELECTRICIDAD));
    
    alert("Tarea creada exitosamente.");
    
    document.getElementById("elec-lugar").value = "";
    document.getElementById("elec-desc").value = "";
    document.getElementById("elec-mat").value = "";
    document.getElementById("elec-fecha").value = "";
    document.getElementById("elec-asignado").value = "";
    
    renderizarTareasElectricas();
}

function renderizarTareasElectricas() {
    const lista = document.getElementById('listaTareasElectricas');
    lista.innerHTML = "";
    
    if(DB_ELECTRICIDAD.length === 0) {
        lista.innerHTML = "<div style='text-align:center; padding:20px; color:#888;'>No hay tareas pendientes.</div>";
        return;
    }

    DB_ELECTRICIDAD.forEach((t, index) => {
        const colorPrio = t.prioridad === 'Alta' ? '#c62828' : (t.prioridad === 'Media' ? '#f9a825' : '#2e7d32');
        
        const div = document.createElement('div');
        div.style.cssText = `background:#222; margin-bottom:10px; padding:15px; border-radius:8px; border-left:5px solid ${colorPrio};`;
        div.innerHTML = `
            <div style="display:flex; justify-content:space-between; margin-bottom:8px;">
                <strong style="color:${colorPrio}; text-transform:uppercase;">${t.tipo} - ${t.prioridad}</strong>
                <span style="font-size:12px; color:#aaa;">Límite: ${t.fechaLimite || 'S/F'}</span>
            </div>
            <div style="font-size:15px; color:white; font-weight:bold; margin-bottom:5px;">${t.lugar}</div>
            <div style="font-size:13px; color:#ccc; margin-bottom:10px;">${t.descripcion}</div>
            
            <div style="font-size:12px; color:#888; border-top:1px solid #333; padding-top:8px;">
                <div>🔧 Materiales: ${t.materiales || '-'}</div>
                <div>👤 Asignado a: ${t.asignado}</div>
                <div style="margin-top:4px;">📅 Creado: ${t.fecha} por ${t.autor}</div>
            </div>
        `;
        
        const permisos = ENCARGADOS_DATA[usuarioActivo];
        if (permisos && (permisos.includes("SUBOFICIAL_ELECTRICIDAD") || permisos.includes("SUPER_USUARIO"))) {
            const btnDel = document.createElement('button');
            btnDel.innerText = "✅ FINALIZAR TAREA";
            btnDel.style.cssText = "width:100%; background:#2e7d32; color:white; border:none; padding:10px; border-radius:4px; font-size:12px; margin-top:10px; cursor:pointer; font-weight:bold;";
            btnDel.onclick = () => { 
                if(confirm("¿Marcar esta tarea como finalizada y borrarla de la lista?")) {
                    DB_ELECTRICIDAD.splice(index, 1);
                    localStorage.setItem("db_electricidad", JSON.stringify(DB_ELECTRICIDAD));
                    renderizarTareasElectricas();
                }
            };
            div.appendChild(btnDel);
        }
        
        lista.appendChild(div);
    });
}

// =========================================================
//  FUNCIONES AUXILIARES
// =========================================================

function setFuel(val, btn) {
    combustibleSeleccionado = val;
    const parent = btn.parentElement;
    parent.querySelectorAll('.fuel-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
}

function toggleObs(idx, mostrar) {
    const el = document.getElementById(`obs-container-${idx}`);
    if(el) el.style.display = mostrar ? 'block' : 'none';
}

function generarGrillaUnidades() {
    const contenedor = document.getElementById('grilla-unidades');
    contenedor.innerHTML = "";
    
    const permisos = ENCARGADOS_DATA[usuarioActivo];
    
    LISTA_IDS_UNIDADES.forEach(i => {
        let mostrar = false;
        if(!permisos) {
            mostrar = true; // Bombero
        } else {
            if (permisos.includes("VER_TODO_AUTOMOTORES") || permisos.includes("SUPER_USUARIO")) {
                mostrar = true;
            } else if (permisos.includes("UNIDAD " + i)) {
                mostrar = true;
            }
        }

        if(mostrar) {
            const btn = document.createElement('div');
            btn.className = 'btn-unidad'; btn.innerText = 'U-' + i;
            btn.onclick = (e) => { e.stopPropagation(); seleccionarUnidad(i, 'AUTO', btn); };
            contenedor.appendChild(btn);
        }
    });
}

function generarGrillaMateriales() {
    const contenedor = document.getElementById('grilla-materiales');
    contenedor.innerHTML = "";
    const excluidas = [1, 4, 5];
    LISTA_IDS_UNIDADES.forEach(i => {
        if (excluidas.includes(i)) return; 
        const btn = document.createElement('div');
        btn.className = 'btn-unidad'; btn.innerText = 'MAT U-' + i;
        btn.onclick = (e) => { e.stopPropagation(); seleccionarUnidad(i, 'MAT', btn); };
        contenedor.appendChild(btn);
    });
    const extras = [ {t:'CENTRAL', v:'CENTRAL'}, {t:'DESTAC.', v:'DESTACAMENTO'} ];
    extras.forEach(x => {
        const btn = document.createElement('div');
        btn.className = 'btn-unidad'; btn.innerText = x.t; btn.style.borderColor = '#ff7a00';
        btn.onclick = (e) => { e.stopPropagation(); seleccionarUnidad(x.v, 'MAT', btn); };
        contenedor.appendChild(btn);
    });
}

function mostrarPanelAdmin() {
    if(!usuarioActivo || !ENCARGADOS_DATA[usuarioActivo]) return;
    const permisos = ENCARGADOS_DATA[usuarioActivo];
    if (!permisos.includes("SOLO_AUTOMOTORES")) return;
    document.getElementById("panel-admin-vencimientos").style.display = "block";
    const select = document.getElementById("admin-unidad");
    if(select) {
        select.innerHTML = "";
        LISTA_IDS_UNIDADES.forEach(u => {
            let opt = document.createElement("option");
            opt.value = "UNIDAD " + u; opt.text = "UNIDAD " + u;
            select.appendChild(opt);
        });
    }
    actualizarListaVisual();
}

function actualizarListaVisual() {
    const lista = document.getElementById("lista-vencimientos-cargados");
    if(!lista) return;
    lista.innerHTML = "";
    VTV_DATA.forEach(v => { lista.innerHTML += `<li>🚗 <b>${v.unidad}</b> - VTV: ${v.fecha}</li>`; });
    TAREAS_GENERALES_AUTO.forEach(t => { lista.innerHTML += `<li>🔧 <b>GENERAL</b> - ${t.tarea}: ${t.fecha}</li>`; });
}

function guardarNuevoVencimiento() {
    const tipo = document.getElementById("admin-tipo").value;
    const fecha = document.getElementById("admin-fecha").value;
    if (!fecha) return alert("Por favor, seleccioná una fecha.");
    if (tipo === "VTV") {
        const unidad = document.getElementById("admin-unidad").value;
        const index = VTV_DATA.findIndex(v => v.unidad === unidad);
        if (index >= 0) { VTV_DATA[index].fecha = fecha; } else { VTV_DATA.push({ unidad: unidad, fecha: fecha }); }
        localStorage.setItem("db_vtv", JSON.stringify(VTV_DATA));
    } else {
        const nombreTarea = prompt("Nombre de la tarea:", "Engrase General");
        if (!nombreTarea) return;
        TAREAS_GENERALES_AUTO.push({ tarea: nombreTarea, fecha: fecha });
        localStorage.setItem("db_tareas_gral", JSON.stringify(TAREAS_GENERALES_AUTO));
    }
    actualizarListaVisual();
}

function toggleSelectorUnidad() {
    const tipo = document.getElementById("admin-tipo").value;
    document.getElementById("box-admin-unidad").style.display = (tipo === "VTV") ? "block" : "none";
}

function gestionarAlertas(sector, nombreUnidad) {
    const contenedor = document.getElementById("contenedor-alertas");
    contenedor.style.display = "none";
    contenedor.className = "alerta-box"; 
    const hoy = new Date();
    let alertas = [];
    if (sector === 'AUTO') {  
        const vtv = VTV_DATA.find(v => v.unidad === nombreUnidad);
        if (vtv) {
            const dias = Math.ceil((new Date(vtv.fecha) - hoy) / (86400000));
            if (dias <= 30) alertas.push({ texto: `VTV: Vence en ${dias} días`, dias: dias });
        }
    }
    if (alertas.length > 0) {
        contenedor.classList.add("amarillo");
        contenedor.innerHTML = `<strong>⚠️ ALERTAS</strong>` + alertas.map(a => `<span>${a.texto}</span>`).join("");
        contenedor.style.display = "block";
    }
}

async function finalizarYEnviar(){
    const km = document.getElementById('km-u1').value;
    if (sectorActivo === 'AUTO' && !km) return alert("KM obligatorio.");
    const btn = document.getElementById('btn-nube'); 
    btn.innerText = "PROCESANDO..."; btn.disabled = true;
    
    // Simulación de guardado
    setTimeout(() => {
        alert("¡Datos guardados correctamente!");
        location.reload();
    }, 1500);
}

function generarBotonesFiltroEncargado(p) {
    const cont = document.getElementById('selector-unidades-encargado');
    cont.innerHTML = `<button class="btn" style="padding:5px 10px; font-size:12px; background:#444; color:white; border:none;" onclick="consultarReportesEncargado()">🔄 RECARGAR TABLA</button>`;
}

function consultarReportesEncargado() {
    document.getElementById('panel-consulta-encargado').style.display = 'block';
    // Simulamos la carga de datos
    fetch(WEB_APP_URL).then(r=>r.json()).then(data=>{
        let datosFiltrados = data;
        const permisos = ENCARGADOS_DATA[usuarioActivo];
        
        // Si no es jefe (Federico/Kevin), solo ve sus unidades
        if (permisos && !permisos.includes("VER_TODO_AUTOMOTORES") && !permisos.includes("SUPER_USUARIO")) {
             datosFiltrados = data.filter(row => permisos.includes(row.unidad));
        }
        
        mostrarDatosEnTabla(datosFiltrados.slice(-20).reverse());
    }).catch(e => {
        mostrarDatosEnTabla([
            {fecha: "19/01/2026", encargado: "BOMBERO 1", unidad: "UNIDAD 1", control: "Aceite", estado: "BIEN", obs: ""},
            {fecha: "18/01/2026", encargado: "BOMBERO 2", unidad: "UNIDAD 8", control: "Luces", estado: "MAL", obs: "Quemada"}
        ]);
    });
}

function verHistorialEspecifico(unidad) {
    document.getElementById('panel-consulta-encargado').style.display = 'block';
    document.getElementById('titulo-consulta').innerText = "Historial - " + unidad;
    
    fetch(WEB_APP_URL).then(r=>r.json()).then(data=>{
        const filtrados = data.filter(r => r.unidad === unidad);
        mostrarDatosEnTabla(filtrados.reverse());
    }).catch(e => mostrarDatosEnTabla([]));
}

function mostrarDatosEnTabla(l) {
    const c = document.getElementById('cuerpo-consulta-encargado');
    c.innerHTML = "";
    if (l.length === 0) { c.innerHTML = "<tr><td colspan='7' style='text-align:center; padding:20px;'>No hay registros recientes.</td></tr>"; return; }
    l.forEach(r => {
        const colorEstado = r.estado === 'MAL' ? '#ff4444' : '#00C851';
        c.innerHTML += `
            <tr style="border-bottom:1px solid #333;">
                <td style="padding:10px;">${r.fecha}</td>
                <td style="padding:10px;">${r.encargado}</td>
                <td style="padding:10px;">${r.unidad}</td>
                <td style="padding:10px;">${r.control}</td>
                <td style="padding:10px; color:${colorEstado}; font-weight:bold;">${r.estado}</td>
                <td style="padding:10px;">${r.obs}</td>
                <td style="padding:10px;">-</td>
            </tr>`;
    });
}

function leerArchivo(file) { /* ... */ }

// INICIAR
window.addEventListener('load', function() {
    const guardado = localStorage.getItem("usuarioBomberosConectado");
    if (guardado) { usuarioActivo = guardado; ingresarAlSistema(); }
});

// AUTO U-1
const CONTROLES_U1_AUTO = [
    { cat: "DIARIO", item: "1.- Limpieza interior de cabina", cant: "-" },
    { cat: "DIARIO", item: "2.- Limpieza ventanillas y parabrisas", cant: "-" },
    { cat: "DIARIO", item: "3.- Puesta en marcha", cant: "-" },
    { cat: "DIARIO", item: "4.- Funcionamiento de frenos (de pie y mano)", cant: "-" },
    { cat: "DIARIO", item: "5.- Cubiertas", cant: "-" },
    { cat: "DIARIO", item: "6.- Llantas, bulones, tapa de válvulas", cant: "-" },
    { cat: "INSPECCIÓN ELÉCTRICA", item: "1.- Luces (posición, bajas y alta)", cant: "-" },
    { cat: "INSPECCIÓN ELÉCTRICA", item: "2.- Luces (giro, balizas, frenado y marcha atrás)", cant: "-" },
    { cat: "INSPECCIÓN ELÉCTRICA", item: "3.- Bocina", cant: "-" },
    { cat: "INSPECCIÓN ELÉCTRICA", item: "4.- Velines", cant: "-" },
    { cat: "INSPECCIÓN ELÉCTRICA", item: "5.- Relojes de instrumento", cant: "-" },
    { cat: "INSPECCIÓN ELÉCTRICA", item: "6.- Reflectores", cant: "-" },
    { cat: "INSPECCIÓN ELÉCTRICA", item: "7.- Batería inspección y soporte", cant: "-" },
    { cat: "INSPECCIÓN MOTOR", item: "1.- Nivel de aceite motor", cant: "-" },
    { cat: "INSPECCIÓN MOTOR", item: "2.- Nivel de líquido del radiador", cant: "-" },
    { cat: "INSPECCIÓN MOTOR", item: "3.- Nivel de combustible", tipo: "combustible", cant: "-" },
    { cat: "INSPECCIÓN MOTOR", item: "4.- Nivel de líquido de freno", cant: "-" },
    { cat: "INSPECCIÓN MOTOR", item: "5.- Pérdidas filtro de combustible", cant: "-" },
    { cat: "INSPECCIÓN MOTOR", item: "6.- Pérdidas trampa de agua", cant: "-" },
    { cat: "INSPECCIÓN MOTOR", item: "7.- Pérdidas filtro de aceite", cant: "-" },
    { cat: "INSPECCIÓN MOTOR", item: "8.- Pérdidas de aceite del diferencial", cant: "-" },
    { cat: "INSPECCIÓN MOTOR", item: "9.- Pérdidas de aceite de la caja de cambios", cant: "-" },
    { cat: "CONTROLES MENSUALES", item: "1.- Filtro de aire", cant: "-" },
    { cat: "CONTROLES MENSUALES", item: "2.- Correas de motor", cant: "-" },
    { cat: "CONTROLES MENSUALES", item: "3.- Calibración de cubierta", cant: "-" },
    { cat: "CONTROLES MENSUALES", item: "4.- Lavar unidad", cant: "-" },
    { cat: "CONTROLES MENSUALES", item: "5.- Nivel de aceite caja intercambiadora", cant: "-" },
    { cat: "CONTROLES MENSUALES", item: "6.- Purgar cilindros de aire", cant: "-" },
    { cat: "CONTROLES SEMESTRALES", item: "1.- Engrase", cant: "-" },
    { cat: "CONTROLES SEMESTRALES", item: "2.- Encerar unidad", cant: "-" }
];

// AUTO U-2 (NUEVO)
const CONTROLES_U2_AUTO = [
    { cat: "INSPECCIÓN GENERAL", item: "1.- Limpieza interior de cabina", cant: "-" },
    { cat: "INSPECCIÓN GENERAL", item: "2.- Limpieza ventanillas, parabrisas y espejos", cant: "-" },
    { cat: "INSPECCIÓN GENERAL", item: "3.- Limpiaparabrisas (operación y escobillas)", cant: "-" },
    { cat: "INSPECCIÓN GENERAL", item: "4.- Desempañador (funcionamiento)", cant: "-" },
    { cat: "INSPECCIÓN GENERAL", item: "5.- Zorrino nivel de agua y funcionamiento", cant: "-" },
    { cat: "INSPECCIÓN GENERAL", item: "6.- Puesta en marcha", cant: "-" },
    { cat: "INSPECCIÓN GENERAL", item: "7.- Funcionamiento de frenos (de pie y mano)", cant: "-" },
    { cat: "INSPECCIÓN GENERAL", item: "8.- Cubiertas", cant: "-" },
    { cat: "INSPECCIÓN GENERAL", item: "9.- Llantas, bulones, tapa de válvulas", cant: "-" },
    { cat: "INSPECCIÓN ELÉCTRICA", item: "1.- Luces (posición, bajas y alta)", cant: "-" },
    { cat: "INSPECCIÓN ELÉCTRICA", item: "2.- Luces (giro, balizas, frenado y marcha atrás)", cant: "-" },
    { cat: "INSPECCIÓN ELÉCTRICA", item: "3.- Bocina", cant: "-" },
    { cat: "INSPECCIÓN ELÉCTRICA", item: "4.- Velines", cant: "-" },
    { cat: "INSPECCIÓN ELÉCTRICA", item: "5.- Luces persianas", cant: "-" },
    { cat: "INSPECCIÓN ELÉCTRICA", item: "6.- Equipo de radio", cant: "-" },
    { cat: "INSPECCIÓN ELÉCTRICA", item: "7.- Relojes de instrumento", cant: "-" },
    { cat: "INSPECCIÓN ELÉCTRICA", item: "8.- Reflectores", cant: "-" },
    { cat: "INSPECCIÓN ELÉCTRICA", item: "9.- Batería inspección y soporte", cant: "-" },
    { cat: "INSPECCIÓN MOTOR", item: "1.- Nivel de aceite motor", cant: "-" },
    { cat: "INSPECCIÓN MOTOR", item: "2.- Nivel de líquido del radiador", cant: "-" },
    { cat: "INSPECCIÓN MOTOR", item: "3.- Nivel de combustible", tipo: "combustible", cant: "-" },
    { cat: "INSPECCIÓN MOTOR", item: "4.- Nivel de líquido de aceite hidráulico", cant: "-" },
    { cat: "INSPECCIÓN MOTOR", item: "5.- Kilómetros (Verificación)", cant: "-" },
    { cat: "INSPECCIÓN MOTOR", item: "6.- Pérdidas filtro de combustible", cant: "-" },
    { cat: "INSPECCIÓN MOTOR", item: "7.- Pérdidas trampa de agua", cant: "-" },
    { cat: "INSPECCIÓN MOTOR", item: "8.- Pérdidas filtro de aceite", cant: "-" },
    { cat: "INSPECCIÓN MOTOR", item: "9.- Pérdidas de aceite del diferencial", cant: "-" },
    { cat: "INSPECCIÓN MOTOR", item: "10.- Pérdidas de aceite de la caja de cambios", cant: "-" },
    { cat: "INSPECCIÓN MATERIALES", item: "1.- Botiquín", cant: "-" },
    { cat: "INSPECCIÓN MATERIALES", item: "2.- Extintor", cant: "-" },
    { cat: "INSPECCIÓN MATERIALES", item: "3.- Materiales en general", cant: "-" },
    { cat: "CONTROLES MENSUALES", item: "1.- Nivel de líquido de freno", cant: "-" },
    { cat: "CONTROLES MENSUALES", item: "2.- Filtro de aire", cant: "-" },
    { cat: "CONTROLES MENSUALES", item: "3.- Correas de motor", cant: "-" },
    { cat: "CONTROLES MENSUALES", item: "4.- Calibración de cubierta", cant: "-" },
    { cat: "CONTROLES MENSUALES", item: "5.- Nivel de aceite caja intercambiadora", cant: "-" },
    { cat: "CONTROLES MENSUALES", item: "6.- Purgar cilindros de aire", cant: "-" },
    { cat: "CONTROLES MENSUALES", item: "7.- Lavar unidad", cant: "-" },
    { cat: "CONTROLES SEMESTRALES", item: "1.- Engrase", cant: "-" },
    { cat: "CONTROLES SEMESTRALES", item: "2.- Encerar unidad", cant: "-" },
    { cat: "CONTROL DE BOMBA", item: "1.- Odómetro de horas de la bomba", cant: "-" },
    { cat: "CONTROL DE BOMBA", item: "2.- Indicación de temperatura del motor", cant: "-" },
    { cat: "CONTROL DE BOMBA", item: "3.- Tacómetro", cant: "-" },
    { cat: "CONTROL DE BOMBA", item: "4.- Manómetro de presión de aceite del motor", cant: "-" },
    { cat: "CONTROL DE BOMBA", item: "5.- Manovacuómetro", cant: "-" },
    { cat: "CONTROL DE BOMBA", item: "6.- Manómetro de alta presión", cant: "-" },
    { cat: "CONTROL DE BOMBA", item: "7.- Manómetro de presión normal", cant: "-" },
    { cat: "CONTROL DE BOMBA", item: "8.- Nivel de aceite de la bomba", cant: "-" },
    { cat: "CONTROL DE BOMBA", item: "9.- Nivel de aceite de la bomba de vacío", cant: "-" },
    { cat: "CONTROL DE BOMBA", item: "10.- Correa de bomba de vacío", cant: "-" },
    { cat: "CONTROL DE BOMBA", item: "11.- Acople de la bomba", cant: "-" },
    { cat: "CONTROL DE BOMBA", item: "12.- Acople de la bomba de vacío", cant: "-" },
    { cat: "CONTROL DE BOMBA", item: "13.- Dosificador espuma", cant: "-" },
    { cat: "CONTROL DE BOMBA", item: "14.- Prueba de expulsiones", cant: "-" }];


const CONTROLES_U3_AUTO = [
    { cat: "DIARIO", item: "1.- Limpieza interior de cabina", cant: "-" },
    { cat: "DIARIO", item: "2.- Limpieza ventanillas, parabrisas y espejos", cant: "-" },
    { cat: "DIARIO", item: "3.- Puesta en marcha", cant: "-" },
    { cat: "DIARIO", item: "4.- Funcionamiento de frenos (de pie y mano)", cant: "-" },
    { cat: "DIARIO", item: "5.- Cubiertas", cant: "-" },
    { cat: "DIARIO", item: "6.- Llantas, bulones, tapa de válvulas", cant: "-" },
    { cat: "DIARIO", item: "7.- Limpiaparabrisas (operacion y escobillas)", cant: "-" },
    { cat: "DIARIO", item: "8.- Desempañador (funcionamiento)", cant: "-" },
    { cat: "DIARIO", item: "9.- Zorrino nivel de agua y funcionamiento", cant: "-" },
    { cat: "INSPECCIÓN ELÉCTRICA", item: "1.- Luces (posición, bajas y alta)", cant: "-" },
    { cat: "INSPECCIÓN ELÉCTRICA", item: "2.- Luces (giro, balizas, frenado y marcha atrás)", cant: "-" },
    { cat: "INSPECCIÓN ELÉCTRICA", item: "3.- Bocina", cant: "-" },
    { cat: "INSPECCIÓN ELÉCTRICA", item: "4.- Velines", cant: "-" },
    { cat: "INSPECCIÓN ELÉCTRICA", item: "5.- Relojes de instrumento", cant: "-" },
    { cat: "INSPECCIÓN ELÉCTRICA", item: "6.- Equipo de radio", cant: "-" },
    { cat: "INSPECCIÓN ELÉCTRICA", item: "7.- Batería inspección y soporte", cant: "-" },
    { cat: "INSPECCIÓN MOTOR", item: "1.- Nivel de aceite motor", cant: "-" },
    { cat: "INSPECCIÓN MOTOR", item: "2.- Nivel de líquido del radiador", cant: "-" },
    { cat: "INSPECCIÓN MOTOR", item: "3.- Nivel de combustible", tipo: "combustible", cant: "-" },
    { cat: "INSPECCIÓN MOTOR", item: "4.- Nivel de líquido de freno", cant: "-" },
    { cat: "INSPECCIÓN MOTOR", item: "5.- Pérdidas filtro de combustible", cant: "-" },
    { cat: "INSPECCIÓN MOTOR", item: "6.- Pérdidas trampa de agua", cant: "-" },
    { cat: "INSPECCIÓN MOTOR", item: "7.- Pérdidas filtro de aceite", cant: "-" },
    { cat: "INSPECCIÓN MOTOR", item: "8.- Pérdidas de aceite del diferencial", cant: "-" },
    { cat: "INSPECCIÓN MOTOR", item: "9.- Pérdidas de aceite de la caja de cambios", cant: "-" },
    { cat: "CONTROLES MENSUALES", item: "1.- Filtro de aire", cant: "-" },
    { cat: "CONTROLES MENSUALES", item: "2.- Correas de motor", cant: "-" },
    { cat: "CONTROLES MENSUALES", item: "3.- Calibración de cubierta", cant: "-" },
    { cat: "CONTROLES MENSUALES", item: "4.- Lavar unidad", cant: "-" },
    { cat: "CONTROLES MENSUALES", item: "5.- Nivel de liquido aceite hidraulico", cant: "-" },
    { cat: "CONTROLES MENSUALES", item: "6.- Purgar cilindros de aire", cant: "-" },
    { cat: "CONTROLES SEMESTRALES", item: "1.- Engrase", cant: "-" },
    { cat: "CONTROLES SEMESTRALES", item: "2.- Encerar unidad", cant: "-" },
    { cat: "CONTROL DE MOTOBOMBA", item: "1.- Nivel de aceite", cant: "-" },
    { cat: "CONTROL DE MOTOBOMBA", item: "2.- Nivel de combustible", tipo: "combustible", cant: "-" },
    { cat: "CONTROL DE MOTOBOMBA", item: "3.- Bujias", cant: "-" },
    { cat: "CONTROL DE MOTOBOMBA", item: "4.- Filtro de aire", cant: "-" },
    { cat: "CONTROL DE MOTOBOMBA", item: "5.- Arranque", cant: "-" },
    { cat: "CONTROL DE MOTOBOMBA", item: "6.- FUncionamiento", cant: "-" },
    { cat: "CONTROL DE MOTOBOMBA", item: "7.- Prueba de exoulsiones", cant: "-" },];


const CONTROLES_U4_AUTO = [
    { cat: "DIARIO", item: "1.- Limpieza interior de cabina", cant: "-" },
    { cat: "DIARIO", item: "2.- Limpieza ventanillas, parabrisas y espejos", cant: "-" },
    { cat: "DIARIO", item: "3.- Puesta en marcha", cant: "-" },
    { cat: "DIARIO", item: "4.- Funcionamiento de frenos (de pie y mano)", cant: "-" },
    { cat: "DIARIO", item: "5.- Cubiertas", cant: "-" },
    { cat: "DIARIO", item: "6.- Llantas, bulones, tapa de válvulas", cant: "-" },
    { cat: "DIARIO", item: "7.- Limpiaparabrisas (operacion y escobillas)", cant: "-" },
    { cat: "DIARIO", item: "8.- Desempañador (funcionamiento)", cant: "-" },
    { cat: "DIARIO", item: "9.- Zorrino nivel de agua y funcionamiento", cant: "-" },
    { cat: "INSPECCIÓN ELÉCTRICA", item: "1.- Luces (posición, bajas y alta)", cant: "-" },
    { cat: "INSPECCIÓN ELÉCTRICA", item: "2.- Luces (giro, balizas, frenado y marcha atrás)", cant: "-" },
    { cat: "INSPECCIÓN ELÉCTRICA", item: "3.- Bocina", cant: "-" },
    { cat: "INSPECCIÓN ELÉCTRICA", item: "4.- Velines", cant: "-" },
    { cat: "INSPECCIÓN ELÉCTRICA", item: "5.- Relojes de instrumento", cant: "-" },
    { cat: "INSPECCIÓN ELÉCTRICA", item: "6.- Batería inspección y soporte", cant: "-" },
    { cat: "INSPECCIÓN MOTOR", item: "1.- Nivel de aceite motor", cant: "-" },
    { cat: "INSPECCIÓN MOTOR", item: "2.- Nivel de líquido del radiador", cant: "-" },
    { cat: "INSPECCIÓN MOTOR", item: "3.- Nivel de combustible", tipo: "combustible", cant: "-" },
    { cat: "INSPECCIÓN MOTOR", item: "4.- Nivel de líquido de freno", cant: "-" },
    { cat: "INSPECCIÓN MOTOR", item: "5.- Pérdidas filtro de combustible", cant: "-" },
    { cat: "INSPECCIÓN MOTOR", item: "6.- Pérdidas trampa de agua", cant: "-" },
    { cat: "INSPECCIÓN MOTOR", item: "7.- Pérdidas filtro de aceite", cant: "-" },
    { cat: "INSPECCIÓN MOTOR", item: "8.- Pérdidas de aceite del diferencial", cant: "-" },
    { cat: "INSPECCIÓN MOTOR", item: "9.- Pérdidas de aceite de la caja de cambios", cant: "-" },
    { cat: "CONTROLES MENSUALES", item: "1.- Filtro de aire", cant: "-" },
    { cat: "CONTROLES MENSUALES", item: "2.- Correas de motor", cant: "-" },
    { cat: "CONTROLES MENSUALES", item: "3.- Calibración de cubierta", cant: "-" },
    { cat: "CONTROLES MENSUALES", item: "4.- Lavar unidad", cant: "-" },
    { cat: "CONTROLES SEMESTRALES", item: "1.- Engrase", cant: "-" },
    { cat: "CONTROLES SEMESTRALES", item: "2.- Encerar unidad", cant: "-" }];


    
const CONTROLES_U5_AUTO = [
    { cat: "DIARIO", item: "1.- Limpieza interior de cabina", cant: "-" },
    { cat: "DIARIO", item: "2.- Limpieza ventanillas, parabrisas y espejos", cant: "-" },
    { cat: "DIARIO", item: "3.- Puesta en marcha", cant: "-" },
    { cat: "DIARIO", item: "4.- Funcionamiento de frenos (de pie y mano)", cant: "-" },
    { cat: "DIARIO", item: "5.- Cubiertas", cant: "-" },
    { cat: "DIARIO", item: "6.- Llantas, bulones, tapa de válvulas", cant: "-" },
    { cat: "DIARIO", item: "7.- Limpiaparabrisas (operacion y escobillas)", cant: "-" },
    { cat: "DIARIO", item: "8.- Desempañador (funcionamiento)", cant: "-" },
    { cat: "DIARIO", item: "9.- Zorrino nivel de agua y funcionamiento", cant: "-" },
    { cat: "INSPECCIÓN ELÉCTRICA", item: "1.- Luces (posición, bajas y alta)", cant: "-" },
    { cat: "INSPECCIÓN ELÉCTRICA", item: "2.- Luces (giro, balizas, frenado y marcha atrás)", cant: "-" },
    { cat: "INSPECCIÓN ELÉCTRICA", item: "3.- Bocina", cant: "-" },
    { cat: "INSPECCIÓN ELÉCTRICA", item: "4.- Velines", cant: "-" },
    { cat: "INSPECCIÓN ELÉCTRICA", item: "5.- Relojes de instrumento", cant: "-" },
    { cat: "INSPECCIÓN ELÉCTRICA", item: "6.- Batería inspección y soporte", cant: "-" },
    { cat: "INSPECCIÓN MOTOR", item: "1.- Nivel de aceite motor", cant: "-" },
    { cat: "INSPECCIÓN MOTOR", item: "2.- Nivel de líquido del radiador", cant: "-" },
    { cat: "INSPECCIÓN MOTOR", item: "3.- Nivel de combustible", tipo: "combustible", cant: "-" },
    { cat: "INSPECCIÓN MOTOR", item: "4.- Nivel de líquido de freno", cant: "-" },
    { cat: "INSPECCIÓN MOTOR", item: "5.- Pérdidas filtro de combustible", cant: "-" },
    { cat: "INSPECCIÓN MOTOR", item: "6.- Pérdidas trampa de agua", cant: "-" },
    { cat: "INSPECCIÓN MOTOR", item: "7.- Pérdidas filtro de aceite", cant: "-" },
    { cat: "INSPECCIÓN MOTOR", item: "8.- Pérdidas de aceite del diferencial", cant: "-" },
    { cat: "INSPECCIÓN MOTOR", item: "9.- Pérdidas de aceite de la caja de cambios", cant: "-" },
    { cat: "CONTROLES MENSUALES", item: "1.- Filtro de aire", cant: "-" },
    { cat: "CONTROLES MENSUALES", item: "2.- Correas de motor", cant: "-" },
    { cat: "CONTROLES MENSUALES", item: "3.- Calibración de cubierta", cant: "-" },
    { cat: "CONTROLES MENSUALES", item: "4.- Lavar unidad", cant: "-" },
    { cat: "CONTROLES SEMESTRALES", item: "1.- Engrase", cant: "-" },
    { cat: "CONTROLES SEMESTRALES", item: "2.- Encerar unidad", cant: "-" }];
    

    
const CONTROLES_U6_AUTO = [
    { cat: "DIARIO", item: "1.- Limpieza interior de cabina", cant: "-" },
    { cat: "DIARIO", item: "2.- Limpieza ventanillas, parabrisas y espejos", cant: "-" },
    { cat: "DIARIO", item: "3.- Puesta en marcha", cant: "-" },
    { cat: "DIARIO", item: "4.- Funcionamiento de frenos (de pie y mano)", cant: "-" },
    { cat: "DIARIO", item: "5.- Cubiertas", cant: "-" },
    { cat: "DIARIO", item: "6.- Llantas, bulones, tapa de válvulas", cant: "-" },
    { cat: "DIARIO", item: "7.- Limpiaparabrisas (operacion y escobillas)", cant: "-" },
    { cat: "DIARIO", item: "8.- Desempañador (funcionamiento)", cant: "-" },
    { cat: "DIARIO", item: "9.- Zorrino nivel de agua y funcionamiento", cant: "-" },
    { cat: "INSPECCIÓN ELÉCTRICA", item: "1.- Luces (posición, bajas y alta)", cant: "-" },
    { cat: "INSPECCIÓN ELÉCTRICA", item: "2.- Luces (giro, balizas, frenado y marcha atrás)", cant: "-" },
    { cat: "INSPECCIÓN ELÉCTRICA", item: "3.- Bocina", cant: "-" },
    { cat: "INSPECCIÓN ELÉCTRICA", item: "4.- Velines", cant: "-" },
    { cat: "INSPECCIÓN ELÉCTRICA", item: "5.- Relojes de instrumento", cant: "-" },
    { cat: "INSPECCIÓN ELÉCTRICA", item: "6.- Batería inspección y soporte", cant: "-" },
    { cat: "INSPECCIÓN MOTOR", item: "1.- Nivel de aceite motor", cant: "-" },
    { cat: "INSPECCIÓN MOTOR", item: "2.- Nivel de líquido del radiador", cant: "-" },
    { cat: "INSPECCIÓN MOTOR", item: "3.- Nivel de combustible", tipo: "combustible", cant: "-" },
    { cat: "INSPECCIÓN MOTOR", item: "4.- Nivel de líquido de freno", cant: "-" },
    { cat: "INSPECCIÓN MOTOR", item: "5.- Nivel de líquido de aceite hidraulico", cant: "-" },
    { cat: "INSPECCIÓN MOTOR", item: "6.- Pérdidas filtro de combustible", cant: "-" },
    { cat: "INSPECCIÓN MOTOR", item: "7.- Pérdidas trampa de agua", cant: "-" },
    { cat: "INSPECCIÓN MOTOR", item: "8.- Pérdidas filtro de aceite", cant: "-" },
    { cat: "INSPECCIÓN MOTOR", item: "9.- Pérdidas de aceite del diferencial", cant: "-" },
    { cat: "INSPECCIÓN MOTOR", item: "10.- Pérdidas de aceite de la caja de cambios", cant: "-" },
    { cat: "INSPECCIÓN MATERIALES", item: "1.- Extintor", cant: "-" },
    { cat: "INSPECCIÓN MATERIALES", item: "2.- Materiales en general", cant: "-" },
    { cat: "CONTROLES MENSUALES", item: "1.- Filtro de aire", cant: "-" },
    { cat: "CONTROLES MENSUALES", item: "2.- Correas de motor", cant: "-" },
    { cat: "CONTROLES MENSUALES", item: "3.- Calibración de cubierta", cant: "-" },
    { cat: "CONTROLES MENSUALES", item: "4.- Lavar unidad", cant: "-" },
    { cat: "CONTROLES MENSUALES", item: "5.- Purgar cilindrosde aire", cant: "-" },
    { cat: "CONTROLES SEMESTRALES", item: "1.- Engrase", cant: "-" },
    { cat: "CONTROLES SEMESTRALES", item: "2.- Encerar unidad", cant: "-" }];
    

    
const CONTROLES_U8_AUTO = [
    { cat: "INSPECCIÓN GENERAL", item: "1.- Limpieza interior de cabina", cant: "-" },
    { cat: "INSPECCIÓN GENERAL", item: "2.- Limpieza ventanillas, parabrisas y espejos", cant: "-" },
    { cat: "INSPECCIÓN GENERAL", item: "3.- Limpiaparabrisas (operación y escobillas)", cant: "-" },
    { cat: "INSPECCIÓN GENERAL", item: "4.- Desempañador (funcionamiento)", cant: "-" },
    { cat: "INSPECCIÓN GENERAL", item: "5.- Zorrino nivel de agua y funcionamiento", cant: "-" },
    { cat: "INSPECCIÓN GENERAL", item: "6.- Puesta en marcha", cant: "-" },
    { cat: "INSPECCIÓN GENERAL", item: "7.- Funcionamiento de frenos (de pie y mano)", cant: "-" },
    { cat: "INSPECCIÓN GENERAL", item: "8.- Cubiertas", cant: "-" },
    { cat: "INSPECCIÓN GENERAL", item: "9.- Llantas, bulones, tapa de válvulas", cant: "-" },
    { cat: "INSPECCIÓN ELÉCTRICA", item: "1.- Luces (posición, bajas y alta)", cant: "-" },
    { cat: "INSPECCIÓN ELÉCTRICA", item: "2.- Luces (giro, balizas, frenado y marcha atrás)", cant: "-" },
    { cat: "INSPECCIÓN ELÉCTRICA", item: "3.- Bocina", cant: "-" },
    { cat: "INSPECCIÓN ELÉCTRICA", item: "4.- Velines", cant: "-" },
    { cat: "INSPECCIÓN ELÉCTRICA", item: "5.- Luces persianas", cant: "-" },
    { cat: "INSPECCIÓN ELÉCTRICA", item: "6.- Equipo de radio", cant: "-" },
    { cat: "INSPECCIÓN ELÉCTRICA", item: "7.- Relojes de instrumento", cant: "-" },
    { cat: "INSPECCIÓN ELÉCTRICA", item: "8.- Reflectores", cant: "-" },
    { cat: "INSPECCIÓN ELÉCTRICA", item: "9.- Batería inspección y soporte", cant: "-" },
    { cat: "INSPECCIÓN MOTOR", item: "1.- Nivel de aceite motor", cant: "-" },
    { cat: "INSPECCIÓN MOTOR", item: "2.- Nivel de líquido del radiador", cant: "-" },
    { cat: "INSPECCIÓN MOTOR", item: "3.- Nivel de combustible", tipo: "combustible", cant: "-" },
    { cat: "INSPECCIÓN MOTOR", item: "4.- Nivel de líquido de aceite hidráulico", cant: "-" },
    { cat: "INSPECCIÓN MOTOR", item: "5.- Nivel de líquido de freno (bombin embrague)", cant: "-" },
    { cat: "INSPECCIÓN MOTOR", item: "6.- Kilómetros (Verificación)", cant: "-" },
    { cat: "INSPECCIÓN MOTOR", item: "7.- Pérdidas filtro de combustible", cant: "-" },
    { cat: "INSPECCIÓN MOTOR", item: "8.- Pérdidas trampa de agua", cant: "-" },
    { cat: "INSPECCIÓN MOTOR", item: "9.- Pérdidas filtro de aceite", cant: "-" },
    { cat: "INSPECCIÓN MOTOR", item: "10.- Pérdidas de aceite del diferencial", cant: "-" },
    { cat: "INSPECCIÓN MOTOR", item: "11.- Pérdidas de aceite de la caja de cambios", cant: "-" },
    { cat: "INSPECCIÓN MATERIALES", item: "1.- Botiquín", cant: "-" },
    { cat: "INSPECCIÓN MATERIALES", item: "2.- Extintor", cant: "-" },
    { cat: "INSPECCIÓN MATERIALES", item: "3.- Materiales en general", cant: "-" },
    { cat: "CONTROLES MENSUALES", item: "1.- Filtro de aire", cant: "-" },
    { cat: "CONTROLES MENSUALES", item: "2.- Correas de motor", cant: "-" },
    { cat: "CONTROLES MENSUALES", item: "3.- Calibración de cubierta", cant: "-" },
    { cat: "CONTROLES MENSUALES", item: "4.- Nivel de aceite caja intercambiadora", cant: "-" },
    { cat: "CONTROLES MENSUALES", item: "5.- Purgar cilindros de aire", cant: "-" },
    { cat: "CONTROLES MENSUALES", item: "6.- Lavar unidad", cant: "-" },
    { cat: "CONTROLES SEMESTRALES", item: "1.- Engrase", cant: "-" },
    { cat: "CONTROLES SEMESTRALES", item: "2.- Encerar unidad", cant: "-" },
    { cat: "CONTROL DE BOMBA", item: "1.- Odómetro de horas de la bomba", cant: "-" },
    { cat: "CONTROL DE BOMBA", item: "2.- Indicación de temperatura del motor", cant: "-" },
    { cat: "CONTROL DE BOMBA", item: "3.- Tacómetro", cant: "-" },
    { cat: "CONTROL DE BOMBA", item: "4.- Manómetro de presión de aceite del motor", cant: "-" },
    { cat: "CONTROL DE BOMBA", item: "5.- Manovacuómetro", cant: "-" },
    { cat: "CONTROL DE BOMBA", item: "6.- Manómetro de alta presión", cant: "-" },
    { cat: "CONTROL DE BOMBA", item: "7.- Manómetro de presión normal", cant: "-" },
    { cat: "CONTROL DE BOMBA", item: "8.- Nivel de aceite de la bomba", cant: "-" },
    { cat: "CONTROL DE BOMBA", item: "9.- Nivel de aceite de la bomba de vacío", cant: "-" },
    { cat: "CONTROL DE BOMBA", item: "10.- Correa de bomba de vacío", cant: "-" },
    { cat: "CONTROL DE BOMBA", item: "11.- Acople de la bomba", cant: "-" },
    { cat: "CONTROL DE BOMBA", item: "12.- Acople de la bomba de vacío", cant: "-" },
    { cat: "CONTROL DE BOMBA", item: "13.- Dosificador espuma", cant: "-" },
    { cat: "CONTROL DE BOMBA", item: "14.- Prueba de expulsiones", cant: "-" },
    { cat: "CONTROL DE BOMBA", item: "15.- Funcionamiento monitor", cant: "-" }];


    const CONTROLES_U9_AUTO = [
    { cat: "INSPECCIÓN GENERAL", item: "1.- Limpieza interior de cabina", cant: "-" },
    { cat: "INSPECCIÓN GENERAL", item: "2.- Limpieza ventanillas, parabrisas y espejos", cant: "-" },
    { cat: "INSPECCIÓN GENERAL", item: "3.- Limpiaparabrisas (operación y escobillas)", cant: "-" },
    { cat: "INSPECCIÓN GENERAL", item: "4.- Desempañador (funcionamiento)", cant: "-" },
    { cat: "INSPECCIÓN GENERAL", item: "5.- Zorrino nivel de agua y funcionamiento", cant: "-" },
    { cat: "INSPECCIÓN GENERAL", item: "6.- Puesta en marcha", cant: "-" },
    { cat: "INSPECCIÓN GENERAL", item: "7.- Funcionamiento de frenos (de pie y mano)", cant: "-" },
    { cat: "INSPECCIÓN GENERAL", item: "8.- Cubiertas", cant: "-" },
    { cat: "INSPECCIÓN GENERAL", item: "9.- Llantas, bulones, tapa de válvulas", cant: "-" },
    { cat: "INSPECCIÓN ELÉCTRICA", item: "1.- Luces (posición, bajas y alta)", cant: "-" },
    { cat: "INSPECCIÓN ELÉCTRICA", item: "2.- Luces (giro, balizas, frenado y marcha atrás)", cant: "-" },
    { cat: "INSPECCIÓN ELÉCTRICA", item: "3.- Bocina", cant: "-" },
    { cat: "INSPECCIÓN ELÉCTRICA", item: "4.- Velines", cant: "-" },
    { cat: "INSPECCIÓN ELÉCTRICA", item: "5.- Luces persianas", cant: "-" },
    { cat: "INSPECCIÓN ELÉCTRICA", item: "6.- Equipo de radio", cant: "-" },
    { cat: "INSPECCIÓN ELÉCTRICA", item: "7.- Relojes de instrumento", cant: "-" },
    { cat: "INSPECCIÓN ELÉCTRICA", item: "8.- Batería inspección y soporte", cant: "-" },
    { cat: "INSPECCIÓN MOTOR", item: "1.- Nivel de aceite motor", cant: "-" },
    { cat: "INSPECCIÓN MOTOR", item: "2.- Nivel de líquido del radiador", cant: "-" },
    { cat: "INSPECCIÓN MOTOR", item: "3.- Nivel de combustible", tipo: "combustible", cant: "-" },
    { cat: "INSPECCIÓN MOTOR", item: "4.- Nivel de líquido de freno", cant: "-" },
    { cat: "INSPECCIÓN MOTOR", item: "6.- Kilómetros (Verificación)", cant: "-" },
    { cat: "INSPECCIÓN MOTOR", item: "7.- Pérdidas filtro de combustible", cant: "-" },
    { cat: "INSPECCIÓN MOTOR", item: "8.- Pérdidas trampa de agua", cant: "-" },
    { cat: "INSPECCIÓN MOTOR", item: "9.- Pérdidas filtro de aceite", cant: "-" },
    { cat: "INSPECCIÓN MOTOR", item: "10.- Pérdidas de aceite del diferencial", cant: "-" },
    { cat: "INSPECCIÓN MOTOR", item: "11.- Pérdidas de aceite de la caja de cambios", cant: "-" },
    { cat: "INSPECCIÓN MATERIALES", item: "1.- Botiquín", cant: "-" },
    { cat: "INSPECCIÓN MATERIALES", item: "2.- Extintor", cant: "-" },
    { cat: "INSPECCIÓN MATERIALES", item: "3.- Materiales en general", cant: "-" },
    { cat: "CONTROLES MENSUALES", item: "1.- Filtro de aire", cant: "-" },
    { cat: "CONTROLES MENSUALES", item: "2.- Correas de motor", cant: "-" },
    { cat: "CONTROLES MENSUALES", item: "3.- Calibración de cubierta", cant: "-" },
    { cat: "CONTROLES MENSUALES", item: "4.- Nivel de aceite caja intercambiadora", cant: "-" },
    { cat: "CONTROLES MENSUALES", item: "5.- Nivel de liquido de aceite hidraulico", cant: "-" },
    { cat: "CONTROLES MENSUALES", item: "6.- Purgar cilindros de aire", cant: "-" },
    { cat: "CONTROLES MENSUALES", item: "7.- Lavar unidad", cant: "-" },
    { cat: "CONTROLES SEMESTRALES", item: "1.- Engrase", cant: "-" },
    { cat: "CONTROLES SEMESTRALES", item: "2.- Encerar unidad", cant: "-" },
    { cat: "CONTROL DE BOMBA", item: "1.- Odómetro de horas de la bomba", cant: "-" },
    { cat: "CONTROL DE BOMBA", item: "2.- Indicación de temperatura del motor", cant: "-" },
    { cat: "CONTROL DE BOMBA", item: "3.- Tacómetro", cant: "-" },
    { cat: "CONTROL DE BOMBA", item: "4.- Manómetro de presión de aceite del motor", cant: "-" },
    { cat: "CONTROL DE BOMBA", item: "5.- Manómetro de presión normal", cant: "-" },
    { cat: "CONTROL DE BOMBA", item: "6.- Nivel de aceite de la bomba", cant: "-" },
    { cat: "CONTROL DE BOMBA", item: "7.- Nivel de aceite de la bomba de vacío", cant: "-" },
    { cat: "CONTROL DE BOMBA", item: "8.- Correa de bomba de vacío", cant: "-" },
    { cat: "CONTROL DE BOMBA", item: "9.- Acople de la bomba", cant: "-" },
    { cat: "CONTROL DE BOMBA", item: "10.- Acople de la bomba de vacío", cant: "-" },
    { cat: "CONTROL DE BOMBA", item: "11.- Prueba de expulsiones", cant: "-" }];


    
const CONTROLES_U10_AUTO = [
    { cat: "DIARIO", item: "1.- Limpieza interior de cabina", cant: "-" },
    { cat: "DIARIO", item: "2.- Limpieza ventanillas, parabrisas y espejos", cant: "-" },
    { cat: "DIARIO", item: "3.- Puesta en marcha", cant: "-" },
    { cat: "DIARIO", item: "4.- Funcionamiento de frenos (de pie y mano)", cant: "-" },
    { cat: "DIARIO", item: "5.- Cubiertas", cant: "-" },
    { cat: "DIARIO", item: "6.- Llantas, bulones, tapa de válvulas", cant: "-" },
    { cat: "DIARIO", item: "7.- Limpiaparabrisas (operacion y escobillas)", cant: "-" },
    { cat: "DIARIO", item: "8.- Desempañador (funcionamiento)", cant: "-" },
    { cat: "DIARIO", item: "9.- Zorrino nivel de agua y funcionamiento", cant: "-" },
    { cat: "INSPECCIÓN ELÉCTRICA", item: "1.- Luces (posición, bajas y alta)", cant: "-" },
    { cat: "INSPECCIÓN ELÉCTRICA", item: "2.- Luces (giro, balizas, frenado y marcha atrás)", cant: "-" },
    { cat: "INSPECCIÓN ELÉCTRICA", item: "3.- Bocina", cant: "-" },
    { cat: "INSPECCIÓN ELÉCTRICA", item: "4.- Velines", cant: "-" },
    { cat: "INSPECCIÓN ELÉCTRICA", item: "5.- Relojes de instrumento", cant: "-" },
    { cat: "INSPECCIÓN ELÉCTRICA", item: "6.- Batería inspección y soporte", cant: "-" },
    { cat: "INSPECCIÓN ELÉCTRICA", item: "7.- Equipo de radio", cant: "-" },
    { cat: "INSPECCIÓN MOTOR", item: "1.- Nivel de aceite motor", cant: "-" },
    { cat: "INSPECCIÓN MOTOR", item: "2.- Nivel de líquido del radiador", cant: "-" },
    { cat: "INSPECCIÓN MOTOR", item: "3.- Nivel de combustible", tipo: "combustible", cant: "-" },
    { cat: "INSPECCIÓN MOTOR", item: "4.- Nivel de líquido de freno", cant: "-" },
    { cat: "INSPECCIÓN MOTOR", item: "5.- Nivel de líquido de aceite hidraulico", cant: "-" },
    { cat: "INSPECCIÓN MOTOR", item: "6.- Pérdidas filtro de combustible", cant: "-" },
    { cat: "INSPECCIÓN MOTOR", item: "7.- Pérdidas trampa de agua", cant: "-" },
    { cat: "INSPECCIÓN MOTOR", item: "8.- Pérdidas filtro de aceite", cant: "-" },
    { cat: "INSPECCIÓN MOTOR", item: "9.- Pérdidas de aceite del diferencial", cant: "-" },
    { cat: "INSPECCIÓN MOTOR", item: "10.- Pérdidas de aceite de la caja de cambios", cant: "-" },
    { cat: "INSPECCIÓN MATERIALES", item: "1.- Materiales en general", cant: "-" },
    { cat: "CONTROLES MENSUALES", item: "1.- Filtro de aire", cant: "-" },
    { cat: "CONTROLES MENSUALES", item: "2.- Correas de motor", cant: "-" },
    { cat: "CONTROLES MENSUALES", item: "3.- Calibración de cubierta", cant: "-" },
    { cat: "CONTROLES MENSUALES", item: "4.- Lavar unidad", cant: "-" },
    { cat: "CONTROLES SEMESTRALES", item: "1.- Engrase", cant: "-" },
    { cat: "CONTROLES SEMESTRALES", item: "2.- Encerar unidad", cant: "-" },
    { cat: "CONTROL DE BOMBA", item: "1.- ivel de aceite", cant: "-" },
    { cat: "CONTROL DE BOMBA", item: "2.- Nivel de combustibe", cant: "-" },
    { cat: "CONTROL DE BOMBA", item: "3.- Bujias", cant: "-" },
    { cat: "CONTROL DE BOMBA", item: "4.- Filtro de aire", cant: "-" },
    { cat: "CONTROL DE BOMBA", item: "5.- Arranque", cant: "-" },
    { cat: "CONTROL DE BOMBA", item: "6.- Funcionamiento", cant: "-" },
    { cat: "CONTROL DE BOMBA", item: "7.- Prueba de expulsiones", cant: "-" },
    { cat: "CONTROL DE BOMBA", item: "8.- Luces bombas", cant: "-" },];


    
const CONTROLES_U11_AUTO = [
    { cat: "DIARIO", item: "1.- Limpieza interior de cabina", cant: "-" },
    { cat: "DIARIO", item: "2.- Limpieza ventanillas, parabrisas y espejos", cant: "-" },
    { cat: "DIARIO", item: "3.- Puesta en marcha", cant: "-" },
    { cat: "DIARIO", item: "4.- Funcionamiento de frenos (de pie y mano)", cant: "-" },
    { cat: "DIARIO", item: "5.- Cubiertas", cant: "-" },
    { cat: "DIARIO", item: "6.- Llantas, bulones, tapa de válvulas", cant: "-" },
    { cat: "DIARIO", item: "7.- Limpiaparabrisas (operacion y escobillas)", cant: "-" },
    { cat: "DIARIO", item: "8.- Desempañador (funcionamiento)", cant: "-" },
    { cat: "DIARIO", item: "9.- Zorrino nivel de agua y funcionamiento", cant: "-" },
    { cat: "INSPECCIÓN ELÉCTRICA", item: "1.- Luces (posición, bajas y alta)", cant: "-" },
    { cat: "INSPECCIÓN ELÉCTRICA", item: "2.- Luces (giro, balizas, frenado y marcha atrás)", cant: "-" },
    { cat: "INSPECCIÓN ELÉCTRICA", item: "3.- Bocina", cant: "-" },
    { cat: "INSPECCIÓN ELÉCTRICA", item: "4.- Velines", cant: "-" },
    { cat: "INSPECCIÓN ELÉCTRICA", item: "5.- Relojes de instrumento", cant: "-" },
    { cat: "INSPECCIÓN ELÉCTRICA", item: "6.- Batería inspección y soporte", cant: "-" },
    { cat: "INSPECCIÓN ELÉCTRICA", item: "7.- Equipo de radio", cant: "-" },
    { cat: "INSPECCIÓN MOTOR", item: "1.- Nivel de aceite motor", cant: "-" },
    { cat: "INSPECCIÓN MOTOR", item: "2.- Nivel de líquido del radiador", cant: "-" },
    { cat: "INSPECCIÓN MOTOR", item: "3.- Nivel de combustible", tipo: "combustible", cant: "-" },
    { cat: "INSPECCIÓN MOTOR", item: "4.- Nivel de líquido de freno", cant: "-" },
    { cat: "INSPECCIÓN MOTOR", item: "5.- Nivel de líquido de aceite hidraulico", cant: "-" },
    { cat: "INSPECCIÓN MOTOR", item: "6.- Pérdidas filtro de combustible", cant: "-" },
    { cat: "INSPECCIÓN MOTOR", item: "7.- Pérdidas trampa de agua", cant: "-" },
    { cat: "INSPECCIÓN MOTOR", item: "8.- Pérdidas filtro de aceite", cant: "-" },
    { cat: "INSPECCIÓN MOTOR", item: "9.- Pérdidas de aceite del diferencial", cant: "-" },
    { cat: "INSPECCIÓN MOTOR", item: "10.- Pérdidas de aceite de la caja de cambios", cant: "-" },
    { cat: "INSPECCIÓN MATERIALES", item: "1.- Materiales en general", cant: "-" },
    { cat: "INSPECCIÓN MATERIALES", item: "2.- Botiquin", cant: "-" },
    { cat: "INSPECCIÓN MATERIALES", item: "3.- Extintor", cant: "-" },
    { cat: "CONTROLES MENSUALES", item: "1.- Filtro de aire", cant: "-" },
    { cat: "CONTROLES MENSUALES", item: "2.- Correas de motor", cant: "-" },
    { cat: "CONTROLES MENSUALES", item: "3.- Calibración de cubierta", cant: "-" },
    { cat: "CONTROLES MENSUALES", item: "4.- Lavar unidad", cant: "-" },
    { cat: "CONTROLES SEMESTRALES", item: "1.- Engrase", cant: "-" },
    { cat: "CONTROLES SEMESTRALES", item: "2.- Encerar unidad", cant: "-" },]


    
const CONTROLES_U12_AUTO = [
    { cat: "INSPECCIÓN GENERAL", item: "1.- Limpieza interior de cabina", cant: "-" },
    { cat: "INSPECCIÓN GENERAL", item: "2.- Limpieza ventanillas, parabrisas y espejos", cant: "-" },
    { cat: "INSPECCIÓN GENERAL", item: "3.- Limpiaparabrisas (operación y escobillas)", cant: "-" },
    { cat: "INSPECCIÓN GENERAL", item: "4.- Desempañador (funcionamiento)", cant: "-" },
    { cat: "INSPECCIÓN GENERAL", item: "5.- Zorrino nivel de agua y funcionamiento", cant: "-" },
    { cat: "INSPECCIÓN GENERAL", item: "6.- Puesta en marcha", cant: "-" },
    { cat: "INSPECCIÓN GENERAL", item: "7.- Funcionamiento de frenos (de pie y mano)", cant: "-" },
    { cat: "INSPECCIÓN GENERAL", item: "8.- Cubiertas", cant: "-" },
    { cat: "INSPECCIÓN GENERAL", item: "9.- Llantas, bulones, tapa de válvulas", cant: "-" },
    { cat: "INSPECCIÓN ELÉCTRICA", item: "1.- Luces (posición, bajas y alta)", cant: "-" },
    { cat: "INSPECCIÓN ELÉCTRICA", item: "2.- Luces (giro, balizas, frenado y marcha atrás)", cant: "-" },
    { cat: "INSPECCIÓN ELÉCTRICA", item: "3.- Bocina", cant: "-" },
    { cat: "INSPECCIÓN ELÉCTRICA", item: "4.- Velines", cant: "-" },
    { cat: "INSPECCIÓN ELÉCTRICA", item: "5.- Luces persianas", cant: "-" },
    { cat: "INSPECCIÓN ELÉCTRICA", item: "6.- Equipo de radio", cant: "-" },
    { cat: "INSPECCIÓN ELÉCTRICA", item: "7.- Relojes de instrumento", cant: "-" },
    { cat: "INSPECCIÓN ELÉCTRICA", item: "8.- Reflectores", cant: "-" },
    { cat: "INSPECCIÓN ELÉCTRICA", item: "9.- Batería inspección y soporte", cant: "-" },
    { cat: "INSPECCIÓN MOTOR", item: "1.- Nivel de aceite motor", cant: "-" },
    { cat: "INSPECCIÓN MOTOR", item: "2.- Nivel de líquido del radiador", cant: "-" },
    { cat: "INSPECCIÓN MOTOR", item: "3.- Nivel de combustible", tipo: "combustible", cant: "-" },
    { cat: "INSPECCIÓN MOTOR", item: "4.- Nivel de líquido de aceite hidráulico", cant: "-" },
    { cat: "INSPECCIÓN MOTOR", item: "5.- Nivel de líquido de freno (bombin embrague)", cant: "-" },
    { cat: "INSPECCIÓN MOTOR", item: "6.- Kilómetros (Verificación)", cant: "-" },
    { cat: "INSPECCIÓN MOTOR", item: "7.- Pérdidas filtro de combustible", cant: "-" },
    { cat: "INSPECCIÓN MOTOR", item: "8.- Pérdidas trampa de agua", cant: "-" },
    { cat: "INSPECCIÓN MOTOR", item: "9.- Pérdidas filtro de aceite", cant: "-" },
    { cat: "INSPECCIÓN MOTOR", item: "10.- Pérdidas de aceite del diferencial", cant: "-" },
    { cat: "INSPECCIÓN MOTOR", item: "11.- Pérdidas de aceite de la caja de cambios", cant: "-" },
    { cat: "INSPECCIÓN MATERIALES", item: "1.- Botiquín", cant: "-" },
    { cat: "INSPECCIÓN MATERIALES", item: "2.- Extintor", cant: "-" },
    { cat: "INSPECCIÓN MATERIALES", item: "3.- Materiales en general", cant: "-" },
    { cat: "CONTROLES MENSUALES", item: "1.- Filtro de aire", cant: "-" },
    { cat: "CONTROLES MENSUALES", item: "2.- Correas de motor", cant: "-" },
    { cat: "CONTROLES MENSUALES", item: "3.- Calibración de cubierta", cant: "-" },
    { cat: "CONTROLES MENSUALES", item: "4.- Nivel de aceite caja intercambiadora", cant: "-" },
    { cat: "CONTROLES MENSUALES", item: "5.- Purgar cilindros de aire", cant: "-" },
    { cat: "CONTROLES MENSUALES", item: "6.- Lavar unidad", cant: "-" },
    { cat: "CONTROLES SEMESTRALES", item: "1.- Engrase", cant: "-" },
    { cat: "CONTROLES SEMESTRALES", item: "2.- Encerar unidad", cant: "-" },
    { cat: "CONTROL DE BOMBA", item: "1.- Odómetro de horas de la bomba", cant: "-" },
    { cat: "CONTROL DE BOMBA", item: "2.- Indicación de temperatura del motor", cant: "-" },
    { cat: "CONTROL DE BOMBA", item: "3.- Tacómetro", cant: "-" },
    { cat: "CONTROL DE BOMBA", item: "4.- Manómetro de presión de aceite del motor", cant: "-" },
    { cat: "CONTROL DE BOMBA", item: "5.- Manovacuómetro", cant: "-" },
    { cat: "CONTROL DE BOMBA", item: "6.- Manómetro de alta presión", cant: "-" },
    { cat: "CONTROL DE BOMBA", item: "7.- Manómetro de presión normal", cant: "-" },
    { cat: "CONTROL DE BOMBA", item: "8.- Nivel de aceite de la bomba", cant: "-" },
    { cat: "CONTROL DE BOMBA", item: "9.- Nivel de aceite de la bomba de vacío", cant: "-" },
    { cat: "CONTROL DE BOMBA", item: "10.- Correa de bomba de vacío", cant: "-" },
    { cat: "CONTROL DE BOMBA", item: "11.- Acople de la bomba", cant: "-" },
    { cat: "CONTROL DE BOMBA", item: "12.- Acople de la bomba de vacío", cant: "-" },
    { cat: "CONTROL DE BOMBA", item: "13.- Prueba de expulsiones", cant: "-" },
    { cat: "CONTROL DE BOMBA", item: "14.- Funcionamiento monitor", cant: "-" }];

    const CONTROLES_U13_AUTO = [
    { cat: "INSPECCIÓN GENERAL", item: "1.- Limpieza interior de cabina", cant: "-" },
    { cat: "INSPECCIÓN GENERAL", item: "2.- Limpieza ventanillas, parabrisas y espejos", cant: "-" },
    { cat: "INSPECCIÓN GENERAL", item: "3.- Limpiaparabrisas (operación y escobillas)", cant: "-" },
    { cat: "INSPECCIÓN GENERAL", item: "4.- Desempañador (funcionamiento)", cant: "-" },
    { cat: "INSPECCIÓN GENERAL", item: "5.- Zorrino nivel de agua y funcionamiento", cant: "-" },
    { cat: "INSPECCIÓN GENERAL", item: "6.- Puesta en marcha", cant: "-" },
    { cat: "INSPECCIÓN GENERAL", item: "7.- Funcionamiento de frenos (de pie y mano)", cant: "-" },
    { cat: "INSPECCIÓN GENERAL", item: "8.- Cubiertas", cant: "-" },
    { cat: "INSPECCIÓN GENERAL", item: "9.- Llantas, bulones, tapa de válvulas", cant: "-" },
    { cat: "INSPECCIÓN ELÉCTRICA", item: "1.- Luces (posición, bajas y alta)", cant: "-" },
    { cat: "INSPECCIÓN ELÉCTRICA", item: "2.- Luces (giro, balizas, frenado y marcha atrás)", cant: "-" },
    { cat: "INSPECCIÓN ELÉCTRICA", item: "3.- Bocina", cant: "-" },
    { cat: "INSPECCIÓN ELÉCTRICA", item: "4.- Velines", cant: "-" },
    { cat: "INSPECCIÓN ELÉCTRICA", item: "5.- Luces persianas", cant: "-" },
    { cat: "INSPECCIÓN ELÉCTRICA", item: "6.- Equipo de radio", cant: "-" },
    { cat: "INSPECCIÓN ELÉCTRICA", item: "7.- Relojes de instrumento", cant: "-" },
    { cat: "INSPECCIÓN ELÉCTRICA", item: "8.- Reflectores", cant: "-" },
    { cat: "INSPECCIÓN ELÉCTRICA", item: "9.- Batería inspección y soporte", cant: "-" },
    { cat: "INSPECCIÓN MOTOR", item: "1.- Nivel de aceite motor", cant: "-" },
    { cat: "INSPECCIÓN MOTOR", item: "2.- Nivel de líquido del radiador", cant: "-" },
    { cat: "INSPECCIÓN MOTOR", item: "3.- Nivel de combustible", tipo: "combustible", cant: "-" },
    { cat: "INSPECCIÓN MOTOR", item: "4.- Nivel de líquido de aceite hidráulico", cant: "-" },
    { cat: "INSPECCIÓN MOTOR", item: "5.- Nivel de líquido de freno (bombin embrague)", cant: "-" },
    { cat: "INSPECCIÓN MOTOR", item: "6.- Kilómetros (Verificación)", cant: "-" },
    { cat: "INSPECCIÓN MOTOR", item: "7.- Pérdidas filtro de combustible", cant: "-" },
    { cat: "INSPECCIÓN MOTOR", item: "8.- Pérdidas trampa de agua", cant: "-" },
    { cat: "INSPECCIÓN MOTOR", item: "9.- Pérdidas filtro de aceite", cant: "-" },
    { cat: "INSPECCIÓN MOTOR", item: "10.- Pérdidas de aceite del diferencial", cant: "-" },
    { cat: "INSPECCIÓN MOTOR", item: "11.- Pérdidas de aceite de la caja de cambios", cant: "-" },
    { cat: "INSPECCIÓN MATERIALES", item: "1.- Botiquín", cant: "-" },
    { cat: "INSPECCIÓN MATERIALES", item: "2.- Extintor", cant: "-" },
    { cat: "INSPECCIÓN MATERIALES", item: "3.- Materiales en general", cant: "-" },
    { cat: "CONTROLES MENSUALES", item: "1.- Filtro de aire", cant: "-" },
    { cat: "CONTROLES MENSUALES", item: "2.- Correas de motor", cant: "-" },
    { cat: "CONTROLES MENSUALES", item: "3.- Calibración de cubierta", cant: "-" },
    { cat: "CONTROLES MENSUALES", item: "4.- Nivel de aceite caja intercambiadora", cant: "-" },
    { cat: "CONTROLES MENSUALES", item: "5.- Purgar cilindros de aire", cant: "-" },
    { cat: "CONTROLES MENSUALES", item: "6.- Lavar unidad", cant: "-" },
    { cat: "CONTROLES SEMESTRALES", item: "1.- Engrase", cant: "-" },
    { cat: "CONTROLES SEMESTRALES", item: "2.- Encerar unidad", cant: "-" },
    { cat: "CONTROL DE BOMBA", item: "1.- Odómetro de horas de la bomba", cant: "-" },
    { cat: "CONTROL DE BOMBA", item: "2.- Indicación de temperatura del motor", cant: "-" },
    { cat: "CONTROL DE BOMBA", item: "3.- Tacómetro", cant: "-" },
    { cat: "CONTROL DE BOMBA", item: "4.- Manómetro de presión de aceite del motor", cant: "-" },
    { cat: "CONTROL DE BOMBA", item: "5.- Manovacuómetro", cant: "-" },
    { cat: "CONTROL DE BOMBA", item: "6.- Manómetro de alta presión", cant: "-" },
    { cat: "CONTROL DE BOMBA", item: "7.- Manómetro de presión normal", cant: "-" },
    { cat: "CONTROL DE BOMBA", item: "8.- Nivel de aceite de la bomba", cant: "-" },
    { cat: "CONTROL DE BOMBA", item: "9.- Nivel de aceite de la bomba de vacío", cant: "-" },
    { cat: "CONTROL DE BOMBA", item: "10.- Correa de bomba de vacío", cant: "-" },
    { cat: "CONTROL DE BOMBA", item: "11.- Acople de la bomba", cant: "-" },
    { cat: "CONTROL DE BOMBA", item: "12.- Acople de la bomba de vacío", cant: "-" },
    { cat: "CONTROL DE BOMBA", item: "13.- Prueba de expulsiones", cant: "-" },
    { cat: "CONTROL DE BOMBA", item: "14.- Funcionamiento monitor", cant: "-" }];


    const CONTROLES_U15_AUTO = [
    { cat: "DIARIO", item: "1.- Limpieza interior de cabina", cant: "-" },
    { cat: "DIARIO", item: "2.- Limpieza ventanillas, parabrisas y espejos", cant: "-" },
    { cat: "DIARIO", item: "3.- Puesta en marcha", cant: "-" },
    { cat: "DIARIO", item: "4.- Funcionamiento de frenos (de pie y mano)", cant: "-" },
    { cat: "DIARIO", item: "5.- Cubiertas", cant: "-" },
    { cat: "DIARIO", item: "6.- Llantas, bulones, tapa de válvulas", cant: "-" },
    { cat: "DIARIO", item: "7.- Limpiaparabrisas (operacion y escobillas)", cant: "-" },
    { cat: "DIARIO", item: "8.- Desempañador (funcionamiento)", cant: "-" },
    { cat: "DIARIO", item: "9.- Zorrino nivel de agua y funcionamiento", cant: "-" },
    { cat: "INSPECCIÓN ELÉCTRICA", item: "1.- Luces (posición, bajas y alta)", cant: "-" },
    { cat: "INSPECCIÓN ELÉCTRICA", item: "2.- Luces (giro, balizas, frenado y marcha atrás)", cant: "-" },
    { cat: "INSPECCIÓN ELÉCTRICA", item: "3.- Bocina", cant: "-" },
    { cat: "INSPECCIÓN ELÉCTRICA", item: "4.- Velines", cant: "-" },
    { cat: "INSPECCIÓN ELÉCTRICA", item: "5.- Relojes de instrumento", cant: "-" },
    { cat: "INSPECCIÓN ELÉCTRICA", item: "6.- Batería inspección y soporte", cant: "-" },
    { cat: "INSPECCIÓN ELÉCTRICA", item: "7.- Equipo de radio", cant: "-" },
    { cat: "INSPECCIÓN MOTOR", item: "1.- Nivel de aceite motor", cant: "-" },
    { cat: "INSPECCIÓN MOTOR", item: "2.- Nivel de líquido del radiador", cant: "-" },
    { cat: "INSPECCIÓN MOTOR", item: "3.- Nivel de combustible", tipo: "combustible", cant: "-" },
    { cat: "INSPECCIÓN MOTOR", item: "4.- Nivel de líquido de freno", cant: "-" },
    { cat: "INSPECCIÓN MOTOR", item: "5.- Nivel de líquido de aceite hidraulico", cant: "-" },
    { cat: "INSPECCIÓN MOTOR", item: "6.- Pérdidas filtro de combustible", cant: "-" },
    { cat: "INSPECCIÓN MOTOR", item: "7.- Pérdidas trampa de agua", cant: "-" },
    { cat: "INSPECCIÓN MOTOR", item: "8.- Pérdidas filtro de aceite", cant: "-" },
    { cat: "INSPECCIÓN MOTOR", item: "9.- Pérdidas de aceite del diferencial", cant: "-" },
    { cat: "INSPECCIÓN MOTOR", item: "10.- Pérdidas de aceite de la caja de cambios", cant: "-" },
    { cat: "INSPECCIÓN MATERIALES", item: "1.- Materiales en general", cant: "-" },
    { cat: "INSPECCIÓN MATERIALES", item: "2.- Extintor", cant: "-" },
    { cat: "CONTROLES MENSUALES", item: "1.- Filtro de aire", cant: "-" },
    { cat: "CONTROLES MENSUALES", item: "2.- Correas de motor", cant: "-" },
    { cat: "CONTROLES MENSUALES", item: "3.- Calibración de cubierta", cant: "-" },
    { cat: "CONTROLES MENSUALES", item: "4.- Lavar unidad", cant: "-" },
    { cat: "CONTROLES SEMESTRALES", item: "1.- Engrase", cant: "-" },
    { cat: "CONTROLES SEMESTRALES", item: "2.- Encerar unidad", cant: "-" },
    { cat: "CONTROL DE BOMBA", item: "1.- Nivel de aceite", cant: "-" },
    { cat: "CONTROL DE BOMBA", item: "2.- Nivel de combustibe", cant: "-" },
    { cat: "CONTROL DE BOMBA", item: "3.- Bujias", cant: "-" },
    { cat: "CONTROL DE BOMBA", item: "4.- Filtro de aire", cant: "-" },
    { cat: "CONTROL DE BOMBA", item: "5.- Arranque", cant: "-" },
    { cat: "CONTROL DE BOMBA", item: "6.- Funcionamiento", cant: "-" },
    { cat: "CONTROL DE BOMBA", item: "7.- Prueba de expulsiones", cant: "-" },
    { cat: "CONTROL DE BOMBA", item: "8.- Luces bombas", cant: "-" },];




    const CONTROLES_U16_AUTO = [
    { cat: "INSPECCIÓN GENERAL", item: "1.- Limpieza interior de cabina", cant: "-" },
    { cat: "INSPECCIÓN GENERAL", item: "2.- Limpieza ventanillas, parabrisas y espejos", cant: "-" },
    { cat: "INSPECCIÓN GENERAL", item: "3.- Limpiaparabrisas (operación y escobillas)", cant: "-" },
    { cat: "INSPECCIÓN GENERAL", item: "4.- Desempañador (funcionamiento)", cant: "-" },
    { cat: "INSPECCIÓN GENERAL", item: "5.- Zorrino nivel de agua y funcionamiento", cant: "-" },
    { cat: "INSPECCIÓN GENERAL", item: "6.- Puesta en marcha", cant: "-" },
    { cat: "INSPECCIÓN GENERAL", item: "7.- Funcionamiento de frenos (de pie y mano)", cant: "-" },
    { cat: "INSPECCIÓN GENERAL", item: "8.- Cubiertas", cant: "-" },
    { cat: "INSPECCIÓN GENERAL", item: "9.- Llantas, bulones, tapa de válvulas", cant: "-" },
    { cat: "INSPECCIÓN ELÉCTRICA", item: "1.- Luces (posición, bajas y alta)", cant: "-" },
    { cat: "INSPECCIÓN ELÉCTRICA", item: "2.- Luces (giro, balizas, frenado y marcha atrás)", cant: "-" },
    { cat: "INSPECCIÓN ELÉCTRICA", item: "3.- Bocina", cant: "-" },
    { cat: "INSPECCIÓN ELÉCTRICA", item: "4.- Velines", cant: "-" },
    { cat: "INSPECCIÓN ELÉCTRICA", item: "5.- Luces persianas", cant: "-" },
    { cat: "INSPECCIÓN ELÉCTRICA", item: "6.- Equipo de radio", cant: "-" },
    { cat: "INSPECCIÓN ELÉCTRICA", item: "7.- Relojes de instrumento", cant: "-" },
    { cat: "INSPECCIÓN ELÉCTRICA", item: "8.- Reflectores", cant: "-" },
    { cat: "INSPECCIÓN ELÉCTRICA", item: "9.- Batería inspección y soporte", cant: "-" },
    { cat: "INSPECCIÓN MOTOR", item: "1.- Nivel de aceite motor", cant: "-" },
    { cat: "INSPECCIÓN MOTOR", item: "2.- Nivel de líquido del radiador", cant: "-" },
    { cat: "INSPECCIÓN MOTOR", item: "3.- Nivel de combustible", tipo: "combustible", cant: "-" },
    { cat: "INSPECCIÓN MOTOR", item: "4.- Nivel de líquido de freno", cant: "-" },
    { cat: "INSPECCIÓN MOTOR", item: "5.- Kilómetros (Verificación)", cant: "-" },
    { cat: "INSPECCIÓN MOTOR", item: "6.- Pérdidas filtro de combustible", cant: "-" },
    { cat: "INSPECCIÓN MOTOR", item: "7.- Pérdidas trampa de agua", cant: "-" },
    { cat: "INSPECCIÓN MOTOR", item: "8.- Pérdidas filtro de aceite", cant: "-" },
    { cat: "INSPECCIÓN MOTOR", item: "9.- Pérdidas de aceite del diferencial", cant: "-" },
    { cat: "INSPECCIÓN MOTOR", item: "10.- Pérdidas de aceite de la caja de cambios", cant: "-" },
    { cat: "INSPECCIÓN MATERIALES", item: "1.- Botiquín", cant: "-" },
    { cat: "INSPECCIÓN MATERIALES", item: "2.- Extintor", cant: "-" },
    { cat: "INSPECCIÓN MATERIALES", item: "3.- Materiales en general", cant: "-" },
    { cat: "CONTROLES MENSUALES", item: "1.- Filtro de aire", cant: "-" },
    { cat: "CONTROLES MENSUALES", item: "2.- Correas de motor", cant: "-" },
    { cat: "CONTROLES MENSUALES", item: "3.- Calibración de cubierta", cant: "-" },
    { cat: "CONTROLES MENSUALES", item: "4.- Nivel de aceite caja intercambiadora", cant: "-" },
    { cat: "CONTROLES MENSUALES", item: "5.- Nivel de liquido de aceite hidraulico", cant: "-" },
    { cat: "CONTROLES MENSUALES", item: "6.- Purgar cilindros de aire", cant: "-" },
    { cat: "CONTROLES MENSUALES", item: "7.- Lavar unidad", cant: "-" },
    { cat: "CONTROLES SEMESTRALES", item: "1.- Engrase", cant: "-" },
    { cat: "CONTROLES SEMESTRALES", item: "2.- Encerar unidad", cant: "-" },
    { cat: "CONTROL DE BOMBA", item: "1.- Odómetro de horas de la bomba", cant: "-" },
    { cat: "CONTROL DE BOMBA", item: "2.- Indicación de temperatura del motor", cant: "-" },
    { cat: "CONTROL DE BOMBA", item: "3.- Tacómetro", cant: "-" },
    { cat: "CONTROL DE BOMBA", item: "4.- Manómetro de presión de aceite del motor", cant: "-" },
    { cat: "CONTROL DE BOMBA", item: "5.- Manovacuómetro", cant: "-" },
    { cat: "CONTROL DE BOMBA", item: "6.- Manómetro de alta presión", cant: "-" },
    { cat: "CONTROL DE BOMBA", item: "7.- Manómetro de presión normal", cant: "-" },
    { cat: "CONTROL DE BOMBA", item: "8.- Nivel de aceite de la bomba", cant: "-" },
    { cat: "CONTROL DE BOMBA", item: "9.- Nivel de aceite de la bomba de vacío", cant: "-" },
    { cat: "CONTROL DE BOMBA", item: "10.- Correa de bomba de vacío", cant: "-" },
    { cat: "CONTROL DE BOMBA", item: "11.- Acople de la bomba", cant: "-" },
    { cat: "CONTROL DE BOMBA", item: "12.- Acople de la bomba de vacío", cant: "-" },
    { cat: "CONTROL DE BOMBA", item: "13.- Prueba de expulsiones", cant: "-" },
    { cat: "CONTROL DE BOMBA", item: "14.- Dosificador espuma", cant: "-" }];


// MATERIALES U-2
const CONTROLES_U2_MAT = [
    { "cat": "TECHO", "item": "Tabla larga", "cant": "1" },
    { "cat": "TECHO", "item": "Escalera", "cant": "1" },
    { "cat": "TECHO", "item": "Manguerote de 2 1/2\"", "cant": "1" },
    { "cat": "TECHO", "item": "Manguerote de 3\" con filtro", "cant": "1" },
    { "cat": "TECHO", "item": "Manguerote de 6\"", "cant": "2" },
    { "cat": "TECHO", "item": "Monitor portátil", "cant": "1" },
    { "cat": "TECHO", "item": "Bichero", "cant": "1" },
    { "cat": "PRIMER PERSIANA LADO CHOFER", "item": "Equipos autónomos", "cant": "4" },
    { "cat": "PRIMER PERSIANA LADO CHOFER", "item": "Tubos de repuestos", "cant": "4" },
    { "cat": "PRIMER PERSIANA LADO CHOFER", "item": "Extintor", "cant": "1" },
    { "cat": "PRIMER PERSIANA LADO CHOFER", "item": "Tramos de mangueras de 1 1/2\" en rollos", "cant": "1" },
    { "cat": "PRIMER PERSIANA LADO CHOFER", "item": "Tramos de mangueras de 2 1/2\" en rollos", "cant": "3" },
    { "cat": "PRIMER PERSIANA LADO CHOFER", "item": "Pertiga", "cant": "1" },
    { "cat": "PRIMER PERSIANA LADO CHOFER", "item": "Columna llave externa", "cant": "1" },
    { "cat": "PRIMER PERSIANA LADO CHOFER", "item": "Llave columna externa", "cant": "1" },
    { "cat": "PRIMER PERSIANA LADO CHOFER", "item": "Columna interna", "cant": "1" },
    { "cat": "SEGUNDA PERSIANA LADO CHOFER", "item": "Devanador", "cant": "1" },
    { "cat": "SEGUNDA PERSIANA LADO CHOFER", "item": "Lanza NE-PI-RO en devanador", "cant": "1" },
    { "cat": "SEGUNDA PERSIANA LADO CHOFER", "item": "Lanza para cortina de agua de 1 1/2\"", "cant": "1" },
    { "cat": "SEGUNDA PERSIANA LADO CHOFER", "item": "Tramos de mangueras de 1 1/2\" en estiba", "cant": "3" },
    { "cat": "SEGUNDA PERSIANA LADO CHOFER", "item": "Lanza Viper de 1 1/2\" en estiba", "cant": "1" },
    { "cat": "SEGUNDA PERSIANA LADO CHOFER", "item": "Tramos de mangueras de 2 1/2\" en estiba", "cant": "2" },
    { "cat": "SEGUNDA PERSIANA LADO CHOFER", "item": "Lanza Viper de 1 1/2\"", "cant": "1" },
    { "cat": "SEGUNDA PERSIANA LADO CHOFER", "item": "Lanza Viper de 2 1/2\"", "cant": "1" },
    { "cat": "SEGUNDA PERSIANA LADO CHOFER", "item": "Gemelo de 2 1/2\" a 1 1/2\"", "cant": "1" },
    { "cat": "SEGUNDA PERSIANA LADO CHOFER", "item": "Llaves storz 1 1/2\"; 2 1/2\", 3\"", "cant": "2" },
    { "cat": "PRIMERA PERSIANA LADO ACOMPAÑANTE", "item": "Pico", "cant": "1" },
    { "cat": "PRIMERA PERSIANA LADO ACOMPAÑANTE", "item": "Halligan ", "cant": "1" },
    { "cat": "PRIMERA PERSIANA LADO ACOMPAÑANTE", "item": "Pinza corta candado", "cant": "1" },
    { "cat": "PRIMERA PERSIANA LADO ACOMPAÑANTE", "item": "Tramos de manguera de 1 1/2\" en rollo", "cant": "3" },
    { "cat": "PRIMERA PERSIANA LADO ACOMPAÑANTE", "item": "Tramos de manguera de 2 1/2\" en rollo", "cant": "2" },
    { "cat": "PRIMERA PERSIANA LADO ACOMPAÑANTE", "item": "Motobomba Sensei", "cant": "1" },
    { "cat": "PRIMERA PERSIANA LADO ACOMPAÑANTE", "item": "Hacha grande", "cant": "1" },
    { "cat": "PRIMERA PERSIANA LADO ACOMPAÑANTE", "item": "Hacha chica", "cant": "1" },
    { "cat": "PRIMERA PERSIANA LADO ACOMPAÑANTE", "item": "Barreta", "cant": "1" },
    { "cat": "PRIMERA PERSIANA LADO ACOMPAÑANTE", "item": "Pala de punta", "cant": "1" },
    { "cat": "PRIMERA PERSIANA LADO ACOMPAÑANTE", "item": "Pescador", "cant": "1" },
    { "cat": "PRIMERA PERSIANA LADO ACOMPAÑANTE", "item": "Lanza de espuma", "cant": "1" },
    { "cat": "PRIMERA PERSIANA LADO ACOMPAÑANTE", "item": "Chaleco de extricación", "cant": "1" },
    { "cat": "PRIMERA PERSIANA LADO ACOMPAÑANTE", "item": "Bolso de trauma", "cant": "1" },
    { "cat": "PRIMERA PERSIANA LADO ACOMPAÑANTE (CAJON 1)", "item": "Cinta de Peligro", "cant": "1" },
    { "cat": "PRIMERA PERSIANA LADO ACOMPAÑANTE (CAJON 1)", "item": "Corta fierro", "cant": "1" },
    { "cat": "PRIMERA PERSIANA LADO ACOMPAÑANTE (CAJON 1)", "item": "Reductor 2 1/2 storz a 1 1/2 storz", "cant": "1" },
    { "cat": "PRIMERA PERSIANA LADO ACOMPAÑANTE (CAJON 1)", "item": "Adaptador 2 1/2 hembra bombero a storz", "cant": "3" },
    { "cat": "PRIMERA PERSIANA LADO ACOMPAÑANTE (CAJON 1)", "item": "Adaptador 2 1/2 storz a macho bombero", "cant": "1" },
    { "cat": "PRIMERA PERSIANA LADO ACOMPAÑANTE (CAJON 1)", "item": "Filtro de 6\"", "cant": "1" },
    { "cat": "PRIMERA PERSIANA LADO ACOMPAÑANTE (CAJON 2)", "item": "Maza", "cant": "1" },
    { "cat": "PRIMERA PERSIANA LADO ACOMPAÑANTE (CAJON 2)", "item": "Riesgo eléctrico", "cant": "1" },
    { "cat": "PRIMERA PERSIANA LADO ACOMPAÑANTE (CAJON 2)", "item": "Filtro", "cant": "1" },
    { "cat": "PRIMERA PERSIANA LADO ACOMPAÑANTE (CAJON 2)", "item": "Destornillador paleta", "cant": "1" },
    { "cat": "PRIMERA PERSIANA LADO ACOMPAÑANTE (CAJON 2)", "item": "Llave 14/17", "cant": "1" },
    { "cat": "PRIMERA PERSIANA LADO ACOMPAÑANTE (CAJON 2)", "item": "Llave 19/16", "cant": "1" },
    { "cat": "PRIMERA PERSIANA LADO ACOMPAÑANTE (CAJON 2)", "item": "Llave 1/2", "cant": "1" },
    { "cat": "RIESGO ELECTRICO", "item": "Pinza", "cant": "1" },
    { "cat": "RIESGO ELECTRICO", "item": "Alicate", "cant": "1" },
    { "cat": "RIESGO ELECTRICO", "item": "Guantes de R.E", "cant": "1" },
    { "cat": "RIESGO ELECTRICO", "item": "Guantes de vaqueta", "cant": "1" },
    { "cat": "BOLSO DE TRAUMA", "item": "Resucitador manual", "cant": "1" },
    { "cat": "BOLSO DE TRAUMA", "item": "Collarín", "cant": "1" },
    { "cat": "BOLSO DE TRAUMA", "item": "Frazadas", "cant": "1" },
    { "cat": "BOLSO DE TRAUMA", "item": "Tubo de Oxigeno", "cant": "1" },
    { "cat": "BOLSO DE TRAUMA", "item": "Cutter", "cant": "3" },
    { "cat": "BOLSO DE TRAUMA", "item": "Platsul", "cant": "5" },
    { "cat": "BOLSO DE TRAUMA", "item": "Guantes", "cant": "varios" },
    { "cat": "BOLSO DE TRAUMA", "item": "Apósitos", "cant": "10" },
    { "cat": "BOLSO DE TRAUMA", "item": "Cinta Adhesiva", "cant": "2" },
    { "cat": "BOLSO DE TRAUMA", "item": "Gasas chicas ", "cant": "varios" },
    { "cat": "BOLSO DE TRAUMA", "item": "Pomada", "cant": "1" },
    { "cat": "BOLSO DE TRAUMA", "item": "Gasas largas", "cant": "3" },
    { "cat": "BOLSO DE TRAUMA", "item": "Rollo de venda de 3mts", "cant": "1" },
    { "cat": "BOLSO DE TRAUMA", "item": "Agua Oxigenada", "cant": "1" },
    { "cat": "BOLSO DE TRAUMA", "item": "Alcohol", "cant": "1" },
    { "cat": "BOLSO DE TRAUMA", "item": "Pervinox", "cant": "1" },
    { "cat": "BOLSO DE TRAUMA", "item": "Jabón Líquido Pervinox", "cant": "1" },
    { "cat": "BOLSO DE TRAUMA", "item": "Apósitos", "cant": "Varios" },
    { "cat": "SEGUNDA PERSIANA LADO ACOMPAÑANTE", "item": "Devanador", "cant": "1" },
    { "cat": "SEGUNDA PERSIANA LADO ACOMPAÑANTE", "item": "Lanza NE-PI-RO en devanador", "cant": "1" },
    { "cat": "SEGUNDA PERSIANA LADO ACOMPAÑANTE", "item": "Llaves union", "cant": "2" },
    { "cat": "SEGUNDA PERSIANA LADO ACOMPAÑANTE", "item": "Manija de devanador", "cant": "1" },
    { "cat": "SEGUNDA PERSIANA LADO ACOMPAÑANTE", "item": "Tramos de mangueras de 2 1/2\" en rollos", "cant": "1" },
    { "cat": "SEGUNDA PERSIANA LADO ACOMPAÑANTE", "item": "Tramos de mangueras de 1 1/2\" en rollos", "cant": "2" },
    { "cat": "SEGUNDA PERSIANA LADO ACOMPAÑANTE", "item": "Lanzas de cortina de agua de 1 1/2\"", "cant": "2" },
    { "cat": "SEGUNDA PERSIANA LADO ACOMPAÑANTE", "item": "Gemelo de 2 1/2\"", "cant": "1" },
    { "cat": "SEGUNDA PERSIANA LADO ACOMPAÑANTE", "item": "Tramos de mangueras de 1 1/2\" en estiba", "cant": "3" },
    { "cat": "SEGUNDA PERSIANA LADO ACOMPAÑANTE", "item": "Lanza Elkhart de 1 1/2\" en estiba", "cant": "1" },
    { "cat": "SEGUNDA PERSIANA LADO ACOMPAÑANTE", "item": "Tramos de mangueras de 2 1/2\" en estiba", "cant": "2" },
    { "cat": "SEGUNDA PERSIANA LADO ACOMPAÑANTE", "item": "Lanza Elkhart de 2 1/2\" en estiba", "cant": "1" },
    { "cat": "ASIENTO DOBLE CABINA ", "item": "Manija para cambiar rueda con mango", "cant": "1" },
    { "cat": "ASIENTO DOBLE CABINA ", "item": "Llave storz de 5\"", "cant": "1" },
    { "cat": "ASIENTO DOBLE CABINA ", "item": "Estilson", "cant": "1" },
    { "cat": "ASIENTO DOBLE CABINA ", "item": "Barreta mediana", "cant": "1" },
    { "cat": "ASIENTO DOBLE CABINA ", "item": "Llave para sacar tapón del carter", "cant": "1" },
    { "cat": "ASIENTO DOBLE CABINA ", "item": "Llave boca-anillo 11/8", "cant": "1" },
    { "cat": "ASIENTO DOBLE CABINA ", "item": "Barreta chica", "cant": "1" },
    { "cat": "TECHO ", "item": "Escalera", "cant": "1" },
    { "cat": "TECHO ", "item": "Bichero", "cant": "1" },
    { "cat": "TECHO ", "item": "Tabla Larga", "cant": "1" },
    { "cat": "TECHO ", "item": "Monitor Portatil", "cant": "1" },
    { "cat": "TECHO ", "item": "Manguerote de 2 1/2\"", "cant": "1" },
    { "cat": "TECHO ", "item": "Escalera", "cant": "1" },
    { "cat": "TECHO ", "item": "Manguerote de 5\"", "cant": "1" },
    { "cat": "TECHO ", "item": "Manguerote de 3\" con filtro", "cant": "1" },
    { "cat": "MOTO BOMBA", "item": "Nivel de combustible", "tipo": "combustible", "cant": "N/A" },
    { "cat": "MOTO BOMBA", "item": "Estado del combustible", "cant": "N/A" },
    { "cat": "MOTO BOMBA", "item": "Nivel de aceite", "cant": "N/A" },
    { "cat": "MOTO BOMBA", "item": "Estado del aceite", "cant": "N/A" },
    { "cat": "MOTO BOMBA", "item": "Limpieza de filtro de aire", "cant": "N/A" },
    { "cat": "MOTO BOMBA", "item": "Perdidas en válvulas", "cant": "N/A" },
    { "cat": "MOTO BOMBA", "item": "Válvula de retencíon", "cant": "N/A" },
    { "cat": "MOTO BOMBA", "item": "Retención", "cant": "N/A" },
    { "cat": "MOTO BOMBA", "item": "Estado de acoples", "cant": "N/A" },
    { "cat": "MOTO BOMBA", "item": "Estado de manguerotes", "cant": "N/A" },
    { "cat": "MOTO BOMBA", "item": "Estado de filtro del manguerote", "cant": "N/A" },
    { "cat": "MOTO BOMBA", "item": "Puesta en marcha", "cant": "N/A" },
    { "cat": "MOTO BOMBA", "item": "Perdida en sello aceptable", "cant": "N/A" },
    { "cat": "MOTO BOMBA", "item": "Tiempo de aspiración", "cant": "N/A" },
    { "cat": "MOTO BOMBA", "item": "Mantenimiento general", "cant": "N/A" },
    { "cat": "MOTO BOMBA", "item": "Limpieza", "cant": "N/A" },
];

// MATERIALES U-3
const CONTROLES_U3_MAT = [
    { "cat": "MOTO BOMBA", "item": "Nivel de combustible", "tipo": "combustible", "cant": "N/A" },
    { "cat": "MOTO BOMBA", "item": "Estado del combustible", "cant": "N/A" },
    { "cat": "MOTO BOMBA", "item": "Nivel de aceite", "cant": "N/A" },
    { "cat": "MOTO BOMBA", "item": "Estado del aceite", "cant": "N/A" },
    { "cat": "MOTO BOMBA", "item": "Limpieza de filtro de aire", "cant": "N/A" },
    { "cat": "MOTO BOMBA", "item": "Perdidas en válvulas", "cant": "N/A" },
    { "cat": "MOTO BOMBA", "item": "Válvula de retencíon", "cant": "N/A" },
    { "cat": "MOTO BOMBA", "item": "Retención", "cant": "N/A" },
    { "cat": "MOTO BOMBA", "item": "Estado de acoples", "cant": "N/A" },
    { "cat": "MOTO BOMBA", "item": "Estado de manguerotes", "cant": "N/A" },
    { "cat": "MOTO BOMBA", "item": "Estado de filtro del manguerote", "cant": "N/A" },
    { "cat": "MOTO BOMBA", "item": "Puesta en marcha", "cant": "N/A" },
    { "cat": "MOTO BOMBA", "item": "Perdida en sello aceptable", "cant": "N/A" },
    { "cat": "MOTO BOMBA", "item": "Tiempo de aspiración", "cant": "N/A" },
    { "cat": "MOTO BOMBA", "item": "Mantenimiento general", "cant": "N/A" },
    { "cat": "MOTO BOMBA", "item": "Limpieza", "cant": "N/A" }
];

// MATERIALES U-6
const CONTROLES_U6_MAT = [
    { "cat": "PUERTA LATERAL LADO CHOFER 1", "item": "Botas verde agua N°43", "cant": "2" },
    { "cat": "PUERTA LATERAL LADO CHOFER 1", "item": "Botas verde agua N°44", "cant": "4" },
    { "cat": "PUERTA LATERAL LADO CHOFER 1", "item": "Botas verde agua N°45", "cant": "2" },
    { "cat": "PUERTA LATERAL LADO CHOFER 1", "item": "Absorbentes", "cant": "1" },
    { "cat": "PUERTA LATERAL LADO CHOFER 1", "item": "Boa Absorbente", "cant": "1" },
    { "cat": "PUERTA LATERAL LADO CHOFER 2", "item": "Mascarillas faciales", "cant": "5" },
    { "cat": "PUERTA LATERAL LADO CHOFER 2", "item": "Cascos amarillos", "cant": "7" },
    { "cat": "PUERTA LATERAL LADO CHOFER 2", "item": "Sordinas", "cant": "1" },
    { "cat": "PUERTA LATERAL LADO CHOFER 2", "item": "Cepillos para lavado", "cant": "9" },
    { "cat": "PUERTA LATERAL LADO ACOMPAÑANTE 1", "item": "Pileta", "cant": "1" },
    { "cat": "PUERTA LATERAL LADO ACOMPAÑANTE 1", "item": "Caños de pileta", "cant": "1" },
    { "cat": "PUERTA LATERAL LADO ACOMPAÑANTE 1", "item": "Rollo de Naylon", "cant": "1" },
    { "cat": "PUERTA LATERAL LADO ACOMPAÑANTE 1", "item": "Lona amarilla", "cant": "1" },
    { "cat": "PUERTA LATERAL LADO ACOMPAÑANTE 2", "item": "Pala ancha", "cant": "2" },
    { "cat": "PUERTA LATERAL LADO ACOMPAÑANTE 2", "item": "Pico grande", "cant": "1" },
    { "cat": "PUERTA LATERAL LADO ACOMPAÑANTE 2", "item": "Masa grande", "cant": "1" },
    { "cat": "PUERTA LATERAL LADO ACOMPAÑANTE 2", "item": "Maniful", "cant": "1" },
    { "cat": "PUERTA LATERAL LADO ACOMPAÑANTE 2", "item": "Tramos manguera 1/2 con acople plástico", "cant": "4" },
    { "cat": "PUERTA LATERAL LADO ACOMPAÑANTE 2", "item": "Manguera azul con acople 1/2 a 3/4", "cant": "1" },
    { "cat": "PUERTA LATERAL LADO ACOMPAÑANTE 2", "item": "Banquetas", "cant": "7" },
    { "cat": "PUESTO DE COMANDO", "item": "Prismáticos (lado 1)", "cant": "1" },
    { "cat": "PUESTO DE COMANDO", "item": "Estación meteorológica (lado 2)", "cant": "1" },
    { "cat": "PUESTO DE COMANDO", "item": "Veleta de estación meteorológica (lado 2)", "cant": "1" },
    { "cat": "PUESTO DE COMANDO", "item": "Sensor T°- H° de estación meteorológica (afuera)", "cant": "1" },
    { "cat": "PUESTO DE COMANDO", "item": "Guía Ciquime (lado 1)", "cant": "1" },
    { "cat": "PUESTO DE COMANDO", "item": "Manual Plan Respuesta Tecnológicas(PRET) (lado 3)", "cant": "1" },
    { "cat": "PUESTO DE COMANDO", "item": "Linterna (afuera)", "cant": "1" },
    { "cat": "PUESTO DE COMANDO", "item": "Radio VHF (afuera)", "cant": "1" },
    { "cat": "PUESTO DE COMANDO", "item": "Pizarra (afuera)", "cant": "1" },
    { "cat": "PUESTO DE COMANDO", "item": "Carpeta gris con archivos, partes de intervención (lado 1)", "cant": "1" },
    { "cat": "PUESTO DE COMANDO", "item": "Matafuego triclase N° 22 de 10 kgs. (afuera)", "cant": "1" },
    { "cat": "ESTANTE A1", "item": "Mini cojín inflable Vetter con cricket y cinta de 10 mts", "cant": "1" },
    { "cat": "ESTANTE A1", "item": "Protector largo de goma", "cant": "1" },
    { "cat": "ESTANTE A1", "item": "Infladores largo Vetter con manguera y cintas amarillas", "cant": "2" },
    { "cat": "ESTANTE A1", "item": "Cricket con cinta de 10 mts.", "cant": "2" },
    { "cat": "ESTANTE A2", "item": "Juego de cojín de drenaje para escapes", "cant": "1" },
    { "cat": "ESTANTE A2", "item": "juego de sistema obturador de fuga de alta presión", "cant": "1" },
    { "cat": "ESTANTE A4", "item": "Juego de cojín de drenaje al vacío con escapes", "cant": "1" },
    { "cat": "CANASTOS", "item": "Inflador Vettes con manguera", "cant": "2" },
    { "cat": "ESTANTE B1", "item": "Voice ducer", "cant": "3" },
    { "cat": "ESTANTE B1", "item": "Base de cargadores con transformador", "cant": "2" },
    { "cat": "ESTANTE B2", "item": "Caja de primeros auxilios", "cant": "1" },
    { "cat": "ESTANTE B4", "item": "Caja con juego de abrazaderas hermetizadoras", "cant": "1" },
    { "cat": "ESTANTE B4", "item": "Caja madera amarilla con Kit para medición de PH", "cant": "1" },
    { "cat": "ESTANTE B5", "item": "Encapsulados grises", "cant": "2" },
    { "cat": "ESTANTE C1", "item": "Mamelucos grises", "cant": "2" },
    { "cat": "ESTANTE C1", "item": "Mamelucos amarrillos", "cant": "7" },
    { "cat": "ESTANTE C1", "item": "Caja de guantes", "cant": "2" },
    { "cat": "ESTANTE C2", "item": "Encapsulados azul", "cant": "4" },
    { "cat": "ESTANTE C3 VERDE", "item": "Pares guantes naranja", "cant": "5" },
    { "cat": "ESTANTE C3 VERDE", "item": "Pares guantes negros", "cant": "7" },
    { "cat": "ESTANTE C3 VERDE", "item": "Par de guantes nitrilo", "cant": "1" },
    { "cat": "ESTANTE C3 VERDE", "item": "Pares guantes verdes", "cant": "6" },
    { "cat": "ESTANTE C3 VERDE", "item": "Pares guantes rojos", "cant": "4" },
    { "cat": "ESTANTE C3 VERDE", "item": "Antiparras y lentes faciales", "cant": "4" },
    { "cat": "ESTANTE C3 ROJO", "item": "Delantales amarillos", "cant": "4" },
    { "cat": "ESTANTE C3 ROJO", "item": "Cintas de papel", "cant": "1" },
    { "cat": "ESTANTE C3 ROJO", "item": "Bolsas resiudos ", "cant": "varios" },
    { "cat": "ESTANTE C4 ROJO", "item": "Llave francesa", "cant": "1" },
    { "cat": "ESTANTE C4 ROJO", "item": "Llave still grande", "cant": "1" },
    { "cat": "ESTANTE C4 ROJO", "item": "Cuñas madera y bronce", "cant": "1" },
    { "cat": "ESTANTE C4 ROJO", "item": "Bolsa con bulones (ox)", "cant": "1" },
    { "cat": "ESTANTE C4 AZUL", "item": "Mascaras para cartucho y semi cartuchos", "cant": "9" },
    { "cat": "ESTANTE C4 AZUL", "item": "Serrucho", "cant": "1" },
    { "cat": "PISO", "item": "Pares de botas naranjas para clase A", "cant": "6" },
    { "cat": "PISO", "item": "Canasto rojo: cuñas madera, cuñas bronce y masa grande", "cant": "1" },
    { "cat": "ESPACIO LIBRE", "item": "Grupo electrógeno ", "cant": "1" },
    { "cat": "LATERAL INTERIOR LADO CHOFER", "item": "Equipos autónomos completos", "cant": "8" },
    { "cat": "LATERAL INTERIOR LADO CHOFER", "item": "Tubos de repuesto", "cant": "1" },
    { "cat": "LATERAL INTERIOR LADO CHOFER", "item": "Recipientes para lavado azul", "cant": "2" },
    { "cat": "LATERAL INTERIOR LADO CHOFER", "item": "Encapsulados clase A naranjas", "cant": "6" },
    { "cat": "LATERAL INTERIOR LADO CHOFER", "item": "Encapsulados clase azules", "cant": "2" },
    { "cat": "LATERAL INTERIOR LADO CHOFER", "item": "Tambor blanco", "cant": "1" },
    { "cat": "LATERAL INTERIOR LADO CHOFER", "item": "Tambor con absorvente", "cant": "1" },
    { "cat": "GENERADOR", "item": "Nivel de combustible", "tipo": "combustible", "cant": "N/A" },
    { "cat": "GENERADOR", "item": "Estado del combustible", "cant": "N/A" },
    { "cat": "GENERADOR", "item": "Nivel de aceite", "cant": "N/A" },
    { "cat": "GENERADOR", "item": "Estado del aceite", "cant": "N/A" },
    { "cat": "GENERADOR", "item": "Limpieza de filtro de aire", "cant": "N/A" },
    { "cat": "GENERADOR", "item": "Estado de bujia", "cant": "N/A" },
    { "cat": "GENERADOR", "item": "Puesta en marcha", "cant": "N/A" },
    { "cat": "GENERADOR", "item": "Estado de enchufes", "cant": "N/A" },
    { "cat": "GENERADOR", "item": "Mantenimiento general", "cant": "N/A" },
    { "cat": "GENERADOR", "item": "Limpieza", "cant": "N/A" },
    { "cat": "IODIN DE PIE N1", "item": "Estado de iodin", "cant": "N/A" },
    { "cat": "IODIN DE PIE N1", "item": "Estado de enchufes", "cant": "N/A" },
    { "cat": "IODIN DE PIE N1", "item": "Estado de tripode", "cant": "N/A" },
    { "cat": "IODIN DE PIE N1", "item": "Limpieza", "cant": "N/A" },
    { "cat": "IODIN DE PIE N1", "item": "Prueba de encendido", "cant": "N/A" },
    { "cat": "IODIN DE PIE N2", "item": "Estado de iodin", "cant": "N/A" },
    { "cat": "IODIN DE PIE N2", "item": "Estado de enchufes", "cant": "N/A" },
    { "cat": "IODIN DE PIE N2", "item": "Estado de tripode", "cant": "N/A" },
    { "cat": "IODIN DE PIE N2", "item": "Limpieza", "cant": "N/A" },
    { "cat": "IODIN DE PIE N2", "item": "Prueba de encendido", "cant": "N/A" },
    { "cat": "IODIN DE PIE N3", "item": "Estado de iodin", "cant": "N/A" },
    { "cat": "IODIN DE PIE N3", "item": "Estado de enchufes", "cant": "N/A" },
    { "cat": "IODIN DE PIE N3", "item": "Estado de tripode", "cant": "N/A" },
    { "cat": "IODIN DE PIE N3", "item": "Limpieza", "cant": "N/A" },
    { "cat": "IODIN DE PIE N3", "item": "Prueba de encendido", "cant": "N/A" },
    { "cat": "IODIN DE PIE N4", "item": "Estado de iodin", "cant": "N/A" },
    { "cat": "IODIN DE PIE N4", "item": "Estado de enchufes", "cant": "N/A" },
    { "cat": "IODIN DE PIE N4", "item": "Estado de tripode", "cant": "N/A" },
    { "cat": "IODIN DE PIE N4", "item": "Limpieza", "cant": "N/A" },
    { "cat": "IODIN DE PIE N4", "item": "Prueba de encendido", "cant": "N/A" },
];

// MATERIALES U-8
const CONTROLES_U8_MAT = [
    { "cat": "PRIMER PERSIANA LADO CHOFER", "item": "Equipos autónomos", "cant": "7" },
    { "cat": "PRIMER PERSIANA LADO CHOFER", "item": "Tubos de repuestos", "cant": "6" },
    { "cat": "PRIMER PERSIANA LADO CHOFER", "item": "Extintores", "cant": "1" },
    { "cat": "SEGUNDA PERSIANA LADO CHOFER", "item": "Devanador", "cant": "1" },
    { "cat": "SEGUNDA PERSIANA LADO CHOFER", "item": "Lanza NE-PI-RO en devavanador", "cant": "1" },
    { "cat": "SEGUNDA PERSIANA LADO CHOFER", "item": "Llave unión", "cant": "2" },
    { "cat": "SEGUNDA PERSIANA LADO CHOFER", "item": "Lanza de cortina de agua de 2 1/2\"", "cant": "1" },
    { "cat": "SEGUNDA PERSIANA LADO CHOFER", "item": "Gemelo de 2 1/2\" a 1 1/2\"", "cant": "1" },
    { "cat": "SEGUNDA PERSIANA LADO CHOFER", "item": "Manija de devanador", "cant": "1" },
    { "cat": "SEGUNDA PERSIANA LADO CHOFER", "item": "Tramos de manguera de 1 1/2\" en rollo", "cant": "2" },
    { "cat": "SEGUNDA PERSIANA LADO CHOFER", "item": "Tramos de manguera de 2 1/2\" en rollo", "cant": "1" },
    { "cat": "SEGUNDA PERSIANA LADO CHOFER", "item": "Tramos de manguera de 1 1/2\" en estiba", "cant": "3" },
    { "cat": "SEGUNDA PERSIANA LADO CHOFER", "item": "Tramos de manguera de 2 1/2\" en estiba", "cant": "2" },
    { "cat": "SEGUNDA PERSIANA LADO CHOFER", "item": "Lanza Elkhart de 1 1/2\" ", "cant": "1" },
    { "cat": "SEGUNDA PERSIANA LADO CHOFER", "item": "Lanza Elkhartde 1 1/2\" en estiba", "cant": "1" },
    { "cat": "SEGUNDA PERSIANA LADO CHOFER", "item": "Lanza Protek de 2 1/2\" en estiba", "cant": "1" },
    { "cat": "BOMBA", "item": "Reducción Storz de 2 1/2\" a 1 1/2\"", "cant": "2" },
    { "cat": "PRIMER PERSIANA LADO ACOMPAÑANTE", "item": "Columna de llave interna", "cant": "1" },
    { "cat": "PRIMER PERSIANA LADO ACOMPAÑANTE", "item": "Columna de llave externa", "cant": "1" },
    { "cat": "PRIMER PERSIANA LADO ACOMPAÑANTE", "item": "Llave de columna externa", "cant": "1" },
    { "cat": "PRIMER PERSIANA LADO ACOMPAÑANTE", "item": "Barreta grande", "cant": "1" },
    { "cat": "PRIMER PERSIANA LADO ACOMPAÑANTE", "item": "Halligan", "cant": "1" },
    { "cat": "PRIMER PERSIANA LADO ACOMPAÑANTE", "item": "Pinza corta candado", "cant": "1" },
    { "cat": "PRIMER PERSIANA LADO ACOMPAÑANTE", "item": "Pala de punta", "cant": "1" },
    { "cat": "PRIMER PERSIANA LADO ACOMPAÑANTE", "item": "Hacha grande", "cant": "1" },
    { "cat": "PRIMER PERSIANA LADO ACOMPAÑANTE", "item": "Hacha chica", "cant": "1" },
    { "cat": "PRIMER PERSIANA LADO ACOMPAÑANTE", "item": "Pescador", "cant": "1" },
    { "cat": "PRIMER PERSIANA LADO ACOMPAÑANTE", "item": "Pertiga", "cant": "1" },
    { "cat": "PRIMER PERSIANA LADO ACOMPAÑANTE", "item": "Motobomba Honda", "cant": "1" },
    { "cat": "PRIMER PERSIANA LADO ACOMPAÑANTE", "item": "Pico", "cant": "1" },
    { "cat": "PRIMER PERSIANA LADO ACOMPAÑANTE", "item": "Arresta llama", "cant": "1" },
    { "cat": "PRIMER PERSIANA LADO ACOMPAÑANTE", "item": "Tramos de mangueras de 2 1/2\" en rollos", "cant": "1" },
    { "cat": "PRIMER PERSIANA LADO ACOMPAÑANTE", "item": " Chaleco de extricación ", "cant": "1" },
    { "cat": "PRIMER PERSIANA LADO ACOMPAÑANTE", "item": "Bolso de trauma", "cant": "1" },
    { "cat": "PRIMER PERSIANA LADO ACOMPAÑANTE (CAJON 1)", "item": "Filtro de 5”", "cant": "1" },
    { "cat": "PRIMER PERSIANA LADO ACOMPAÑANTE (CAJON 2)", "item": "Maza", "cant": "1" },
    { "cat": "PRIMER PERSIANA LADO ACOMPAÑANTE (CAJON 2)", "item": "Corta fierro", "cant": "1" },
    { "cat": "PRIMER PERSIANA LADO ACOMPAÑANTE (CAJON 2)", "item": "Lanza Elkhart de 11/2\"", "cant": "1" },
    { "cat": "PRIMER PERSIANA LADO ACOMPAÑANTE (CAJON 3)", "item": "Adaptador hembra bombero a 2 1/2\" storz", "cant": "2" },
    { "cat": "PRIMER PERSIANA LADO ACOMPAÑANTE (CAJON 3)", "item": "Adaptador macho bombero a 2 1/2\" storz", "cant": "2" },
    { "cat": "PRIMER PERSIANA LADO ACOMPAÑANTE (CAJON 3)", "item": "Cinta de peligro", "cant": "1" },
    { "cat": " PRIMER PERSIANA LADO ACOMPAÑANTE (CAJON 3)", "item": "Adaptador para succíon motobomba", "cant": "1" },
    { "cat": " PRIMER PERSIANA LADO ACOMPAÑANTE (CAJON 3)", "item": "Llave storz 1 1/2\"; 2 1/2\"", "cant": "1" },
    { "cat": "PRIMER PERSIANA LADO ACOMPAÑANTE (CAJON 4)", "item": "Pinza", "cant": "1" },
    { "cat": "PRIMER PERSIANA LADO ACOMPAÑANTE (CAJON 4)", "item": "Alicate", "cant": "1" },
    { "cat": "PRIMER PERSIANA LADO ACOMPAÑANTE (CAJON 4)", "item": "Lápiz detector de tensión", "cant": "1" },
    { "cat": "PRIMER PERSIANA LADO ACOMPAÑANTE (CAJON 4)", "item": "Guantes de R.E", "cant": "1" },
    { "cat": "PRIMER PERSIANA LADO ACOMPAÑANTE (CAJON 4)", "item": "Guantes de vaqueta", "cant": "1" },
    { "cat": "BOLSO DE TRAUMA", "item": "Resucitador manual", "cant": "1" },
    { "cat": "BOLSO DE TRAUMA", "item": "Collarín", "cant": "1" },
    { "cat": "BOLSO DE TRAUMA", "item": "Frazadas", "cant": "2" },
    { "cat": "BOLSO DE TRAUMA", "item": "Tubo de Oxigeno", "cant": "1" },
    { "cat": "BOLSO DE TRAUMA", "item": "Cutter", "cant": "2" },
    { "cat": "BOLSO DE TRAUMA", "item": "Platsul", "cant": "1" },
    { "cat": "BOLSO DE TRAUMA", "item": "Gasas", "cant": "10" },
    { "cat": "BOLSO DE TRAUMA", "item": "Cinta Adhesiva", "cant": "2" },
    { "cat": "BOLSO DE TRAUMA", "item": "Rollo de venda", "cant": "4" },
    { "cat": "BOLSO DE TRAUMA", "item": "Guantes", "cant": "varios" },
    { "cat": "BOLSO DE TRAUMA", "item": "Apósitos", "cant": "10" },
    { "cat": "BOLSO DE TRAUMA", "item": "Gasas chicas ", "cant": "varios" },
    { "cat": "BOLSO DE TRAUMA", "item": "Pomada", "cant": "1" },
    { "cat": "BOLSO DE TRAUMA", "item": "Agua Oxigenada", "cant": "1" },
    { "cat": "BOLSO DE TRAUMA", "item": "Alcohol", "cant": "1" },
    { "cat": "BOLSO DE TRAUMA", "item": "Pervinox", "cant": "1" },
    { "cat": "BOLSO DE TRAUMA", "item": "Jabón Líquido Pervinox", "cant": "1" },
    { "cat": "BOLSO DE TRAUMA", "item": "Apósitos", "cant": "Varios" },
    { "cat": "SEGUNDA PERSIANA LADO ACOMPAÑANTE", "item": "Devanador", "cant": "1" },
    { "cat": "SEGUNDA PERSIANA LADO ACOMPAÑANTE", "item": "Lanza NE-PI-RO en devanador", "cant": "1" },
    { "cat": "SEGUNDA PERSIANA LADO ACOMPAÑANTE", "item": "Llaves union", "cant": "2" },
    { "cat": "SEGUNDA PERSIANA LADO ACOMPAÑANTE", "item": "Manija de devanador", "cant": "1" },
    { "cat": "SEGUNDA PERSIANA LADO ACOMPAÑANTE", "item": "Tramos de mangueras de 2 1/2\" en rollos", "cant": "1" },
    { "cat": "SEGUNDA PERSIANA LADO ACOMPAÑANTE", "item": "Tramos de mangueras de 1 1/2\" en rollos", "cant": "2" },
    { "cat": "SEGUNDA PERSIANA LADO ACOMPAÑANTE", "item": "Lanzas de cortina de agua de 1 1/2\"", "cant": "2" },
    { "cat": "SEGUNDA PERSIANA LADO ACOMPAÑANTE", "item": "Gemelo de 2 1/2\"", "cant": "1" },
    { "cat": "SEGUNDA PERSIANA LADO ACOMPAÑANTE", "item": "Tramos de mangueras de 1 1/2\" en estiba", "cant": "3" },
    { "cat": "SEGUNDA PERSIANA LADO ACOMPAÑANTE", "item": "Lanza Elkhart de 1 1/2\" en estiba", "cant": "1" },
    { "cat": "SEGUNDA PERSIANA LADO ACOMPAÑANTE", "item": "Tramos de mangueras de 2 1/2\" en estiba", "cant": "2" },
    { "cat": "SEGUNDA PERSIANA LADO ACOMPAÑANTE", "item": "Lanza Elkhart de 2 1/2\" en estiba", "cant": "1" },
    { "cat": "ASIENTO DOBLE CABINA ", "item": "Manija para cambiar rueda con mango", "cant": "1" },
    { "cat": "ASIENTO DOBLE CABINA ", "item": "Llave storz de 5\"", "cant": "1" },
    { "cat": "ASIENTO DOBLE CABINA ", "item": "Estilson", "cant": "1" },
    { "cat": "ASIENTO DOBLE CABINA ", "item": "Barreta mediana", "cant": "1" },
    { "cat": "ASIENTO DOBLE CABINA ", "item": "Llave para sacar tapón del carter", "cant": "1" },
    { "cat": "ASIENTO DOBLE CABINA ", "item": "Llave boca-anillo 11/8", "cant": "1" },
    { "cat": "ASIENTO DOBLE CABINA ", "item": "Barreta chica", "cant": "1" },
    { "cat": "TECHO ", "item": "Escalera", "cant": "1" },
    { "cat": "TECHO ", "item": "Bichero", "cant": "1" },
    { "cat": "TECHO ", "item": "Tabla Larga", "cant": "1" },
    { "cat": "TECHO ", "item": "Monitor Portatil", "cant": "1" },
    { "cat": "TECHO ", "item": "Manguerote de 2 1/2\"", "cant": "1" },
    { "cat": "TECHO ", "item": "Escalera", "cant": "1" },
    { "cat": "TECHO ", "item": "Manguerote de 5\"", "cant": "1" },
    { "cat": "TECHO ", "item": "Manguerote de 3\" con filtro", "cant": "1" },
    { "cat": "MOTO BOMBA", "item": "Nivel de combustible", "tipo": "combustible", "cant": "N/A" },
    { "cat": "MOTO BOMBA", "item": "Estado del combustible", "cant": "N/A" },
    { "cat": "MOTO BOMBA", "item": "Nivel de aceite", "cant": "N/A" },
    { "cat": "MOTO BOMBA", "item": "Estado del aceite", "cant": "N/A" },
    { "cat": "MOTO BOMBA", "item": "Limpieza de filtro de aire", "cant": "N/A" },
    { "cat": "MOTO BOMBA", "item": "Perdidas en válvulas", "cant": "N/A" },
    { "cat": "MOTO BOMBA", "item": "Válvula de retencíon", "cant": "N/A" },
    { "cat": "MOTO BOMBA", "item": "Retención", "cant": "N/A" },
    { "cat": "MOTO BOMBA", "item": "Estado de acoples", "cant": "N/A" },
    { "cat": "MOTO BOMBA", "item": "Estado de manguerotes", "cant": "N/A" },
    { "cat": "MOTO BOMBA", "item": "Estado de filtro del manguerote", "cant": "N/A" },
    { "cat": "MOTO BOMBA", "item": "Puesta en marcha", "cant": "N/A" },
    { "cat": "MOTO BOMBA", "item": "Perdida en sello aceptable", "cant": "N/A" },
    { "cat": "MOTO BOMBA", "item": "Tiempo de aspiración", "cant": "N/A" },
    { "cat": "MOTO BOMBA", "item": "Mantenimiento general", "cant": "N/A" },
    { "cat": "MOTO BOMBA", "item": "Limpieza", "cant": "N/A" },
    { "cat": "EQUIPO AUTONOMO N1", "item": "Presión de aire respirable", "cant": "N/A" },
    { "cat": "EQUIPO AUTONOMO N1", "item": "Máscara facial completa", "cant": "N/A" },
    { "cat": "EQUIPO AUTONOMO N1", "item": "Estado de válvula y acople", "cant": "N/A" },
    { "cat": "EQUIPO AUTONOMO N1", "item": "Estado de reguladoras", "cant": "N/A" },
    { "cat": "EQUIPO AUTONOMO N1", "item": "Mangueras ", "cant": "N/A" },
    { "cat": "EQUIPO AUTONOMO N1", "item": "Arnés y ganchos", "cant": "N/A" },
    { "cat": "EQUIPO AUTONOMO N1", "item": "Prueba de funcionamiento", "cant": "N/A" },
    { "cat": "EQUIPO AUTONOMO N1", "item": "Alarma de equipo", "cant": "N/A" },
    { "cat": "EQUIPO AUTONOMO N1", "item": "Manómetros", "cant": "N/A" },
    { "cat": "EQUIPO AUTONOMO N1", "item": " Estado del Visor", "cant": "N/A" },
    { "cat": "EQUIPO AUTONOMO N2", "item": "Presión de aire respirable", "cant": "N/A" },
    { "cat": "EQUIPO AUTONOMO N2", "item": "Máscara facial completa", "cant": "N/A" },
    { "cat": "EQUIPO AUTONOMO N2", "item": "Estado de válvula y acople", "cant": "N/A" },
    { "cat": "EQUIPO AUTONOMO N2", "item": "Estado de reguladoras", "cant": "N/A" },
    { "cat": "EQUIPO AUTONOMO N2", "item": "Mangueras ", "cant": "N/A" },
    { "cat": "EQUIPO AUTONOMO N2", "item": "Arnés y ganchos", "cant": "N/A" },
    { "cat": "EQUIPO AUTONOMO N2", "item": "Prueba de funcionamiento", "cant": "N/A" },
    { "cat": "EQUIPO AUTONOMO N2", "item": "Alarma de equipo", "cant": "N/A" },
    { "cat": "EQUIPO AUTONOMO N2", "item": "Manómetros", "cant": "N/A" },
    { "cat": "EQUIPO AUTONOMO N2", "item": " Estado del Visor", "cant": "N/A" },
    { "cat": "EQUIPO AUTONOMO N3", "item": "Presión de aire respirable", "cant": "N/A" },
    { "cat": "EQUIPO AUTONOMO N3", "item": "Máscara facial completa", "cant": "N/A" },
    { "cat": "EQUIPO AUTONOMO N3", "item": "Estado de válvula y acople", "cant": "N/A" },
    { "cat": "EQUIPO AUTONOMO N3", "item": "Estado de reguladoras", "cant": "N/A" },
    { "cat": "EQUIPO AUTONOMO N3", "item": "Mangueras ", "cant": "N/A" },
    { "cat": "EQUIPO AUTONOMO N3", "item": "Arnés y ganchos", "cant": "N/A" },
    { "cat": "EQUIPO AUTONOMO N3", "item": "Prueba de funcionamiento", "cant": "N/A" },
    { "cat": "EQUIPO AUTONOMO N3", "item": "Alarma de equipo", "cant": "N/A" },
    { "cat": "EQUIPO AUTONOMO N3", "item": "Manómetros", "cant": "N/A" },
    { "cat": "EQUIPO AUTONOMO N3", "item": " Estado del Visor", "cant": "N/A" },
    { "cat": "EQUIPO AUTONOMO N4", "item": "Presión de aire respirable", "cant": "N/A" },
    { "cat": "EQUIPO AUTONOMO N4", "item": "Máscara facial completa", "cant": "N/A" },
    { "cat": "EQUIPO AUTONOMO N4", "item": "Estado de válvula y acople", "cant": "N/A" },
    { "cat": "EQUIPO AUTONOMO N4", "item": "Estado de reguladoras", "cant": "N/A" },
    { "cat": "EQUIPO AUTONOMO N4", "item": "Mangueras ", "cant": "N/A" },
    { "cat": "EQUIPO AUTONOMO N4", "item": "Arnés y ganchos", "cant": "N/A" },
    { "cat": "EQUIPO AUTONOMO N4", "item": "Prueba de funcionamiento", "cant": "N/A" },
    { "cat": "EQUIPO AUTONOMO N4", "item": "Alarma de equipo", "cant": "N/A" },
    { "cat": "EQUIPO AUTONOMO N4", "item": "Manómetros", "cant": "N/A" },
    { "cat": "EQUIPO AUTONOMO N4", "item": " Estado del Visor", "cant": "N/A" },
    { "cat": "TUBO DE REPUESTO N5", "item": "Presión de aire respirable", "cant": "N/A" },
    { "cat": "TUBO DE REPUESTO N5", "item": "Estado de manómetro", "cant": "N/A" },
    { "cat": "TUBO DE REPUESTO N5", "item": "Estado de entrada de aire ", "cant": "N/A" },
    { "cat": "TUBO DE REPUESTO N5", "item": "Fecha de vencimiento de PH", "cant": "N/A" },
    { "cat": "TUBO DE REPUESTO N6", "item": "Presión de aire respirable", "cant": "N/A" },
    { "cat": "TUBO DE REPUESTO N6", "item": "Estado de manómetro", "cant": "N/A" },
    { "cat": "TUBO DE REPUESTO N6", "item": "Estado de entrada de aire ", "cant": "N/A" },
    { "cat": "TUBO DE REPUESTO N6", "item": "Fecha de vencimiento de PH", "cant": "N/A" },
    { "cat": "TUBO DE REPUESTO N7", "item": "Presión de aire respirable", "cant": "N/A" },
    { "cat": "TUBO DE REPUESTO N7", "item": "Estado de manómetro", "cant": "N/A" },
    { "cat": "TUBO DE REPUESTO N7", "item": "Estado de entrada de aire ", "cant": "N/A" },
    { "cat": "TUBO DE REPUESTO N7", "item": "Fecha de vencimiento de PH", "cant": "N/A" },
    { "cat": "TUBO DE REPUESTO N8", "item": "Presión de aire respirable", "cant": "N/A" },
    { "cat": "TUBO DE REPUESTO N8", "item": "Estado de manómetro", "cant": "N/A" },
    { "cat": "TUBO DE REPUESTO N8", "item": "Estado de entrada de aire ", "cant": "N/A" },
    { "cat": "TUBO DE REPUESTO N8", "item": "Fecha de vencimiento de PH", "cant": "N/A" },];

const CONTROLES_U9_MAT = [{ "cat": "PRIMER PERSIANA LADO CHOFER", "item": "Comando, reguladora de minicojines", "cant": "1" },
{ "cat": "PRIMER PERSIANA LADO CHOFER", "item": "Sierra sable a bateria", "cant": "1" },
{ "cat": "PRIMER PERSIANA LADO CHOFER", "item": "Minicojines", "cant": "2" },
{ "cat": "PRIMER PERSIANA LADO CHOFER", "item": "Protectores de minicojines", "cant": "2" },
{ "cat": "PRIMER PERSIANA LADO CHOFER", "item": "Hi Lift", "cant": "2" },
{ "cat": "PRIMER PERSIANA LADO CHOFER", "item": "Rotopercutor", "cant": "1" },
{ "cat": "PRIMER PERSIANA LADO CHOFER", "item": "Amoladora", "cant": "1" },
{ "cat": "SEGUNDA PERSIANA LADO CHOFER", "item": "Bolso cinta Verde", "cant": "1" },
{ "cat": "SEGUNDA PERSIANA LADO CHOFER", "item": "Bolso cinta Roja", "cant": "1" },
{ "cat": "SEGUNDA PERSIANA LADO CHOFER", "item": "Bolso cinta Azul", "cant": "1" },
{ "cat": "SEGUNDA PERSIANA LADO CHOFER", "item": "Bolos cintas Amarrillas", "cant": "1" },
{ "cat": "SEGUNDA PERSIANA LADO CHOFER", "item": "Mochila con cintas", "cant": "1" },
{ "cat": "SEGUNDA PERSIANA LADO CHOFER", "item": "Bolsos con cuerdas", "cant": "4" },
{ "cat": "SEGUNDA PERSIANA LADO CHOFER", "item": "Manija devanador", "cant": "1" },
{ "cat": "SEGUNDA PERSIANA LADO CHOFER", "item": "Devanador con lanza protek", "cant": "1" },
{ "cat": "SEGUNDA PERSIANA LADO CHOFER", "item": "Extintor", "cant": "1" },
{ "cat": "TERCER PERSIANA LADO CHOFER", "item": "Tacos", "cant": "17" },
{ "cat": "TERCER PERSIANA LADO CHOFER", "item": "Tacos escalonados", "cant": "5" },
{ "cat": "TERCER PERSIANA LADO CHOFER", "item": "Cuñas", "cant": "4" },
{ "cat": "TERCER PERSIANA LADO CHOFER", "item": "Tramos de 1 1/2", "cant": "2" },
{ "cat": "TERCER PERSIANA LADO CHOFER", "item": "Estiba de 1 ½ con lanza Elkhart 1 ½ ", "cant": "1" },
{ "cat": "TERCER PERSIANA LADO CHOFER", "item": "Propack", "cant": "1" },
{ "cat": "TERCER PERSIANA LADO CHOFER", "item": " Grilletes chicos", "cant": "4" },
{ "cat": "TERCER PERSIANA LADO CHOFER", "item": "Grilletes grandes", "cant": "4" },
{ "cat": "TERCER PERSIANA LADO CHOFER", "item": "Lingas", "cant": "3" },
{ "cat": "TERCER PERSIANA LADO CHOFER", "item": "Fajas con crique tensor y linga boa ", "cant": "3" },
{ "cat": "TERCER PERSIANA LADO CHOFER", "item": "Conos", "cant": "5" },
{ "cat": "TERCER PERSIANA LADO CHOFER", "item": "Baliza de conos", "cant": "5" },
{ "cat": "TERCER PERSIANA LADO CHOFER", "item": "Tramos en estiba", "cant": "2" },
{ "cat": "PRIMER PERSIANA LADO ACOMPAÑANTE", "item": "Sierra de mano", "cant": "2" },
{ "cat": "PRIMER PERSIANA LADO ACOMPAÑANTE", "item": "Corta candado", "cant": "1" },
{ "cat": "PRIMER PERSIANA LADO ACOMPAÑANTE", "item": "Hacha grande", "cant": "1" },
{ "cat": "PRIMER PERSIANA LADO ACOMPAÑANTE", "item": "Hacha chica", "cant": "1" },
{ "cat": "PRIMER PERSIANA LADO ACOMPAÑANTE", "item": "Masa", "cant": "1" },
{ "cat": "PRIMER PERSIANA LADO ACOMPAÑANTE", "item": "Barreta", "cant": "1" },
{ "cat": "PRIMER PERSIANA LADO ACOMPAÑANTE", "item": "Corta cable", "cant": "1" },
{ "cat": "PRIMER PERSIANA LADO ACOMPAÑANTE", "item": "Halligan", "cant": "1" },
{ "cat": "PRIMER PERSIANA LADO ACOMPAÑANTE", "item": "Tacho de residuos biologicos", "cant": "1" },
{ "cat": "PRIMER PERSIANA LADO ACOMPAÑANTE", "item": "Cobijas", "cant": "5" },
{ "cat": "PRIMER PERSIANA LADO ACOMPAÑANTE", "item": "Bolso trauma", "cant": "1" },
{ "cat": "PRIMER PERSIANA LADO ACOMPAÑANTE", "item": "Pala", "cant": "2" },
{ "cat": "PRIMER PERSIANA LADO ACOMPAÑANTE", "item": "Escobillón", "cant": "2" },
{ "cat": "PRIMER PERSIANA LADO ACOMPAÑANTE", "item": "Bidon de 5L", "cant": "1" },
{ "cat": "PRIMER PERSIANA LADO ACOMPAÑANTE", "item": "Pértiga", "cant": "1" },
{ "cat": "PRIMER PERSIANA LADO ACOMPAÑANTE", "item": "Holmatro", "cant": "1" },
{ "cat": "PRIMER PERSIANA LADO ACOMPAÑANTE", "item": "Mangueras hidráulicas", "cant": "1" },
{ "cat": "PRIMER PERSIANA LADO ACOMPAÑANTE", "item": "Lona amarilla", "cant": "1" },
{ "cat": "PRIMER PERSIANA LADO ACOMPAÑANTE", "item": "Expansor", "cant": "1" },
{ "cat": "PRIMER PERSIANA LADO ACOMPAÑANTE", "item": "Cizalla grande", "cant": "1" },
{ "cat": "SEGUNDA PERSIANA LADO ACOMPAÑANTE", "item": "Devanador con lanza protek de 1 1/2", "cant": "1" },
{ "cat": "SEGUNDA PERSIANA LADO ACOMPAÑANTE", "item": "Manija devanador", "cant": "1" },
{ "cat": "SEGUNDA PERSIANA LADO ACOMPAÑANTE", "item": "Multipropósito", "cant": "1" },
{ "cat": "SEGUNDA PERSIANA LADO ACOMPAÑANTE", "item": "Rams", "cant": "2" },
{ "cat": "TERCER PERSIANA LADO CHOFER", "item": "Tablas raqui larga", "cant": "4" },
{ "cat": "TERCER PERSIANA LADO CHOFER", "item": "Tablas raqui corta", "cant": "2" },
{ "cat": "TERCER PERSIANA LADO CHOFER", "item": "Tablas raqui de madera", "cant": "3" },
{ "cat": "TERCER PERSIANA LADO CHOFER", "item": "Estabilizadores vehicular", "cant": "4" },
{ "cat": "TERCER PERSIANA LADO CHOFER", "item": "Inmovilizadores latero cervical", "cant": "4" },
{ "cat": "TERCER PERSIANA LADO CHOFER", "item": "Chaleco de extricación adulto", "cant": "2" },
{ "cat": "TERCER PERSIANA LADO CHOFER", "item": " Chaleco de extricación pediatrico", "cant": "2" },
{ "cat": "TERCER PERSIANA LADO CHOFER", "item": "Férulas largas", "cant": "3" },
{ "cat": "TERCER PERSIANA LADO CHOFER", "item": "Férulas cortas", "cant": "2" },
{ "cat": "ZONA CENTRAL", "item": "Camilla canasto", "cant": "1" },
{ "cat": "ZONA CENTRAL", "item": "Escobillón", "cant": "4" },
{ "cat": "ZONA CENTRAL", "item": "Bidon de combustible", "cant": "1" },
{ "cat": "ZONA CENTRAL", "item": "Camilla Sked", "cant": "1" },
{ "cat": "ZONA CENTRAL", "item": "Juguetes", "cant": "1" },
{ "cat": "ZONA CENTRAL", "item": "Frazadas", "cant": "2" },
{ "cat": "ZONA CENTRAL", "item": "Pértiga", "cant": "1" },
{ "cat": "CABINA", "item": "Francesa chica", "cant": "1" },
{ "cat": "CABINA", "item": "Pinza", "cant": "1" },
{ "cat": "CABINA", "item": "Tenaza", "cant": "1" },
{ "cat": "CABINA", "item": "Llave bujia", "cant": "1" },
{ "cat": "CABINA", "item": "Llave acople", "cant": "2" },
{ "cat": "CABINA", "item": "Corta fierro", "cant": "1" },
{ "cat": "CABINA", "item": "Barretin", "cant": "1" },
{ "cat": "CABINA", "item": "Rompe cristal", "cant": "2" },
{ "cat": "CABINA", "item": "Cinta de peligro", "cant": "2" },
{ "cat": "CABINA", "item": "Guia de respuesta ante emergencias", "cant": "1" },
{ "cat": "CABINA", "item": "Manual búsqueda y rescate", "cant": "1" },
{ "cat": "CABINA", "item": "Linterna", "cant": "1" },
{ "cat": "CABINA", "item": "Casco de rescate", "cant": "7" },
{ "cat": "CABINA", "item": "Riesgo eléctrico", "cant": "1" },
{ "cat": "CABINA", "item": "Chalecos reflectaríos", "cant": "4" },
{ "cat": "CABINA", "item": "Torre de iluminación", "cant": "1" },
{ "cat": "CABINA", "item": "Puntales", "cant": "4" },
{ "cat": "CABINA", "item": "Mamelucos", "cant": "4" },
{ "cat": "CABINA", "item": "Vientos", "cant": "4" },
{ "cat": "TECHO", "item": "Escalera", "cant": "1" },
{ "cat": "BOMBA", "item": "Reducción stor de 2 ½ a 1 ½ ", "cant": "1" },
{ "cat": "BOLSO DE TRAUMA", "item": "Collarín plano regulable adultos", "cant": "4" },
{ "cat": "BOLSO DE TRAUMA", "item": " Collarín plano fijo adultos ", "cant": "2" },
{ "cat": "BOLSO DE TRAUMA", "item": "Collarín plano regulable pediátrico", "cant": "1" },
{ "cat": "BOLSO DE TRAUMA", "item": "Collarín plano fijo pediátrico", "cant": "1" },
{ "cat": "BOLSO DE TRAUMA", "item": "BVM adulto", "cant": "1" },
{ "cat": "BOLSO DE TRAUMA", "item": "BVM pediátrico", "cant": "1" },
{ "cat": "BOLSO DE TRAUMA", "item": "Manta ignifuga", "cant": "1" },
{ "cat": "BOLSO DE TRAUMA", "item": "Guantes", "cant": "varios" },
{ "cat": "BOLSO DE TRAUMA", "item": "Tubo de Oxigeno", "cant": "1" },
{ "cat": "BOLSO DE TRAUMA", "item": "Frazadas", "cant": "1" },
{ "cat": "BOLSO DE TRAUMA", "item": "Oxímetro de pulso", "cant": "1" },
{ "cat": "BOLSO DE TRAUMA", "item": "Tijeras", "cant": "2" },
{ "cat": "BOLSO DE TRAUMA", "item": "Corta cinturón", "cant": "4" },
{ "cat": "BOLSO DE TRAUMA", "item": "Rompe cristal", "cant": "1" },
{ "cat": "BOLSO DE TRAUMA", "item": "Apósitos grandes", "cant": "2" },
{ "cat": "BOLSO DE TRAUMA", "item": "Apósitos chicos", "cant": "1" },
{ "cat": "BOLSO DE TRAUMA", "item": "Cinta", "cant": "2" },
{ "cat": "BOLSO DE TRAUMA", "item": "Palillos para entablillar", "cant": "3" },
{ "cat": "BOLSO DE TRAUMA", "item": "Guantes", "cant": "Varios" },
{ "cat": "BOLSO DE TRAUMA", "item": "Barbijos", "cant": "4" },
{ "cat": "BOLSO DE TRAUMA", "item": "Protector ocular", "cant": "4" },
{ "cat": "BOLSO DE TRAUMA", "item": "Cinta impermeable", "cant": "1" },
{ "cat": "BOLSO DE TRAUMA", "item": "Apósitos", "cant": "Varios" },
{ "cat": "BOLSO DE TRAUMA", "item": "Vendas", "cant": "Varios" },
{ "cat": "BOLSO DE TRAUMA", "item": "Alcohol", "cant": "1" },
{ "cat": "BOLSO DE TRAUMA", "item": "Solución fisiológica", "cant": "Varias" },
{ "cat": "BOLSO DE TRAUMA", "item": "Cánula orofaríngea", "cant": "6" },
{ "cat": "TUBO DE OXIGENO", "item": "Presión del tubo", "cant": "N/A" },
{ "cat": "TUBO DE OXIGENO", "item": "Estado del manómetro", "cant": "N/A" },
{ "cat": "TUBO DE OXIGENO", "item": "Estado de manguera para mascara", "cant": "N/A" },
{ "cat": "TUBO DE OXIGENO", "item": "Estado de mascara", "cant": "N/A" },
{ "cat": "TUBO DE OXIGENO", "item": "Prueba hidráulica", "cant": "N/A" },
{ "cat": "TUBO DE OXIGENO", "item": "Limpieza", "cant": "N/A" },
{ "cat": "HOLMATRO", "item": "Nivel de combustible", "cant": "N/A" },
{ "cat": "HOLMATRO", "item": "Estado del combustible", "cant": "N/A" },
{ "cat": "HOLMATRO", "item": "Nivel de aceite de motor", "cant": "N/A" },
{ "cat": "HOLMATRO", "item": "Estado del aceite de motor", "cant": "N/A" },
{ "cat": "HOLMATRO", "item": "Nivel de aceite compresor", "cant": "N/A" },
{ "cat": "HOLMATRO", "item": "Estado del aceite hidraulico", "cant": "N/A" },
{ "cat": "HOLMATRO", "item": "Limpieza de filtro de aire", "cant": "N/A" },
{ "cat": "HOLMATRO", "item": "Estado de piola", "cant": "N/A" },
{ "cat": "HOLMATRO", "item": "Puesta en marcha", "cant": "N/A" },
{ "cat": "HOLMATRO", "item": "Perdidas", "cant": "N/A" },
{ "cat": "HOLMATRO", "item": "Estado de manguera", "cant": "N/A" },
{ "cat": "HOLMATRO", "item": "Estado de acoples", "cant": "N/A" },
{ "cat": "HOLMATRO", "item": "Mantenimiento general", "cant": "N/A" },
{ "cat": "HOLMATRO", "item": "Limpieza", "cant": "N/A" },
{ "cat": "EXPANSOR", "item": "Perdidas", "cant": "N/A" },
{ "cat": " EXPANSOR", "item": "Estado de acoples", "cant": "N/A" },
{ "cat": " EXPANSOR ", "item": "Estado de cierre y apertura", "cant": "N/A" },
{ "cat": " EXPANSOR ", "item": "Apertura y cierre total", "cant": "N/A" },
{ "cat": " EXPANSOR ", "item": "Mantenimiento general", "cant": "N/A" },
{ "cat": " EXPANSOR ", "item": "Limpieza", "cant": "N/A" },
{ "cat": "CIZALLA GRANDE", "item": "Perdidas", "cant": "N/A" },
{ "cat": " CIZALLA GRANDE", "item": "Estado de acoples", "cant": "N/A" },
{ "cat": " CIZALLA GRANDE",  "item": "Estado de cierre y apertura", "cant": "N/A" },
{ "cat": " CIZALLA GRANDE", "item": "Apertura y cierre total", "cant": "N/A" },
{ "cat": " CIZALLA GRANDE", "item": "Mantenimiento general", "cant": "N/A" },
{ "cat": " CIZALLA GRANDE", "item": "Limpieza", "cant": "N/A" },
{ "cat": "MULTIPROPOSITO", "item": "Perdidas", "cant": "N/A" },
{ "cat": " MULTIPROPOSITO", "item": "Estado de acoples", "cant": "N/A" },
{ "cat": " MULTIPROPOSITO ", "item": "Estado de cierre y apertura", "cant": "N/A" },
{ "cat": " MULTIPROPOSITO ", "item": "Apertura y cierre total", "cant": "N/A" },
{ "cat": " MULTIPROPOSITO ", "item": "Mantenimiento general", "cant": "N/A" },
{ "cat": " MULTIPROPOSITO ", "item": "Limpieza", "cant": "N/A" },
{ "cat": "RAM DOBLE", "item": "Perdidas", "cant": "N/A" },
{ "cat": " RAM DOBLE ", "item": "Estado de acoples", "cant": "N/A" },
{ "cat": " RAM DOBLE ", "item": "Estado de cierre y apertura", "cant": "N/A" },
{ "cat": " RAM DOBLE ", "item": "Apertura y cierre total", "cant": "N/A" },
{ "cat": " RAM DOBLE ", "item": "Mantenimiento general", "cant": "N/A" },
{ "cat": " RAM DOBLE ", "item": "Limpieza", "cant": "N/A" },
{ "cat": "RAM SIMPLE", "item": "Perdidas", "cant": "N/A" },
{ "cat": " RAM SIMPLE ", "item": "Estado de acoples", "cant": "N/A" },
{ "cat": " RAM SIMPLE ", "item": "Estado de cierre y apertura", "cant": "N/A" },
{ "cat": " RAM SIMPLE ", "item": "Apertura y cierre total", "cant": "N/A" },
{ "cat": " RAM SIMPLE ", "item": "Mantenimiento general", "cant": "N/A" },
{ "cat": " RAM SIMPLE ", "item": "Limpieza", "cant": "N/A" },
{ "cat": "AMOLADORA", "item": "Mantenimiento general", "cant": "N/A" },
{ "cat": "AMOLADORA", "item": "Puesta en marcha", "cant": "N/A" },
{ "cat": "AMOLADORA", "item": "Disco y llave", "cant": "N/A" },
{ "cat": "AMOLADORA", "item": "Protector", "cant": "N/A" },
{ "cat": "AMOLADORA", "item": "Batería", "cant": "N/A" },
{ "cat": "SIERRA SABLE", "item": "Mantenimiento general", "cant": "N/A" },
{ "cat": "SIERRA SABLE", "item": "Puesta en marcha", "cant": "N/A" },
{ "cat": "SIERRA SABLE", "item": "Sierras de repuestos", "cant": "N/A" },
{ "cat": "SIERRA SABLE", "item": "Batería", "cant": "N/A" },
{ "cat": "EQUIPO AUTONOMO N1", "item": "Presión de aire respirable", "cant": "N/A" },
{ "cat": "EQUIPO AUTONOMO N1", "item": "Máscara facial completa", "cant": "N/A" },
{ "cat": "EQUIPO AUTONOMO N1", "item": "Estado de válvula y acople", "cant": "N/A" },
{ "cat": "EQUIPO AUTONOMO N1", "item": "Estado de reguladoras", "cant": "N/A" },
{ "cat": "EQUIPO AUTONOMO N1", "item": "Mangueras ", "cant": "N/A" },
{ "cat": "EQUIPO AUTONOMO N1", "item": "Arnés y ganchos", "cant": "N/A" },
{ "cat": "EQUIPO AUTONOMO N1", "item": "Prueba de funcionamiento", "cant": "N/A" },
{ "cat": "EQUIPO AUTONOMO N1", "item": "Alarma de equipo", "cant": "N/A" },
{ "cat": "EQUIPO AUTONOMO N1", "item": "Manómetros", "cant": "N/A" },
{ "cat": "EQUIPO AUTONOMO N1", "item": " Estado del Visor", "cant": "N/A" },
{ "cat": "EQUIPO AUTONOMO N2", "item": "Presión de aire respirable", "cant": "N/A" },
{ "cat": "EQUIPO AUTONOMO N2", "item": "Máscara facial completa", "cant": "N/A" },
{ "cat": "EQUIPO AUTONOMO N2", "item": "Estado de válvula y acople", "cant": "N/A" },
{ "cat": "EQUIPO AUTONOMO N2", "item": "Estado de reguladoras", "cant": "N/A" },
{ "cat": "EQUIPO AUTONOMO N2", "item": "Mangueras ", "cant": "N/A" },
{ "cat": "EQUIPO AUTONOMO N2", "item": "Arnés y ganchos", "cant": "N/A" },
{ "cat": "EQUIPO AUTONOMO N2", "item": "Prueba de funcionamiento", "cant": "N/A" },
{ "cat": "EQUIPO AUTONOMO N2", "item": "Alarma de equipo", "cant": "N/A" },
{ "cat": "EQUIPO AUTONOMO N2", "item": "Manómetros", "cant": "N/A" },
{ "cat": "EQUIPO AUTONOMO N2", "item": " Estado del Visor", "cant": "N/A" },
{ "cat": "EQUIPO AUTONOMO N3", "item": "Presión de aire respirable", "cant": "N/A" },
{ "cat": "EQUIPO AUTONOMO N3", "item": "Máscara facial completa", "cant": "N/A" },
{ "cat": "EQUIPO AUTONOMO N3", "item": "Estado de válvula y acople", "cant": "N/A" },
{ "cat": "EQUIPO AUTONOMO N3", "item": "Estado de reguladoras", "cant": "N/A" },
{ "cat": "EQUIPO AUTONOMO N3", "item": "Mangueras ", "cant": "N/A" },
{ "cat": "EQUIPO AUTONOMO N3", "item": "Arnés y ganchos", "cant": "N/A" },
{ "cat": "EQUIPO AUTONOMO N3", "item": "Prueba de funcionamiento", "cant": "N/A" },
{ "cat": "EQUIPO AUTONOMO N3", "item": "Alarma de equipo", "cant": "N/A" },
{ "cat": "EQUIPO AUTONOMO N3", "item": "Manómetros", "cant": "N/A" },
{ "cat": "EQUIPO AUTONOMO N3", "item": " Estado del Visor", "cant": "N/A" },
{ "cat": "EQUIPO AUTONOMO N4", "item": "Presión de aire respirable", "cant": "N/A" },
{ "cat": "EQUIPO AUTONOMO N4", "item": "Máscara facial completa", "cant": "N/A" },
{ "cat": "EQUIPO AUTONOMO N4", "item": "Estado de válvula y acople", "cant": "N/A" },
{ "cat": "EQUIPO AUTONOMO N4", "item": "Estado de reguladoras", "cant": "N/A" },
{ "cat": "EQUIPO AUTONOMO N4", "item": "Mangueras ", "cant": "N/A" },
{ "cat": "EQUIPO AUTONOMO N4", "item": "Arnés y ganchos", "cant": "N/A" },
{ "cat": "EQUIPO AUTONOMO N4", "item": "Prueba de funcionamiento", "cant": "N/A" },
{ "cat": "EQUIPO AUTONOMO N4", "item": "Alarma de equipo", "cant": "N/A" },
{ "cat": "EQUIPO AUTONOMO N4", "item": "Manómetros", "cant": "N/A" },
{ "cat": "EQUIPO AUTONOMO N4", "item": " Estado del Visor", "cant": "N/A" },
{ "cat": "BOLSO ALTURA AZUL", "item": "Arnés + Maion", "cant": "1" },
{ "cat": "BOLSO ALTURA AZUL ", "item": "Mallions", "cant": "1" },
{ "cat": "BOLSO ALTURA AZUL ", "item": "Guantes", "cant": "2" },
{ "cat": "BOLSO ALTURA AZUL ", "item": "Anticaída", "cant": "1" },
{ "cat": "BOLSO ALTURA AZUL ", "item": "Bloqueador de pecho", "cant": "1" },
{ "cat": "BOLSO ALTURA AZUL ", "item": "Bloqueador de mano con pedal", "cant": "1" },
{ "cat": "BOLSO ALTURA AZUL ", "item": "Mosquetón a rosca", "cant": "10" },
{ "cat": "BOLSO ALTURA AZUL ", "item": "Casco", "cant": "1" },
{ "cat": "BOLSO ALTURA AZUL ", "item": "Mosquetón tri blod", "cant": "3" },
{ "cat": "BOLSO ALTURA AZUL ", "item": "Descensor", "cant": "1" },
{ "cat": "BOLSO ALTURA AZUL ", "item": "Vínculos", "cant": "4" },
{ "cat": "BOLSO ALTURA AZUL ", "item": "Cintas rosas", "cant": "3" },
{ "cat": "BOLSO ALTURA AZUL ", "item": "Cintas azules", "cant": "4" },
{ "cat": "BOLSO ALTURA AZUL ", "item": "JAG", "cant": "1" },
{ "cat": "BOLSO ALTURA AZUL ", "item": "Placa multiplaca", "cant": "1" },
{ "cat": "BOLSO ALTURA AZUL ", "item": "Polea chica", "cant": "1" },
{ "cat": "BOLSO ALTURA AZUL ", "item": "Placa multi anclaje", "cant": "1" },
{ "cat": "BOLSO ALTURA AZUL ", "item": "Protector de cuerdas", "cant": "1" },
{ "cat": "BOLSO ALTURA AMARILLO", "item": "Arnés + Maion", "cant": "1" },
{ "cat": "BOLSO ALTURA AMARILLO ", "item": "Mallions", "cant": "1" },
{ "cat": "BOLSO ALTURA AMARILLO ", "item": "Guantes", "cant": "1" },
{ "cat": "BOLSO ALTURA AMARILLO ", "item": "Anticaída", "cant": "1" },
{ "cat": "BOLSO ALTURA AMARILLO ", "item": "Bloqueador de pecho", "cant": "1" },
{ "cat": "BOLSO ALTURA AMARILLO ", "item": "Bloqueador de mano con pedal", "cant": "1" },
{ "cat": "BOLSO ALTURA AMARILLO ", "item": "Mosquetón a rosca", "cant": "17" },
{ "cat": "BOLSO ALTURA AMARILLO ", "item": "Casco", "cant": "1" },
{ "cat": "BOLSO ALTURA AMARILLO ", "item": "Mosquetón tri blod", "cant": "4" },
{ "cat": "BOLSO ALTURA AMARILLO ", "item": "Descensor", "cant": "1" },
{ "cat": "BOLSO ALTURA AMARILLO ", "item": "Vínculos", "cant": "3" },
{ "cat": "BOLSO ALTURA AMARILLO ", "item": "Cintas rojas", "cant": "3" },
{ "cat": "BOLSO ALTURA AMARILLO ", "item": "Cintas rap", "cant": "1" },
{ "cat": "BOLSO ALTURA AMARILLO ", "item": "Descensor 8", "cant": "1" },
{ "cat": "BOLSO ALTURA AMARILLO ", "item": "Mosquetón", "cant": "1" },
{ "cat": "BOLSO ALTURA AMARILLO ", "item": "Polea", "cant": "1" },
{ "cat": "BOLSO ALTURA AMARILLO ", "item": "Protector de cuerdas", "cant": "1" },
{ "cat": "BOLSO ALTURA ROJO", "item": "Arnés + Maion", "cant": "1" },
{ "cat": "BOLSO ALTURA ROJO ", "item": "Mallions", "cant": "1" },
{ "cat": "BOLSO ALTURA ROJO ", "item": "Guantes", "cant": "1" },
{ "cat": "BOLSO ALTURA ROJO ", "item": "Anticaída", "cant": "1" },
{ "cat": "BOLSO ALTURA ROJO ", "item": "Bloqueador de pecho", "cant": "1" },
{ "cat": "BOLSO ALTURA ROJO ", "item": "Bloqueador de mano con pedal", "cant": "1" },
{ "cat": "BOLSO ALTURA ROJO ", "item": "Mosquetón a rosca", "cant": "13" },
{ "cat": "BOLSO ALTURA ROJO ", "item": "Casco", "cant": "1" },
{ "cat": "BOLSO ALTURA ROJO ", "item": "Mosquetón tri blod", "cant": "3" },
{ "cat": "BOLSO ALTURA ROJO ", "item": "Descensor", "cant": "1" },
{ "cat": "BOLSO ALTURA ROJO ", "item": "Vínculos", "cant": "3" },
{ "cat": "BOLSO ALTURA ROJO ", "item": "Cintas rojas", "cant": "3" },
{ "cat": "BOLSO ALTURA ROJO ", "item": "Cintas azules", "cant": "4" },
{ "cat": "BOLSO ALTURA ROJO ", "item": "Coordines", "cant": "1" },
{ "cat": "BOLSO ALTURA ROJO ", "item": "Mosquetón", "cant": "1" },
{ "cat": "BOLSO ALTURA ROJO ", "item": "Polea", "cant": "2" },
{ "cat": "BOLSO ALTURA ROJO ", "item": "Protector de cuerdas", "cant": "1" },
{ "cat": "BOLSO ALTURA ROJO ", "item": "Descensor 8", "cant": "1" },
{ "cat": "BOLSO ALTURA ROJO ", "item": "Cintas amarilla", "cant": "1" },
{ "cat": "BOLSO ALTURA ROJO ", "item": "Cordin", "cant": "1" },
];

// MATERIALES U-10
const CONTROLES_U10_MAT = [
    { "cat": "SECTOR BOMBA", "item": "Bichero", "cant": "1" },
    { "cat": "SECTOR BOMBA", "item": "Pala Corazon", "cant": "1" },
    { "cat": "SECTOR BOMBA", "item": "Lanza Proteck", "cant": "1" },
    { "cat": "SECTOR BOMBA", "item": "Bidon de Nafta", "cant": "1" },
    { "cat": "SECTOR BOMBA", "item": "Tramo de manguera de 3/4\" en rollo", "cant": "1" },
    { "cat": "SECTOR BOMBA", "item": "Mochilas", "cant": "4" },
    { "cat": "SECTOR BOMBA", "item": "Devanador", "cant": "1" },
    { "cat": "SECTOR BOMBA", "item": "Manguerote", "cant": "1" },
    { "cat": "SECTOR BOMBA", "item": "Botiquin", "cant": "1" },
    { "cat": "DOBLE CABINA", "item": "Corta candado", "cant": "1" },
    { "cat": "DOBLE CABINA", "item": "Hacha grande", "cant": "1" },
    { "cat": "DOBLE CABINA", "item": "Llave acople", "cant": "2" },
    { "cat": "DOBLE CABINA", "item": "Bujía de repuesto", "cant": "1" },
    { "cat": "DOBLE CABINA", "item": "Saca Bujía", "cant": "1" },
    { "cat": "DOBLE CABINA", "item": "Manija Devanador", "cant": "1" },
    { "cat": "MOCHILA N1", "item": "Estado de la bolsa", "cant": "N/A" },
    { "cat": "MOCHILA N1", "item": "Estado de la lanza", "cant": "N/A" },
    { "cat": "MOCHILA N1", "item": "Estado de correas", "cant": "N/A" },
    { "cat": "MOCHILA N1", "item": "Estado de manguera", "cant": "N/A" },
    { "cat": "MOCHILA N1", "item": "Estado de pico", "cant": "N/A" },
    { "cat": "MOCHILA N1", "item": "Verificacíon de topes ", "cant": "N/A" },
    { "cat": "MOCHILA N1", "item": "Prueba de funcionamiento", "cant": "N/A" },
    { "cat": "MOCHILA N1", "item": "Limpieza ", "cant": "N/A" },
    { "cat": "MOCHILA N2", "item": "Estado de la bolsa", "cant": "N/A" },
    { "cat": "MOCHILA N2", "item": "Estado de la lanza", "cant": "N/A" },
    { "cat": "MOCHILA N2", "item": "Estado de correas", "cant": "N/A" },
    { "cat": "MOCHILA N2", "item": "Estado de manguera", "cant": "N/A" },
    { "cat": "MOCHILA N2", "item": "Estado de pico", "cant": "N/A" },
    { "cat": "MOCHILA N2", "item": "Verificacíon de topes ", "cant": "N/A" },
    { "cat": "MOCHILA N2", "item": "Prueba de funcionamiento", "cant": "N/A" },
    { "cat": "MOCHILA N2", "item": "Limpieza ", "cant": "N/A" },
    { "cat": "MOCHILA N3", "item": "Estado de la bolsa", "cant": "N/A" },
    { "cat": "MOCHILA N3", "item": "Estado de la lanza", "cant": "N/A" },
    { "cat": "MOCHILA N3", "item": "Estado de correas", "cant": "N/A" },
    { "cat": "MOCHILA N3", "item": "Estado de manguera", "cant": "N/A" },
    { "cat": "MOCHILA N3", "item": "Estado de pico", "cant": "N/A" },
    { "cat": "MOCHILA N3", "item": "Verificacíon de topes ", "cant": "N/A" },
    { "cat": "MOCHILA N3", "item": "Prueba de funcionamiento", "cant": "N/A" },
    { "cat": "MOCHILA N3", "item": "Limpieza ", "cant": "N/A" },
    { "cat": "MOCHILA N4", "item": "Estado de la bolsa", "cant": "N/A" },
    { "cat": "MOCHILA N4", "item": "Estado de la lanza", "cant": "N/A" },
    { "cat": "MOCHILA N4", "item": "Estado de correas", "cant": "N/A" },
    { "cat": "MOCHILA N4", "item": "Estado de manguera", "cant": "N/A" },
    { "cat": "MOCHILA N4", "item": "Estado de pico", "cant": "N/A" },
    { "cat": "MOCHILA N4", "item": "Verificacíon de topes ", "cant": "N/A" },
    { "cat": "MOCHILA N4", "item": "Prueba de funcionamiento", "cant": "N/A" },
    { "cat": "MOCHILA N4", "item": "Limpieza ", "cant": "N/A" },
    { "cat": "MOTO BOMBA", "item": "Nivel de combustible", "tipo": "combustible", "cant": "N/A" },
    { "cat": "MOTO BOMBA", "item": "Estado del combustible", "cant": "N/A" },
    { "cat": "MOTO BOMBA", "item": "Nivel de aceite", "cant": "N/A" },
    { "cat": "MOTO BOMBA", "item": "Estado del aceite", "cant": "N/A" },
    { "cat": "MOTO BOMBA", "item": "Limpieza de filtro de aire", "cant": "N/A" },
    { "cat": "MOTO BOMBA", "item": "Perdidas en válvulas", "cant": "N/A" },
    { "cat": "MOTO BOMBA", "item": "Válvula de retencíon", "cant": "N/A" },
    { "cat": "MOTO BOMBA", "item": "Retención", "cant": "N/A" },
    { "cat": "MOTO BOMBA", "item": "Estado de acoples", "cant": "N/A" },
    { "cat": "MOTO BOMBA", "item": "Estado de manguerotes", "cant": "N/A" },
    { "cat": "MOTO BOMBA", "item": "Estado de filtro del manguerote", "cant": "N/A" },
    { "cat": "MOTO BOMBA", "item": "Puesta en marcha", "cant": "N/A" },
    { "cat": "MOTO BOMBA", "item": "Perdida en sello aceptable", "cant": "N/A" },
    { "cat": "MOTO BOMBA", "item": "Tiempo de aspiración", "cant": "N/A" },
    { "cat": "MOTO BOMBA", "item": "Mantenimiento general", "cant": "N/A" },
    { "cat": "MOTO BOMBA", "item": "Limpieza", "cant": "N/A" },
];

// MATERIALES U-11
const CONTROLES_U11_MAT = [
    { "cat": "GUANTERA SUPERIOR", "item": "Guia GRE", "cant": "1" },
    { "cat": "GUANTERA INFERIOR", "item": "Cinta de peligro", "cant": "2" },
    { "cat": "GUANTERA INFERIOR", "item": "Parches para Agua", "cant": "1" },
    { "cat": "GUANTERA INFERIOR", "item": "Parches para Gas", "cant": "1" },
    { "cat": "GUANTERA INFERIOR", "item": "Lapicera", "cant": "1" },
    { "cat": "GUANTERA INFERIOR", "item": "Anotador", "cant": "2" },
    { "cat": "GUANTERA CENTRAL", "item": "Cinta de peligro", "cant": "1" },
    { "cat": "GUANTERA CENTRAL", "item": "Antiparras", "cant": "1" },
    { "cat": "GUANTERA CENTRAL", "item": "Guantes", "cant": "Varios" },
    { "cat": "CAJA", "item": "Tabla larga", "cant": "2" },
    { "cat": "CAJA", "item": "Extintor", "cant": "1" },
    { "cat": "CAJON", "item": "Frazadas", "cant": "1" },
    { "cat": "CAJON", "item": "Mameluco", "cant": "2" },
    { "cat": "CAJON", "item": "Bolsa obito", "cant": "2" },
    { "cat": "CAJON", "item": "Torre de iluminación", "cant": "1" },
    { "cat": "CAJON", "item": "Chaleco de extricación", "cant": "2" },
    { "cat": "CAJON", "item": "Ferulas Rigidas", "cant": "1" },
    { "cat": "CAJON", "item": "Estabilizadores latero cervical", "cant": "2" },
    { "cat": "CAJON", "item": "Halligan", "cant": "1" },
    { "cat": "CAJON", "item": "Vientos", "cant": "1" },
    { "cat": "CAJON", "item": "Bolso trauma", "cant": "1" },
    { "cat": "BOLSO DE TRAUMA", "item": "Collarín cervical plano adulto", "cant": "3" },
    { "cat": "BOLSO DE TRAUMA", "item": "Collarín cervical plano pediatrico ", "cant": "2" },
    { "cat": "BOLSO DE TRAUMA", "item": "Apósitos", "cant": "Varios" },
    { "cat": "BOLSO DE TRAUMA", "item": "Oxímetro de pulso", "cant": "1" },
    { "cat": "BOLSO DE TRAUMA", "item": "Vendas", "cant": "Varios" },
    { "cat": "BOLSO DE TRAUMA", "item": "Cánulas de mayo", "cant": "3" },
    { "cat": "BOLSO DE TRAUMA", "item": "Antiparras", "cant": "3" },
    { "cat": "BOLSO DE TRAUMA", "item": "Alcohol", "cant": "1" },
    { "cat": "BOLSO DE TRAUMA", "item": "Barbijos", "cant": "1" },
    { "cat": "BOLSO DE TRAUMA", "item": "Tijera", "cant": "1" },
    { "cat": "BOLSO DE TRAUMA", "item": "Corta cinturón", "cant": "3" },
    { "cat": "BOLSO DE TRAUMA", "item": "Guantes", "cant": "varios" },
    { "cat": "BOLSO DE TRAUMA", "item": "Solución fisiológica", "cant": "1" }
];

// MATERIALES U-12
const CONTROLES_U12_MAT = [
    { "cat": "PRIMER PERSIANA LADO CHOFER", "item": "Corta candado", "cant": "1" },
    { "cat": "PRIMER PERSIANA LADO CHOFER", "item": "Maza", "cant": "1" },
    { "cat": "PRIMER PERSIANA LADO CHOFER", "item": "Hacha", "cant": "1" },
    { "cat": "PRIMER PERSIANA LADO CHOFER", "item": "Barreta", "cant": "1" },
    { "cat": "PRIMER PERSIANA LADO CHOFER", "item": "Riesgo Eléctrico", "cant": "1" },
    { "cat": "PRIMER PERSIANA LADO CHOFER", "item": "Halligan", "cant": "1" },
    { "cat": "PRIMER PERSIANA LADO CHOFER", "item": "Hacha de mano", "cant": "1" },
    { "cat": "PRIMER PERSIANA LADO CHOFER", "item": "Pala", "cant": "1" },
    { "cat": "SEGUNDA PERSIANA LADO CHOFER", "item": "Extintor", "cant": "1" },
    { "cat": "SEGUNDA PERSIANA LADO CHOFER", "item": "Cuña", "cant": "1" },
    { "cat": "SEGUNDA PERSIANA LADO CHOFER", "item": "Acople Macho", "cant": "1" },
    { "cat": "SEGUNDA PERSIANA LADO CHOFER", "item": "Acoplé de 2 ½ a 1 1/2", "cant": "1" },
    { "cat": "SEGUNDA PERSIANA LADO CHOFER", "item": "Lanza de 1 1/2", "cant": "1" },
    { "cat": "SEGUNDA PERSIANA LADO CHOFER", "item": "Gemelo", "cant": "1" },
    { "cat": "SEGUNDA PERSIANA LADO CHOFER", "item": "Columna", "cant": "1" },
    { "cat": "SEGUNDA PERSIANA LADO CHOFER", "item": "Filtro", "cant": "1" },
    { "cat": "SEGUNDA PERSIANA LADO CHOFER", "item": "Llave unión", "cant": "1" },
    { "cat": "SEGUNDA PERSIANA LADO CHOFER", "item": "Viento", "cant": "2" },
    { "cat": "SEGUNDA PERSIANA LADO CHOFER", "item": "Llave de hidrante y punta", "cant": "1" },
    { "cat": "SEGUNDA PERSIANA LADO CHOFER", "item": "Lanza de 2 1/2", "cant": "1" },
    { "cat": "TERCER PERSIANA LADO CHOFER", "item": "Devanador", "cant": "1" },
    { "cat": "TERCER PERSIANA LADO CHOFER", "item": "Lanza de 1”", "cant": "1" },
    { "cat": "TERCER PERSIANA LADO CHOFER", "item": "Tramos en estiba de 1 1/2", "cant": "3" },
    { "cat": "TERCER PERSIANA LADO CHOFER", "item": "Lanza de 1 1/2", "cant": "1" },
    { "cat": "PRIMER PERSIANA LADO ACOMPAÑANTE", "item": "Tacos de madera ", "cant": "12" },
    { "cat": "PRIMER PERSIANA LADO ACOMPAÑANTE", "item": "Vientos ", "cant": "1" },
    { "cat": "PRIMER PERSIANA LADO ACOMPAÑANTE", "item": "Estabilizadores latero cervicales", "cant": "1" },
    { "cat": "PRIMER PERSIANA LADO ACOMPAÑANTE", "item": "Motobomba ", "cant": "1" },
    { "cat": "SEGUNDA PERSIANA LADO ACOMPAÑANTE", "item": "Tramos manguera 1 1 /2 ", "cant": "7" },
    { "cat": "SEGUNDAPERSIANA LADO ACOMPAÑANTE", "item": "Tramos de manguera de 2 1/2", "cant": "2" },
    { "cat": "SEGUNDA PERSIANA LADO ACOMPAÑANTE", "item": "Mochilas", "cant": "5" },
    { "cat": "SEGUNDA PERSIANA LADO ACOMPAÑANTE", "item": "Cordin", "cant": "1" },
    { "cat": "TERCER PERSIANA LADO ACOMPAÑANTE", "item": "Devanador", "cant": "1" },
    { "cat": "TERCER PERSIANA LADO ACOMPAÑANTE", "item": "Lanza devanador 1”", "cant": "1" },
    { "cat": "TERCER PERSIANA LADO ACOMPAÑANTE", "item": "Estiba", "cant": "1" },
    { "cat": "TERCER PERSIANA LADO ACOMPAÑANTE", "item": "Lanza 1 1/2", "cant": "1" },
    { "cat": "TECHO", "item": "Bichero", "cant": "1" },
    { "cat": "TECHO", "item": "Tabla larga", "cant": "1" },
    { "cat": "TECHO", "item": "Escalera", "cant": "1" },
    { "cat": "MOCHILA N1", "item": "Estado de la bolsa", "cant": "N/A" },
    { "cat": "MOCHILA N1", "item": "Estado de la lanza", "cant": "N/A" },
    { "cat": "MOCHILA N1", "item": "Estado de correas", "cant": "N/A" },
    { "cat": "MOCHILA N1", "item": "Estado de manguera", "cant": "N/A" },
    { "cat": "MOCHILA N1", "item": "Estado de pico", "cant": "N/A" },
    { "cat": "MOCHILA N1", "item": "Verificacíon de topes ", "cant": "N/A" },
    { "cat": "MOCHILA N1", "item": "Prueba de funcionamiento", "cant": "N/A" },
    { "cat": "MOCHILA N1", "item": "Limpieza ", "cant": "N/A" },
    { "cat": "MOCHILA N2", "item": "Estado de la bolsa", "cant": "N/A" },
    { "cat": "MOCHILA N2", "item": "Estado de la lanza", "cant": "N/A" },
    { "cat": "MOCHILA N2", "item": "Estado de correas", "cant": "N/A" },
    { "cat": "MOCHILA N2", "item": "Estado de manguera", "cant": "N/A" },
    { "cat": "MOCHILA N2", "item": "Estado de pico", "cant": "N/A" },
    { "cat": "MOCHILA N2", "item": "Verificacíon de topes ", "cant": "N/A" },
    { "cat": "MOCHILA N2", "item": "Prueba de funcionamiento", "cant": "N/A" },
    { "cat": "MOCHILA N2", "item": "Limpieza ", "cant": "N/A" },
    { "cat": "MOCHILA N3", "item": "Estado de la bolsa", "cant": "N/A" },
    { "cat": "MOCHILA N3", "item": "Estado de la lanza", "cant": "N/A" },
    { "cat": "MOCHILA N3", "item": "Estado de correas", "cant": "N/A" },
    { "cat": "MOCHILA N3", "item": "Estado de manguera", "cant": "N/A" },
    { "cat": "MOCHILA N3", "item": "Estado de pico", "cant": "N/A" },
    { "cat": "MOCHILA N3", "item": "Verificación de topes ", "cant": "N/A" },
    { "cat": "MOCHILA N3", "item": "Prueba de funcionamiento", "cant": "N/A" },
    { "cat": "MOCHILA N3", "item": "Limpieza ", "cant": "N/A" },
    { "cat": "MOCHILA N4", "item": "Estado de la bolsa", "cant": "N/A" },
    { "cat": "MOCHILA N4", "item": "Estado de la lanza", "cant": "N/A" },
    { "cat": "MOCHILA N4", "item": "Estado de correas", "cant": "N/A" },
    { "cat": "MOCHILA N4", "item": "Estado de manguera", "cant": "N/A" },
    { "cat": "MOCHILA N4", "item": "Estado de pico", "cant": "N/A" },
    { "cat": "MOCHILA N4", "item": "Verificación de topes ", "cant": "N/A" },
    { "cat": "MOCHILA N4", "item": "Prueba de funcionamiento", "cant": "N/A" },
    { "cat": "MOCHILA N4", "item": "Limpieza ", "cant": "N/A" },
    { "cat": "MOTO BOMBA", "item": "Nivel de combustible", "tipo": "combustible", "cant": "N/A" },
    { "cat": "MOTO BOMBA", "item": "Estado del combustible", "cant": "N/A" },
    { "cat": "MOTO BOMBA", "item": "Nivel de aceite", "cant": "N/A" },
    { "cat": "MOTO BOMBA", "item": "Estado del aceite", "cant": "N/A" },
    { "cat": "MOTO BOMBA", "item": "Limpieza de filtro de aire", "cant": "N/A" },
    { "cat": "MOTO BOMBA", "item": "Perdidas en válvulas", "cant": "N/A" },
    { "cat": "MOTO BOMBA", "item": "Válvula de retencíon", "cant": "N/A" },
    { "cat": "MOTO BOMBA", "item": "Retención", "cant": "N/A" },
    { "cat": "MOTO BOMBA", "item": "Estado de acoples", "cant": "N/A" },
    { "cat": "MOTO BOMBA", "item": "Estado de manguerotes", "cant": "N/A" },
    { "cat": "MOTO BOMBA", "item": "Estado de filtro del manguerote", "cant": "N/A" },
    { "cat": "MOTO BOMBA", "item": "Puesta en marcha", "cant": "N/A" },
    { "cat": "MOTO BOMBA", "item": "Perdida en sello aceptable", "cant": "N/A" },
    { "cat": "MOTO BOMBA", "item": "Tiempo de aspiración", "cant": "N/A" },
    { "cat": "MOTO BOMBA", "item": "Mantenimiento general", "cant": "N/A" },
    { "cat": "MOTO BOMBA", "item": "Limpieza", "cant": "N/A" },
];

const CONTROLES_U13_MAT = [{ "cat": "PRIMER PERSIANA LADO CHOFER", "item": "Linterna", "cant": "1" },
{ "cat": "PRIMER PERSIANA LADO CHOFER", "item": "Amoladora", "cant": "1" },
{ "cat": "PRIMER PERSIANA LADO CHOFER", "item": "Tubo repuestos", "cant": "3" },
{ "cat": "PRIMER PERSIANA LADO CHOFER", "item": "Riesgo eléctrico", "cant": "1" },
{ "cat": "PRIMER PERSIANA LADO CHOFER", "item": "Generador", "cant": "1" },
{ "cat": "PRIMER PERSIANA LADO CHOFER", "item": "Extintor", "cant": "1" },
{ "cat": "PRIMER PERSIANA LADO CHOFER", "item": "Tacos escalonados", "cant": "4" },
{ "cat": "PRIMER PERSIANA LADO CHOFER", "item": "Tacos planos", "cant": "15" },
{ "cat": "PRIMER PERSIANA LADO CHOFER", "item": "Cascos de rescate", "cant": "2" },
{ "cat": "PRIMER PERSIANA LADO CHOFER", "item": "Cuerdas", "cant": "2" },
{ "cat": "PRIMER PERSIANA LADO CHOFER", "item": "Bolsos de altura", "cant": "2" },
{ "cat": "PRIMER PERSIANA LADO CHOFER", "item": "Pañal", "cant": "1" },
{ "cat": "PRIMER PERSIANA LADO CHOFER", "item": "Maza", "cant": "1" },
{ "cat": "PRIMER PERSIANA LADO CHOFER", "item": "Sierra Sable", "cant": "1" },
{ "cat": "PRIMER PERSIANA LADO CHOFER", "item": "Tenaza", "cant": "1" },
{ "cat": "PRIMER PERSIANA LADO CHOFER", "item": "Corta bateria", "cant": "1" },
{ "cat": "PRIMER PERSIANA LADO CHOFER", "item": "Corta fierro", "cant": "1" },
{ "cat": "PRIMER PERSIANA LADO CHOFER", "item": "Destornillador Paleta", "cant": "1" },
{ "cat": "PRIMER PERSIANA LADO CHOFER", "item": "Llave amoladora", "cant": "1" },
{ "cat": "SEGUNDA PERSIANA LADO CHOFER", "item": "Palas", "cant": "2" },
{ "cat": "SEGUNDA PERSIANA LADO CHOFER", "item": "Corta candado", "cant": "1" },
{ "cat": "SEGUNDA PERSIANA LADO CHOFER", "item": "Halligan", "cant": "1" },
{ "cat": "SEGUNDA PERSIANA LADO CHOFER", "item": "Hacha grande", "cant": "1" },
{ "cat": "SEGUNDA PERSIANA LADO CHOFER", "item": "Hacha chica", "cant": "1" },
{ "cat": "SEGUNDA PERSIANA LADO CHOFER", "item": "Bichero", "cant": "1" },
{ "cat": "SEGUNDA PERSIANA LADO CHOFER", "item": "Pértiga", "cant": "1" },
{ "cat": "SEGUNDA PERSIANA LADO CHOFER", "item": "Torre de iluminación", "cant": "2" },
{ "cat": "SEGUNDA PERSIANA LADO CHOFER", "item": "Amoladora a batería", "cant": "1" },
{ "cat": "SEGUNDA PERSIANA LADO CHOFER", "item": "Vientos", "cant": "2" },
{ "cat": "TERCER PERSIANA LADO CHOFER", "item": " Tramos de manguera de 1/2 en estiba ", "cant": "3" },
{ "cat": "TERCER PERSIANA LADO CHOFER", "item": "Lanza Proteck 1 1/2", "cant": "1" },
{ "cat": "TERCER PERSIANA LADO CHOFER", "item": " Devanador con Lanza de 1 pulgada", "cant": "1" },
{ "cat": "TERCER PERSIANA LADO CHOFER", "item": "Conos", "cant": "4" },
{ "cat": "BOMBA", "item": "Bomba", "cant": "1" },
{ "cat": "TECHO", "item": "Monitor", "cant": "1" },
{ "cat": "TECHO", "item": "Escalera Larga", "cant": "1" },
{ "cat": "TECHO", "item": "Escalera Corta", "cant": "1" },
{ "cat": "TECHO", "item": "Manguerotes", "cant": "3" },
{ "cat": "PRIMER PERSIANA LADO ACOMPAÑANTE", "item": "Tablas largas", "cant": "2" },
{ "cat": "PRIMER PERSIANA LADO ACOMPAÑANTE", "item": "Tabla pediátrica", "cant": "1" },
{ "cat": "PRIMER PERSIANA LADO ACOMPAÑANTE", "item": "Latero cervicales", "cant": "4" },
{ "cat": "PRIMER PERSIANA LADO ACOMPAÑANTE", "item": "Juguetes", "cant": "Varios" },
{ "cat": "PRIMER PERSIANA LADO ACOMPAÑANTE", "item": "Bolso trauma", "cant": "1" },
{ "cat": "PRIMER PERSIANA LADO ACOMPAÑANTE", "item": "Holmatro", "cant": "1" },
{ "cat": "PRIMER PERSIANA LADO ACOMPAÑANTE", "item": "Multi propósito", "cant": "1" },
{ "cat": "PRIMER PERSIANA LADO ACOMPAÑANTE", "item": "Ram", "cant": "1" },
{ "cat": "PRIMER PERSIANA LADO ACOMPAÑANTE", "item": "Mangueras Holmatro", "cant": "1" },
{ "cat": "PRIMER PERSIANA LADO ACOMPAÑANTE", "item": "Lona Amarilla", "cant": "1" },
{ "cat": "PRIMER PERSIANA LADO ACOMPAÑANTE", "item": "Propack", "cant": "1" },
{ "cat": "SEGUNDA PERSIANA LADO ACOMPAÑANTE", "item": "Tramos de 1 1/2", "cant": "3" },
{ "cat": "SEGUNDA PERSIANA LADO ACOMPAÑANTE", "item": "Motobomba", "cant": "1" },
{ "cat": "SEGUNDA PERSIANA LADO ACOMPAÑANTE", "item": "Patin", "cant": "1" },
{ "cat": "SEGUNDA PERSIANA LADO ACOMPAÑANTE", "item": "Acoples", "cant": "5" },
{ "cat": "SEGUNDA PERSIANA LADO ACOMPAÑANTE", "item": "Filtro Manguerote", "cant": "1" },
{ "cat": "SEGUNDA PERSIANA LADO ACOMPAÑANTE", "item": "Tramos de 2 1/2", "cant": "3" },
{ "cat": "SEGUNDA PERSIANA LADO ACOMPAÑANTE", "item": "Tramos de 1 pulgada", "cant": "1" },
{ "cat": "SEGUNDA PERSIANA LADO ACOMPAÑANTE", "item": "Lanza Proteck 1/2", "cant": "1" },
{ "cat": "SEGUNDA PERSIANA LADO ACOMPAÑANTE", "item": "Mochilas de agua", "cant": "2" },
{ "cat": "SEGUNDA PERSIANA LADO ACOMPAÑANTE", "item": "Lanza Elkhart 2/2", "cant": "1" },
{ "cat": "SEGUNDA PERSIANA LADO ACOMPAÑANTE", "item": "Gemelos", "cant": "1" },
{ "cat": "SEGUNDA PERSIANA LADO ACOMPAÑANTE", "item": "Llaves acoples", "cant": "2" },
{ "cat": "SEGUNDA PERSIANA LADO ACOMPAÑANTE", "item": "Bidon de nafta", "cant": "1" },
{ "cat": "TERCER PERSIANA LADO CHOFER", "item": " Tramos de manguera de 1/2 en estiba ", "cant": "3" },
{ "cat": "TERCER PERSIANA LADO CHOFER", "item": "Lanza ½ Proteck", "cant": "2" },
{ "cat": "TERCER PERSIANA LADO CHOFER", "item": "Consola Mini cojines", "cant": "1" },
{ "cat": "TERCER PERSIANA LADO CHOFER", "item": "Mangueras Mini Cojines", "cant": "1" },
{ "cat": "TERCER PERSIANA LADO CHOFER", "item": "Cepillo", "cant": "1" },
{ "cat": "TERCER PERSIANA LADO CHOFER", "item": "Devanador con Lanza de 1 pulgada", "cant": "1" },
{ "cat": "CABINA", "item": "Equipos autónomos", "cant": "3" },
{ "cat": "CABINA", "item": "DEA", "cant": "1" },
{ "cat": "CABINA", "item": "Cinta de peligro", "cant": "1" },
{ "cat": "CABINA", "item": "Hidrante con llave", "cant": "1" },
{ "cat": "CABINA", "item": "Criquet", "cant": "1" },
{ "cat": "BOLSO DE TRAUMA", "item": "Collarín plano regulable adultos", "cant": "3" },
{ "cat": "BOLSO DE TRAUMA", "item": "Collarín plano regulable pediátrico", "cant": "1" },
{ "cat": "BOLSO DE TRAUMA", "item": "Frazadas", "cant": "2" },
{ "cat": "BOLSO DE TRAUMA", "item": "Tubo de Oxigeno", "cant": "1" },
{ "cat": "BOLSO DE TRAUMA", "item": "BVM", "cant": "2" },
{ "cat": "BOLSO DE TRAUMA", "item": "Juguetes", "cant": "Varios" },
{ "cat": "BOLSO DE TRAUMA", "item": "Gasas", "cant": "Varios" },
{ "cat": "BOLSO DE TRAUMA", "item": "Gasas elásticas", "cant": "2" },
{ "cat": "BOLSO DE TRAUMA", "item": "Guantes", "cant": "varios" },
{ "cat": "BOLSO DE TRAUMA", "item": "Apósitos", "cant": "Varios" },
{ "cat": "BOLSO DE TRAUMA", "item": "Corta cinturón", "cant": "2" },
{ "cat": "BOLSO DE TRAUMA", "item": "Oxímetro de pulso", "cant": "1" },
{ "cat": "BOLSO DE TRAUMA", "item": "Cinta", "cant": "3" },
{ "cat": "BOLSO DE TRAUMA", "item": "Tijera", "cant": "1" },
{ "cat": "BOLSO DE TRAUMA", "item": "Alcohol", "cant": "1" },
{ "cat": "BOLSO DE TRAUMA", "item": "Medidor temperatura", "cant": "1" },
{ "cat": "BOLSO DE TRAUMA", "item": "Solución fisiológica", "cant": "Varios" },
{ "cat": "BOLSO DE TRAUMA", "item": "Tubo de oxigeno", "cant": "1" },
{ "cat": "TUBO DE OXIGENO", "item": "Presión del tubo", "cant": "N/A" },
{ "cat": "TUBO DE OXIGENO", "item": "Estado del manómetro", "cant": "N/A" },
{ "cat": "TUBO DE OXIGENO", "item": "Estado de manguera para mascara", "cant": "N/A" },
{ "cat": "TUBO DE OXIGENO", "item": "Estado de mascara", "cant": "N/A" },
{ "cat": "TUBO DE OXIGENO", "item": "Prueba hidráulica", "cant": "N/A" },
{ "cat": "TUBO DE OXIGENO", "item": "Limpieza", "cant": "N/A" },
{ "cat": "HOLMATRO", "item": "Nivel de combustible", "cant": "N/A" },
{ "cat": "HOLMATRO", "item": "Estado del combustible", "cant": "N/A" },
{ "cat": "HOLMATRO", "item": "Nivel de aceite de motor", "cant": "N/A" },
{ "cat": "HOLMATRO", "item": "Estado del aceite de motor", "cant": "N/A" },
{ "cat": "HOLMATRO", "item": "Nivel de aceite compresor", "cant": "N/A" },
{ "cat": "HOLMATRO", "item": "Estado del aceite hidraulico", "cant": "N/A" },
{ "cat": "HOLMATRO", "item": "Limpieza de filtro de aire", "cant": "N/A" },
{ "cat": "HOLMATRO", "item": "Estado de piola", "cant": "N/A" },
{ "cat": "HOLMATRO", "item": "Puesta en marcha", "cant": "N/A" },
{ "cat": "HOLMATRO", "item": "Perdidas", "cant": "N/A" },
{ "cat": "HOLMATRO", "item": "Estado de manguera", "cant": "N/A" },
{ "cat": "HOLMATRO", "item": "Estado de acoples", "cant": "N/A" },
{ "cat": "HOLMATRO", "item": "Mantenimiento general", "cant": "N/A" },
{ "cat": "HOLMATRO", "item": "Limpieza", "cant": "N/A" },
{ "cat": "MULTIPROPOSITO", "item": "Perdidas", "cant": "N/A" },
{ "cat": " MULTIPROPOSITO", "item": "Estado de acoples", "cant": "N/A" },
{ "cat": " MULTIPROPOSITO ", "item": "Estado de cierre y apertura", "cant": "N/A" },
{ "cat": " MULTIPROPOSITO ", "item": "Apertura y cierre total", "cant": "N/A" },
{ "cat": " MULTIPROPOSITO ", "item": "Mantenimiento general", "cant": "N/A" },
{ "cat": " MULTIPROPOSITO ", "item": "Limpieza", "cant": "N/A" },
{ "cat": "RAM DOBLE", "item": "Perdidas", "cant": "N/A" },
{ "cat": " RAM DOBLE ", "item": "Estado de acoples", "cant": "N/A" },
{ "cat": " RAM DOBLE ", "item": "Estado de cierre y apertura", "cant": "N/A" },
{ "cat": " RAM DOBLE ", "item": "Apertura y cierre total", "cant": "N/A" },
{ "cat": " RAM DOBLE ", "item": "Mantenimiento general", "cant": "N/A" },
{ "cat": " RAM DOBLE ", "item": "Limpieza", "cant": "N/A" },
{ "cat": "RAM SIMPLE", "item": "Perdidas", "cant": "N/A" },
{ "cat": " RAM SIMPLE ", "item": "Estado de acoples", "cant": "N/A" },
{ "cat": " RAM SIMPLE ", "item": "Estado de cierre y apertura", "cant": "N/A" },
{ "cat": " RAM SIMPLE ", "item": "Apertura y cierre total", "cant": "N/A" },
{ "cat": " RAM SIMPLE ", "item": "Mantenimiento general", "cant": "N/A" },
{ "cat": " RAM SIMPLE ", "item": "Limpieza", "cant": "N/A" },
{ "cat": "MOTO BOMBA", "item": "Nivel de combustible", "cant": "N/A" },
{ "cat": "MOTO BOMBA", "item": "Estado del combustible", "cant": "N/A" },
{ "cat": "MOTO BOMBA", "item": "Nivel de aceite", "cant": "N/A" },
{ "cat": "MOTO BOMBA", "item": "Estado del aceite", "cant": "N/A" },
{ "cat": "MOTO BOMBA", "item": "Limpieza de filtro de aire", "cant": "N/A" },
{ "cat": "MOTO BOMBA", "item": "Perdidas en válvulas", "cant": "N/A" },
{ "cat": "MOTO BOMBA", "item": "Válvula de retencíon", "cant": "N/A" },
{ "cat": "MOTO BOMBA", "item": "Retención", "cant": "N/A" },
{ "cat": "MOTO BOMBA", "item": "Estado de acoples", "cant": "N/A" },
{ "cat": "MOTO BOMBA", "item": "Estado de manguerotes", "cant": "N/A" },
{ "cat": "MOTO BOMBA", "item": "Estado de filtro del manguerote", "cant": "N/A" },
{ "cat": "MOTO BOMBA", "item": "Puesta en marcha", "cant": "N/A" },
{ "cat": "MOTO BOMBA", "item": "Perdida en sello aceptable", "cant": "N/A" },
{ "cat": "MOTO BOMBA", "item": "Tiempo de aspiración", "cant": "N/A" },
{ "cat": "MOTO BOMBA", "item": "Mantenimiento general", "cant": "N/A" },
{ "cat": "MOTO BOMBA", "item": "Limpieza", "cant": "N/A" },
{ "cat": "MOCHILA N11", "item": "Estado de la bolsa", "cant": "N/A" },
{ "cat": "MOCHILA N11", "item": "Estado de la lanza", "cant": "N/A" },
{ "cat": "MOCHILA N11", "item": "Estado de correas", "cant": "N/A" },
{ "cat": "MOCHILA N11", "item": "Estado de manguera", "cant": "N/A" },
{ "cat": "MOCHILA N11", "item": "Estado de pico", "cant": "N/A" },
{ "cat": "MOCHILA N11", "item": "Verificacíon de topes ", "cant": "N/A" },
{ "cat": "MOCHILA N11", "item": "Prueba de funcionamiento", "cant": "N/A" },
{ "cat": "MOCHILA N11", "item": "Limpieza ", "cant": "N/A" },
{ "cat": "MOCHILA N12", "item": "Estado de la bolsa", "cant": "N/A" },
{ "cat": "MOCHILA N12", "item": "Estado de la lanza", "cant": "N/A" },
{ "cat": "MOCHILA N12", "item": "Estado de correas", "cant": "N/A" },
{ "cat": "MOCHILA N12", "item": "Estado de manguera", "cant": "N/A" },
{ "cat": "MOCHILA N12", "item": "Estado de pico", "cant": "N/A" },
{ "cat": "MOCHILA N12", "item": "Verificacíon de topes ", "cant": "N/A" },
{ "cat": "MOCHILA N12", "item": "Prueba de funcionamiento", "cant": "N/A" },
{ "cat": "MOCHILA N12", "item": "Limpieza ", "cant": "N/A" },
{ "cat": "GENERADOR HONDA", "item": "Nivel de combustible", "cant": "N/A" },
{ "cat": "GENERADOR HONDA", "item": "Estado del combustible", "cant": "N/A" },
{ "cat": "GENERADOR HONDA", "item": "Nivel de aceite motor", "cant": "N/A" },
{ "cat": "GENERADOR HONDA", "item": "Estado del aceite", "cant": "N/A" },
{ "cat": "GENERADOR HONDA", "item": "Limpieza de filtro de aire", "cant": "N/A" },
{ "cat": "GENERADOR HONDA", "item": "Estado de bujía", "cant": "N/A" },
{ "cat": "GENERADOR HONDA", "item": "Puesta en marcha", "cant": "N/A" },
{ "cat": "GENERADOR HONDA", "item": "Estado de enchufes", "cant": "N/A" },
{ "cat": "GENERADOR HONDA", "item": "Mantenimiento general", "cant": "N/A" },
{ "cat": "GENERADOR HONDA", "item": "Limpieza", "cant": "N/A" },
{ "cat": "AMOLADORA GRANDE", "item": "Mantenimiento general", "cant": "N/A" },
{ "cat": "AMOLADORA GRANDE", "item": "Puesta en marcha", "cant": "N/A" },
{ "cat": "AMOLADORA GRANDE", "item": "Disco y llave", "cant": "N/A" },
{ "cat": "AMOLADORA GRANDE", "item": "Protector", "cant": "N/A" },
{ "cat": "AMOLADORA GRANDE", "item": "Cable", "cant": "N/A" },
{ "cat": "AMOLADORA CHICA", "item": "Mantenimiento general", "cant": "N/A" },
{ "cat": "AMOLADORA CHICA", "item": "Puesta en marcha", "cant": "N/A" },
{ "cat": "AMOLADORA CHICA", "item": "Disco y llave", "cant": "N/A" },
{ "cat": "AMOLADORA CHICA", "item": "Protector", "cant": "N/A" },
{ "cat": "AMOLADORA CHICA", "item": "Batería", "cant": "N/A" },
{ "cat": "SIERRA SABLE", "item": "Mantenimiento general", "cant": "N/A" },
{ "cat": "SIERRA SABLE", "item": "Puesta en marcha", "cant": "N/A" },
{ "cat": "SIERRA SABLE", "item": "Sierras de repuestos", "cant": "N/A" },
{ "cat": "SIERRA SABLE", "item": "Batería", "cant": "N/A" },
{ "cat": "EQUIPO AUTONOMO N11", "item": "Presión de aire respirable", "cant": "N/A" },
{ "cat": "EQUIPO AUTONOMO N11", "item": "Máscara facial completa", "cant": "N/A" },
{ "cat": "EQUIPO AUTONOMO N11", "item": "Estado de válvula y acople", "cant": "N/A" },
{ "cat": "EQUIPO AUTONOMO N11", "item": "Estado de reguladoras", "cant": "N/A" },
{ "cat": "EQUIPO AUTONOMO N11", "item": "Mangueras ", "cant": "N/A" },
{ "cat": "EQUIPO AUTONOMO N11", "item": "Arnés y ganchos", "cant": "N/A" },
{ "cat": "EQUIPO AUTONOMO N11", "item": "Prueba de funcionamiento", "cant": "N/A" },
{ "cat": "EQUIPO AUTONOMO N11", "item": "Alarma de equipo", "cant": "N/A" },
{ "cat": "EQUIPO AUTONOMO N11", "item": "Manómetros", "cant": "N/A" },
{ "cat": "EQUIPO AUTONOMO N11", "item": " Estado del Visor", "cant": "N/A" },
{ "cat": "EQUIPO AUTONOMO N12", "item": "Presión de aire respirable", "cant": "N/A" },
{ "cat": "EQUIPO AUTONOMO N12", "item": "Máscara facial completa", "cant": "N/A" },
{ "cat": "EQUIPO AUTONOMO N12", "item": "Estado de válvula y acople", "cant": "N/A" },
{ "cat": "EQUIPO AUTONOMO N12", "item": "Estado de reguladoras", "cant": "N/A" },
{ "cat": "EQUIPO AUTONOMO N12", "item": "Mangueras ", "cant": "N/A" },
{ "cat": "EQUIPO AUTONOMO N12", "item": "Arnés y ganchos", "cant": "N/A" },
{ "cat": "EQUIPO AUTONOMO N12", "item": "Prueba de funcionamiento", "cant": "N/A" },
{ "cat": "EQUIPO AUTONOMO N12", "item": "Alarma de equipo", "cant": "N/A" },
{ "cat": "EQUIPO AUTONOMO N12", "item": "Manómetros", "cant": "N/A" },
{ "cat": "EQUIPO AUTONOMO N12", "item": " Estado del Visor", "cant": "N/A" },
{ "cat": "EQUIPO AUTONOMO N13", "item": "Presión de aire respirable", "cant": "N/A" },
{ "cat": "EQUIPO AUTONOMO N13", "item": "Máscara facial completa", "cant": "N/A" },
{ "cat": "EQUIPO AUTONOMO N13", "item": "Estado de válvula y acople", "cant": "N/A" },
{ "cat": "EQUIPO AUTONOMO N13", "item": "Estado de reguladoras", "cant": "N/A" },
{ "cat": "EQUIPO AUTONOMO N13", "item": "Mangueras ", "cant": "N/A" },
{ "cat": "EQUIPO AUTONOMO N13", "item": "Arnés y ganchos", "cant": "N/A" },
{ "cat": "EQUIPO AUTONOMO N13", "item": "Prueba de funcionamiento", "cant": "N/A" },
{ "cat": "EQUIPO AUTONOMO N13", "item": "Alarma de equipo", "cant": "N/A" },
{ "cat": "EQUIPO AUTONOMO N13", "item": "Manómetros", "cant": "N/A" },
{ "cat": "EQUIPO AUTONOMO N13", "item": " Estado del Visor", "cant": "N/A" },
{ "cat": "TUBO DE REPUESTO N1", "item": "Presión de aire respirable", "cant": "N/A" },
{ "cat": "TUBO DE REPUESTO N1", "item": "Estado de manómetro", "cant": "N/A" },
{ "cat": "TUBO DE REPUESTO N1", "item": "Estado de entrada de aire ", "cant": "N/A" },
{ "cat": "TUBO DE REPUESTO N1", "item": "Fecha de vencimiento de PH", "cant": "N/A" },
{ "cat": "TUBO DE REPUESTO N2", "item": "Presión de aire respirable", "cant": "N/A" },
{ "cat": "TUBO DE REPUESTO N2", "item": "Estado de manómetro", "cant": "N/A" },
{ "cat": "TUBO DE REPUESTO N2", "item": "Estado de entrada de aire ", "cant": "N/A" },
{ "cat": "TUBO DE REPUESTO N2", "item": "Fecha de vencimiento de PH", "cant": "N/A" },
{ "cat": "TUBO DE REPUESTO N3", "item": "Presión de aire respirable", "cant": "N/A" },
{ "cat": "TUBO DE REPUESTO N3", "item": "Estado de manómetro", "cant": "N/A" },
{ "cat": "TUBO DE REPUESTO N3", "item": "Estado de entrada de aire ", "cant": "N/A" },
{ "cat": "TUBO DE REPUESTO N3", "item": "Fecha de vencimiento de PH", "cant": "N/A" },
{ "cat": "BOLSO ALTURA NARANJA", "item": "Arnés con croll", "cant": "1" },
{ "cat": "BOLSO ALTURA NARANJA", "item": "Anticaída + asap", "cant": "1" },
{ "cat": "BOLSO ALTURA NARANJA", "item": "Shummar + pedal", "cant": "1" },
{ "cat": "BOLSO ALTURA NARANJA", "item": "Casco", "cant": "1" },
{ "cat": "BOLSO ALTURA NARANJA", "item": "ID", "cant": "1" },
{ "cat": "BOLSO ALTURA NARANJA", "item": "Jag", "cant": "1" },
{ "cat": "BOLSO ALTURA NARANJA", "item": "Guantes", "cant": "1" },
{ "cat": "BOLSO ALTURA NARANJA", "item": "Polea simple", "cant": "1" },
{ "cat": "BOLSO ALTURA NARANJA", "item": "Polea doble", "cant": "1" },
{ "cat": "BOLSO ALTURA NARANJA", "item": "Vinculos", "cant": "1" },
{ "cat": "BOLSO ALTURA NARANJA", "item": "Polea simple chica", "cant": "1" },
{ "cat": "BOLSO ALTURA NARANJA", "item": "Cintas cortas rojas", "cant": "1" },
{ "cat": "BOLSO ALTURA NARANJA", "item": "Cintas largas negras", "cant": "1" },
{ "cat": "BOLSO ALTURA NARANJA", "item": "Mosquetón triblock", "cant": "1" },
{ "cat": "BOLSO ALTURA NARANJA", "item": "Mosquetones", "cant": "1" },
{ "cat": "BOLSO ALTURA NARANJA", "item": "Polea tirolesa", "cant": "1" },
{ "cat": "BOLSO ALTURA NARANJA", "item": "Placa multi anclaje ", "cant": "1" },
{ "cat": "BOLSO ALTURA BLANCO", "item": "Arnés con croll", "cant": "1" },
{ "cat": "BOLSO ALTURA BLANCO", "item": "Anticaída + asap", "cant": "1" },
{ "cat": "BOLSO ALTURA BLANCO", "item": "Stop", "cant": "1" },
{ "cat": "BOLSO ALTURA BLANCO", "item": "Casco", "cant": "1" },
{ "cat": "BOLSO ALTURA BLANCO", "item": "ID", "cant": "1" },
{ "cat": "BOLSO ALTURA BLANCO", "item": "Shummer", "cant": "1" },
{ "cat": "BOLSO ALTURA BLANCO", "item": "Guantes", "cant": "1" },
{ "cat": "BOLSO ALTURA BLANCO", "item": "Polea simple", "cant": "1" },
{ "cat": "BOLSO ALTURA BLANCO", "item": "Vinculos", "cant": "1" },
{ "cat": "BOLSO ALTURA BLANCO", "item": "Cintas cortas rojas", "cant": "1" },
{ "cat": "BOLSO ALTURA BLANCO", "item": "Cintas largas negras", "cant": "1" },
{ "cat": "BOLSO ALTURA BLANCO", "item": "Mosquetón triblock", "cant": "1" },
{ "cat": "BOLSO ALTURA BLANCO", "item": "Mosquetones", "cant": "1" },];

const CONTROLES_U15_MAT = [ { "cat": "CAJA", "item": "Mochilas", "cant": "4" },
{ "cat": "CAJA", "item": "Tramo de una manguera de 1 pulgada", "cant": "1" },
{ "cat": "CAJA", "item": "Devanador", "cant": "1" },
{ "cat": "CAJA", "item": "Lanza Proteck de 1 pulgada", "cant": "1" },
{ "cat": "CAJA", "item": "Bichero", "cant": "1" },
{ "cat": "CAJA", "item": "Bidon de Nafta", "cant": "1" },
{ "cat": "CAJA", "item": "Pala", "cant": "1" },
{ "cat": "CAJA", "item": "Tabla Larga", "cant": "1" },
{ "cat": "CAJA", "item": "Aceite Motobomba", "cant": "1" },

{ "cat": "CABINA", "item": "Eslinga", "cant": "1" },
{ "cat": "CABINA", "item": "Corta candado", "cant": "1" },
{ "cat": "CABINA", "item": "Llave devanador", "cant": "1" },
{ "cat": "CABINA", "item": "Enganche", "cant": "1" },
{ "cat": "CABINA", "item": "Llave bujía", "cant": "1" },
{ "cat": "CABINA", "item": "Bolso Férulas", "cant": "1" },
{ "cat": "CABINA", "item": "Bolso Trauma", "cant": "1" },
{ "cat": "BOLSO DE TRAUMA", "item": "Collarín plano regulable adulto", "cant": "2" },
{ "cat": "BOLSO DE TRAUMA", "item": "Collarín plano regulable pediátrico", "cant": "1" },
{ "cat": "BOLSO DE TRAUMA", "item": "BVM", "cant": "1" },
{ "cat": "BOLSO DE TRAUMA", "item": "Frazadas", "cant": "1" },
{ "cat": "BOLSO DE TRAUMA", "item": "Mascara pocket", "cant": "1" },
{ "cat": "BOLSO DE TRAUMA", "item": "Botiquin chico", "cant": "1" },
{ "cat": "BOLSO DE TRAUMA", "item": "Corta cinturones", "cant": "2" },
{ "cat": "BOLSO DE TRAUMA", "item": "Gasas", "cant": "varios" },
{  "cat": "BOLSO DE TRAUMA", "item": "Vendas", "cant": "varios" },
{"cat": "BOLSO DE TRAUMA", "item": "Oxímetro de pulso", "cant": "1" },
{ "cat": "BOLSO DE TRAUMA", "item": "Solución fisiológica", "cant": "varios" },
{ "cat": "MOCHILA N7", "item": "Estado de la bolsa", "cant": "N/A" },
{ "cat": "MOCHILA N7", "item": "Estado de la lanza", "cant": "N/A" },
{ "cat": "MOCHILA N7", "item": "Estado de correas", "cant": "N/A" },
{ "cat": "MOCHILA N7", "item": "Estado de manguera", "cant": "N/A" },
{ "cat": "MOCHILA N7", "item": "Estado de pico", "cant": "N/A" },
{ "cat": "MOCHILA N7", "item": "Verificacíon de topes ", "cant": "N/A" },
{ "cat": "MOCHILA N7", "item": "Prueba de funcionamiento", "cant": "N/A" },
{ "cat": "MOCHILA N7", "item": "Limpieza ", "cant": "N/A" },
{ "cat": "MOCHILA N8", "item": "Estado de la bolsa", "cant": "N/A" },
{ "cat": "MOCHILA N8", "item": "Estado de la lanza", "cant": "N/A" },
{ "cat": "MOCHILA N8", "item": "Estado de correas", "cant": "N/A" },
{ "cat": "MOCHILA N8", "item": "Estado de manguera", "cant": "N/A" },
{ "cat": "MOCHILA N8", "item": "Estado de pico", "cant": "N/A" },
{ "cat": "MOCHILA N8", "item": "Verificacíon de topes ", "cant": "N/A" },
{ "cat": "MOCHILA N8", "item": "Prueba de funcionamiento", "cant": "N/A" },
{ "cat": "MOCHILA N8", "item": "Limpieza ", "cant": "N/A" },
{ "cat": "MOCHILA N9", "item": "Estado de la bolsa", "cant": "N/A" },
{ "cat": "MOCHILA N9", "item": "Estado de la lanza", "cant": "N/A" },
{ "cat": "MOCHILA N9", "item": "Estado de correas", "cant": "N/A" },
{ "cat": "MOCHILA N9", "item": "Estado de manguera", "cant": "N/A" },
{ "cat": "MOCHILA N9", "item": "Estado de pico", "cant": "N/A" },
{ "cat": "MOCHILA N9", "item": "Verificacíon de topes ", "cant": "N/A" },
{ "cat": "MOCHILA N9", "item": "Prueba de funcionamiento", "cant": "N/A" },
{ "cat": "MOCHILA N9", "item": "Limpieza ", "cant": "N/A" },
{ "cat": "MOCHILA N10", "item": "Estado de la bolsa", "cant": "N/A" },
{ "cat": "MOCHILA N10", "item": "Estado de la lanza", "cant": "N/A" },
{ "cat": "MOCHILA N10", "item": "Estado de correas", "cant": "N/A" },
{ "cat": "MOCHILA N10", "item": "Estado de manguera", "cant": "N/A" },
{ "cat": "MOCHILA N10", "item": "Estado de pico", "cant": "N/A" },
{ "cat": "MOCHILA N10", "item": "Verificacíon de topes ", "cant": "N/A" },
{ "cat": "MOCHILA N10", "item": "Prueba de funcionamiento", "cant": "N/A" },
{ "cat": "MOCHILA N10", "item": "Limpieza ", "cant": "N/A" },
{ "cat": "MOTO BOMBA", "item": "Nivel de combustible", "cant": "N/A" },
{ "cat": "MOTO BOMBA", "item": "Estado del combustible", "cant": "N/A" },
{ "cat": "MOTO BOMBA", "item": "Nivel de aceite", "cant": "N/A" },
{ "cat": "MOTO BOMBA", "item": "Estado del aceite", "cant": "N/A" },
{ "cat": "MOTO BOMBA", "item": "Limpieza de filtro de aire", "cant": "N/A" },
{ "cat": "MOTO BOMBA", "item": "Perdidas en válvulas", "cant": "N/A" },
{ "cat": "MOTO BOMBA", "item": "Válvula de retencíon", "cant": "N/A" },
{ "cat": "MOTO BOMBA", "item": "Retención", "cant": "N/A" },
{ "cat": "MOTO BOMBA", "item": "Estado de acoples", "cant": "N/A" },
{ "cat": "MOTO BOMBA", "item": "Estado de manguerotes", "cant": "N/A" },
{ "cat": "MOTO BOMBA", "item": "Estado de filtro del manguerote", "cant": "N/A" },
{ "cat": "MOTO BOMBA", "item": "Puesta en marcha", "cant": "N/A" },
{ "cat": "MOTO BOMBA", "item": "Perdida en sello aceptable", "cant": "N/A" },
{ "cat": "MOTO BOMBA", "item": "Tiempo de aspiración", "cant": "N/A" },
{ "cat": "MOTO BOMBA", "item": "Mantenimiento general", "cant": "N/A" },
{ "cat": "MOTO BOMBA", "item": "Limpieza", "cant": "N/A" },];

const CONTROLES_U16_MAT = [ { "cat": "PRIMER PERSIANA LADO CHOFER", "item": "Forzador de aire", "cant": "1" },
{ "cat": "PRIMER PERSIANA LADO CHOFER", "item": "Cargadores de batería", "cant": "2" },
{ "cat": "PRIMER PERSIANA LADO CHOFER", "item": "Pack de batería 5,0", "cant": "3" },
{ "cat": "PRIMER PERSIANA LADO CHOFER", "item": " Pack de batería 9,0", "cant": "2" },
{ "cat": "SEGUNDA PERSIANA LADO CHOFER", "item": "Tubos de repuestos", "cant": "2" },
{ "cat": "SEGUNDA PERSIANA LADO CHOFER", "item": "Torre de iluminación", "cant": "1" },
{ "cat": "TERCER PERSIANA LADO CHOFER", "item": "Bidon de espumógeno aff", "cant": "1" },
{ "cat": "TERCER PERSIANA LADO CHOFER", "item": "Lanza de espuma", "cant": "1" },
{ "cat": "TERCER PERSIANA LADO CHOFER", "item": "Tramos en estiva", "cant": "2" },
{ "cat": "TERCER PERSIANA LADO CHOFER", "item": "Torre de iluminación", "cant": "1" },
{ "cat": "PRIMER PERSIANA LADO ACOMPAÑANTE", "item": "Bolso trauma", "cant": "1" },
{ "cat": "PRIMER PERSIANA LADO ACOMPAÑANTE", "item": "Juguetes", "cant": "1" },
{ "cat": "PRIMER PERSIANA LADO ACOMPAÑANTE", "item": "Inmovilizadores", "cant": "2" },
{ "cat": "SEGUNDA PERSIANA LADO ACOMPAÑANTE", "item": "Tramos 2 1/2 ", "cant": "5" },
{ "cat": "SEGUNDA PERSIANA LADO ACOMPAÑANTE", "item": "Tramos 1 1/2 ", "cant": "4" },
{ "cat": "SEGUNDA PERSIANA LADO ACOMPAÑANTE", "item": "Lanza Protek 1 1/2 ", "cant": "1" },
{ "cat": "SEGUNDA PERSIANA LADO ACOMPAÑANTE", "item": "Lanza Protek 2 1/2 ", "cant": "1" },
{ "cat": "SEGUNDA PERSIANA LADO ACOMPAÑANTE", "item": "Acople Storz a Bombero ", "cant": "1" },
{ "cat": "SEGUNDA PERSIANA LADO ACOMPAÑANTE", "item": "Bifurcador de 2 ½ a 1 1/2 ", "cant": "1" },
{ "cat": "SEGUNDA PERSIANA LADO ACOMPAÑANTE", "item": "Reductor de 2 ½ a 1 1/2", "cant": "1" },
{ "cat": "SEGUNDA PERSIANA LADO ACOMPAÑANTE", "item": "Llave unión combinada ", "cant": "2" },
{ "cat": "SEGUNDA PERSIANA LADO ACOMPAÑANTE", "item": "Masa ", "cant": "1" },
{ "cat": "SEGUNDA PERSIANA LADO ACOMPAÑANTE", "item": "Corta fierro ", "cant": "1" },
{ "cat": "SEGUNDA PERSIANA LADO ACOMPAÑANTE", "item": "Tenaza ", "cant": "1" },
{ "cat": "SEGUNDA PERSIANA LADO ACOMPAÑANTE", "item": "Protector auditivo ", "cant": "1" },
{ "cat": "TERCER PERSIANA LADO ACOMPAÑANTE", "item": "Bidon de espumógeno aff ", "cant": "1" },
{ "cat": "TERCER PERSIANA LADO ACOMPAÑANTE", "item": "Tramos en estiva ", "cant": "3" },
{ "cat": "TERCER PERSIANA LADO ACOMPAÑANTE", "item": "Lanza Protek de 1 1/2 ", "cant": "1" },
{ "cat": "TERCER PERSIANA LADO ACOMPAÑANTE", "item": "Base para inmovilizar", "cant": "1" },
{ "cat": "TERCER PERSIANA LADO ACOMPAÑANTE", "item": "Inmovilizador ", "cant": "3" },
{ "cat": "TERCER PERSIANA LADO ACOMPAÑANTE", "item": "K.E.D ", "cant": "2" },
{ "cat": "TERCER PERSIANA LADO ACOMPAÑANTE", "item": "Pescador ¾ ", "cant": "1" },
{ "cat": "TERCER PERSIANA LADO ACOMPAÑANTE", "item": "Pescador 1 1/2 ", "cant": "1" },
{ "cat": "ZONA CENTRAL", "item": "Tabla larga", "cant": "2" },
{ "cat": "ZONA CENTRAL", "item": "Tabla corta", "cant": "1" },
{ "cat": "ZONA CENTRAL", "item": "Halligan", "cant": "1" },
{ "cat": "ZONA CENTRAL", "item": "Pértiga", "cant": "1" },
{ "cat": "ZONA CENTRAL", "item": "Palanca para enroscar", "cant": "1" },
{ "cat": "ZONA CENTRAL", "item": "Escobillón", "cant": "2" },
{ "cat": "ZONA CENTRAL", "item": "Pala", "cant": "1" },
{ "cat": "ZONA CENTRAL", "item": "Hacha", "cant": "1" },
{ "cat": "ZONA CENTRAL", "item": "Corta candado", "cant": "1" },
{ "cat": "ZONA CENTRAL", "item": "Palanca larga", "cant": "1" },
{ "cat": "ZONA CENTRAL", "item": "Palanca corta con saca clavos", "cant": "1" },
{ "cat": "CABINA", "item": "Equipos auutonomos", "cant": "4" },
{ "cat": "CABINA", "item": "Guantes", "cant": "Varios" },
{ "cat": "CABINA", "item": "Chalecos", "cant": "2" },
{ "cat": "CABINA", "item": "Vientos", "cant": "4" },
{ "cat": "CABINA", "item": "Libreta Anotación", "cant": "2" },
{ "cat": "CABINA", "item": "Cámara térmica", "cant": "1" },
{ "cat": "CABINA", "item": "Batería de Cámara térmica", "cant": "2" },
{ "cat": "CABINA", "item": "E.R.A LAK", "cant": "1" },
{ "cat": "CABINA", "item": "Linterna", "cant": "1" },
{ "cat": "CABINA", "item": "Cinta de peligro", "cant": "2" },
{ "cat": "CABINA", "item": "Rollo de obturación", "cant": "2" },
{ "cat": "TECHO", "item": "Manguerote largo de 2 1/2", "cant": "1" },
{ "cat": "TECHO", "item": " Manguerote corto de 2 1/2", "cant": "1" },
{ "cat": "TECHO", "item": "Escalera", "cant": "1" },
{ "cat": "BOLSO DE TRAUMA", "item": "Collarín plano regulable adultos", "cant": "4" },
{ "cat": "BOLSO DE TRAUMA", "item": "Collarín plano regulable pediátrico", "cant": "2" },
{ "cat": "BOLSO DE TRAUMA", "item": "BVM con mascarilla para adulto", "cant": "1" },
{ "cat": "BOLSO DE TRAUMA", "item": "BVM con mascarilla para pediátricos", "cant": "1" },
{ "cat": "BOLSO DE TRAUMA", "item": "Frazadas", "cant": "1" },
{ "cat": "BOLSO DE TRAUMA", "item": "Guantes", "cant": "varios" },
{ "cat": "BOLSO DE TRAUMA", "item": "Oxímetro de pulso", "cant": "1" },
{ "cat": "BOLSO DE TRAUMA", "item": "Tijera", "cant": "2" },
{ "cat": "BOLSO DE TRAUMA", "item": "Corta cinturón", "cant": "4" },
{ "cat": "BOLSO DE TRAUMA", "item": "Rompe cristal", "cant": "1" },
{ "cat": "BOLSO DE TRAUMA", "item": "Gasas", "cant": "Varios" },
{ "cat": "BOLSO DE TRAUMA", "item": "Apósitos", "cant": "Varios" },
{ "cat": "BOLSO DE TRAUMA", "item": "Cinta", "cant": "3" },
{ "cat": "BOLSO DE TRAUMA", "item": "Mascara Pocket", "cant": "1" },
{ "cat": "BOLSO DE TRAUMA", "item": "Alcohol", "cant": "1" },
{ "cat": "BOLSO DE TRAUMA", "item": "Solución fisiológica", "cant": "Varios" },
{ "cat": "EQUIPO AUTONOMO N1", "item": "Presión de aire respirable", "cant": "N/A" },
{ "cat": "EQUIPO AUTONOMO N1", "item": "Máscara facial completa", "cant": "N/A" },
{ "cat": "EQUIPO AUTONOMO N1", "item": "Estado de válvula y acople", "cant": "N/A" },
{ "cat": "EQUIPO AUTONOMO N1", "item": "Estado de reguladoras", "cant": "N/A" },
{ "cat": "EQUIPO AUTONOMO N1", "item": "Mangueras ", "cant": "N/A" },
{ "cat": "EQUIPO AUTONOMO N1", "item": "Arnés y ganchos", "cant": "N/A" },
{ "cat": "EQUIPO AUTONOMO N1", "item": "Prueba de funcionamiento", "cant": "N/A" },
{ "cat": "EQUIPO AUTONOMO N1", "item": "Alarma de equipo", "cant": "N/A" },
{ "cat": "EQUIPO AUTONOMO N1", "item": "Manómetros", "cant": "N/A" },
{ "cat": "EQUIPO AUTONOMO N1", "item": " Estado del Visor", "cant": "N/A" },
{ "cat": "EQUIPO AUTONOMO N2", "item": "Presión de aire respirable", "cant": "N/A" },
{ "cat": "EQUIPO AUTONOMO N2", "item": "Máscara facial completa", "cant": "N/A" },
{ "cat": "EQUIPO AUTONOMO N2", "item": "Estado de válvula y acople", "cant": "N/A" },
{ "cat": "EQUIPO AUTONOMO N2", "item": "Estado de reguladoras", "cant": "N/A" },
{ "cat": "EQUIPO AUTONOMO N2", "item": "Mangueras ", "cant": "N/A" },
{ "cat": "EQUIPO AUTONOMO N2", "item": "Arnés y ganchos", "cant": "N/A" },
{ "cat": "EQUIPO AUTONOMO N2", "item": "Prueba de funcionamiento", "cant": "N/A" },
{ "cat": "EQUIPO AUTONOMO N2", "item": "Alarma de equipo", "cant": "N/A" },
{ "cat": "EQUIPO AUTONOMO N2", "item": "Manómetros", "cant": "N/A" },
{ "cat": "EQUIPO AUTONOMO N2", "item": " Estado del Visor", "cant": "N/A" },
{ "cat": "EQUIPO AUTONOMO N3", "item": "Presión de aire respirable", "cant": "N/A" },
{ "cat": "EQUIPO AUTONOMO N3", "item": "Máscara facial completa", "cant": "N/A" },
{ "cat": "EQUIPO AUTONOMO N3", "item": "Estado de válvula y acople", "cant": "N/A" },
{ "cat": "EQUIPO AUTONOMO N3", "item": "Estado de reguladoras", "cant": "N/A" },
{ "cat": "EQUIPO AUTONOMO N3", "item": "Mangueras ", "cant": "N/A" },
{ "cat": "EQUIPO AUTONOMO N3", "item": "Arnés y ganchos", "cant": "N/A" },
{ "cat": "EQUIPO AUTONOMO N3", "item": "Prueba de funcionamiento", "cant": "N/A" },
{ "cat": "EQUIPO AUTONOMO N3", "item": "Alarma de equipo", "cant": "N/A" },
{ "cat": "EQUIPO AUTONOMO N3", "item": "Manómetros", "cant": "N/A" },
{ "cat": "EQUIPO AUTONOMO N3", "item": " Estado del Visor", "cant": "N/A" },
{ "cat": "EQUIPO AUTONOMO N4", "item": "Presión de aire respirable", "cant": "N/A" },
{ "cat": "EQUIPO AUTONOMO N4", "item": "Máscara facial completa", "cant": "N/A" },
{ "cat": "EQUIPO AUTONOMO N4", "item": "Estado de válvula y acople", "cant": "N/A" },
{ "cat": "EQUIPO AUTONOMO N4", "item": "Estado de reguladoras", "cant": "N/A" },
{ "cat": "EQUIPO AUTONOMO N4", "item": "Mangueras ", "cant": "N/A" },
{ "cat": "EQUIPO AUTONOMO N4", "item": "Arnés y ganchos", "cant": "N/A" },
{ "cat": "EQUIPO AUTONOMO N4", "item": "Prueba de funcionamiento", "cant": "N/A" },
{ "cat": "EQUIPO AUTONOMO N4", "item": "Alarma de equipo", "cant": "N/A" },
{ "cat": "EQUIPO AUTONOMO N4", "item": "Manómetros", "cant": "N/A" },
{ "cat": "EQUIPO AUTONOMO N4", "item": " Estado del Visor", "cant": "N/A" },
{ "cat": "EQUIPO AUTONOMO N5", "item": "Presión de aire respirable", "cant": "N/A" },
{ "cat": "EQUIPO AUTONOMO N5", "item": "Máscara facial completa", "cant": "N/A" },
{ "cat": "EQUIPO AUTONOMO N5", "item": "Estado de válvula y acople", "cant": "N/A" },
{ "cat": "EQUIPO AUTONOMO N5", "item": "Estado de reguladoras", "cant": "N/A" },
{ "cat": "EQUIPO AUTONOMO N5", "item": "Mangueras ", "cant": "N/A" },
{ "cat": "EQUIPO AUTONOMO N5", "item": "Arnés y ganchos", "cant": "N/A" },
{ "cat": "EQUIPO AUTONOMO N5", "item": "Prueba de funcionamiento", "cant": "N/A" },
{ "cat": "EQUIPO AUTONOMO N5", "item": "Alarma de equipo", "cant": "N/A" },
{ "cat": "EQUIPO AUTONOMO N5", "item": "Manómetros", "cant": "N/A" },
{ "cat": "EQUIPO AUTONOMO N5", "item": " Estado del Visor", "cant": "N/A" },
{ "cat": "TUBO DE REPUESTO N1", "item": "Presión de aire respirable", "cant": "N/A" },
{ "cat": "TUBO DE REPUESTO N1", "item": "Estado de manómetro", "cant": "N/A" },
{ "cat": "TUBO DE REPUESTO N1", "item": "Estado de entrada de aire ", "cant": "N/A" },
{ "cat": "TUBO DE REPUESTO N1", "item": "Fecha de vencimiento de PH", "cant": "N/A" },
{ "cat": "TUBO DE REPUESTO N2", "item": "Presión de aire respirable", "cant": "N/A" },
{ "cat": "TUBO DE REPUESTO N2", "item": "Estado de manómetro", "cant": "N/A" },
{ "cat": "TUBO DE REPUESTO N2", "item": "Estado de entrada de aire ", "cant": "N/A" },
{ "cat": "TUBO DE REPUESTO N2", "item": "Fecha de vencimiento de PH", "cant": "N/A" },];

const CONTROLES_CENTRAL = [ { cat: "COMPRESOR OCEANIC", item: "Nivel de combustible", tipo: "combustible", cant: "-" },
{ cat: "COMPRESOR OCEANIC", item: "Nivel de aceite motor", cant: "-" },
{ cat: "COMPRESOR OCEANIC", item: "Nivel de aceite del compresor", cant: "-" },
{ cat: "COMPRESOR OCEANIC", item: "Estado de bujía", cant: "-" },
{ cat: "COMPRESOR OCEANIC", item: "Puesta en marcha", cant: "-" },
{ cat: "COMPRESOR OCEANIC", item: "Limpieza de filtro de aire", cant: "-" },
{ cat: "COMPRESOR OCEANIC", item: "Mantenimiento general", cant: "-" },
{ cat: "COMPRESOR OCEANIC", item: "Horas de uso", tipo: "escritura", cant: "-" }, 
{ cat: "COMPRESOR OCEANIC", item: "Manguera y manómetro hasta 150", cant: "-" },
{ cat: "COMPRESOR OCEANIC", item: "Manguera y manómetro hasta 300", cant: "-" },
{ cat: "COMPRESOR OCEANIC", item: "Tension de correa", cant: "-" },
{ cat: "COMPRESOR OCEANIC", item: "Estado de válvulas de carga", cant: "-" },
{ cat: "COMPRESOR OCEANIC", item: "O-rings de válvula de carga", cant: "-" },
{ cat: "BATERIA DE AIRE", item: "Estado de válvulas de carga", cant: "-" },
{ cat: "BATERIA DE AIRE", item: "O-rings de válvula de carga", cant: "-" },
{ cat: "BATERIA DE AIRE", item: "Estado de válvulas de tubos", cant: "-" },
{ cat: "BATERIA DE AIRE", item: "Estado de mangueras", cant: "-" },
{ cat: "BATERIA DE AIRE", item: "Estado de manómetros", cant: "-" },
{ cat: "BATERIA DE AIRE", item: "Estado de acoples de tubos", cant: "-" },
{ cat: "BATERIA DE AIRE", item: "Perdidas", cant: "-" },
{ cat: "BATERIA DE AIRE", item: "Mantenimiento general", cant: "-" },
{ cat: "BATERIA DE AIRE", item: "Limpieza", cant: "-" },
{ cat: "BATERIA DE AIRE", item: "Cantidad de aire Cilindro Nº 1", tipo: "escritura", cant: "-" },
{ cat: "BATERIA DE AIRE", item: "Cantidad de aire Cilindro Nº 2", tipo: "escritura", cant: "-" },
{ cat: "BATERIA DE AIRE", item: "Cantidad de aire Cilindro Nº 3", tipo: "escritura", cant: "-" },
{ cat: "BATERIA DE AIRE", item: "Cantidad de aire Cilindro Nº 4", tipo: "escritura", cant: "-" },
{ cat: "BATERIA DE AIRE BAUER", item: "Estado de válvulas de carga", cant: "-" },
{ cat: "BATERIA DE AIRE BAUER", item: "O-rings de válvula de carga", cant: "-" },
{ cat: "BATERIA DE AIRE BAUER", item: "Estado de válvulas de tubos", cant: "-" },
{ cat: "BATERIA DE AIRE BAUER", item: "Estado de mangueras", cant: "-" },
{ cat: "BATERIA DE AIRE BAUER", item: "Estado de manómetros", cant: "-" },
{ cat: "BATERIA DE AIRE BAUER", item: "Estado de acoples de tubos", cant: "-" },
{ cat: "BATERIA DE AIRE BAUER", item: "Perdidas", cant: "-" },
{ cat: "BATERIA DE AIRE BAUER", item: "Mantenimiento general", cant: "-" },
{ cat: "BATERIA DE AIRE BAUER", item: "Limpieza", cant: "-" }, 
{ cat: "BATERIA DE AIRE BAUER", item: "Cantidad de aire Cilindro Nº 1", tipo: "escritura", cant: "-" },
{ cat: "BATERIA DE AIRE BAUER", item: "Cantidad de aire Cilindro Nº 2", tipo: "escritura", cant: "-" },
{ cat: "BATERIA DE AIRE BAUER", item: "Cantidad de aire Cilindro Nº 3", tipo: "escritura", cant: "-" },
{ cat: "BATERIA DE AIRE BAUER", item: "Cantidad de aire Cilindro Nº 4", tipo: "escritura", cant: "-" },
{ cat: "BATERIA DE AIRE BAUER", item: "Cantidad de aire Cilindro Nº 5", tipo: "escritura", cant: "-" },
{ cat: "EXTINTOR - SALON", item: "N° Interno", tipo: "escritura", cant: "-" },
    { cat: "EXTINTOR - SALON", item: "N° Cilindro", tipo: "escritura", cant: "-" },
    { cat: "EXTINTOR - SALON", item: "Vencimiento Carga", tipo: "escritura", cant: "-" },
    { cat: "EXTINTOR - SALON", item: "Vencimiento P/H", tipo: "escritura", cant: "-" },
    { cat: "EXTINTOR - SALON", item: "Estado Tobera", cant: "-" },
    { cat: "EXTINTOR - SALON", item: "Estado Manómetro", cant: "-" },
    { cat: "EXTINTOR - SALON", item: "Estado Carga", cant: "-" },
    { cat: "EXTINTOR - SALON", item: "Limpieza", cant: "-" },
    { cat: "EXTINTOR - SALON", item: "Seguro Colocado", cant: "-" },

    // Ubicación: COCINA SALON
    { cat: "EXTINTOR - COCINA SALON", item: "N° Interno", tipo: "escritura", cant: "-" },
    { cat: "EXTINTOR - COCINA SALON", item: "N° Cilindro", tipo: "escritura", cant: "-" },
    { cat: "EXTINTOR - COCINA SALON", item: "Vencimiento Carga", tipo: "escritura", cant: "-" },
    { cat: "EXTINTOR - COCINA SALON", item: "Vencimiento P/H", tipo: "escritura", cant: "-" },
    { cat: "EXTINTOR - COCINA SALON", item: "Estado Tobera", cant: "-" },
    { cat: "EXTINTOR - COCINA SALON", item: "Estado Manómetro", cant: "-" },
    { cat: "EXTINTOR - COCINA SALON", item: "Estado Carga", cant: "-" },
    { cat: "EXTINTOR - COCINA SALON", item: "Limpieza", cant: "-" },
    { cat: "EXTINTOR - COCINA SALON", item: "Seguro Colocado", cant: "-" },

    // Ubicación: CAPACITACION
    { cat: "EXTINTOR - CAPACITACION", item: "N° Interno", tipo: "escritura", cant: "-" },
    { cat: "EXTINTOR - CAPACITACION", item: "N° Cilindro", tipo: "escritura", cant: "-" },
    { cat: "EXTINTOR - CAPACITACION", item: "Vencimiento Carga", tipo: "escritura", cant: "-" },
    { cat: "EXTINTOR - CAPACITACION", item: "Vencimiento P/H", tipo: "escritura", cant: "-" },
    { cat: "EXTINTOR - CAPACITACION", item: "Estado Tobera", cant: "-" },
    { cat: "EXTINTOR - CAPACITACION", item: "Estado Manómetro", cant: "-" },
    { cat: "EXTINTOR - CAPACITACION", item: "Estado Carga", cant: "-" },
    { cat: "EXTINTOR - CAPACITACION", item: "Limpieza", cant: "-" },
    { cat: "EXTINTOR - CAPACITACION", item: "Seguro Colocado", cant: "-" },

    // Ubicación: FOGON
    { cat: "EXTINTOR - FOGON", item: "N° Interno", tipo: "escritura", cant: "-" },
    { cat: "EXTINTOR - FOGON", item: "N° Cilindro", tipo: "escritura", cant: "-" },
    { cat: "EXTINTOR - FOGON", item: "Vencimiento Carga", tipo: "escritura", cant: "-" },
    { cat: "EXTINTOR - FOGON", item: "Vencimiento P/H", tipo: "escritura", cant: "-" },
    { cat: "EXTINTOR - FOGON", item: "Estado Tobera", cant: "-" },
    { cat: "EXTINTOR - FOGON", item: "Estado Manómetro", cant: "-" },
    { cat: "EXTINTOR - FOGON", item: "Estado Carga", cant: "-" },
    { cat: "EXTINTOR - FOGON", item: "Limpieza", cant: "-" },
    { cat: "EXTINTOR - FOGON", item: "Seguro Colocado", cant: "-" },

    // Ubicación: PASILLO
    { cat: "EXTINTOR - PASILLO", item: "N° Interno", tipo: "escritura", cant: "-" },
    { cat: "EXTINTOR - PASILLO", item: "N° Cilindro", tipo: "escritura", cant: "-" },
    { cat: "EXTINTOR - PASILLO", item: "Vencimiento Carga", tipo: "escritura", cant: "-" },
    { cat: "EXTINTOR - PASILLO", item: "Vencimiento P/H", tipo: "escritura", cant: "-" },
    { cat: "EXTINTOR - PASILLO", item: "Estado Tobera", cant: "-" },
    { cat: "EXTINTOR - PASILLO", item: "Estado Manómetro", cant: "-" },
    { cat: "EXTINTOR - PASILLO", item: "Estado Carga", cant: "-" },
    { cat: "EXTINTOR - PASILLO", item: "Limpieza", cant: "-" },
    { cat: "EXTINTOR - PASILLO", item: "Seguro Colocado", cant: "-" },

    // Ubicación: CUADRA (1)
    { cat: "EXTINTOR - CUADRA (1)", item: "N° Interno", tipo: "escritura", cant: "-" },
    { cat: "EXTINTOR - CUADRA (1)", item: "N° Cilindro", tipo: "escritura", cant: "-" },
    { cat: "EXTINTOR - CUADRA (1)", item: "Vencimiento Carga", tipo: "escritura", cant: "-" },
    { cat: "EXTINTOR - CUADRA (1)", item: "Vencimiento P/H", tipo: "escritura", cant: "-" },
    { cat: "EXTINTOR - CUADRA (1)", item: "Estado Tobera", cant: "-" },
    { cat: "EXTINTOR - CUADRA (1)", item: "Estado Manómetro", cant: "-" },
    { cat: "EXTINTOR - CUADRA (1)", item: "Estado Carga", cant: "-" },
    { cat: "EXTINTOR - CUADRA (1)", item: "Limpieza", cant: "-" },
    { cat: "EXTINTOR - CUADRA (1)", item: "Seguro Colocado", cant: "-" },

    // Ubicación: PATIO
    { cat: "EXTINTOR - PATIO", item: "N° Interno", tipo: "escritura", cant: "-" },
    { cat: "EXTINTOR - PATIO", item: "N° Cilindro", tipo: "escritura", cant: "-" },
    { cat: "EXTINTOR - PATIO", item: "Vencimiento Carga", tipo: "escritura", cant: "-" },
    { cat: "EXTINTOR - PATIO", item: "Vencimiento P/H", tipo: "escritura", cant: "-" },
    { cat: "EXTINTOR - PATIO", item: "Estado Tobera", cant: "-" },
    { cat: "EXTINTOR - PATIO", item: "Estado Manómetro", cant: "-" },
    { cat: "EXTINTOR - PATIO", item: "Estado Carga", cant: "-" },
    { cat: "EXTINTOR - PATIO", item: "Limpieza", cant: "-" },
    { cat: "EXTINTOR - PATIO", item: "Seguro Colocado", cant: "-" },

    // Ubicación: MATERIALES
    { cat: "EXTINTOR - MATERIALES", item: "N° Interno", tipo: "escritura", cant: "-" },
    { cat: "EXTINTOR - MATERIALES", item: "N° Cilindro", tipo: "escritura", cant: "-" },
    { cat: "EXTINTOR - MATERIALES", item: "Vencimiento Carga", tipo: "escritura", cant: "-" },
    { cat: "EXTINTOR - MATERIALES", item: "Vencimiento P/H", tipo: "escritura", cant: "-" },
    { cat: "EXTINTOR - MATERIALES", item: "Estado Tobera", cant: "-" },
    { cat: "EXTINTOR - MATERIALES", item: "Estado Manómetro", cant: "-" },
    { cat: "EXTINTOR - MATERIALES", item: "Estado Carga", cant: "-" },
    { cat: "EXTINTOR - MATERIALES", item: "Limpieza", cant: "-" },
    { cat: "EXTINTOR - MATERIALES", item: "Seguro Colocado", cant: "-" },

    // Ubicación: UNIDAD 16
    { cat: "EXTINTOR - UNIDAD 16", item: "N° Interno", tipo: "escritura", cant: "-" },
    { cat: "EXTINTOR - UNIDAD 16", item: "N° Cilindro", tipo: "escritura", cant: "-" },
    { cat: "EXTINTOR - UNIDAD 16", item: "Vencimiento Carga", tipo: "escritura", cant: "-" },
    { cat: "EXTINTOR - UNIDAD 16", item: "Vencimiento P/H", tipo: "escritura", cant: "-" },
    { cat: "EXTINTOR - UNIDAD 16", item: "Estado Tobera", cant: "-" },
    { cat: "EXTINTOR - UNIDAD 16", item: "Estado Manómetro", cant: "-" },
    { cat: "EXTINTOR - UNIDAD 16", item: "Estado Carga", cant: "-" },
    { cat: "EXTINTOR - UNIDAD 16", item: "Limpieza", cant: "-" },
    { cat: "EXTINTOR - UNIDAD 16", item: "Seguro Colocado", cant: "-" },

    // Ubicación: UNIDAD 2
    { cat: "EXTINTOR - UNIDAD 2", item: "N° Interno", tipo: "escritura", cant: "-" },
    { cat: "EXTINTOR - UNIDAD 2", item: "N° Cilindro", tipo: "escritura", cant: "-" },
    { cat: "EXTINTOR - UNIDAD 2", item: "Vencimiento Carga", tipo: "escritura", cant: "-" },
    { cat: "EXTINTOR - UNIDAD 2", item: "Vencimiento P/H", tipo: "escritura", cant: "-" },
    { cat: "EXTINTOR - UNIDAD 2", item: "Estado Tobera", cant: "-" },
    { cat: "EXTINTOR - UNIDAD 2", item: "Estado Manómetro", cant: "-" },
    { cat: "EXTINTOR - UNIDAD 2", item: "Estado Carga", cant: "-" },
    { cat: "EXTINTOR - UNIDAD 2", item: "Limpieza", cant: "-" },
    { cat: "EXTINTOR - UNIDAD 2", item: "Seguro Colocado", cant: "-" },

    // Ubicación: UNIDAD 3
    { cat: "EXTINTOR - UNIDAD 3", item: "N° Interno", tipo: "escritura", cant: "-" },
    { cat: "EXTINTOR - UNIDAD 3", item: "N° Cilindro", tipo: "escritura", cant: "-" },
    { cat: "EXTINTOR - UNIDAD 3", item: "Vencimiento Carga", tipo: "escritura", cant: "-" },
    { cat: "EXTINTOR - UNIDAD 3", item: "Vencimiento P/H", tipo: "escritura", cant: "-" },
    { cat: "EXTINTOR - UNIDAD 3", item: "Estado Tobera", cant: "-" },
    { cat: "EXTINTOR - UNIDAD 3", item: "Estado Manómetro", cant: "-" },
    { cat: "EXTINTOR - UNIDAD 3", item: "Estado Carga", cant: "-" },
    { cat: "EXTINTOR - UNIDAD 3", item: "Limpieza", cant: "-" },
    { cat: "EXTINTOR - UNIDAD 3", item: "Seguro Colocado", cant: "-" },



    // Ubicación: UNIDAD 5
    { cat: "EXTINTOR - UNIDAD 5", item: "N° Interno", tipo: "escritura", cant: "-" },
    { cat: "EXTINTOR - UNIDAD 5", item: "N° Cilindro", tipo: "escritura", cant: "-" },
    { cat: "EXTINTOR - UNIDAD 5", item: "Vencimiento Carga", tipo: "escritura", cant: "-" },
    { cat: "EXTINTOR - UNIDAD 5", item: "Vencimiento P/H", tipo: "escritura", cant: "-" },
    { cat: "EXTINTOR - UNIDAD 5", item: "Estado Tobera", cant: "-" },
    { cat: "EXTINTOR - UNIDAD 5", item: "Estado Manómetro", cant: "-" },
    { cat: "EXTINTOR - UNIDAD 5", item: "Estado Carga", cant: "-" },
    { cat: "EXTINTOR - UNIDAD 5", item: "Limpieza", cant: "-" },
    { cat: "EXTINTOR - UNIDAD 5", item: "Seguro Colocado", cant: "-" },

    // Ubicación: UNIDAD 6
    { cat: "EXTINTOR - UNIDAD 6", item: "N° Interno", tipo: "escritura", cant: "-" },
    { cat: "EXTINTOR - UNIDAD 6", item: "N° Cilindro", tipo: "escritura", cant: "-" },
    { cat: "EXTINTOR - UNIDAD 6", item: "Vencimiento Carga", tipo: "escritura", cant: "-" },
    { cat: "EXTINTOR - UNIDAD 6", item: "Vencimiento P/H", tipo: "escritura", cant: "-" },
    { cat: "EXTINTOR - UNIDAD 6", item: "Estado Tobera", cant: "-" },
    { cat: "EXTINTOR - UNIDAD 6", item: "Estado Manómetro", cant: "-" },
    { cat: "EXTINTOR - UNIDAD 6", item: "Estado Carga", cant: "-" },
    { cat: "EXTINTOR - UNIDAD 6", item: "Limpieza", cant: "-" },
    { cat: "EXTINTOR - UNIDAD 6", item: "Seguro Colocado", cant: "-" },

    // Ubicación: UNIDAD 10
    { cat: "EXTINTOR - UNIDAD 10", item: "N° Interno", tipo: "escritura", cant: "-" },
    { cat: "EXTINTOR - UNIDAD 10", item: "N° Cilindro", tipo: "escritura", cant: "-" },
    { cat: "EXTINTOR - UNIDAD 10", item: "Vencimiento Carga", tipo: "escritura", cant: "-" },
    { cat: "EXTINTOR - UNIDAD 10", item: "Vencimiento P/H", tipo: "escritura", cant: "-" },
    { cat: "EXTINTOR - UNIDAD 10", item: "Estado Tobera", cant: "-" },
    { cat: "EXTINTOR - UNIDAD 10", item: "Estado Manómetro", cant: "-" },
    { cat: "EXTINTOR - UNIDAD 10", item: "Estado Carga", cant: "-" },
    { cat: "EXTINTOR - UNIDAD 10", item: "Limpieza", cant: "-" },
    { cat: "EXTINTOR - UNIDAD 10", item: "Seguro Colocado", cant: "-" },

    // Ubicación: UNIDAD 11
    { cat: "EXTINTOR - UNIDAD 11", item: "N° Interno", tipo: "escritura", cant: "-" },
    { cat: "EXTINTOR - UNIDAD 11", item: "N° Cilindro", tipo: "escritura", cant: "-" },
    { cat: "EXTINTOR - UNIDAD 11", item: "Vencimiento Carga", tipo: "escritura", cant: "-" },
    { cat: "EXTINTOR - UNIDAD 11", item: "Vencimiento P/H", tipo: "escritura", cant: "-" },
    { cat: "EXTINTOR - UNIDAD 11", item: "Estado Tobera", cant: "-" },
    { cat: "EXTINTOR - UNIDAD 11", item: "Estado Manómetro", cant: "-" },
    { cat: "EXTINTOR - UNIDAD 11", item: "Estado Carga", cant: "-" },
    { cat: "EXTINTOR - UNIDAD 11", item: "Limpieza", cant: "-" },
    { cat: "EXTINTOR - UNIDAD 11", item: "Seguro Colocado", cant: "-" },

    // Ubicación: UNIDAD 8
    { cat: "EXTINTOR - UNIDAD 8", item: "N° Interno", tipo: "escritura", cant: "-" },
    { cat: "EXTINTOR - UNIDAD 8", item: "N° Cilindro", tipo: "escritura", cant: "-" },
    { cat: "EXTINTOR - UNIDAD 8", item: "Vencimiento Carga", tipo: "escritura", cant: "-" },
    { cat: "EXTINTOR - UNIDAD 8", item: "Vencimiento P/H", tipo: "escritura", cant: "-" },
    { cat: "EXTINTOR - UNIDAD 8", item: "Estado Tobera", cant: "-" },
    { cat: "EXTINTOR - UNIDAD 8", item: "Estado Manómetro", cant: "-" },
    { cat: "EXTINTOR - UNIDAD 8", item: "Estado Carga", cant: "-" },
    { cat: "EXTINTOR - UNIDAD 8", item: "Limpieza", cant: "-" },
    { cat: "EXTINTOR - UNIDAD 8", item: "Seguro Colocado", cant: "-" },

    // Ubicación: UNIDAD 9
    { cat: "EXTINTOR - UNIDAD 9", item: "N° Interno", tipo: "escritura", cant: "-" },
    { cat: "EXTINTOR - UNIDAD 9", item: "N° Cilindro", tipo: "escritura", cant: "-" },
    { cat: "EXTINTOR - UNIDAD 9", item: "Vencimiento Carga", tipo: "escritura", cant: "-" },
    { cat: "EXTINTOR - UNIDAD 9", item: "Vencimiento P/H", tipo: "escritura", cant: "-" },
    { cat: "EXTINTOR - UNIDAD 9", item: "Estado Tobera", cant: "-" },
    { cat: "EXTINTOR - UNIDAD 9", item: "Estado Manómetro", cant: "-" },
    { cat: "EXTINTOR - UNIDAD 9", item: "Estado Carga", cant: "-" },
    { cat: "EXTINTOR - UNIDAD 9", item: "Limpieza", cant: "-" },
    { cat: "EXTINTOR - UNIDAD 9", item: "Seguro Colocado", cant: "-" }
];]

const CONTROLES_DESTACAMENTO = [ { cat: "COMPRESOR OCEANIC", item: "Nivel de combustible", tipo: "combustible", cant: "-" },
    { cat: "COMPRESOR OCEANIC", item: "Estado del combustible", cant: "-" },
    { cat: "COMPRESOR OCEANIC", item: "Nivel de aceite motor", cant: "-" },
    { cat: "COMPRESOR OCEANIC", item: "Estado del aceite del motor", cant: "-" },
    { cat: "COMPRESOR OCEANIC", item: "Nivel de aceite del compresor", cant: "-" },
    { cat: "COMPRESOR OCEANIC", item: "Estado de bujía", cant: "-" },
    { cat: "COMPRESOR OCEANIC", item: "Puesta en marcha", cant: "-" },
    { cat: "COMPRESOR OCEANIC", item: "Limpieza de filtro de aire", cant: "-" },
    { cat: "COMPRESOR OCEANIC", item: "Mantenimiento general", cant: "-" },
    { cat: "COMPRESOR OCEANIC", item: "Horas de uso", tipo: "escritura", cant: "-" },
    { cat: "COMPRESOR OCEANIC", item: "Manguera y manómetro hasta 300", cant: "-" },
    { cat: "COMPRESOR OCEANIC", item: "Tension de correa", cant: "-" },
    { cat: "COMPRESOR OCEANIC", item: "Estado de válvulas de carga", cant: "-" },
    { cat: "COMPRESOR OCEANIC", item: "O-rings de válvula de carga", cant: "-" },
    { cat: "MOTOSIERRA", item: "Nivel de combustible", tipo: "combustible", cant: "-" },
    { cat: "MOTOSIERRA", item: "Estado del combustible", cant: "-" },
    { cat: "MOTOSIERRA", item: "Nivel de aceite de cadena", cant: "-" },
    { cat: "MOTOSIERRA", item: "Estado de bujia", cant: "-" },
    { cat: "MOTOSIERRA", item: "Estado de espada", cant: "-" },
    { cat: "MOTOSIERRA", item: "Estado de cadena", cant: "-" },
    { cat: "MOTOSIERRA", item: "Tensión de cadena", cant: "-" },
    { cat: "MOTOSIERRA", item: "Estado de traba de cadena", cant: "-" },
    { cat: "MOTOSIERRA", item: "Estado de piola", cant: "-" },
    { cat: "MOTOSIERRA", item: "Puesta en marcha", cant: "-" },
    { cat: "MOTOSIERRA", item: "Limpieza de filtro", cant: "-" },
    { cat: "MOTOSIERRA", item: "Mantenimiento general", cant: "-" },
    { cat: "MOTOSIERRA", item: "Limpieza", cant: "-" },
{ "cat": "EXTINTOR ZOOM", "item": "Numero Interno", "cant": "N/A" },
{ "cat": "EXTINTOR ZOOM", "item": "Numero de Cilindro", "cant": "N/A" },
{ "cat": "EXTINTOR ZOOM", "item": "Vencimiento de Carga", "cant": "N/A" },
{ "cat": "EXTINTOR ZOOM", "item": "Vencimiento de P/H", "cant": "N/A" },
{ "cat": "EXTINTOR ZOOM", "item": "Seguro Colocado", "cant": "N/A" },
{ "cat": "EXTINTOR ZOOM", "item": "Estado de la Tobera", "cant": "N/A" },
{ "cat": "EXTINTOR ZOOM", "item": "Estado de Manómetro", "cant": "N/A" },
{ "cat": "EXTINTOR ZOOM", "item": "Estado de Carga", "cant": "N/A" },
{ "cat": "EXTINTOR ZOOM", "item": "Limpieza", "cant": "N/A" },
{ "cat": "EXTINTOR CUADRA", "item": "Numero Interno", "cant": "N/A" },
{ "cat": "EXTINTOR CUADRA", "item": "Numero de Cilindro", "cant": "N/A" },
{ "cat": "EXTINTOR CUADRA", "item": "Vencimiento de Carga", "cant": "N/A" },
{ "cat": "EXTINTOR CUADRA", "item": "Vencimiento de P/H", "cant": "N/A" },
{ "cat": "EXTINTOR CUADRA", "item": "Seguro Colocado", "cant": "N/A" },
{ "cat": "EXTINTOR CUADRA", "item": "Estado de la Tobera", "cant": "N/A" },
{ "cat": "EXTINTOR CUADRA", "item": "Estado de Manómetro", "cant": "N/A" },
{ "cat": "EXTINTOR CUADRA", "item": "Estado de Carga", "cant": "N/A" },
{ "cat": "EXTINTOR CUADRA", "item": "Limpieza", "cant": "N/A" },
{ "cat": "EXTINTOR GUARDIA", "item": "Numero Interno", "cant": "N/A" },
{ "cat": "EXTINTOR GUARDIA", "item": "Numero de Cilindro", "cant": "N/A" },
{ "cat": "EXTINTOR GUARDIA", "item": "Vencimiento de Carga", "cant": "N/A" },
{ "cat": "EXTINTOR GUARDIA", "item": "Vencimiento de P/H", "cant": "N/A" },
{ "cat": "EXTINTOR GUARDIA", "item": "Seguro Colocado", "cant": "N/A" },
{ "cat": "EXTINTOR GUARDIA", "item": "Estado de la Tobera", "cant": "N/A" },
{ "cat": "EXTINTOR GUARDIA", "item": "Estado de Manómetro", "cant": "N/A" },
{ "cat": "EXTINTOR GUARDIA", "item": "Estado de Carga", "cant": "N/A" },
{ "cat": "EXTINTOR GUARDIA", "item": "Limpieza", "cant": "N/A" },
{ "cat": "EXTINTOR UNIDAD 13", "item": "Numero Interno", "cant": "N/A" },
{ "cat": "EXTINTOR UNIDAD 13", "item": "Numero de Cilindro", "cant": "N/A" },
{ "cat": "EXTINTOR UNIDAD 13", "item": "Vencimiento de Carga", "cant": "N/A" },
{ "cat": "EXTINTOR UNIDAD 13", "item": "Vencimiento de P/H", "cant": "N/A" },
{ "cat": "EXTINTOR UNIDAD 13", "item": "Seguro Colocado", "cant": "N/A" },
{ "cat": "EXTINTOR UNIDAD 13", "item": "Estado de la Tobera", "cant": "N/A" },
{ "cat": "EXTINTOR UNIDAD 13", "item": "Estado de Manómetro", "cant": "N/A" },
{ "cat": "EXTINTOR UNIDAD 13", "item": "Estado de Carga", "cant": "N/A" },
{ "cat": "EXTINTOR UNIDAD 13", "item": "Limpieza", "cant": "N/A" },];



