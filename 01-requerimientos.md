# TP1 - Programación IV - Sistema de Cine
## Requerimientos extraídos de la consigna y el intercambio de emails

---

## 0. Cláusulas de entrega (consigna formal)

1. Crear documento que resuma todos los requerimientos a realizar (este documento).
2. Crear la aplicación utilizando todos los temas vistos en clase.
3. Defender oralmente las decisiones tomadas el día de la entrega.
4. Aplicación **desplegada** con URL funcional.
5. Código publicado en **GitHub**.
6. **README** con arquitectura y decisiones técnicas.

### A considerar (criterios de evaluación)

- El estilo visual de la aplicación debe ser **único y producido** (no template genérico).
- Los profesores pueden pedir cambios si no se respeta la consigna.
- La aprobación y/o promoción depende de la **defensa oral**.
- Se evalúa el uso correcto de **Angular**, buenas prácticas y técnicas vistas en clase.
- Se evalúa la integración con **Supabase**.
- Se evalúa la integración de **PWA**.
- Se evalúa la **lógica de negocio** lograda.

---

## 1. Estructura del cine

- Es un edificio único, con varias salas.
- Distribución **original** de butacas por sala: 20 filas (A–T) x 3 columnas de 4, 20 y 4 butacas.
- **Cambio posterior**: se eliminan las filas J y K (las del medio) para crear una fila de butacas accesibles (discapacidad). Esa fila queda con 2, 10 y 2 butacas.
- **Butacas VIP**: últimas 3 filas de cada sala (R, S, T). Precio más alto, marcadas visualmente distinto. El usuario debe confirmar explícitamente que está comprando una butaca VIP antes de pagar.
- Las butacas accesibles deben resaltarse visualmente distinto del resto.
- Selección de butacas **en tiempo real**: si otro usuario está comprando en simultáneo, deben verse las butacas que ese otro usuario está ocupando/reservando en el momento.

## 2. Películas y funciones

- Atributos de película: nombre, imagen, sinopsis, duración, uno o varios **géneros**, formato (2D/3D/4D/5D), idioma (castellano/subtitulado).
- El admin controla qué películas se muestran y en qué horarios.
- **Restricción de solapamiento por duración**: no puede haber una función en una sala hasta que no pasen 30 minutos desde que terminó la función anterior en esa misma sala.
- **Asignación automática de sala**: el admin define horarios/días recurrentes para una película (ej. "lunes, martes y viernes 18hs") y el sistema asigna la sala automáticamente, garantizando que nunca se solapen dos funciones en la misma sala al mismo tiempo.
- **Restricción de edad**: películas pueden requerir +18, +13 o sin restricción. No se permite comprar entradas de esas películas a usuarios menores de la edad requerida (requiere conocer la fecha de nacimiento del usuario). Si la entrada es de una película con restricción, debe aclararse que debe asistir un adulto.
- **Próximamente**: sección con películas a estrenarse en las próximas semanas. El usuario puede activar una alerta/notificación para cuando la entrada esté disponible.
- **Preventa**: configurable por película. Se puede abrir la venta 7 días antes del estreno con precio especial; pasada la fecha de preventa, el precio vuelve a ser el normal.

## 3. Usuarios y registro

- Datos a recolectar en el registro: mail, nombre, apellido, fecha de nacimiento, tipo de sangre, color de ojos, cantidad de días de vacaciones por año.
- Beneficio por registrarse: cupón de 20% de descuento en la primera compra (el porcentaje debe ser **configurable** por el admin).
- Se permite comprar de forma **anónima** (sin registrarse), siempre que se pague.
- El admin puede crear **cupones segmentados**, por ejemplo aplicables solo a usuarios mayores de 50 años (requiere calcular edad a partir de la fecha de nacimiento).
- Perfil de usuario debe mostrar: puntos acumulados, historial de canjes, crédito disponible en cuenta.
- Sección **"Mis películas"**: historial visual de películas vistas por el usuario, con póster, fecha y su propia calificación.

