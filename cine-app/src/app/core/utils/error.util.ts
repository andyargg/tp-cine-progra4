const MENSAJES_CONOCIDOS: [RegExp, string][] = [
  [/invalid login credentials/i, 'Email o contraseña incorrectos.'],
  [/email not confirmed/i, 'Todavía no confirmaste tu email. Revisá tu casilla de correo.'],
  [/user already registered|already been registered/i, 'Ya existe una cuenta con ese email.'],
  [/password should be at least/i, 'La contraseña debe tener al menos 6 caracteres.'],
  [/rate limit|too many requests|for security purposes/i, 'Demasiados intentos. Esperá unos minutos y volvé a probar.'],
  [/unable to validate email|invalid email|email address .* is invalid/i, 'El email ingresado no es válido.'],
  [/failed to fetch|networkerror|network request failed/i, 'No hay conexión con el servidor. Revisá tu internet.'],
];

export function mensajeDeError(err: unknown, mensajePorDefecto: string): string {
  if (!err || typeof err !== 'object') return mensajePorDefecto;

  const { code, message } = err as { code?: unknown; message?: unknown };
  if (typeof message !== 'string') return mensajePorDefecto;

  if (code === 'P0001') return message;

  for (const [patron, texto] of MENSAJES_CONOCIDOS) {
    if (patron.test(message)) return texto;
  }

  if (Object.getPrototypeOf(err) === Error.prototype) return message;

  if (code === '23505') return 'Ese dato ya está registrado.';
  if (code === '42501') return 'No tenés permisos para realizar esta acción.';

  return mensajePorDefecto;
}
