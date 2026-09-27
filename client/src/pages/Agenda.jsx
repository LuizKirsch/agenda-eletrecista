import { useCallback, useEffect, useState } from 'react';
import { useOutletContext } from 'react-router';
import { api } from '../api';
import DetalheAtividade from '../agenda/DetalheAtividade';
import Grade from '../agenda/Grade';
import Modal from '../agenda/Modal';
import OsForm from '../agenda/OsForm';
import RemarcarAtividade from '../agenda/RemarcarAtividade';
import {
  dataBr, hoje, paraHora, paraMin, rotuloSemana, segundaDe, somarDias,
} from '../datas';

const AVISO_CONFLITO = 'Atenção: há conflito de horário com outra atividade. Salvo mesmo assim; ajuste se preferir.';
const SEM_TIPO_ATIVO = 'Não há tipos de atividade ativos. Cadastre ou reative um tipo para criar uma OS.';

export default function Agenda() {
  const { abrirTipos, versaoTipos } = useOutletContext();
  const [segunda, setSegunda] = useState(() => segundaDe(hoje()));
  const [atividades, setAtividades] = useState([]);
  const [erro, setErro] = useState('');
  const [aviso, setAviso] = useState('');
  // { tela: 'os' | 'detalhe' | 'remarcar' | 'arraste', ... }
  const [modal, setModal] = useState(null);

  const carregar = useCallback(() => {
    api(`/agenda?inicio=${segunda}&fim=${somarDias(segunda, 6)}`)
      .then(setAtividades)
      .catch((err) => setErro(err.message));
  }, [segunda]);

  useEffect(() => {
    carregar();
  }, [carregar, versaoTipos]);

  // RF 1.27: toda alteração fecha o modal e recarrega a semana visível
  function concluido(resposta) {
    setModal(null);
    setErro('');
    setAviso(resposta?.aviso_conflito ? AVISO_CONFLITO : '');
    carregar();
  }

  async function executar(acao) {
    setErro('');
    setAviso('');
    try {
      concluido(await acao());
    } catch (err) {
      setModal(null);
      setErro(err.message);
    }
  }

  // RF 5.8 / RN 21: sem tipo ativo, direciona ao gerenciamento de tipos
  async function abrirFormOs(estado) {
    setErro('');
    try {
      const ativos = await api('/tipos-atividade?ativos=1');
      if (ativos.length) {
        setModal({ tela: 'os', ...estado });
      } else {
        setModal(null);
        abrirTipos(SEM_TIPO_ATIVO);
      }
    } catch (err) {
      setErro(err.message);
    }
  }

  const novaOs = (data, hora) => abrirFormOs({ titulo: 'Nova Ordem de Serviço', data, hora });

  // RF 1.14: com mais de uma agendada na OS, pergunta; com uma só (ou ao arrastar um grupo), aplica direto
  async function soltar(a, data, inicioMin, { osInteira = false } = {}) {
    if (data === a.data && inicioMin === paraMin(a.hora_inicio)) return;
    const destino = { data, hora_inicio: paraHora(inicioMin) };
    if (osInteira) {
      executar(() => deslocarOs(a, destino));
      return;
    }
    try {
      const os = await api(`/os/${a.os_id}`);
      const agendadas = os.atividades.filter((x) => x.status === 'agendada').length;
      if (agendadas > 1) setModal({ tela: 'arraste', atividade: a, agendadas, ...destino });
      else executar(() => deslocarOs(a, destino));
    } catch (err) {
      setErro(err.message);
    }
  }

  const deslocarOs = (a, destino) => api(`/os/${a.os_id}/deslocar`, { method: 'POST', body: { atividade_id: a.id, ...destino } });

  function moverSoEsta(a, destino) {
    const fim = paraMin(destino.hora_inicio) + paraMin(a.hora_fim) - paraMin(a.hora_inicio);
    if (fim > 1439) {
      setModal(null);
      setErro('A atividade deve começar e terminar no mesmo dia.');
      return;
    }
    executar(() => api(`/atividades-os/${a.id}/horario`, { method: 'PATCH', body: { ...destino, hora_fim: paraHora(fim) } }));
  }

  const semanaAtual = segundaDe(hoje());

  return (
    <>
      <div className="cabecalho agenda-cab">
        <div className="semana">
          <button type="button" aria-label="Semana anterior" onClick={() => setSegunda(somarDias(segunda, -7))}>‹</button>
          <strong>{rotuloSemana(segunda)}</strong>
          <button type="button" aria-label="Próxima semana" onClick={() => setSegunda(somarDias(segunda, 7))}>›</button>
          <button type="button" onClick={() => setSegunda(semanaAtual)}>Hoje</button>
        </div>
        <div className="semana">
          <button type="button" onClick={() => abrirTipos()}>Tipos de atividade</button>
          <button type="button" className="primario" onClick={() => novaOs(hoje(), '08:00')}>+ Nova OS</button>
        </div>
      </div>

      <div className="legenda">
        <span><i className="cor agendada" /> Agendada</span>
        <span><i className="cor encerrada" /> Concluída / Cancelada</span>
        <span><i className="cor conflito" /> Conflito de horário</span>
      </div>

      {erro && <p className="erro" role="alert">{erro}</p>}
      {aviso && <p className="aviso" role="status">{aviso}</p>}

      <Grade
        segunda={segunda}
        atividades={atividades}
        onNovaOs={novaOs}
        onAbrir={(itens) => setModal({ tela: 'detalhe', atividade: itens[0] })}
        onSoltar={soltar}
      />

      {modal?.tela === 'os' && (
        <OsForm
          osId={modal.osId}
          data={modal.data}
          hora={modal.hora}
          titulo={modal.titulo}
          adicionarAtividade={modal.adicionarAtividade}
          onFechar={() => setModal(null)}
          onSalvo={concluido}
        />
      )}

      {modal?.tela === 'detalhe' && (
        <DetalheAtividade
          atividadeId={modal.atividade.id}
          osId={modal.atividade.os_id}
          onFechar={() => setModal(null)}
          onAlterou={concluido}
          onRemarcar={(atividade) => setModal({ tela: 'remarcar', atividade })}
          onEditarOs={(atividade) => setModal({
            tela: 'os',
            osId: atividade.os_id,
            titulo: atividade.status === 'agendada' ? 'Remarcar OS inteira' : 'Editar OS inteira',
          })}
          onAdicionarAtividade={() => abrirFormOs({
            osId: modal.atividade.os_id,
            titulo: `Adicionar atividade à OS ${modal.atividade.os_id}`,
            adicionarAtividade: true,
          })}
        />
      )}

      {modal?.tela === 'remarcar' && (
        <RemarcarAtividade atividade={modal.atividade} onFechar={() => setModal(null)} onSalvo={concluido} />
      )}

      {modal?.tela === 'arraste' && (
        <Modal
          titulo="Remarcar"
          subtitulo={`A OS ${modal.atividade.os_id} tem ${modal.agendadas} atividades agendadas. Mover "${modal.atividade.tipo.nome}" para ${dataBr(modal.data)} às ${modal.hora_inicio}?`}
          onFechar={() => setModal(null)}
        >
          <div className="escolhas">
            <button type="button" onClick={() => executar(() => deslocarOs(modal.atividade, { data: modal.data, hora_inicio: modal.hora_inicio }))}>
              <strong>Remarcar a OS inteira</strong>
              <span>Todas as atividades agendadas vão para este dia, uma após a outra, na ordem da OS.</span>
            </button>
            <button type="button" onClick={() => moverSoEsta(modal.atividade, { data: modal.data, hora_inicio: modal.hora_inicio })}>
              <strong>Remarcar só esta atividade</strong>
              <span>As demais atividades da OS não mudam.</span>
            </button>
            <button type="button" onClick={() => setModal(null)}>
              <strong>Cancelar</strong>
              <span>A atividade volta ao horário original.</span>
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
