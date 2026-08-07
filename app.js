const API_URL = 'https://script.google.com/macros/s/AKfycby4x0nVPKJDzkI10xbT8yRa3TI6KFca7NVl7QrQ6QT709cW17DDITWdKn0U-ZfprK9idA/exec';
        let todosLosProductos = [];
        let tasaCambioCUP = 650;
        let monedaActual = 'USD';
        let usuarioActual = null;
        let carrito = [];
        let direccionesGuardadas = [];
        let ordenesCliente = [];
        let listaUbicacionesTabulares = []; 
        let datosUbicacionesGlobal = [];

        let provinciaSeleccionadaValor = "";
        let municipioSeleccionadaValor = "";
        let direccionCheckoutSeleccionadaIndex = 0;
        let metodoPagoSeleccionado = "Transferencia Bancaria";
        let tipoPedidoSeleccionado = "Entrega Inmediata";

        let firmaCatalogoAnterior = "";

        // Función centralizada para cerrar cualquier panel lateral y limpiar el fondo
        function cerrarPanelLateral() {
    // Seleccionamos todos los paneles y overlays por si existe más de uno en el DOM
            document.querySelectorAll('.drawer').forEach(drawer => drawer.classList.remove('open'));
            document.querySelectorAll('.drawer-overlay').forEach(overlay => overlay.classList.remove('open'));
    
    // Si usas alguna clase en el <body> para bloquear el scroll mientras el drawer está abierto, la quitamos
            document.body.classList.remove('drawer-open', 'no-scroll');
        }

       // 1. Función para Abrir Nueva Dirección
        function abrirFormularioDireccion() {
                 cerrarPanelLateral(); // Cierra el cajón lateral inmediatamente
    
    // Pequeño retardo opcional (30ms) para permitir que la animación del drawer responda suavemente en el móvil
            setTimeout(() => {
            abrirModalNuevaDireccion();
            }, 30);
        }

        function toggleTema() {
            const currentTheme = document.documentElement.getAttribute('data-theme');
            const nuevoTema = currentTheme === 'light' ? 'dark' : 'light';
            
            if (nuevoTema === 'light') {
                document.documentElement.setAttribute('data-theme', 'light');
                localStorage.setItem('theme', 'light');
            } else {
                document.documentElement.removeAttribute('data-theme');
                localStorage.setItem('theme', 'dark');
            }
        }

        window.addEventListener('DOMContentLoaded', () => {
            const savedTheme = localStorage.getItem('theme');
            if (savedTheme === 'light') {
                document.documentElement.setAttribute('data-theme', 'light');
            }
        });

        function alternarFormularioAuth(modo) {
            const vistaLogin = document.getElementById("vistaLoginUnico");
            const vistaRegistro = document.getElementById("contenedorRegistro");
            
            if (modo === 'registro') {
                vistaLogin.style.display = "none";
                vistaRegistro.style.display = "block";
            } else {
                vistaRegistro.style.display = "none";
                vistaLogin.style.display = "block";
            }
        }

        async function inicializarUbicacionesFormulario() {
            try {
                const respuesta = await fetch(API_URL);
                const resultado = await respuesta.json();
                
                if (resultado.ubicaciones && Array.isArray(resultado.ubicaciones)) {
                    datosUbicacionesGlobal = resultado.ubicaciones;
                    poblarPaises(datosUbicacionesGlobal);
                } else {
                    console.warn("No se encontraron ubicaciones en la respuesta de la API.");
                }
            } catch (error) {
                console.error("Error al cargar las ubicaciones desde la API:", error);
            }
        }

        function poblarPaises(data) {
            const selectPais = document.getElementById('selectPais');
            if (!selectPais) return;

            const paisesUnicos = [...new Set(data.map(item => item.pais || item.Pais))].filter(Boolean);
            
            selectPais.innerHTML = '<option value="">Selecciona un país...</option>';
            paisesUnicos.forEach(pais => {
                selectPais.innerHTML += `<option value="${pais}">${pais}</option>`;
            });
        }

        function cargarProvinciasSegunPais() {
            const paisSeleccionado = document.getElementById('selectPais').value;
            const selectProvincia = document.getElementById('selectProvincia');
            const selectMunicipio = document.getElementById('selectMunicipio');
            
            selectProvincia.innerHTML = '<option value="">Selecciona una provincia...</option>';
            selectMunicipio.innerHTML = '<option value="">Selecciona un municipio...</option>';
            selectMunicipio.disabled = true;

            if (!paisSeleccionado) {
                selectProvincia.disabled = true;
                return;
            }

            const provinciasUnicas = [...new Set(
                datosUbicacionesGlobal
                    .filter(item => (item.pais || item.Pais) === paisSeleccionado)
                    .map(item => item.provincia || item.Provincia)
            )].filter(Boolean);

            provinciasUnicas.forEach(provincia => {
                selectProvincia.innerHTML += `<option value="${provincia}">${provincia}</option>`;
            });
            selectProvincia.disabled = false;
        }

        function cargarMunicipiosSegunProvincia() {
            const paisSeleccionado = document.getElementById('selectPais').value;
            const provinciaSeleccionada = document.getElementById('selectProvincia').value;
            const selectMunicipio = document.getElementById('selectMunicipio');
            
            selectMunicipio.innerHTML = '<option value="">Selecciona un municipio...</option>';

            if (!provinciaSeleccionada) {
                selectMunicipio.disabled = true;
                return;
            }

            const municipiosUnicos = [...new Set(
                datosUbicacionesGlobal
                    .filter(item => ((item.pais || item.Pais) === paisSeleccionado) && ((item.provincia || item.Provincia) === provinciaSeleccionada))
                    .map(item => item.municipio || item.Municipio)
            )].filter(Boolean);

            municipiosUnicos.forEach(municipio => {
                selectMunicipio.innerHTML += `<option value="${municipio}">${municipio}</option>`;
            });
            selectMunicipio.disabled = false;
        }

        document.addEventListener("DOMContentLoaded", () => {
            inicializarUbicacionesFormulario();
        });

        async function registrarNuevoUsuario() {
            const datosRegistro = {
                accion: "registrar_usuario",
                nombre: document.getElementById("regNombre").value.trim(),
                correo: document.getElementById("regCorreo").value.trim(),
                telefono: document.getElementById("regTelefono").value.trim(),
                password: document.getElementById("regPassword").value.trim(),
                sexo: document.getElementById("regSexo").value,
                fechaNacimiento: document.getElementById("regFechaNacimiento").value,
                pais: document.getElementById("selectPais").value.trim(),
                provincia: document.getElementById("selectProvincia").value.trim(),
                municipio: document.getElementById("selectMunicipio").value.trim()
            };

            if (!datosRegistro.nombre || !datosRegistro.correo || !datosRegistro.password) {
                mostrarAlerta('Atención', 'Por favor, completa al menos los campos obligatorios (Nombre, Correo y Contraseña).');
                return;
            }

            mostrarLoaderGlobal("Registrando nueva cuenta...");

            try {
                const respuesta = await fetch(API_URL, {
                    method: "POST",
                    headers: {
                        "Content-Type": "text/plain;charset=utf-8"
                    },
                    body: JSON.stringify(datosRegistro)
                });
                
                const resultado = await respuesta.json();
                ocultarLoaderGlobal();

                if (resultado.success) {
                    mostrarAlerta('¡Éxito!', resultado.message || 'Cuenta creada correctamente. Ya puedes iniciar sesión.');
                    alternarFormularioAuth('login');
                } else {
                    mostrarAlerta('Error', resultado.message || 'No se pudo completar el registro.');
                }

            } catch (error) {
                ocultarLoaderGlobal();
                console.error("Error en la conexión:", error);
                mostrarAlerta('Error', 'Ocurrió un error al intentar conectar con el servidor.');
            }
        }

        function solicitarPermisoNotificaciones() {
            if (window.Notification && Notification.permission !== "granted") {
                Notification.requestPermission();
            }
        }

        function dispararNotificacionNativa(titulo, cuerpo) {
            if (window.Notification && Notification.permission === "granted") {
                new Notification(titulo, {
                    body: cuerpo,
                    icon: "https://res.cloudinary.com/kla50st7/image/upload/v1785343940/Gemini_Generated_Image_9e7gng9e7gng9e7g_okv4ap.jpg"
                });
            }
        }

        function mostrarBannerActualizacion(mensaje = "Se han actualizado los productos del catálogo.") {
            document.getElementById('updateBannerText').innerText = mensaje;
            document.getElementById('updateNotificationBanner').style.display = 'flex';
        }

        function ocultarBannerActualizacion() {
            document.getElementById('updateNotificationBanner').style.display = 'none';
        }

        function mostrarLoaderGlobal(texto = "Actualizando catálogo...") {
            document.getElementById('globalLoaderText').innerText = texto;
            document.getElementById('globalLoaderOverlay').style.display = 'flex';
        }

        function ocultarLoaderGlobal() {
            document.getElementById('globalLoaderOverlay').style.display = 'none';
        }

        function cerrarTodosLosMenusDesplegablesCustom() {
            document.querySelectorAll('.dropdown-box-menu').forEach(m => m.classList.remove('open'));
        }

        function toggleCustomBox(menuId, e) {
            if (e) e.stopPropagation();
            const menu = document.getElementById(menuId);
            const isOpen = menu.classList.contains('open');
            cerrarTodosLosMenusDesplegablesCustom();
            if (!isOpen) menu.classList.add('open');
        }

        window.addEventListener('click', () => {
            cerrarTodosLosMenusDesplegablesCustom();
            document.getElementById('customDropdown').classList.remove('open');
        });

        function inicializarProvinciasDireccion() {
            const provinciasUnicas = [...new Set(listaUbicacionesTabulares.map(u => u.Provincia || u.provincia))].filter(Boolean);
            const menuProv = document.getElementById('customProvinciaMenu');
            
            provinciaSeleccionadaValor = "";
            municipioSeleccionadaValor = "";
            document.getElementById('provinciaToggleBtn').innerText = "Seleccione Provincia...";
            document.getElementById('municipioToggleBtn').innerText = "Seleccione Municipio...";
            
            menuProv.innerHTML = provinciasUnicas.map(p => `
                <div class="dropdown-box-item" onclick="seleccionarProvinciaDireccion('${p.replace(/'/g, "\\'")}')">${p}</div>
            `).join('');
            
            document.getElementById('customMunicipioMenu').innerHTML = '<div class="dropdown-box-item" style="color:#777; cursor:default;">Seleccione Provincia primero</div>';
        }

        function seleccionarProvinciaDireccion(provincia) {
            provinciaSeleccionadaValor = provincia;
            municipioSeleccionadaValor = "";
            document.getElementById('provinciaToggleBtn').innerText = provincia;
            document.getElementById('municipioToggleBtn').innerText = "Seleccione Municipio...";

            const municipios = listaUbicacionesTabulares
                .filter(u => (u.Provincia || u.provincia) === provincia)
                .map(u => u.Municipio || u.municipio)
                .filter(Boolean);

            const menuMuni = document.getElementById('customMunicipioMenu');
            menuMuni.innerHTML = municipios.map(m => `
                <div class="dropdown-box-item" onclick="seleccionarMunicipioDireccion('${m.replace(/'/g, "\\'")}')">${m}</div>
            `).join('');
        }

        function seleccionarMunicipioDireccion(municipio) {
            municipioSeleccionadaValor = municipio;
            document.getElementById('municipioToggleBtn').innerText = municipio;
        }

        function seleccionarMetodoPago(metodo) {
            metodoPagoSeleccionado = metodo;
            document.getElementById('pagoToggleBtn').innerText = metodo;
        }

        function seleccionarTipoPedido(tipo) {
            tipoPedidoSeleccionado = tipo;
            document.getElementById('tipoPedidoToggleBtn').innerText = tipo;
            
            const seccionReserva = document.getElementById('seccionFechaReserva');
            if (tipo === 'Reserva Programada') {
                seccionReserva.style.display = 'block';
                const hoy = new Date().toISOString().split('T')[0];
                document.getElementById('inputFechaReserva').min = hoy;
                document.getElementById('inputFechaReserva').value = hoy;
            } else {
                seccionReserva.style.display = 'none';
            }
        }

        function mostrarAlerta(titulo, mensaje) {
            document.getElementById('alert-title').textContent = titulo;
            document.getElementById('alert-message').textContent = mensaje;
            document.getElementById('custom-alert').style.display = 'flex';
        }
        function closeCustomAlert() { document.getElementById('custom-alert').style.display = 'none'; }

        async function cargar() {
            const loaderDiv = document.getElementById('loader');
            loaderDiv.style.display = 'block';
            loaderDiv.innerHTML = `<div class="spinner-hlg" style="margin: 0 auto 10px auto;"></div><p style="color: #00f2ff;">Cargando catálogo...</p>`;

            try {
                const res = await fetch(API_URL);
                const data = await res.json();                
                
                todosLosProductos = (data.productos || []).filter(p => String(p.Mostrar).toUpperCase() === 'TRUE' || String(p.Mostrar) === '1');
                tasaCambioCUP = data.tasa ? parseFloat(data.tasa) : 650;
                listaUbicacionesTabulares = data.ubicaciones || [];
                datosUbicacionesGlobal = data.ubicaciones || [];

                firmaCatalogoAnterior = generarFirmaCatalogo(todosLosProductos, tasaCambioCUP);
                
                crearCategorias();
                renderizar(todosLosProductos);
                if (datosUbicacionesGlobal.length > 0) {
                    poblarPaises(datosUbicacionesGlobal);
                }
                ocultarBannerActualizacion();
            } catch (err) {
                console.error("Error al procesar el catálogo:", err);
                loaderDiv.innerHTML = `
                    <p style="color: #ff4d4d; margin-bottom: 12px;">Error al procesar los datos del catálogo.</p>
                    <button onclick="cargar()" class="btn btn-buy" style="max-width: 200px; margin: 0 auto; padding: 8px 16px;">🔄 Recargar</button>
                `;
            }
        }

        function generarFirmaCatalogo(productos, tasa) {
            const detalleProductos = productos.map(p => `${p.Nombre}_${p.Precio}_${p.Stock}`).join('|');
            return `tasa:${tasa}|prod:${detalleProductos}`;
        }

        async function verificarActualizacionesCatalog() {
            if (!navigator.onLine) return;

            try {
                const res = await fetch(API_URL + "?t=" + new Date().getTime());
                if (!res.ok) return;
                
                const data = await res.json();
                
                const nuevosProductos = (data.productos || []).filter(p => String(p.Mostrar).toUpperCase() === 'TRUE' || String(p.Mostrar) === '1');
                const nuevaTasa = data.tasa ? parseFloat(data.tasa) : 650;
                
                const firmaNueva = generarFirmaCatalogo(nuevosProductos, nuevaTasa);

                if (!firmaCatalogoAnterior) {
                    firmaCatalogoAnterior = firmaNueva;
                    return;
                }

                if (firmaCatalogoAnterior !== firmaNueva) {
                    mostrarBannerActualizacion("Se detectaron cambios en precios, productos o tasa.");
                }
            } catch (e) {
                console.warn("Actualización en segundo plano pospuesta (problema temporal de red o CORS).");
            }
        }

        setInterval(verificarActualizacionesCatalog, 30000);

        function toggleFolder(folderId) {
            const folder = document.getElementById(folderId);
            const isOpen = folder.classList.contains('active');
            document.querySelectorAll('.folder-group').forEach(f => f.classList.remove('active'));
            if (!isOpen) folder.classList.add('active');
        }

        function agregarAlCarrito(nombre) {
            const prod = todosLosProductos.find(p => p.Nombre === nombre);
            if (!prod || parseInt(prod.Stock) <= 0) return;
            const item = carrito.find(i => i.Nombre === nombre);
            if (item) {
                if (item.cantidad < parseInt(prod.Stock)) item.cantidad++;
            } else {
                carrito.push({ Nombre: prod.Nombre, Precio: parseFloat(prod.Precio), Imagen_URL: prod.Imagen_URL, cantidad: 1, stockMax: parseInt(prod.Stock) });
            }
            actualizarContadorCarrito();
            renderizarCarrito();
            cerrarDetalles();
        }

        function cambiarCantidadItem(nombre, delta) {
            const item = carrito.find(i => i.Nombre === nombre);
            if (!item) return;
            item.cantidad += delta;
            if (item.cantidad <= 0) carrito = carrito.filter(i => i.Nombre !== nombre);
            actualizarContadorCarrito();
            renderizarCarrito();
        }

        function actualizarContadorCarrito() {
            const badge = document.getElementById('cartBadge');
            const total = carrito.reduce((sum, i) => sum + i.cantidad, 0);
            badge.style.display = total > 0 ? 'flex' : 'none';
            badge.innerText = total;
        }

        function renderizarCarrito() {
            const container = document.getElementById('cartItemsContainer');
            const footer = document.getElementById('cartFooter');
            if (carrito.length === 0) {
                container.innerHTML = `<p style="text-align: center; color: var(--text-muted); font-size: 0.9em; margin-top: 40px;">Tu carrito está vacío.</p>`;
                footer.style.display = 'none';
                return;
            }
            footer.style.display = 'block';
            let totalUSD = 0;
            container.innerHTML = carrito.map(item => {
                totalUSD += item.Precio * item.cantidad;
                return `
                <div class="cart-item">
                    <img src="${item.Imagen_URL}" alt="">
                    <div class="cart-item-info">
                        <h4>${item.Nombre}</h4>
                        <span>${formatearPrecio(item.Precio)}</span>
                        <div class="cart-item-controls">
                            <button onclick="cambiarCantidadItem('${item.Nombre.replace(/'/g, "\\'")}', -1)">-</button>
                            <span style="font-size:0.85em; font-weight:bold;">${item.cantidad}</span>
                            <button onclick="cambiarCantidadItem('${item.Nombre.replace(/'/g, "\\'")}', 1)">+</button>
                        </div>
                    </div>
                    <button class="btn-eliminar-item" onclick="carrito = carrito.filter(i => i.Nombre !== '${item.Nombre}'); actualizarContadorCarrito(); renderizarCarrito();">&times;</button>
                </div>`;
            }).join('');
            document.getElementById('cartTotalText').innerText = formatearPrecio(totalUSD);
        }

        function iniciarCheckout() {
                cerrarDrawerCarrito();
            if (!usuarioActual) {
                mostrarAlerta('Atención', 'Debes iniciar sesión para completar tu pedido.');
                abrirDrawerUsuario();
                return;
            }
            if (direccionesGuardadas.length === 0) {
                mostrarAlerta('Dirección Requerida', 'Por favor, añade al menos una dirección de entrega en tu perfil antes de continuar.');
                cerrarDrawerCarrito();
                abrirDrawerUsuario();
                toggleFolder('folderDirecciones');
                return;
            }
            
            direccionCheckoutSeleccionadaIndex = 0;
            const d0 = direccionesGuardadas[0];
            document.getElementById('checkoutDirToggleBtn').innerText = `${d0.provincia || d0.Provincia}, ${d0.municipio || d0.Municipio} - ${d0.exacta || d0.Direccion_Exacta}`;
            
            const menuDir = document.getElementById('customCheckoutDirMenu');
            menuDir.innerHTML = direccionesGuardadas.map((d, index) => `
                <div class="dropdown-box-item" onclick="seleccionarDireccionCheckout(${index})">${d.provincia || d.Provincia}, ${d.municipio || d.Municipio} - ${d.exacta || d.Direccion_Exacta}</div>
            `).join('');

            seleccionarTipoPedido('Entrega Inmediata');
            metodoPagoSeleccionado = "Transferencia Bancaria";
            document.getElementById('pagoToggleBtn').innerText = "Transferencia Bancaria";

            let totalUSD = carrito.reduce((sum, i) => sum + (i.Precio * i.cantidad), 0);
            document.getElementById('checkoutImporteTotal').innerText = formatearPrecio(totalUSD);
            document.getElementById('modalCheckout').style.display = 'flex';
        }

        function seleccionarDireccionCheckout(index) {
            direccionCheckoutSeleccionadaIndex = index;
            const d = direccionesGuardadas[index];
            document.getElementById('checkoutDirToggleBtn').innerText = `${d.provincia || d.Provincia}, ${d.municipio || d.Municipio} - ${d.exacta || d.Direccion_Exacta}`;
        }

        function cerrarModalCheckout() { document.getElementById('modalCheckout').style.display = 'none'; }

        async function enviarOrdenAlBackend() {
            const direccionElegida = direccionesGuardadas[direccionCheckoutSeleccionadaIndex];
            const totalUSD = carrito.reduce((sum, i) => sum + (i.Precio * i.cantidad), 0);
            const direccionTexto = `${direccionElegida.provincia || direccionElegida.Provincia}, ${direccionElegida.municipio || direccionElegida.Municipio} - ${direccionElegida.exacta || direccionElegida.Direccion_Exacta}`;

            let tiempoEstimadoTexto = 'Inmediato / Normal';
            if (tipoPedidoSeleccionado === 'Reserva Programada') {
                const fechaRes = document.getElementById('inputFechaReserva').value;
                const horaRes = document.getElementById('inputHoraReserva').value;
                if (!fechaRes || !horaRes) {
                    mostrarAlerta('Datos incompletos', 'Por favor selecciona la fecha y hora para tu reserva.');
                    return;
                }
                tiempoEstimadoTexto = `Reserva para el ${fechaRes} a las ${horaRes}`;
            }

            const nuevaOrden = {
                accion: 'crear_orden',
                correo: usuarioActual.correo,
                nombreUsuario: usuarioActual.nombre,
                telefono: usuarioActual.telefono,
                productos: JSON.stringify(carrito),
                total: totalUSD,
                costoTotal: totalUSD,
                moneda: monedaActual,
                metodoPago: metodoPagoSeleccionado,
                direccion: direccionTexto,
                estado: 'Pendiente',
                hora: new Date().toLocaleString()
            };

            mostrarLoaderGlobal("Procesando y completando compra...");
            try {
                const res = await fetch(API_URL, { method: 'POST', body: JSON.stringify(nuevaOrden) });
                const data = await res.json();
                
                if(data.success) {
                    ordenesCliente.unshift({
                        ID_Orden: data.idOrden,
                        Total: totalUSD,
                        Estado: 'Pendiente',
                        Hora: new Date().toLocaleString(),
                        Direccion: direccionTexto
                    });

                    ocultarLoaderGlobal();
                    mostrarAlerta('¡Pedido Enviado!', 'Tu orden/reserva ha sido registrada exitosamente.');
                    carrito = [];
                    actualizarContadorCarrito();
                    renderizarCarrito();
                    cerrarModalCheckout();
                    cerrarDrawerCarrito();
                    cargarOrdenesUsuario();
                } else {
                    ocultarLoaderGlobal();
                    mostrarAlerta('Error', data.message || 'No se pudo registrar la orden.');
                }
            } catch (err) {
                ocultarLoaderGlobal();
                mostrarAlerta('Error', 'Error de comunicación con el servidor.');
            }
        }

        function abrirModalNuevaDireccion() { 
            inicializarProvinciasDireccion();
            document.getElementById('dirExacta').value = "";
            document.getElementById('modalDireccion').style.display = 'flex'; 
        }
        function cerrarModalDireccion() { document.getElementById('modalDireccion').style.display = 'none'; }

        async function guardarDireccionUsuario() {
            const provincia = provinciaSeleccionadaValor;
            const municipio = municipioSeleccionadaValor;
            const exacta = document.getElementById('dirExacta').value.trim();
            
            if (!provincia || !municipio || !exacta) {
                mostrarAlerta('Campos incompletos', 'Selecciona la provincia, municipio y dirección exacta.');
                return;
            }

            const idDireccion = 'DIR-' + Date.now();
            const nuevaDirData = {
                accion: 'guardar_direccion',
                nombreUsuario: usuarioActual.nombre,
                correo: usuarioActual.correo,
                idDireccion: idDireccion,
                pais: 'Cuba',
                provincia: provincia,
                municipio: municipio,
                direccionExacta: exacta,
                detalles: ''
            };

            mostrarLoaderGlobal("Guardando dirección...");
            try {
                const res = await fetch(API_URL, { method: 'POST', body: JSON.stringify(nuevaDirData) });
                const data = await res.json();
                ocultarLoaderGlobal();

                if(data.success) {
                    direccionesGuardadas.push({
                        id: idDireccion,
                        provincia: provincia,
                        municipio: municipio,
                        exacta: exacta
                    });
                    renderizarDirecciones();
                    cerrarModalDireccion();
                    mostrarAlerta('Éxito', 'Dirección guardada correctamente.');
                } else {
                    mostrarAlerta('Aviso', data.message || 'No se pudo guardar.');
                }
            } catch (err) {
                ocultarLoaderGlobal();
                mostrarAlerta('Error', 'Fallo al conectar con el servidor.');
            }
        }

        function renderizarDirecciones() {
            const container = document.getElementById('listaDireccionesCliente');
            if (direccionesGuardadas.length === 0) {
                container.innerHTML = `<p style="color:var(--text-muted); font-size:0.85em;">No tienes direcciones guardadas.</p>`;
                return;
            }
            container.innerHTML = direccionesGuardadas.map((d, index) => `
                <div style="background:var(--folder-btn-bg); padding:10px; border-radius:8px; margin-bottom:8px; border:1px solid rgba(0,242,255,0.2); font-size:0.85em;">
                    <p style="margin:0 0 4px 0; color:#00f2ff; font-weight:bold;">Dirección #${index + 1}</p>
                    <p style="margin:0; color:var(--text-muted);">${d.provincia || d.Provincia}, ${d.municipio || d.Municipio} - ${d.exacta || d.Direccion_Exacta}</p>
                </div>
            `).join('');
        }

        function cargarOrdenesUsuario() {
            const container = document.getElementById('listaOrdenesCliente');
            if (!container) return;

            if (!ordenesCliente || ordenesCliente.length === 0) {
                container.innerHTML = `<p style="color: var(--text-muted); font-size: 0.85em; text-align: center;">No tienes órdenes registradas.</p>`;
                return;
            }

            const ultimaOrden = ordenesCliente[0];
            const idOrdenActual = ultimaOrden.ID_Orden || ultimaOrden.id || '1';
            const estadoActual = ultimaOrden.Estado || ultimaOrden.estado || 'Pendiente';
            
            const claveStorage = `estado_previo_${idOrdenActual}`;
            const estadoAnterior = localStorage.getItem(claveStorage);
            
            let htmlNotiEstado = '';

            if (!estadoAnterior) {
                localStorage.setItem(claveStorage, estadoActual);
            }

            if (estadoAnterior && estadoAnterior !== estadoActual) {
                htmlNotiEstado = `
                    <div class="order-alert-box" style="background: rgba(0, 242, 255, 0.15); border: 1px solid #00f2ff; padding: 12px; border-radius: 8px; margin-bottom: 12px;">
                        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
                            <span style="font-size: 1.2em;">🔔</span>
                            <strong style="color:#00f2ff; font-size: 0.95em;">¡Actualización en tu pedido!</strong>
                        </div>
                        <p style="margin: 0; color: var(--text-main); font-size: 0.9em;">Tu orden #${idOrdenActual} ha cambiado a: <strong style="color: #00f2ff;">${estadoActual}</strong></p>
                    </div>
                `;
                dispararNotificacionNativa("HLG-Tech - Actualización", `Tu pedido #${idOrdenActual} ahora está: ${estadoActual}`);
                localStorage.setItem(claveStorage, estadoActual);
            } else {
                const colorEstado = estadoActual === 'Completado' ? '#25D366' : (estadoActual === 'Procesando' ? '#00f2ff' : '#ffaa00');
                htmlNotiEstado = `
                    <div class="order-alert-box">
                        <strong style="color:#00f2ff;">Estado del Último Pedido:</strong> 
                        <span style="color: ${colorEstado}; font-weight:bold;">${estadoActual}</span>
                        <p style="margin: 4px 0 0 0; color: var(--text-muted); font-size: 0.9em;">Tu orden #${idOrdenActual} está siendo gestionada.</p>
                    </div>
                `;
            }

            container.innerHTML = htmlNotiEstado + ordenesCliente.map(o => `
                <div class="order-card">
                    <div style="display:flex; justify-content:space-between; margin-bottom:5px;">
                        <span style="color:#00f2ff; font-weight:bold;">Orden #${o.ID_Orden || o.id || '1'}</span>
                        <span class="order-status" style="color: ${ (o.Estado || o.estado) === 'Completado' ? '#25D366' : '#ffaa00' }; font-weight:bold;">${o.Estado || o.estado || 'Pendiente'}</span>
                    </div>
                    <p style="margin:2px 0; color:var(--text-muted);"><strong>Total:</strong> ${formatearPrecio(parseFloat(o.Total || o.total || 0))}</p>
                    <p style="margin:2px 0; color:var(--text-muted); font-size:0.8em;">Fecha: ${o.Hora || o.hora || ''}</p>
                </div>
            `).join('');
        }

        async function iniciarSesionUsuario() {
            cerrarDrawerUsuario();
            const correo = document.getElementById('loginCorreo').value.trim();
            const pass = document.getElementById('loginPassword').value.trim();
            if (!correo || !pass) return;
            
            mostrarLoaderGlobal("Iniciando sesión...");

            try {
                const res = await fetch(API_URL, {
                    method: 'POST',
                    body: JSON.stringify({
                        accion: 'iniciar_sesion',
                        correo: correo,
                        password: pass
                    })
                });
                const data = await res.json();
                ocultarLoaderGlobal();

                if(data.success) {
                    usuarioActual = data.usuario || { nombre: data.nombre, correo: correo, telefono: data.telefono };
                    direccionesGuardadas = data.direcciones || [];
                    ordenesCliente = data.ordenes || [];

                    solicitarPermisoNotificaciones();

                    if (ordenesCliente.length > 0) {
                        const ultima = ordenesCliente[0];
                        const idOrd = ultima.ID_Orden || ultima.id || '1';
                        const estOrd = ultima.Estado || ultima.estado || 'Pendiente';
                        const claveSt = `estado_previo_${idOrd}`;
                        
                        if (!localStorage.getItem(claveSt)) {
                            localStorage.setItem(claveSt, estOrd);
                        }
                    }

                    document.getElementById('pNombre').innerText = usuarioActual.nombre || usuarioActual.Nombre;
                    document.getElementById('pCorreo').innerText = usuarioActual.correo || usuarioActual.Correo;
                    document.getElementById('pTelefono').innerText = usuarioActual.telefono || usuarioActual.Telefono;
                    
                    document.getElementById('vistaLoginUnico').style.display = 'none';
                    document.getElementById('vistaPanelLogueado').style.display = 'block';
                    renderizarDirecciones();
                    cargarOrdenesUsuario();
                } else {
                    mostrarAlerta('Acceso Denegado', data.message || 'Credenciales incorrectas.');
                }
            } catch (err) {
                ocultarLoaderGlobal();
                mostrarAlerta('Error', 'No se pudo iniciar sesión.');
            }
        }

        async function cambiarContrasenaUsuario() {
            const passActual = document.getElementById('passActual').value.trim();
            const passNueva = document.getElementById('passNueva').value.trim();
            if (!passActual || !passNueva) {
                mostrarAlerta('Atención', 'Introduce tu contraseña actual y la nueva.');
                return;
            }
            
            mostrarLoaderGlobal("Actualizando contraseña...");
            try {
                const res = await fetch(API_URL, {
                    method: 'POST',
                    body: JSON.stringify({
                        accion: 'cambiar_password',
                        correo: usuarioActual.correo || usuarioActual.Correo,
                        passActual: passActual,
                        passNueva: passNueva
                    })
                });
                const data = await res.json();
                ocultarLoaderGlobal();
                if(data.success) {
                    document.getElementById('passActual').value = '';
                    document.getElementById('passNueva').value = '';
                    mostrarAlerta('Éxito', 'Contraseña actualizada correctamente.');
                } else {
                    mostrarAlerta('Error', data.message || 'No se pudo actualizar.');
                }
            } catch (err) {
                ocultarLoaderGlobal();
                mostrarAlerta('Error', 'Fallo al cambiar contraseña.');
            }
        }

        function cerrarSesionUsuario() {
            usuarioActual = null;
            direccionesGuardadas = [];
            ordenesCliente = [];
            document.getElementById('vistaLoginUnico').style.display = 'block';
            document.getElementById('vistaPanelLogueado').style.display = 'none';
            document.querySelectorAll('.folder-group').forEach(f => f.classList.remove('active'));
        }

        function formatearPrecio(val) {
            return monedaActual === 'CUP' ? `${(val * tasaCambioCUP).toLocaleString('es-CU')} CUP` : `$${val.toFixed(2)} USD`;
        }
        
        function seleccionarMoneda(val, label) {
            monedaActual = val;
            document.getElementById('monedaTextoBtn').innerText = label;
            document.getElementById('customDropdown').classList.remove('open');
            
            const categoriaActivaBtn = document.querySelector('.tab-btn.active');
            let catActual = categoriaActivaBtn ? categoriaActivaBtn.innerText : 'Todos';
            let listaAMostrar = catActual === 'Todos' ? todosLosProductos : todosLosProductos.filter(p => p.Categoria === catActual);
            
            renderizar(listaAMostrar);
            renderizarCarrito();
        }

        function toggleDropdown(e) { e.stopPropagation(); document.getElementById('customDropdown').classList.toggle('open'); }
        function abrirDrawerCarrito() { cerrarTodosLosDrawers(); document.getElementById('cartDrawer').classList.add('open'); document.getElementById('drawerOverlay').classList.add('open'); }
        function cerrarDrawerCarrito() { document.getElementById('cartDrawer').classList.remove('open'); document.getElementById('drawerOverlay').classList.remove('open'); }
        function abrirDrawerUsuario() { cerrarTodosLosDrawers(); document.getElementById('userDrawer').classList.add('open'); document.getElementById('drawerOverlay').classList.add('open'); }
        function cerrarDrawerUsuario() { document.getElementById('userDrawer').classList.remove('open'); document.getElementById('drawerOverlay').classList.remove('open'); }
        function cerrarTodosLosDrawers() { cerrarDrawerCarrito(); cerrarDrawerUsuario(); }

        function crearCategorias() {
            const cats = ['Todos', ...new Set(todosLosProductos.map(p => p.Categoria))];
            document.getElementById('categoryTabs').innerHTML = cats.map(c => `<button class="tab-btn ${c==='Todos'?'active':''}" onclick="filtrarCat('${c}', this)">${c}</button>`).join('');
        }
        function filtrarCat(cat, btn) {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            renderizar(cat === 'Todos' ? todosLosProductos : todosLosProductos.filter(p => p.Categoria === cat));
        }
        function renderizar(lista) {
            document.getElementById('app').innerHTML = [...new Set(lista.map(p => p.Categoria))].map(cat => `
                <div class="categoria-seccion">
                    <h2 class="titulo-cat">${cat}</h2>
                    <div class="carrusel">
                        ${lista.filter(p => p.Categoria === cat).map(p => {
                            const stock = parseInt(p.Stock) || 0;
                            return `
                            <div class="card" onclick="abrirDetalles('${p.Nombre.replace(/'/g, "\\'")}')">
                                <img src="${p.Imagen_URL}" alt="">
                                <h3>${p.Nombre}</h3>
                                <p style="color:var(--text-muted); margin: 2px 0;">${formatearPrecio(p.Precio)}</p>
                                <span class="badge-stock ${stock <= 0 ? 'stock-agotado' : 'stock-disponible'}">${stock <= 0 ? 'Agotado' : 'Stock: '+stock}</span>
                                <div class="btn-group" onclick="event.stopPropagation()">
                                    <button class="btn btn-buy ${stock<=0?'btn-disabled':''}" ${stock<=0?'disabled':''} onclick="agregarAlCarrito('${p.Nombre.replace(/'/g, "\\'")}')">Añadir</button>
                                </div>
                            </div>`;
                        }).join('')}
                    </div>
                </div>
            `).join('');
        }
        function abrirDetalles(nombre) {
            const p = todosLosProductos.find(item => item.Nombre === nombre);
            if (!p) return;
            document.getElementById('modalImg').src = p.Imagen_URL;
            document.getElementById('modalTitulo').innerText = p.Nombre;
            document.getElementById('modalPrecio').innerText = formatearPrecio(p.Precio);
            document.getElementById('modalStock').innerHTML = `<span class="badge-stock stock-disponible">Stock: ${p.Stock}</span>`;
            document.getElementById('modalDesc').innerText = p.Descripcion || 'Sin descripción.';
            document.getElementById('modalProducto').style.display = 'flex';
        }
        function cerrarDetalles(e) { if (!e || e.target.id === 'modalProducto') document.getElementById('modalProducto').style.display = 'none'; }
        function restablecerTodo() { renderizar(todosLosProductos); }

        // Función para verificar si puede calificar al abrir los detalles del producto
        // Función para verificar si el usuario logueado puede calificar el producto abierto
        function verificarEstadoCalificacion() {
        const formCalif = document.getElementById('formCalificacion');
        const avisoLogin = document.getElementById('avisoLoginCalificar');
    
    // Verificamos si existe usuarioActual en sesión
    if (window.usuarioActual && window.usuarioActual.correo) {
        if(formCalif) formCalif.style.display = 'block';
        if(avisoLogin) avisoLogin.style.display = 'none';
    } else {
        if(formCalif) formCalif.style.display = 'none';
        if(avisoLogin) avisoLogin.style.display = 'block';
    }
}

