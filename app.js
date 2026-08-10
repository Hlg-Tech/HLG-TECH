const API_URL = 'https://script.google.com/macros/s/AKfycbxVr5nPd0y3alsnYKfnE-Nyscy8inDEdKxszF7vKEM_lD8zYCR9WWCFEnMhzT2ulmghWA/exec';

        const CLOUDINARY_CLOUD_NAME = 'kla50st7';
        const CLOUDINARY_UPLOAD_PRESET = 'HLG TECH';

        async function subirImagenACloudinary(inputElement) {
            const file = inputElement.files[0];
            if (!file) return;

            mostrarLoaderNeon("Subiendo imagen a Cloudinary...");

            const formData = new FormData();
            formData.append('file', file);
            formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

            try {
                const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, {
                    method: 'POST',
                    body: formData
                });

                const data = await response.json();
                ocultarLoaderNeon();

                if (data.secure_url) {
                    document.getElementById('prodImagenUrl').value = data.secure_url;
                    mostrarAlerta("Éxito", "Imagen subida correctamente a Cloudinary.");
                } else {
                    mostrarAlerta("Error", "No se pudo subir la imagen.");
                }
            } catch (error) {
                ocultarLoaderNeon();
                mostrarAlerta("Error", "Ocurrió un error al conectar con Cloudinary.");
            }
        }

        let globalDataCache = null;
        let modoEdicion = 'nuevo';
        let ordenActualId = null;
        let promptCallback = null;

        function mostrarAlerta(titulo, mensaje) {
            document.getElementById('customAlertTitle').innerText = titulo;
            document.getElementById('customAlertMessage').innerText = mensaje;
            document.getElementById('customAlertModal').style.display = 'flex';
        }
        function cerrarCustomAlert() { document.getElementById('customAlertModal').style.display = 'none'; }

        function abrirPromptPersonalizado(titulo, descripcion, valorInicial, callback) {
            document.getElementById('customPromptTitle').innerText = titulo;
            document.getElementById('customPromptDesc').innerText = descripcion;
            const input = document.getElementById('customPromptInput');
            input.value = valorInicial || '';
            promptCallback = callback;
            document.getElementById('customPromptModal').style.display = 'flex';
            input.focus();
        }
        function cerrarCustomPrompt(confirmado) {
            document.getElementById('customPromptModal').style.display = 'none';
            if (promptCallback) {
                const valor = document.getElementById('customPromptInput').value;
                promptCallback(confirmado ? valor : null);
                promptCallback = null;
            }
        }

        function mostrarLoaderNeon(txt) {
            document.getElementById('neonLoaderText').innerText = txt;
            document.getElementById('neonLoaderOverlay').style.display = 'flex';
        }
        function ocultarLoaderNeon() { document.getElementById('neonLoaderOverlay').style.display = 'none'; }

        async function verificarAcceso() {
            const input = document.getElementById('adminEmailInput').value.trim().toLowerCase();
            mostrarLoaderNeon("Verificando...");
            try {
                const res = await fetch(API_URL);
                const data = await res.json();
                ocultarLoaderNeon();
                if ((data.admins || []).includes(input)) {
                    localStorage.setItem('hlg_admin_email', input);
                    document.getElementById('authScreen').style.display = 'none';
                    document.getElementById('userDisplay').innerText = input;
                    procesarDatosGlobales(data);
                    iniciarMonitoreoNotificaciones();
                } else {
                    document.getElementById('authError').style.display = 'block';
                }
            } catch (e) {
                ocultarLoaderNeon();
                document.getElementById('authError').style.display = 'block';
            }
        }

        window.addEventListener('DOMContentLoaded', async () => {
            const guardado = localStorage.getItem('hlg_admin_email');
            if (guardado) {
                try {
                    const res = await fetch(API_URL);
                    const data = await res.json();
                    if ((data.admins || []).includes(guardado)) {
                        document.getElementById('authScreen').style.display = 'none';
                        document.getElementById('userDisplay').innerText = guardado;
                        procesarDatosGlobales(data);
                        iniciarMonitoreoNotificaciones();
                    }
                } catch (e) { console.error(e); }
            }
        });

        function cerrarSesion() { localStorage.removeItem('hlg_admin_email'); location.reload(); }
        function toggleSidebar() { document.getElementById('appSidebar').classList.toggle('open'); document.getElementById('sidebarOverlay').classList.toggle('open'); }

        function cambiarVista(vistaId) {
            document.querySelectorAll('.view-section').forEach(el => el.classList.remove('active'));
            document.getElementById('view-' + vistaId).classList.add('active');
            if (vistaId === 'productos') aplicarFiltrosProductos();
            if (vistaId === 'categorias') renderizarTablaCategorias();
            if (vistaId === 'usuarios') renderizarTablaUsuarios();
            if (vistaId === 'ordenes') aplicarFiltrosOrdenes();
            window.scrollTo(0, 0);
        }

        function procesarDatosGlobales(data) {
            globalDataCache = data;
            document.getElementById('statTotal').innerText = (data.productos || []).length;
            document.getElementById('statUsuarios').innerText = (data.usuarios || []).length;
            document.getElementById('statOrdenes').innerText = (data.ordenes || []).length;
            document.getElementById('statTasa').innerText = `${data.tasa || 650} CUP`;
            
            calcularResumenFinanciero(data.ordenes || [], data.productos || []);
            inicializarFiltrosProductos();
            actualizarCampanitaNotificaciones(data.ordenes || []);
        }

        function toggleNotificationDropdown() {
            document.getElementById('notifDropdown').classList.toggle('show');
        }

        window.addEventListener('click', function(e) {
            if (!e.target.closest('.notification-container')) {
                const dropdown = document.getElementById('notifDropdown');
                if (dropdown) dropdown.classList.remove('show');
            }
        });

        function actualizarCampanitaNotificaciones(ordenes) {
            const pendientes = ordenes.filter(o => {
                const estado = String(o.Estado || '').toLowerCase();
                return estado.includes('pendiente') || estado === '';
            });

            const badge = document.getElementById('notifBadge');
            const countText = document.getElementById('notifCountText');
            const listContainer = document.getElementById('notifList');

            if (pendientes.length > 0) {
                badge.innerText = pendientes.length;
                badge.style.display = 'inline-block';
                countText.innerText = `${pendientes.length} pendientes`;
                
                listContainer.innerHTML = '';
                pendientes.forEach(o => {
                    const item = document.createElement('div');
                    item.className = 'notification-item';
                    item.onclick = () => {
                        toggleNotificationDropdown();
                        abrirDetalleOrden(o.ID_Orden);
                    };
                    item.innerHTML = `
                        <strong>Orden #${o.ID_Orden} - $${parseFloat(o.Total || 0).toFixed(2)}</strong>
                        <span>${o.Correo || 'Cliente'} • ${o.Hora || 'Reciente'}</span>
                    `;
                    listContainer.appendChild(item);
                });
            } else {
                badge.style.display = 'none';
                countText.innerText = '0 pendientes';
                listContainer.innerHTML = `<div class="notification-item" style="text-align: center; color: var(--text-muted); cursor: default;">Sin órdenes pendientes</div>`;
            }
        }

        function iniciarMonitoreoNotificaciones() {
            setInterval(async () => {
                try {
                    const res = await fetch(API_URL);
                    const data = await res.json();
                    if (data && data.ordenes) {
                        globalDataCache = data;
                        document.getElementById('statTotal').innerText = (data.productos || []).length;
                        document.getElementById('statUsuarios').innerText = (data.usuarios || []).length;
                        document.getElementById('statOrdenes').innerText = (data.ordenes || []).length;
                        actualizarCampanitaNotificaciones(data.ordenes);
                    }
                } catch (e) { console.error(e); }
            }, 30000);
        }

        function calcularResumenFinanciero(ordenes, productos) {
            const ahora = new Date();
            let hoyV = 0, hoyC = 0, semV = 0, semC = 0, mesV = 0, mesC = 0;

            ordenes.forEach(o => {
                if (o.Estado === 'Cancelada') return;
                const fechaOrden = new Date(o.Hora || o.Fecha || Date.now());
                const ventaTotal = parseFloat(o.Total || 0);
                const costoTotal = parseFloat(o.CostoTotal || 0);

                if (esMismoDia(fechaOrden, ahora)) { hoyV += ventaTotal; hoyC += costoTotal; }
                if (esMismaSemana(fechaOrden, ahora)) { semV += ventaTotal; semC += costoTotal; }
                if (esMismoMes(fechaOrden, ahora)) { mesV += ventaTotal; mesC += costoTotal; }
            });

            document.getElementById('hoyVenta').innerText = `$${hoyV.toFixed(2)}`;
            document.getElementById('hoyCosto').innerText = `$${hoyC.toFixed(2)}`;
            document.getElementById('hoyGanancia').innerText = `$${(hoyV - hoyC).toFixed(2)}`;

            document.getElementById('semVenta').innerText = `$${semV.toFixed(2)}`;
            document.getElementById('semCosto').innerText = `$${semC.toFixed(2)}`;
            document.getElementById('semGanancia').innerText = `$${(semV - semC).toFixed(2)}`;

            document.getElementById('mesVenta').innerText = `$${mesV.toFixed(2)}`;
            document.getElementById('mesCosto').innerText = `$${mesC.toFixed(2)}`;
            document.getElementById('mesGanancia').innerText = `$${(mesV - mesC).toFixed(2)}`;
        }

        function esMismoDia(d1, d2) { return d1.toDateString() === d2.toDateString(); }
        function esMismoMes(d1, d2) { return d1.getMonth() === d2.getMonth() && d1.getFullYear() === d2.getFullYear(); }
        function esMismaSemana(d1, d2) {
            const onejan = new Date(d1.getFullYear(), 0, 1);
            const week1 = Math.ceil((((d1 - onejan) / 86400000) + onejan.getDay() + 1) / 7);
            const week2 = Math.ceil((((d2 - onejan) / 86400000) + onejan.getDay() + 1) / 7);
            return week1 === week2 && d1.getFullYear() === d2.getFullYear();
        }

        function renderizarTablaCategorias() {
            if (!globalDataCache) return;
            const tbody = document.getElementById('tablaCategoriasBody');
            tbody.innerHTML = "";
            (globalDataCache.categorias || []).forEach((cat, index) => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td style="color:var(--text-muted);">${index + 1}</td>
                    <td style="color:var(--accent); font-weight:bold;">${cat}</td>
                    <td><button class="btn-edit-row" onclick="editarCategoriaPrompt('${cat}')">Editar / Corregir</button></td>
                `;
                tbody.appendChild(tr);
            });
        }

        async function crearNuevaCategoriaSubmit() {
            const inputNombre = document.getElementById('nuevaCategoriaInput').value.trim();
            if (!inputNombre) { mostrarAlerta("Campo vacío", "Escribe un nombre para la categoría."); return; }
            
            mostrarLoaderNeon("Creando categoría...");
            const res = await fetch(API_URL, { method: 'POST', body: JSON.stringify({ accion: 'crear_categoria', nombre: inputNombre }) });
            const r = await res.json();
            if (r.success) {
                document.getElementById('nuevaCategoriaInput').value = "";
                const resReload = await fetch(API_URL);
                globalDataCache = await resReload.json();
                ocultarLoaderNeon();
                renderizarTablaCategorias();
                inicializarFiltrosProductos();
                mostrarAlerta("Éxito", "Categoría creada correctamente.");
            } else {
                ocultarLoaderNeon();
                mostrarAlerta("Error", "No se pudo crear la categoría.");
            }
        }

        function editarCategoriaPrompt(catAntigua) {
            abrirPromptPersonalizado("Editar Categoría", "Corrige o edita el nombre de la categoría:", catAntigua, async (catNueva) => {
                if (!catNueva || catNueva.trim() === "" || catNueva === catAntigua) return;

                mostrarLoaderNeon("Actualizando categoría...");
                const res = await fetch(API_URL, { method: 'POST', body: JSON.stringify({ accion: 'editar_categoria', antigua: catAntigua, nueva: catNueva.trim() }) });
                const r = await res.json();
                if (r.success) {
                    const resReload = await fetch(API_URL);
                    globalDataCache = await resReload.json();
                    ocultarLoaderNeon();
                    renderizarTablaCategorias();
                    inicializarFiltrosProductos();
                    mostrarAlerta("Éxito", "Categoría actualizada correctamente.");
                } else {
                    ocultarLoaderNeon();
                    mostrarAlerta("Error", "No se pudo actualizar la categoría.");
                }
            });
        }

        function renderizarTablaUsuarios() {
            if (!globalDataCache) return;
            const tbody = document.getElementById('tablaUsuariosBody');
            tbody.innerHTML = "";
            (globalDataCache.usuarios || []).forEach((u, index) => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td style="color:var(--text-muted);">${index + 1}</td>
                    <td style="color:var(--accent); font-weight:bold;">${u.Nombre || "Sin Nombre"}</td>
                    <td>${u.Correo || ""}</td>
                    <td>${u.Telefono || "N/A"}</td>
                    <td>${u.FechaRegistro || "N/A"}</td>
                `;
                tbody.appendChild(tr);
            });
        }

        function filtrarUsuarios() {
            const texto = document.getElementById('filtroBuscadorUsuarios').value.toLowerCase();
            document.querySelectorAll('#tablaUsuariosBody tr').forEach(r => {
                r.style.display = r.innerText.toLowerCase().includes(texto) ? "" : "none";
            });
        }

        function renderizarTablaOrdenes(ordenesMostrar) {
            const tbody = document.getElementById('tablaOrdenesBody');
            tbody.innerHTML = "";
            if (ordenesMostrar.length === 0) {
                tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;">No hay órdenes registradas.</td></tr>`;
                return;
            }
            ordenesMostrar.forEach(o => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td style="color:var(--accent); font-weight:bold;">${o.ID_Orden || "S/N"}</td>
                    <td>${o.Hora || ""}</td>
                    <td>${o.Correo || ""}</td>
                    <td>$${parseFloat(o.Total || 0).toFixed(2)}</td>
                    <td><span class="badge badge-estado">${o.Estado || "Pendiente"}</span></td>
                    <td><button class="btn-action" onclick="abrirDetalleOrden('${o.ID_Orden}')">Gestionar Pedido</button></td>
                `;
                tbody.appendChild(tr);
            });
        }

        function aplicarFiltrosOrdenes() {
            if (!globalDataCache) return;
            const listaOrdenes = globalDataCache.ordenes || [];
            const textoBuscador = document.getElementById('filtroOrdenTexto').value.trim().toLowerCase();
            const estadoSelect = document.getElementById('filtroOrdenEstado').value;
            const fechaDesdeStr = document.getElementById('filtroOrdenDesde').value;
            const fechaHastaStr = document.getElementById('filtroOrdenHasta').value;

            const fechaDesde = fechaDesdeStr ? new Date(fechaDesdeStr + 'T00:00:00') : null;
            const fechaHasta = fechaHastaStr ? new Date(fechaHastaStr + 'T23:59:59') : null;

            const filtradas = listaOrdenes.filter(o => {
                const idOrden = String(o.ID_Orden || '').toLowerCase();
                const correoCliente = String(o.Correo || '').toLowerCase();
                const nombreCliente = String(o.NombreUsuario || '').toLowerCase();

                if (textoBuscador && !idOrden.includes(textoBuscador) && !correoCliente.includes(textoBuscador) && !nombreCliente.includes(textoBuscador)) return false;
                if (estadoSelect !== 'TODAS' && !String(o.Estado || 'Pendiente').toLowerCase().includes(estadoSelect.toLowerCase())) return false;

                if (o.Hora || o.Fecha) {
                    const fechaOrden = new Date(o.Hora || o.Fecha);
                    if (!isNaN(fechaOrden.getTime())) {
                        if (fechaDesde && fechaOrden < fechaDesde) return false;
                        if (fechaHasta && fechaOrden > fechaHasta) return false;
                    }
                }
                return true;
            });

            renderizarTablaOrdenes(filtradas);
        }

        function abrirDetalleOrden(idOrden) {
            const orden = (globalDataCache.ordenes || []).find(o => String(o.ID_Orden) === String(idOrden));
            if (!orden) return;

            ordenActualId = idOrden;
            document.getElementById('detOrdenId').innerText = `Orden #${orden.ID_Orden}`;
            document.getElementById('detOrdenBadge').innerText = orden.Estado || "Pendiente";
            document.getElementById('detCliente').innerText = orden.NombreUsuario ? `${orden.NombreUsuario} (${orden.Correo})` : (orden.Correo || "N/A");
            document.getElementById('detTelefono').innerText = orden.Telefono || "N/A";
            document.getElementById('detDireccion').innerText = orden.Direccion || "N/A";
            document.getElementById('detFecha').innerText = orden.Hora || "N/A";

            const tbodyProd = document.getElementById('detTablaProductos');
            tbodyProd.innerHTML = "";
            let items = [];
            try { items = typeof orden.Productos === 'string' ? JSON.parse(orden.Productos) : (orden.Productos || []); } catch (e) { items = []; }

            items.forEach(item => {
                const tr = document.createElement('tr');
                const subtotal = (parseFloat(item.Precio) || 0) * (parseInt(item.Cantidad) || 1);
                tr.innerHTML = `
                    <td>${item.Nombre || item.Codigo}</td>
                    <td>${item.Cantidad || 1}</td>
                    <td>$${parseFloat(item.Precio || 0).toFixed(2)}</td>
                    <td>$${subtotal.toFixed(2)}</td>
                `;
                tbodyProd.appendChild(tr);
            });

            document.getElementById('detTotalCosto').innerText = `$${parseFloat(orden.CostoTotal || 0).toFixed(2)}`;
            document.getElementById('detTotalVenta').innerText = `$${parseFloat(orden.Total || 0).toFixed(2)}`;
            document.getElementById('detTotalGanancia').innerText = `$${(parseFloat(orden.Total || 0) - parseFloat(orden.CostoTotal || 0)).toFixed(2)}`;

            cambiarVista('detalle-orden');
        }

        async function actualizarEstadoOrdenActual(nuevoEstado) {
            if (!ordenActualId) return;
            mostrarLoaderNeon("Actualizando estado...");
            const res = await fetch(API_URL, {
                method: 'POST',
                body: JSON.stringify({ accion: 'actualizar_estado_orden', id_orden: ordenActualId, estado: nuevoEstado })
            });
            const r = await res.json();
            if (r.success) {
                const resReload = await fetch(API_URL);
                globalDataCache = await resReload.json();
                ocultarLoaderNeon();
                abrirDetalleOrden(ordenActualId);
            } else {
                ocultarLoaderNeon();
                mostrarAlerta("Error", "No se pudo actualizar el estado.");
            }
        }

        function inicializarFiltrosProductos() {
            if (!globalDataCache) return;
            const selectCat = document.getElementById('filtroCategoria');
            selectCat.innerHTML = `<option value="todos">📂 Todas las Categorías</option>`;
            (globalDataCache.categorias || []).forEach(cat => {
                const opt = document.createElement('option');
                opt.value = cat; opt.innerText = cat;
                selectCat.appendChild(opt);
            });
        }

        function aplicarFiltrosProductos() {
            if (!globalDataCache || !globalDataCache.productos) return;
            const tbody = document.getElementById('tablaProductosBody');
            tbody.innerHTML = "";

            const texto = document.getElementById('filtroTexto').value.toLowerCase();
            const catFiltro = document.getElementById('filtroCategoria').value;
            const estadoFiltro = document.getElementById('filtroEstado').value;
            const publicadoFiltro = document.getElementById('filtroPublicado').value;
            const stockFiltro = document.getElementById('filtroStock').value;

            const filtrados = (globalDataCache.productos || []).filter(p => {
                const nombre = String(p.Nombre || "").toLowerCase();
                const codigo = String(p.Codigo || "").toLowerCase();
                const categoria = String(p.Categoria || "General");
                const estado = String(p.Estado || "Disponible");
                const mostrar = p.Mostrar !== undefined ? String(p.Mostrar) : "true";
                const stock = parseInt(p.Stock || 0);

                if (texto && !nombre.includes(texto) && !codigo.includes(texto)) return false;
                if (catFiltro !== "todos" && categoria !== catFiltro) return false;
                if (estadoFiltro !== "todos" && estado !== estadoFiltro) return false;
                if (publicadoFiltro !== "todos" && mostrar !== publicadoFiltro) return false;
                if (stockFiltro === "con_stock" && stock <= 0) return false;
                if (stockFiltro === "sin_stock" && stock > 0) return false;

                return true;
            });

            if (filtrados.length === 0) {
                tbody.innerHTML = `<tr><td colspan="10" style="text-align:center;">No se encontraron productos.</td></tr>`;
                return;
            }

            filtrados.forEach(p => {
                const precioVenta = parseFloat(p.Precio || 0);
                const precioCosto = parseFloat(p.Costo || 0);
                const ganancia = precioVenta - precioCosto;
                const stockVal = parseInt(p.Stock || 0);
                const isPub = p.Mostrar !== false && p.Mostrar !== "false";

                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td><img src="${p.Imagen_URL || 'https://via.placeholder.com/40'}" class="prod-thumb"></td>
                    <td style="color:var(--accent); font-weight:bold;">${p.Codigo}</td>
                    <td>${p.Nombre}</td>
                    <td>$${precioVenta.toFixed(2)}</td>
                    <td style="color:#ff4d4d;">$${precioCosto.toFixed(2)}</td>
                    <td style="color:#2ecc71; font-weight:bold;">$${ganancia.toFixed(2)}</td>
                    <td>${stockVal}</td>
                    <td><span class="badge ${p.Estado === 'Disponible' ? 'badge-stock' : 'badge-nostock'}">${p.Estado || 'Disponible'}</span></td>
                    <td><span class="badge ${isPub ? 'badge-pub' : 'badge-unpub'}">${isPub ? 'Sí' : 'No'}</span></td>
                    <td><button class="btn-edit-row" onclick="abrirModalEditarProducto('${p.Codigo}')">Editar</button></td>
                `;
                tbody.appendChild(tr);
            });
        }

        function abrirModalTasa() { document.getElementById('tasaModal').style.display = 'flex'; }
        function cerrarModalTasa() { document.getElementById('tasaModal').style.display = 'none'; }
        
        async function guardarNuevaTasa() {
            const val = document.getElementById('nuevaTasaInput').value;
            if (!val) return;
            mostrarLoaderNeon("Guardando tasa...");
            try {
                const res = await fetch(API_URL, { method: 'POST', body: JSON.stringify({ tasa: Number(val) }) });
                const r = await res.json();
                ocultarLoaderNeon();
                if (r.success) {
                    if (globalDataCache) globalDataCache.tasa = Number(val);
                    document.getElementById('statTasa').innerText = `${val} CUP`;
                    cerrarModalTasa();
                    mostrarAlerta("Éxito", "Tasa actualizada correctamente.");
                } else {
                    mostrarAlerta("Error", "No se pudo actualizar la tasa.");
                }
            } catch (e) {
                ocultarLoaderNeon();
                mostrarAlerta("Error", "Error de conexión.");
            }
        }

        function abrirModalProducto(modo, productoData = null) {
            modoEdicion = modo;
            const selectCat = document.getElementById('prodCategoria');
            selectCat.innerHTML = "";
            (globalDataCache.categorias || ["General"]).forEach(c => {
                const opt = document.createElement('option');
                opt.value = c; opt.innerText = c;
                if (productoData && productoData.Categoria === c) opt.selected = true;
                selectCat.appendChild(opt);
            });

            if (modo === 'nuevo') {
                document.getElementById('modalProductoTitulo').innerText = "Nuevo Producto";
                document.getElementById('prodCodigo').value = "(Automático)";
                document.getElementById('prodNombre').value = "";
                document.getElementById('prodPrecio').value = "";
                document.getElementById('prodCosto').value = "";
                document.getElementById('prodStock').value = "5";
                document.getElementById('prodEstado').value = "Disponible";
                document.getElementById('prodMostrar').value = "true";
                document.getElementById('prodDescripcion').value = "";
                document.getElementById('prodImagenUrl').value = "";
                document.getElementById('prodFile').value = "";
            } else if (modo === 'editar' && productoData) {
                document.getElementById('modalProductoTitulo').innerText = "Editar Producto";
                document.getElementById('prodCodigo').value = productoData.Codigo;
                document.getElementById('prodNombre').value = productoData.Nombre || "";
                document.getElementById('prodPrecio').value = productoData.Precio || "";
                document.getElementById('prodCosto').value = productoData.Costo || "";
                document.getElementById('prodStock').value = productoData.Stock || 5;
                document.getElementById('prodEstado').value = productoData.Estado || "Disponible";
                document.getElementById('prodMostrar').value = String(productoData.Mostrar !== undefined ? productoData.Mostrar : true);
                document.getElementById('prodDescripcion').value = productoData.Descripcion || "";
                document.getElementById('prodImagenUrl').value = productoData.Imagen_URL || "";
                document.getElementById('prodFile').value = "";
            }
            document.getElementById('productoModal').style.display = 'flex';
        }

        function abrirModalEditarProducto(codigo) {
            const p = (globalDataCache.productos || []).find(item => String(item.Codigo) === String(codigo));
            if (p) abrirModalProducto('editar', p);
        }

        function cerrarModalProducto() { document.getElementById('productoModal').style.display = 'none'; }

        async function guardarProductoSubmit() {
            const itemData = {
                "Codigo": document.getElementById('prodCodigo').value,
                "Nombre": document.getElementById('prodNombre').value,
                "Precio": parseFloat(document.getElementById('prodPrecio').value || 0),
                "Costo": parseFloat(document.getElementById('prodCosto').value || 0),
                "Descripcion": document.getElementById('prodDescripcion').value,
                "Stock": parseInt(document.getElementById('prodStock').value || 0),
                "Categoria": document.getElementById('prodCategoria').value,
                "Estado": document.getElementById('prodEstado').value,
                "Mostrar": document.getElementById('prodMostrar').value === "true",
                "Imagen_URL": document.getElementById('prodImagenUrl').value || ""
            };

            mostrarLoaderNeon("Guardando producto...");
            try {
                const res = await fetch(API_URL, {
                    method: 'POST',
                    body: JSON.stringify({ accion: modoEdicion === 'nuevo' ? 'crear_producto' : 'editar_producto', producto: itemData })
                });
                const r = await res.json();
                if (r.success) {
                    const resReload = await fetch(API_URL);
                    globalDataCache = await resReload.json();
                    ocultarLoaderNeon();
                    cerrarModalProducto();
                    document.getElementById('statTotal').innerText = (globalDataCache.productos || []).length;
                    calcularResumenFinanciero(globalDataCache.ordenes || [], globalDataCache.productos || []);
                    aplicarFiltrosProductos();
                    mostrarAlerta("Éxito", "Producto guardado correctamente.");
                } else {
                    ocultarLoaderNeon();
                    mostrarAlerta("Error", "No se pudo guardar.");
                }
            } catch (e) {
                ocultarLoaderNeon();
                mostrarAlerta("Error", "Error de conexión.");
            }
        }

        function toggleTema() {
            const htmlEl = document.documentElement;
            const btn = document.getElementById('themeToggleBtn');
            if (htmlEl.getAttribute('data-theme') === 'light') {
                htmlEl.removeAttribute('data-theme');
                btn.innerText = '☀️';
                localStorage.setItem('hlg_theme', 'dark');
            } else {
                htmlEl.setAttribute('data-theme', 'light');
                btn.innerText = '🌙';
                localStorage.setItem('hlg_theme', 'light');
            }
        }

        window.addEventListener('DOMContentLoaded', () => {
            const savedTheme = localStorage.getItem('hlg_theme');
            const btn = document.getElementById('themeToggleBtn');
            if (savedTheme === 'light') {
                document.documentElement.setAttribute('data-theme', 'light');
                if (btn) btn.innerText = '🌙';
            }
        });
