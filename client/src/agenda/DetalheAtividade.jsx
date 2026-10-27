import { useEffect, useState } from 'react';
import { api } from '../api';
import { dataBr, nomeDia } from '../datas';
import { formatarEndereco } from '../formato';
import {
  IconeAgenda, IconeAlerta, IconeBalao, IconeCheck, IconeLixo, IconeLocal, IconeMais, iniciais,
} from '../icones';
import Modal from './Modal';

export const NOME_STATUS = { agendada: 'Agendada', concluida: 'Concluída', cancelada: 'Cancelada' };

// Status da OS para o cabeçalho: agendada se ainda houver alguma atividade agendada
const statusDaOs = (atividades) => (atividades.some((x) => x.status === 'agendada')
  ? 'agendada'
  : atividades.every((x) => x.status === 'cancelada') ? 'cancelada' : 'concluida');

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

  const selecionada = { ...a, os_id: os.id };
  const statusOs = statusDaOs(os.atividades);
  const mudarStatus = (status) => executar(`/atividades-os/${a.id}/status`, { method: 'PATCH', body: { status } });

  return (
    <Modal
      titulo={<>OS {os.id} <span className={`pilula ${statusOs}`} style={{ marginLeft: 6 }}>{NOME_STATUS[statusOs]}</span></>}
      subtitulo="Ordem de serviço"
      onFechar={onFechar}
      rodape={
        <>
          <button
            type="button"
            className="discreto perigo esquerda"
            disabled={ocupado}
            onClick={() => window.confirm(`Excluir a OS ${os.id} e todas as suas atividades?`) && executar(`/os/${os.id}`, { method: 'DELETE' })}
          >
            <IconeLixo />Excluir OS
          </button>
          <button type="button" disabled={ocupado} onClick={() => onEditarOs(selecionada)}>Editar OS</button>
          <button type="button" className="primario" disabled={ocupado} onClick={() => executar(`/os/${os.id}/concluir`, { method: 'POST' })}>
            Concluir OS
          </button>
        </>
      }
    >
      {a.conflito && a.status === 'agendada' && (
        <p className="erro" role="alert" style={{ display: 'flex', gap: 10 }}>
          <IconeAlerta tamanho={16} />
          <span><strong>Conflito de horário.</strong> A atividade de {a.hora_inicio} se sobrepõe a outra no mesmo dia.</span>
        </p>
      )}

      <section className="os-cliente">
        <div className="quem">
          <span className="avatar">{iniciais(os.cliente.nome)}</span>
          <div>
            <strong>{os.cliente.nome}</strong>
            <span className="suave" style={{ fontSize: 13 }}>{os.cliente.telefone}</span>
          </div>
        </div>
        {os.endereco && (
          <div className="linha-icone"><IconeLocal tamanho={16} /><span>{os.endereco.identificacao ? `${os.endereco.identificacao} · ` : ''}{formatarEndereco(os.endereco)}</span></div>
        )}
        {os.observacao && <div className="linha-icone nota"><IconeBalao tamanho={16} /><span>{os.observacao}</span></div>}
      </section>

      <section style={{ display: 'grid', gap: 10 }}>
        <h3>Atividades <span className="contador">· {os.atividades.length}</span></h3>
        <ul className="atividades">
          {os.atividades.map((x) => {
            const atual = x.id === a.id;
            const classe = ['atividade', atual && 'atual', atual && x.conflito && x.status === 'agendada' && 'conflito'].filter(Boolean).join(' ');
            return (
              <li key={x.id} className={classe}>
                <button type="button" aria-pressed={atual} onClick={() => { setErro(''); setSelecionadaId(x.id); }}>
                  <span className="numero">{x.sequencia}</span>
                  <span className="info">
                    <strong>{x.tipo.nome}</strong>
                    <small>{nomeDia(x.data).toLowerCase()}, {dataBr(x.data)} · {x.hora_inicio} – {x.hora_fim}</small>
                  </span>
                  <span className={`pilula ${x.status}`}>{NOME_STATUS[x.status]}</span>
                </button>
                {atual && (
                  <div className="acoes-atividade">
                    {x.status === 'agendada' ? (
                      <>
                        <button type="button" disabled={ocupado} onClick={() => onRemarcar(selecionada)}><IconeAgenda tamanho={15} />Remarcar</button>
                        <button type="button" disabled={ocupado} onClick={() => mudarStatus('concluida')}><IconeCheck tamanho={15} />Concluir</button>
                        <button type="button" className="discreto perigo" disabled={ocupado} onClick={() => mudarStatus('cancelada')}>Cancelar atividade</button>
                      </>
                    ) : (
                      <button type="button" className="discreto perigo" disabled={ocupado} onClick={() => executar(`/atividades-os/${x.id}`, { method: 'DELETE' })}>
                        <IconeLixo tamanho={15} />Excluir atividade
                      </button>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
        <button type="button" className="tracejado" disabled={ocupado} onClick={onAdicionarAtividade}><IconeMais />Adicionar atividade</button>
      </section>

      {erro && <p className="erro" role="alert">{erro}</p>}
    </Modal>
  );
}
