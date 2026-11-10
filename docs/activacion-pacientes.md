# Activación de cuentas de pacientes

Al crear un paciente desde el panel, el backend guarda la ficha y la cuenta
pendiente en una transacción. Envía la invitación después de confirmar ambas
escrituras. El enlace vence en 24 horas y se consume cuando el paciente establece
su contraseña. La API devuelve el estado del envío sin devolver el token.

Si el proveedor rechaza el envío, la ficha queda registrada y el personal
autorizado puede elegir **Reenviar invitación** en la lista de pacientes. Espera
al menos un minuto entre envíos. Un reenvío reemplaza el enlace anterior. El
enlace queda vinculado al correo, al rol y a la versión de sesión de la cuenta.

## Contrato HTTP

- `POST /api/v1/pacientes` devuelve `201` con la ficha y
  `invitacionEnviada`. Si el correo falla, ese valor es `false`.
- `POST /api/v1/pacientes/:id/activacion` requiere permiso para crear pacientes.
  Devuelve `200` tras entregar la invitación al proveedor, `409` cuando no se
  puede reenviar todavía y `502` ante un fallo de envío.
- `POST /api/v1/registro/activacion` recibe `token` y `password` en el cuerpo.
  Devuelve `200` tras activar la cuenta y `400` ante una invitación inválida,
  vencida o ya utilizada. El paciente inicia sesión después de la activación.

## Antes del despliegue

1. Comprueba que el primer origen en `CLIENT_URL` sea el frontend público
   correcto y use HTTPS. La invitación abre la ruta `/activar-cuenta`.
2. Confirma que MongoDB admite transacciones y que el proveedor de correo
   existente, Resend o SMTP, tiene un remitente operativo. Desactiva el
   seguimiento de clics para invitaciones si el proveedor lo tiene habilitado.
3. En un entorno de prueba y con un destinatario autorizado, crea una ficha
   sintética, confirma que el enlace recibido abre la pantalla de activación y
   prueba el acceso posterior. Comprueba también el reenvío y que el enlace
   anterior deje de funcionar.
4. Revisa las cuentas creadas antes de este parche siguiendo el procedimiento
   siguiente. El despliegue por sí solo no rota sus credenciales.

## Cuentas anteriores

Una cuenta antigua pudo haberse creado por registro público, mediante el panel,
o haber cambiado su contraseña después. La fecha o el rol solos no identifican
si la contraseña sigue siendo el RUT.

1. Con autorización del responsable, ejecuta en un entorno controlado una
   revisión de solo lectura. Considera cuentas de paciente anteriores al parche
   vinculadas a una ficha. Compara con bcrypt el RUT normalizado con el hash
   existente. Devuelve solo conteos para revisión y conserva cualquier lista de
   trabajo con acceso restringido. Evita exportar hashes, RUT o contraseñas.
2. Prepara y revisa una operación de recuperación para las cuentas confirmadas.
   Con el correo verificado, sustituye el hash antiguo por el de una contraseña
   aleatoria generada para esa cuenta, marca la activación como pendiente,
   elimina cualquier invitación y refresh token previos e incrementa
   `sessionVersion`. Aplica esos cambios de forma atómica y verifica que una
   sesión previa ya no acceda. Conserva el estado administrativo de cada cuenta.
3. Comunica la recuperación a través de un canal autorizado. Emite una nueva
   invitación desde el panel para las cuentas activas que corresponda recuperar.
   Si el correo o la titularidad están en duda, deriva a revisión manual.

La revisión y la recuperación de cuentas antiguas requieren autorización
operativa y una prueba con datos ficticios antes de intervenir en producción.
