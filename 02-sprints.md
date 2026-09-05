# TP1 - Programación IV - Sistema de Cine
## Planificación por Sprints (organizados por módulo)

> Basado en [01-requerimientos.md](01-requerimientos.md). Cada sprint asume ~1 semana. Ajustar según tiempo real disponible antes de la entrega.

---

### Sprint 0 — Setup y arquitectura
**Módulo: Infraestructura**
- Inicializar proyecto Angular (standalone components, routing, lazy loading por feature).
- Crear proyecto en Supabase (DB, Auth, Storage, Realtime).
- Definir modelo de datos (tablas: usuarios, películas, géneros, salas, butacas, funciones, entradas, reseñas, cupones, puntos, productos, categorías, combos, compras, créditos, logs).
- Configurar políticas RLS base en Supabase.
- Definir sistema de diseño propio (paleta, tipografía, componentes base) — cumple "estilo visual único y producido".
- Setup de despliegue (Vercel/Netlify/similar) con pipeline básico desde el día 1, para no dejar el deploy para el final.
- Esqueleto de README (arquitectura, decisiones técnicas) — se completa a lo largo del proyecto.

**Entregable**: repo con Angular + Supabase conectado, deploy vacío funcionando en URL pública.

---

### Sprint 1 — Usuarios y autenticación
**Módulo: Usuarios / Auth**
- Registro con datos requeridos (mail, nombre, apellido, fecha nacimiento, tipo de sangre, color de ojos, días de vacaciones/año).
- Login/logout, recuperación de contraseña (Supabase Auth).
- Roles: cliente registrado, anónimo (guest checkout), empleado, admin.
- Pantalla de perfil (base): datos personales editables.
- Cálculo de edad a partir de fecha de nacimiento (utilidad compartida — se reutiliza en restricciones de edad y cupones +50).
- Cupón de bienvenida (20% primera compra) generado automáticamente al registrarse; % configurable desde admin (placeholder de config).

**Entregable**: alta/baja/login de usuarios funcionando, roles diferenciados en el routing.

---

### Sprint 2 — Catálogo de películas y salas
**Módulo: Catálogo / Salas**
- CRUD de películas (admin): nombre, imagen, sinopsis, duración, géneros (múltiples), formato (2D/3D/4D/5D), idioma, restricción de edad.
- CRUD de salas: generación de layout de butacas (normal, accesible J/K, VIP R/S/T) según reglas fijas.
- Listado público de películas con buscador + filtro por género.
- Home: destacar top 3 películas más vendidas (cálculo básico o mock inicial).
- Sección "Próximamente" (listado, sin alertas todavía).

**Entregable**: catálogo navegable y buscador funcionando; admin puede cargar películas y salas.

---

### Sprint 3 — Funciones y asignación automática de salas
**Módulo: Funciones**
- CRUD de funciones (admin): película, días/horarios recurrentes.
- Algoritmo de asignación automática de sala: valida solapamiento + 30 min de buffer entre funciones de la misma sala.
- Vista de cartelera con horarios por película.
- Configuración de preventa por película (fecha de apertura, precio especial) y switch automático a precio normal al vencer.
- Alertas de estreno: opt-in del usuario + disparo de notificación cuando la función se publica (puede ser email vía Supabase Edge Function o notificación in-app/push si ya hay PWA).

**Entregable**: cartelera con horarios asignados automáticamente sin conflictos, preventa funcionando.

---

### Sprint 4 — Selección de butacas y compra de entradas
**Módulo: Compra / Entradas**
- Mapa de butacas por función: normales, accesibles, VIP con estilos visuales diferenciados.
- Selección de butacas en **tiempo real** (Supabase Realtime): bloqueo temporal visible a otros usuarios mientras se elige.
- Validación de restricción de edad al confirmar compra (bloqueo si el usuario no cumple edad mínima; aviso "debe ir acompañado de un adulto" cuando corresponda).
- Confirmación explícita antes de pagar butaca VIP.
- Checkout (mock de pago o integración simple), aplicación de cupón de bienvenida.
- Generación de PDF de entrada + QR único.
- Cancelación de compra hasta 2h antes de la función → generación de crédito en cuenta.

**Entregable**: flujo completo de compra de entrada de punta a punta, con PDF/QR y cancelación con crédito.

---