## 4. Reseñas y descubrimiento

- Los usuarios pueden calificar con estrellas y dejar un comentario corto por película.
- Las reseñas deben poder verse **antes** de comprar la entrada.
- Debe mostrarse la puntuación promedio de cada película.
- La página principal debe mostrar primero las **3 películas más vendidas**.
- El listado de películas debe tener un **buscador**.
- El buscador debe poder **filtrar por género** (una película puede tener varios géneros).

## 5. Compra de entradas

- El sistema genera un **PDF** con los datos de la entrada y un **código QR** para presentar en el ingreso.
- Se pueden comprar productos de candy bar junto con la entrada, retirables con el mismo QR.
- **Combos**: entrada + pochoclos + bebida a precio fijo, configurable desde el panel de admin. Deben mostrarse destacados en la página de compra.
- **Cancelación**: el usuario puede cancelar una compra hasta 2 horas antes de la función. No hay devolución de dinero; en cambio se otorga **crédito en cuenta** que puede combinarse con otros métodos de pago en compras futuras.
- Una vez que una entrada se valida (o se entrega la comida asociada), el QR deja de ser válido.

## 6. Candy bar

- Productos (pochoclos, bebidas, etc.) administrables, organizados en categorías.
- Compra combinada con la entrada, un mismo QR sirve para retirar comida y para el ingreso a sala.

## 7. Programa de fidelización (puntos)

- Solo para usuarios registrados: 1 punto por cada peso gastado.
- Los puntos se canjean por entradas gratis o productos de candy bar.
- El admin configura el costo en puntos de cada recompensa (ej. entrada = 500 pts, pochoclo grande = 150 pts).
- El usuario ve en su perfil el saldo de puntos y el historial de canjes.
- Los puntos **no son transferibles** entre usuarios.

## 8. Administración (rol admin)

- CRUD completo de salas, funciones, distribución de butacas, productos, categorías, combos y precios.
- Configuración de cupones (porcentaje, segmentación por edad, vigencia).
- Configuración del programa de puntos (equivalencias de canje).
- Configuración de preventa por película (fecha de apertura, precio especial).
- Reportes: facturación por día y cantidad de entradas vendidas.
- Exportación de reportes a **PDF y Excel**.
- Gráficos: películas más vistas por semana y por mes; producto de candy bar más vendido.
- **Log de actividad**: quién creó una función, quién modificó un precio, quién validó un QR — todo con fecha y hora.

## 9. Rol empleado

- Usuario de tipo empleado para escanear QRs y validar entradas (cine) y consumos (candy bar).
- Posibilidad de ingresar el código manualmente si el lector/scanner falla.
- Tras validar, el QR queda inutilizado.

## 10. UX / UI

- Interfaces simples y fáciles de navegar tanto para clientes como para empleados.
- Selector de fecha/hora amigable (explícitamente se pide **no** usar inputs nativos tipo calendario básico como el de la imagen de referencia del cliente).
- Minimizar el scroll excesivo.
- Estilo visual propio, no genérico.

## 11. Fuera de alcance (mencionado pero sin luz verde)

- Pantalla con mapa del cine que indique la sala asignada a la entrada comprada: el cliente lo menciona como idea a futuro, **sin confirmar** — no implementar en esta entrega salvo indicación posterior.

---

## Resumen de entidades del dominio

`Usuario` (registrado/anónimo/empleado/admin), `Perfil` (puntos, crédito, historial), `Película`, `Género`, `Sala`, `Butaca` (normal/accesible/VIP), `Función`, `Entrada`, `Reserva temporal de butaca`, `Reseña`, `Cupón`, `ProgramaPuntos`/`Recompensa`, `Producto` (candy), `Categoría`, `Combo`, `Compra`/`Orden`, `Crédito`, `LogActividad`, `AlertaEstreno`, `Preventa`.
