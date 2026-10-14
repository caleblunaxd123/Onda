/** Fragment tokens stay out of server access logs and HTTP referrers. */
export function verificationToken(url: string | null | undefined): string | null {
  if (!url) return null;
  const hash = url.indexOf('#');
  if (hash < 0) return null;
  const token = new URLSearchParams(url.slice(hash + 1)).get('token');
  return token && /^[a-fA-F0-9]{64}$/.test(token) ? token : null;
}

export function verificationMessage(status: string): string {
  switch (status) {
    case 'sent': return 'Enviamos un enlace a tu correo. Vence en 30 minutos; revisa también spam.';
    case 'verified': return 'Tu correo ya está confirmado.';
    case 'wait': return 'Espera un minuto antes de pedir otro enlace.';
    case 'failed': return 'No pudimos enviar el correo. Puedes intentarlo nuevamente en un minuto.';
    default: return 'El envío de correos todavía se está preparando. Conserva tu código de recuperación.';
  }
}
