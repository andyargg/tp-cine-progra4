export function mensajeDeError(err: unknown, mensajePorDefecto: string): string {
  if (
    err &&
    typeof err === 'object' &&
    'message' in err &&
    typeof (err as { message: unknown }).message === 'string'
  ) {
    return (err as { message: string }).message;
  }

  return mensajePorDefecto;
}
