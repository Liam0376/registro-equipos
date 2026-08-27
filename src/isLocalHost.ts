/**
 * Solo la computadora que corre el servidor (localhost) tiene acceso a la
 * pestaña de Admin. Quienes se conectan por la red ven el formulario de
 * registro sin admin.
 */
export function isLocalHost(): boolean {
  const host = window.location.hostname
  return host === 'localhost' || host === '127.0.0.1' || host === '::1'
}