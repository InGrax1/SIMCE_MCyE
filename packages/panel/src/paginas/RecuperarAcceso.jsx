export function RecuperarAcceso({ ejecutar, ocupado, estado, volver }) {
  return (
    <main className="cms-acceso">
      <section className="cms-login">
        <p className="cms-marca">SIMCE · CEA</p>
        <h1>Recupera tu acceso</h1>
        <p>Escribe el correo de tu cuenta. Te enviaremos un enlace válido durante 30 minutos.</p>
        {estado}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const correo = new FormData(e.currentTarget).get('correo');
            ejecutar(correo);
          }}
        >
          <label>
            Correo de tu cuenta
            <input type="email" name="correo" autoComplete="username" required maxLength={160} />
          </label>
          <button disabled={ocupado}>Solicitar enlace</button>
        </form>
        <button type="button" className="secundario" disabled={ocupado} onClick={volver}>
          Volver al inicio de sesión
        </button>
      </section>
    </main>
  );
}

export function RestablecerAcceso({ ejecutar, ocupado, estado, volver }) {
  return (
    <main className="cms-acceso">
      <section className="cms-login">
        <p className="cms-marca">SIMCE · CEA</p>
        <h1>Define tu nueva contraseña</h1>
        <p>Usa al menos 10 caracteres. El enlace solo puede utilizarse una vez.</p>
        {estado}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const datos = new FormData(e.currentTarget);
            ejecutar(datos.get('nueva'), datos.get('confirmacion'));
          }}
        >
          <label>
            Nueva contraseña
            <input
              type="password"
              name="nueva"
              autoComplete="new-password"
              minLength={10}
              maxLength={200}
              required
            />
          </label>
          <label>
            Confirma la nueva contraseña
            <input
              type="password"
              name="confirmacion"
              autoComplete="new-password"
              minLength={10}
              maxLength={200}
              required
            />
          </label>
          <button disabled={ocupado}>Guardar nueva contraseña</button>
        </form>
        <button type="button" className="secundario" disabled={ocupado} onClick={volver}>
          Volver al inicio de sesión
        </button>
      </section>
    </main>
  );
}
