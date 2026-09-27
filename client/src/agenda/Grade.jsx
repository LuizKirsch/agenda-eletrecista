import { useEffect, useRef } from 'react';
import { dataCurta, hoje, nomeDia, paraHora, paraMin, somarDias } from '../datas';

const ALTURA_HORA = 48;
const PX_POR_MIN = ALTURA_HORA / 60;
const SEGURAR_MS = 300;
const ALTURA_MIN = 20;
const HORAS = Array.from({ length: 24 }, (_, h) => h);

const fimNaTela = (ini, fim) => Math.max(fim, ini + ALTURA_MIN / PX_POR_MIN);

// Atividades da mesma OS que se cobririam na tela (por causa da altura mínima do bloco) viram um
// único bloco; tocar nele lista as atividades do grupo.
function agrupar(doDia) {
  const unidades = [];
  const ultimaDaOs = new Map();
  const ordenadas = [...doDia].sort((x, y) => paraMin(x.hora_inicio) - paraMin(y.hora_inicio) || x.sequencia - y.sequencia);
  for (const a of ordenadas) {
    const ini = paraMin(a.hora_inicio);
    const fim = paraMin(a.hora_fim);
    const anterior = ultimaDaOs.get(a.os_id);
    if (anterior && ini < anterior.fimVisual) {
      anterior.itens.push(a);
      anterior.fim = Math.max(anterior.fim, fim);
      anterior.fimVisual = Math.max(anterior.fimVisual, fimNaTela(ini, fim));
    } else {
      const unidade = { itens: [a], ini, fim, fimVisual: fimNaTela(ini, fim), col: 0, cols: 1 };
      unidades.push(unidade);
      ultimaDaOs.set(a.os_id, unidade);
    }
  }
  return unidades;
}

// Sobrepostas lado a lado (RF 1.21): mesma lógica de layoutDayInstances do protótipo, usando o fim
// na tela, para que blocos de OS diferentes nunca se cubram.
function distribuirColunas(doDia) {
  const itens = agrupar(doDia).sort((x, y) => x.ini - y.ini || x.fim - y.fim);
  let abertos = [];
  let grupo = [];
  let maxCol = 0;
  const fecharGrupo = () => {
    grupo.forEach((it) => { it.cols = maxCol + 1; });
    grupo = [];
    maxCol = 0;
  };
  for (const item of itens) {
    abertos = abertos.filter((x) => x.fimVisual > item.ini);
    if (!abertos.length && grupo.length) fecharGrupo();
    const usadas = new Set(abertos.map((x) => x.col));
    while (usadas.has(item.col)) item.col++;
    maxCol = Math.max(maxCol, item.col);
    abertos.push(item);
    grupo.push(item);
  }
  if (grupo.length) fecharGrupo();
  return itens;
}

