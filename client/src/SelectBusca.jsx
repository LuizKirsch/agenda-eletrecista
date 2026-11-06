import { useEffect, useId, useRef, useState } from 'react';

const norm = (s) => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

// Select com busca (combobox ARIA). opcoes: [{ valor, rotulo, desabilitada? }]; onChange recebe o valor.
export default function SelectBusca({ opcoes, value, onChange, placeholder = 'Selecione', disabled, required, name, ariaLabel }) {
  const id = useId();
  const raiz = useRef(null);
  const campo = useRef(null);
  const lista = useRef(null);
  const [aberto, setAberto] = useState(false);
  const [busca, setBusca] = useState(null); // null = mostra o rótulo selecionado
  const [ativo, setAtivo] = useState(0);

  const atual = opcoes.find((o) => String(o.valor) === String(value));
  const visiveis = busca ? opcoes.filter((o) => norm(o.rotulo).includes(norm(busca))) : opcoes;

  useEffect(() => { campo.current?.setCustomValidity(required && !value ? 'Selecione uma opção.' : ''); }, [required, value]);
  useEffect(() => { lista.current?.children[ativo]?.scrollIntoView?.({ block: 'nearest' }); }, [ativo, aberto]);

  function abrir() {
    if (aberto || disabled) return;
    setAberto(true);
    setAtivo(Math.max(0, opcoes.findIndex((o) => String(o.valor) === String(value) && !o.desabilitada)));
  }
  function fechar() { setAberto(false); setBusca(null); }
  function escolher(o) {
    if (!o || o.desabilitada) return;
    onChange(String(o.valor));
    fechar();
  }
  function mover(passo) {
    if (!visiveis.length) return;
    let i = ativo;
    for (let n = 0; n < visiveis.length; n++) {
      i = (i + passo + visiveis.length) % visiveis.length;
      if (!visiveis[i].desabilitada) break;
    }
    setAtivo(i);
  }
  function tecla(e) {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (!aberto) abrir(); else mover(e.key === 'ArrowDown' ? 1 : -1);
    } else if (e.key === 'Enter' && aberto) {
      e.preventDefault(); // não envia o formulário
      escolher(visiveis[ativo]);
    } else if (e.key === 'Escape' && aberto) {
      e.preventDefault();
      e.stopPropagation(); // não fecha o modal junto
      fechar();
    }
  }

  return (
    <div className="select-busca" ref={raiz} onBlur={(e) => { if (!raiz.current.contains(e.relatedTarget)) fechar(); }}>
      <input
        ref={campo}
        type="text"
        role="combobox"
        aria-expanded={aberto}
        aria-controls={`${id}-lista`}
        aria-autocomplete="list"
        aria-activedescendant={aberto && visiveis[ativo] ? `${id}-${ativo}` : undefined}
        aria-label={ariaLabel}
        autoComplete="off"
        value={busca ?? atual?.rotulo ?? ''}
        placeholder={placeholder}
        disabled={disabled}
        onChange={(e) => { setBusca(e.target.value); setAberto(true); setAtivo(0); }}
        onFocus={(e) => e.target.select()}
        onClick={abrir}
        onKeyDown={tecla}
      />
      <span className="select-busca-seta" aria-hidden="true" />
      {name && <input type="hidden" name={name} value={value ?? ''} disabled={disabled} />}
      {aberto && (
        <ul className="select-busca-lista" role="listbox" id={`${id}-lista`} ref={lista}>
          {visiveis.map((o, i) => (
            <li
              key={o.valor}
              id={`${id}-${i}`}
              role="option"
              aria-selected={String(o.valor) === String(value)}
              aria-disabled={o.desabilitada || undefined}
              className={`${i === ativo ? 'ativo' : ''}${o.desabilitada ? ' desabilitada' : ''}`}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => escolher(o)}
              onMouseMove={() => !o.desabilitada && setAtivo(i)}
            >{o.rotulo}</li>
          ))}
          {!visiveis.length && <li className="vazio" role="presentation">Nenhum resultado</li>}
        </ul>
      )}
    </div>
  );
}