// Función para enviar la calificación al Apps Script
    async function enviarCalificacion(puntuacion) {
    if (!window.usuarioActual || !window.usuarioActual.correo) {
        mostrarAlerta('Acceso Denegado', 'Debes iniciar sesión para realizar esta operación.');
        return;
    }

    // Aquí puedes capturar el ID o Nombre del producto actual que se está viendo en el modal
    const tituloProducto = document.getElementById('modalTitulo').innerText;

    const datosCalificacion = {
        accion: 'calificar_producto',
        correo: window.usuarioActual.correo,
        producto: tituloProducto,
        puntuacion: puntuacion
    };

    mostrarLoaderGlobal("Enviando calificación...");

    try {
        const respuesta = await fetch(API_URL, {
            method: "POST",
            headers: { "Content-Type": "text/plain;charset=utf-8" },
            body: JSON.stringify(datosCalificacion)
        });
        
        const resultado = await respuesta.json();
        ocultarLoaderGlobal();

        if (resultado.success) {
            mostrarAlerta('¡Éxito!', resultado.message || `¡Gracias por calificar con ${puntuacion} estrellas!`);
            // Opcional: Actualizar datos locales del producto o cerrar detalles
        } else {
            mostrarAlerta('Error', resultado.message || 'No se pudo registrar la calificación.');
        }

    } catch (error) {
        ocultarLoaderGlobal();
        console.error("Error al enviar calificación:", error);
        mostrarAlerta('Error', 'Ocurrió un error al intentar conectar con el servidor.');
    }
}
        cargar();