export default function Grade({ segunda, atividades, onNovaOs, onAbrir, onSoltar }) {
  const dias = Array.from({ length: 7 }, (_, i) => somarDias(segunda, i));
  const dataHoje = hoje();
  const gradeRef = useRef(null);
  const arraste = useRef(null);

  useEffect(() => {
    const el = gradeRef.current;
    const bloquearRolagem = (e) => {
      if (arraste.current?.ativo) e.preventDefault();
    };
    el.addEventListener('touchmove', bloquearRolagem, { passive: false });
    return () => el.removeEventListener('touchmove', bloquearRolagem);
  }, []);

  function ativar(ctx, pointerId) {
    ctx.ativo = true;
    try { ctx.bloco.setPointerCapture(pointerId); } catch { /* ponteiro já liberado */ }
    const fantasma = ctx.bloco.cloneNode(true);
    Object.assign(fantasma.style, {
      position: 'fixed', left: `${ctx.rect.left}px`, top: `${ctx.rect.top}px`, width: `${ctx.rect.width}px`,
      height: `${ctx.rect.height}px`, margin: '0', pointerEvents: 'none', zIndex: '999', opacity: '.92',
    });
    fantasma.classList.add('fantasma');
    document.body.appendChild(fantasma);
    ctx.fantasma = fantasma;
    ctx.bloco.classList.add('origem-arraste');
  }

  function limpar(ctx) {
    clearTimeout(ctx.timer);
    ctx.fantasma?.remove();
    ctx.bloco.classList.remove('origem-arraste');
    ctx.coluna?.classList.remove('alvo');
    arraste.current = null;
  }

  function aoPressionar(e, unidade) {
    if (e.button !== 0) return;
    const bloco = e.currentTarget;
    const rect = bloco.getBoundingClientRect();
    const ctx = {
      unidade, bloco, rect, x0: e.clientX, y0: e.clientY, dx: e.clientX - rect.left, dy: e.clientY - rect.top,
      toque: e.pointerType === 'touch', arrastavel: unidade.itens.some((a) => a.status === 'agendada'),
      ativo: false, moveu: false, coluna: null,
    };
    arraste.current = ctx;
    if (ctx.toque) {
      // toque: só arrasta depois de pressionar e segurar, para não brigar com a rolagem
      if (ctx.arrastavel) ctx.timer = setTimeout(() => ativar(ctx, e.pointerId), SEGURAR_MS);
    } else {
      e.preventDefault();
      bloco.setPointerCapture(e.pointerId);
    }
  }

  function aoMover(e) {
    const ctx = arraste.current;
    if (!ctx) return;
    const distancia = Math.hypot(e.clientX - ctx.x0, e.clientY - ctx.y0);
    if (!ctx.ativo) {
      if (ctx.toque) {
        if (distancia > 10) limpar(ctx);
        return;
      }
      if (distancia <= 5) return;
      ctx.moveu = true;
      if (!ctx.arrastavel) return;
      ativar(ctx, e.pointerId);
    }
    ctx.moveu = true;
    ctx.fantasma.style.left = `${e.clientX - ctx.dx}px`;
    ctx.fantasma.style.top = `${e.clientY - ctx.dy}px`;
    const coluna = document.elementFromPoint(e.clientX, e.clientY)?.closest('.dia-col') ?? null;
    if (coluna !== ctx.coluna) {
      ctx.coluna?.classList.remove('alvo');
      coluna?.classList.add('alvo');
      ctx.coluna = coluna;
    }
  }

  function aoSoltar(e) {
    const ctx = arraste.current;
    if (!ctx) return;
    const { unidade, ativo, moveu, coluna } = ctx;
    limpar(ctx);
    if (ativo && moveu && coluna) {
      const topo = e.clientY - ctx.dy - coluna.getBoundingClientRect().top;
      const inicio = Math.min(Math.max(Math.round(topo / PX_POR_MIN / 15) * 15, 0), 1440 - 15);
      if (unidade.itens.length === 1) {
        onSoltar(unidade.itens[0], coluna.dataset.data, inicio);
      } else {
        // grupo: remarca a OS inteira usando a 1ª agendada do grupo como referência
        const referencia = unidade.itens.find((a) => a.status === 'agendada');
        onSoltar(referencia, coluna.dataset.data, inicio + paraMin(referencia.hora_inicio) - unidade.ini, { osInteira: true });
      }
    } else if (!ativo && !moveu) {
      onAbrir(unidade.itens);
    }
  }

  function classes({ itens }) {
    const agendada = itens.some((a) => a.status === 'agendada');
    const status = agendada ? 'agendada' : itens.every((a) => a.status === 'cancelada') ? 'cancelada' : 'concluida';
    return `bloco status-${status}${itens.some((a) => a.conflito) ? ' conflito' : ''}${agendada ? ' arrastavel' : ''}`;
  }

  return (
    <div className="grade-rolagem" ref={gradeRef}>
      <div className="grade">
        <div className="canto" />
        {dias.map((d) => (
          <div key={d} className={`dia-cab${d === dataHoje ? ' hoje' : ''}`}>
            <strong>{nomeDia(d)}</strong>
            <span>{dataCurta(d)}</span>
          </div>
        ))}

        <div className="eixo-horas">
          {HORAS.map((h) => <div key={h} className="hora"><span>{paraHora(h * 60)}</span></div>)}
        </div>

        {dias.map((d) => (
          <div key={d} className={`dia-col${d === dataHoje ? ' hoje' : ''}`} data-data={d}>
            {HORAS.map((h) => (
              <div
                key={h}
                className="slot"
                style={{ top: h * ALTURA_HORA }}
                onClick={() => onNovaOs(d, paraHora(h * 60))}
              />
            ))}
            {distribuirColunas(atividades.filter((a) => a.data === d)).map((u) => {
              const [a] = u.itens;
              return (
                <div
                  key={a.id}
                  role="button"
                  tabIndex={0}
                  className={classes(u)}
                  style={{
                    top: u.ini * PX_POR_MIN,
                    height: Math.max((u.fim - u.ini) * PX_POR_MIN, ALTURA_MIN),
                    left: `calc(${(u.col * 100) / u.cols}% + 2px)`,
                    width: `calc(${100 / u.cols}% - 4px)`,
                  }}
                  onPointerDown={(e) => aoPressionar(e, u)}
                  onPointerMove={aoMover}
                  onPointerUp={aoSoltar}
                  onPointerCancel={() => arraste.current && limpar(arraste.current)}
                  onContextMenu={(e) => e.preventDefault()}
                  onKeyDown={(e) => e.key === 'Enter' && onAbrir(u.itens)}
                >
                  <span className="t">{paraHora(u.ini)}–{paraHora(u.fim)}</span>
                  <span className="c">{a.cliente.nome}</span>
                  {u.itens.length === 1 ? (
                    <span className="t">
                      {a.tipo.nome}
                      {a.total > 1 && <span className="grp"> ({a.sequencia}/{a.total} · OS {a.os_id})</span>}
                    </span>
                  ) : (
                    <span className="t">{u.itens.length} atividades · OS {a.os_id}</span>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
