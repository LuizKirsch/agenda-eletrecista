import { useEffect, useState } from 'react';
import { api } from '../api';
import { dataBr, nomeDia } from '../datas';
import { formatarEndereco } from '../formato';
import Modal from './Modal';

export const NOME_STATUS = { agendada: 'Agendada', concluida: 'Concluída', cancelada: 'Cancelada' };

// Abre a OS com uma atividade selecionada; tocar em outra atividade da lista troca a seleção.
export default function DetalheAtividade({
  atividadeId, osId, onFechar, onAlterou, onRemarcar, onEditarOs, onAdicionarAtividade,
}) {
  const [os, setOs] = useState(null);
  const [selecionadaId, setSelecionadaId] = useState(atividadeId);
  const [erro, setErro] = useState('');
  const [ocupado, setOcupado] = useState(false);

  useEffect(() => {
    api(`/os/${osId}`).then(setOs).catch((err) => setErro(err.message));
  }, [osId]);

  async function executar(caminho, opcoes) {
    setErro('');
    setOcupado(true);
    try {
      onAlterou(await api(caminho, opcoes));
    } catch (err) {
      setErro(err.message);
      setOcupado(false);
    }
  }

  const a = os?.atividades.find((x) => x.id === selecionadaId);
  if (!a) {
    return (
      <Modal titulo={`OS ${osId}`} onFechar={onFechar}>
        {erro ? <p className="erro" role="alert">{erro}</p> : <p className="carregando">Carregando…</p>}
      </Modal>
    );
  }

  const status = (s) => <span className={`pilula ${s}`}>{NOME_STATUS[s]}</span>;
  const selecionada = { ...a, os_id: os.id };

  return (
    <Modal titulo={`OS ${os.id}`} subtitulo={`${os.cliente.nome} · ${os.cliente.telefone}`} onFechar={onFechar}>
      <dl className="detalhes">
        <dt>Endereço</dt><dd>{os.endereco ? formatarEndereco(os.endereco) : '—'}</dd>
        {os.observacao && <><dt>Observações</dt><dd className="texto">{os.observacao}</dd></>}
      </dl>

      <div>
        <div className="rotulo">Atividades desta OS</div>
        <ul className="mini-lista">
          {os.atividades.map((x) => (
            <li key={x.id} className={x.id === a.id ? 'atual' : undefined}>
              <button type="button" aria-pressed={x.id === a.id} onClick={() => { setErro(''); setSelecionadaId(x.id); }}>
                <span>
                  {x.sequencia}. {x.tipo.nome} <small>{dataBr(x.data)} {x.hora_inicio}–{x.hora_fim}</small>
                </span>
                {status(x.status)}
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div className="selecionada">
        <div className="rotulo">{a.sequencia}ª atividade · {a.tipo.nome} {status(a.status)}</div>
        {a.conflito && <p className="erro">Este horário conflita com outra atividade no mesmo dia.</p>}
        <dl className="detalhes">
          <dt>Data</dt><dd>{nomeDia(a.data)} {dataBr(a.data)}</dd>
          <dt>Horário</dt><dd>{a.hora_inicio} – {a.hora_fim}</dd>
        </dl>
        <div className="acoes-detalhe">
          {a.status === 'agendada' ? (
            <>
              <button type="button" disabled={ocupado} onClick={() => onRemarcar(selecionada)}>Remarcar só esta atividade</button>
              <button type="button" disabled={ocupado} onClick={() => onEditarOs(selecionada)}>Remarcar a OS inteira</button>
              <button type="button" disabled={ocupado} onClick={() => executar(`/atividades-os/${a.id}/status`, { method: 'PATCH', body: { status: 'concluida' } })}>
                Concluir esta atividade
              </button>
              <button type="button" className="perigo" disabled={ocupado} onClick={() => executar(`/atividades-os/${a.id}/status`, { method: 'PATCH', body: { status: 'cancelada' } })}>
                Cancelar esta atividade
              </button>
            </>
          ) : (
            <>
              <button type="button" disabled={ocupado} onClick={() => onEditarOs(selecionada)}>Editar a OS inteira</button>
              <button type="button" className="perigo" disabled={ocupado} onClick={() => executar(`/atividades-os/${a.id}`, { method: 'DELETE' })}>
                Excluir esta atividade
              </button>
            </>
          )}
        </div>
      </div>

      {erro && <p className="erro" role="alert">{erro}</p>}

      <div className="acoes-os">
        <div className="rotulo">Ações da OS inteira</div>
        <div className="acoes-detalhe">
          <button type="button" disabled={ocupado} onClick={onAdicionarAtividade}>Adicionar atividade</button>
          <button type="button" disabled={ocupado} onClick={() => executar(`/os/${os.id}/concluir`, { method: 'POST' })}>Concluir OS</button>
          <button
            type="button"
            className="perigo"
            disabled={ocupado}
            onClick={() => window.confirm(`Excluir a OS ${os.id} e todas as suas atividades?`) && executar(`/os/${os.id}`, { method: 'DELETE' })}
          >
            Excluir OS
          </button>
        </div>
      </div>
    </Modal>
  );
}
