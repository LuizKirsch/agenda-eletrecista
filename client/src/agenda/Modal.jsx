import { useEffect, useId, useRef } from 'react';

export default function Modal({ titulo, subtitulo, onFechar, children }) {
  const ref = useRef(null);
  const idTitulo = useId();

  useEffect(() => {
    ref.current.showModal();
  }, []);

  return (
    <dialog ref={ref} className="modal" onClose={onFechar} aria-labelledby={idTitulo}>
      <div className="cabecalho">
        <h2 id={idTitulo}>{titulo}</h2>
        <button type="button" onClick={() => ref.current.close()}>Fechar</button>
      </div>
      {subtitulo && <div className="subtitulo">{subtitulo}</div>}
      {children}
    </dialog>
  );
}
