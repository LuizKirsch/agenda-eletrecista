import { useEffect, useId, useRef, useState } from 'react';
import { IconeFechar } from '../icones';

// close/cancel de um modal empilhado sobem pela árvore do React; só reage ao do próprio dialog
const aposAnimacao = (fn) => (e) => {
  if (e.target !== e.currentTarget) return;
  Promise.allSettled(e.currentTarget.getAnimations().map((a) => a.finished)).then(fn);
};

function clicouFora(e) {
  if (e.target !== e.currentTarget) return false;
  const r = e.currentTarget.getBoundingClientRect();
  return e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom;
}

// variante "painel": entra pela direita (tela cheia no celular)
// variante "dialogo": centralizado (folha que sobe de baixo no celular)
// rodape: nó ou função (fechar) => nó; botões de envio usam form="<id do form>"
// confirmarSaida: com dados não salvos, qualquer forma de fechar (×, Cancelar, clique fora, Esc) pergunta antes
export default function Modal({
  titulo, subtitulo, variante = 'painel', largo = false, confirmarSaida = false, rodape, onFechar, children,
}) {
  const ref = useRef(null);
  const idTitulo = useId();
  const [perguntando, setPerguntando] = useState(false);
  const fechar = () => ref.current?.close();
  const tentarFechar = () => (confirmarSaida ? setPerguntando(true) : fechar());

  useEffect(() => {
    ref.current.showModal();
  }, []);

  const classe = ['modal', variante === 'dialogo' && 'dialogo', largo && 'largo'].filter(Boolean).join(' ');

  return (
    <dialog
      ref={ref}
      className={classe}
      onClose={aposAnimacao(onFechar)}
      onClick={(e) => clicouFora(e) && tentarFechar()}
      onCancel={(e) => {
        if (e.target !== e.currentTarget || !confirmarSaida) return;
        e.preventDefault();
        setPerguntando(true);
      }}
      aria-labelledby={idTitulo}
    >
      <div className="modal-cab">
        <div>
          <h2 id={idTitulo}>{titulo}</h2>
          {subtitulo && <p className="suave">{subtitulo}</p>}
        </div>
        <button type="button" className="icone-botao discreto" aria-label="Fechar" onClick={tentarFechar}><IconeFechar /></button>
      </div>
      <div className="modal-corpo">{children}</div>
      {rodape && <div className="modal-rodape">{typeof rodape === 'function' ? rodape(tentarFechar) : rodape}</div>}
      {perguntando && (
        <Confirmar
          titulo="Descartar alterações?"
          rotulo="Descartar"
          rotuloEnviando="Descartar"
          rotuloCancelar="Continuar editando"
          onFechar={() => setPerguntando(false)}
          onConfirmar={async () => { setPerguntando(false); fechar(); }}
        >
          As informações preenchidas ainda não foram salvas e serão perdidas.
        </Confirmar>
      )}
    </dialog>
  );
}

// confirmação no lugar do window.confirm; se onConfirmar lançar, o erro aparece no modal
export function Confirmar({
  titulo, subtitulo, rotulo, rotuloEnviando, rotuloCancelar = 'Cancelar', onConfirmar, onFechar, children,
}) {
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);

  async function confirmar() {
    setErro('');
    setEnviando(true);
    try {
      await onConfirmar();
    } catch (err) {
      setErro(err.message);
      setEnviando(false);
    }
  }

  return (
    <Modal
      titulo={titulo}
      subtitulo={subtitulo}
      variante="dialogo"
      onFechar={onFechar}
      rodape={(fechar) => (
        <>
          <button type="button" onClick={fechar}>{rotuloCancelar}</button>
          <button type="button" className="perigo" disabled={enviando} onClick={confirmar}>{enviando ? rotuloEnviando : rotulo}</button>
        </>
      )}
    >
      <p className="suave" style={{ margin: 0 }}>{children}</p>
      {erro && <p className="erro" role="alert" style={{ marginTop: 12 }}>{erro}</p>}
    </Modal>
  );
}
