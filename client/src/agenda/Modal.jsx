import { useEffect, useId, useRef } from 'react';
import { IconeFechar } from '../icones';

export const aposAnimacao = (fn) => (e) =>
  Promise.allSettled(e.currentTarget.getAnimations().map((a) => a.finished)).then(fn);

export function fecharAoClicarFora(e) {
  if (e.target !== e.currentTarget) return;
  const r = e.currentTarget.getBoundingClientRect();
  if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) e.currentTarget.close();
}

// variante "painel": entra pela direita (tela cheia no celular)
// variante "dialogo": centralizado (folha que sobe de baixo no celular)
// rodape: nó ou função (fechar) => nó; botões de envio usam form="<id do form>"
export default function Modal({ titulo, subtitulo, variante = 'painel', largo = false, rodape, onFechar, children }) {
  const ref = useRef(null);
  const idTitulo = useId();
  const fechar = () => ref.current?.close();

  useEffect(() => {
    ref.current.showModal();
  }, []);

  const classe = ['modal', variante === 'dialogo' && 'dialogo', largo && 'largo'].filter(Boolean).join(' ');

  return (
    <dialog ref={ref} className={classe} onClose={aposAnimacao(onFechar)} onClick={fecharAoClicarFora} aria-labelledby={idTitulo}>
      <div className="modal-cab">
        <div>
          <h2 id={idTitulo}>{titulo}</h2>
          {subtitulo && <p className="suave">{subtitulo}</p>}
        </div>
        <button type="button" className="icone-botao discreto" aria-label="Fechar" onClick={fechar}><IconeFechar /></button>
      </div>
      <div className="modal-corpo">{children}</div>
      {rodape && <div className="modal-rodape">{typeof rodape === 'function' ? rodape(fechar) : rodape}</div>}
    </dialog>
  );
}
