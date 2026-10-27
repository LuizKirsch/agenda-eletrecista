import { dataCurta, hoje, somarDias } from '../datas';
import { IconeAlerta, IconeDireita, IconeEsquerda } from '../icones';

const CURTOS = ['seg', 'ter', 'qua', 'qui', 'sex', 'sáb', 'dom'];
const LONGOS = ['segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado', 'domingo'];
const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

function tituloDia(data, i, dataHoje) {
  const base = `${LONGOS[i]}, ${Number(data.slice(8, 10))} de ${MESES[Number(data.slice(5, 7)) - 1]}`;
  if (data === dataHoje) return `Hoje · ${base}`;
  if (data === somarDias(dataHoje, 1)) return `Amanhã · ${base}`;
  return base.charAt(0).toUpperCase() + base.slice(1);
}

// Celular: faixa com os 7 dias e lista só com os horários agendados, agrupados por dia (estilo Teams).
// Sem arraste aqui; remarcar no celular é pelo detalhe da OS.
export default function ListaSemana({ segunda, atividades, onSemanaAnterior, onProximaSemana, onAbrir }) {
  const dataHoje = hoje();
  const dias = Array.from({ length: 7 }, (_, i) => somarDias(segunda, i));
  const doDia = (d) => atividades.filter((a) => a.data === d);

  const irPara = (d) => document.getElementById(`dia-${d}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  return (
    <>
      <div className="faixa-dias">
        <button type="button" aria-label="Semana anterior" onClick={onSemanaAnterior}><IconeEsquerda /></button>
        <div className="dias">
          {dias.map((d, i) => {
            const itens = doDia(d);
            const marca = itens.some((a) => a.conflito) ? 'conflito' : itens.length ? 'tem' : '';
            const classe = ['dia', d === dataHoje && 'hoje', d < dataHoje && 'passado'].filter(Boolean).join(' ');
            return (
              <button key={d} type="button" className={classe} aria-current={d === dataHoje ? 'date' : undefined}
                aria-label={`${LONGOS[i]} ${dataCurta(d)}${itens.length ? `, ${itens.length} atividade(s)` : ''}`} onClick={() => irPara(d)}>
                <span>{CURTOS[i]}</span>
                <b>{Number(d.slice(8, 10))}</b>
                <i className={marca} />
              </button>
            );
          })}
        </div>
        <button type="button" aria-label="Próxima semana" onClick={onProximaSemana}><IconeDireita /></button>
      </div>

      <div className="lista-dias">
        {dias.map((d, i) => {
          const itens = doDia(d);
          if (d < dataHoje && itens.length === 0) return null; // dias que já passaram sem nada: some da lista
          return (
            <section key={d} id={`dia-${d}`} aria-labelledby={`titulo-${d}`} style={{ scrollMarginTop: 16 }}>
              <h2 id={`titulo-${d}`}>{tituloDia(d, i, dataHoje)}</h2>
              {itens.length === 0 && <p className="nada">Nada agendado</p>}
              {itens.map((a) => {
                const encerrada = a.status !== 'agendada';
                const classe = ['item-agenda', a.conflito && !encerrada && 'conflito', encerrada && 'encerrada', a.status === 'cancelada' && 'cancelada']
                  .filter(Boolean).join(' ');
                return (
                  <button key={a.id} type="button" className={classe} onClick={() => onAbrir(a)}>
                    <span className="horas"><b>{a.hora_inicio}</b><small>{a.hora_fim}</small></span>
                    <span className="barra" aria-hidden="true" />
                    <span className="info">
                      <strong>{a.cliente.nome}</strong>
                      <span>{a.tipo.nome}{a.endereco?.cidade ? ` · ${a.endereco.cidade}` : ''}</span>
                      {a.status === 'cancelada' && <span>Cancelada</span>}
                      {a.status === 'concluida' && <span>Concluída</span>}
                      {a.conflito && !encerrada && <span className="alerta-conflito"><IconeAlerta tamanho={12} />Conflito de horário</span>}
                    </span>
                  </button>
                );
              })}
            </section>
          );
        })}
      </div>
    </>
  );
}
