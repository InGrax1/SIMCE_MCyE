import { useEffect, useRef, useState } from 'react';

export function Camara({ alLeer, cerrar }) {
  const video = useRef(null);
  const callbacks = useRef({ alLeer, cerrar });
  const [error, cambiarError] = useState('');
  callbacks.current = { alLeer, cerrar };
  useEffect(() => {
    let activa = true;
    let control;
    async function abrir() {
      try {
        const [{ BrowserMultiFormatOneDReader }, { BarcodeFormat, DecodeHintType }] =
          await Promise.all([import('@zxing/browser'), import('@zxing/library')]);
        if (!activa) return;
        const lector = new BrowserMultiFormatOneDReader(
          new Map([[DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.EAN_13]]]),
        );
        control = await lector.decodeFromConstraints(
          { audio: false, video: { facingMode: { ideal: 'environment' } } },
          video.current,
          (resultado, _error, controles) => {
            if (!activa || !resultado) return;
            activa = false;
            controles.stop();
            callbacks.current.alLeer(resultado.getText());
            callbacks.current.cerrar();
          },
        );
        if (!activa) control.stop();
      } catch {
        if (activa)
          cambiarError(
            'No se pudo abrir la cámara. Revisa el permiso o usa el lector de teclado o la captura manual.',
          );
      }
    }
    abrir();
    return () => {
      activa = false;
      control?.stop();
    };
  }, []);
  return (
    <div className="cms-form-gestion">
      <video
        ref={video}
        muted
        playsInline
        aria-label="Vista de cámara para leer una etiqueta"
        className="operacion-video"
      />
      {error ? <p role="alert">{error}</p> : <p>Coloca el código completo frente a la cámara.</p>}
      <button className="secundario" type="button" onClick={cerrar}>
        Cerrar cámara
      </button>
    </div>
  );
}
