import { useEffect, useId, useRef } from 'react';

export const aposAnimacao = (fn) => (e) =>
  Promise.allSettled(e.currentTarget.getAnimations().map((a) => a.finished)).then(fn);

export function fecharAoClicarFora(e) {
  if (e.target !== e.currentTarget) return;
  const r = e.currentTarget.getBoundingClientRect();
  if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) e.currentTarget.close();
}

export default function Modal({ titulo, subtitulo, onFechar, children }) {
  const ref = useRef(null);
  const idTitulo = useId();

  useEffect(() => {
    ref.current.showModal();
  }, []);

  return (
    <dialog ref={ref} className="modal" onClose={aposAnimacao(onFechar)} onClick={fecharAoClicarFora} aria-labelledby={idTitulo}>
      <div className="cabecalho">
        <h2 id={idTitulo}>{titulo}</h2>
        <button type="button" onClick={() => ref.current.close()}>Fechar</button>
      </div>
      {subtitulo && <div className="subtitulo">{subtitulo}</div>}
      {children}
    </dialog>
  );
}