### Sprint 5 — Candy bar y combos
**Módulo: Candy bar**
- CRUD de productos y categorías (admin).
- Selección de productos de candy bar dentro del flujo de compra, asociados al mismo QR de la entrada.
- CRUD de combos (entrada + pochoclos + bebida a precio fijo), destacados en la página de compra.
- Actualizar generación de QR/PDF para reflejar ítems de candy bar incluidos.

**Entregable**: compra de entrada + candy bar/combos en un mismo checkout y mismo QR.

---

### Sprint 6 — Cupones y programa de fidelización
**Módulo: Cupones / Puntos**
- Admin: CRUD de cupones (porcentaje configurable, segmentación por edad como "+50 años", vigencia).
- Acumulación de 1 punto por peso gastado en cada compra (solo usuarios registrados).
- Admin: configuración de recompensas (costo en puntos de entrada gratis, productos).
- Canje de puntos por recompensas desde el perfil del usuario.
- Perfil: saldo de puntos + historial de canjes + crédito disponible (no transferible).

**Entregable**: cupones aplicables en checkout, acumulación y canje de puntos funcionando.

---

### Sprint 7 — Reseñas y "Mis películas"
**Módulo: Reseñas / Social**
- Alta de reseña (estrellas + comentario corto) solo para usuarios que ya vieron la película (o abierto, según decisión de negocio a defender).
- Cálculo y visualización de puntuación promedio por película.
- Reseñas visibles antes de comprar entrada (en la ficha de película).
- Sección "Mis películas": histórico visual (pósters, fechas, calificación propia) a partir de entradas validadas.
- Recalcular "3 más vendidas" del home con datos reales de compras.

**Entregable**: reseñas integradas en ficha de película, sección "Mis películas" funcionando.

---

### Sprint 8 — Panel de administración y reportes
**Módulo: Admin / Reportes**
- Dashboard admin: accesos rápidos a salas, funciones, productos, cupones, puntos, combos (unifica CRUDs de sprints anteriores en una sola experiencia coherente).
- Reporte de facturación por día y cantidad de entradas vendidas.
- Exportación de reportes a PDF y Excel.
- Gráficos: películas más vistas (semana/mes), producto de candy bar más vendido.
- Log de actividad (creación de funciones, modificación de precios, validación de QR) con usuario, fecha y hora.

**Entregable**: panel admin completo con reportes exportables, gráficos y auditoría.

---

### Sprint 9 — App de empleados (validación de QR)
**Módulo: Operación / Empleados**
- Vista de escaneo de QR (cámara) para validar entradas de cine y candy bar.
- Ingreso manual de código como fallback si el lector falla.
- Invalidación del QR tras validar entrada o entregar producto.
- Registro de cada validación en el log de actividad (Sprint 8).

**Entregable**: flujo de validación en sala/candy bar operativo, con y sin cámara.

---

### Sprint 10 — PWA, UX final, pulido y despliegue
**Módulo: PWA / UX / Cierre**
- Configuración de PWA (manifest, service worker, instalación, funcionamiento offline básico del catálogo).
- Reemplazo de inputs nativos de fecha/hora por selectores custom amigables (requisito explícito del cliente).
- Revisión general de UX: reducir scroll, navegación simple para clientes y empleados.
- Revisión de accesibilidad y consistencia visual (estilo único y producido).
- Testing end-to-end de los flujos críticos: compra, cancelación, canje de puntos, validación de QR, asignación automática de salas.
- Despliegue final, verificación de URL pública, y redacción final del README (arquitectura, decisiones técnicas, diagrama de datos).
- Preparación de la defensa oral: justificar decisiones de arquitectura, Supabase, PWA y lógica de negocio.

**Entregable**: aplicación desplegada, PWA instalable, README completo, lista para defensa oral.

---

## Resumen de módulos vs. sprints

| Módulo | Sprint(s) |
|---|---|
| Infraestructura | 0 |
| Usuarios / Auth | 1 |
| Catálogo / Salas | 2 |
| Funciones (asignación automática, preventa) | 3 |
| Compra de entradas (butacas, QR, PDF, cancelación) | 4 |
| Candy bar / Combos | 5 |
| Cupones / Fidelización | 6 |
| Reseñas / Mis películas | 7 |
| Admin / Reportes | 8 |
| Empleados / Validación QR | 9 |
| PWA / UX / Despliegue final | 10 |
