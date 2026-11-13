import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { api } from '../api';
import DetalheAtividade from '../agenda/DetalheAtividade';
import Grade from '../agenda/Grade';
import ListaSemana from '../agenda/ListaSemana';
import Modal from '../agenda/Modal';
import OsForm from '../agenda/OsForm';
import RemarcarAtividade from '../agenda/RemarcarAtividade';
import {
  dataBr, hoje, paraHora, paraMin, rotuloSemana, segundaDe, somarDias,
} from '../datas';
import { carregarEletricistas } from '../eletricistas';
import { IconeAlerta, IconeDireita, IconeEsquerda, IconeMais } from '../icones';

// Celular (< 768 px): lista no lugar da grade
function useCelular() {
  const consulta = '(max-width: 767px)';
  const [celular, setCelular] = useState(() => window.matchMedia(consulta).matches);
  useEffect(() => {
    const mq = window.matchMedia(consulta);
    const aoMudar = (e) => setCelular(e.matches);
    mq.addEventListener('change', aoMudar);
    return () => mq.removeEventListener('change', aoMudar);
  }, []);
  return celular;
}

const AVISO_CONFLITO = 'Atenção: há conflito de horário com outra atividade. Salvo mesmo assim; ajuste se preferir.';
const SEM_TIPO_ATIVO = 'Não há tipos de atividade ativos. Cadastre ou reative um tipo para criar uma OS.';

export default function Agenda() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const celular = useCelular();
  const abrirTipos = (mensagem) => navigate('/tipos-atividade', { state: { mensagem } });
  const [segunda, setSegunda] = useState(() => segundaDe(state?.data ?? hoje()));
  const [atividades, setAtividades] = useState([]);
  const [erro, setErro] = useState('');
  const [aviso, setAviso] = useState('');
  const [eletricistas, setEletricistas] = useState([]);
  const [filtro, setFiltro] = useState([]); // RF 1.13: ids selecionados; vazio = todos
  // { tela: 'os' | 'detalhe' | 'remarcar' | 'arraste', ... }
  const [modal, setModal] = useState(null);

  const pedido = useRef(0); // só a resposta da última chamada vale (descarta semana antiga)
  const carregar = useCallback(() => {
    const meu = ++pedido.current;
    api(`/agenda?inicio=${segunda}&fim=${somarDias(segunda, 6)}${filtro.length ? `&eletricista_id=${filtro.join(',')}` : ''}`)
      .then((lista) => { if (meu === pedido.current) { setAtividades(lista); setErro(''); } })
      .catch((err) => { if (meu === pedido.current) setErro(err.message); });
  }, [segunda, filtro]);

  useEffect(() => {
    carregarEletricistas().then(setEletricistas).catch((err) => setErro(err.message));
  }, []);

  useEffect(() => {
    carregar();
    return () => { pedido.current++; };
  }, [carregar]);

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

  const novaOs = (data, hora) => abrirFormOs({ titulo: 'Nova ordem de serviço', data, hora });

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

  // RF 1.13: seleção múltipla de eletricistas; vazio = todos.
  // Inativo só aparece com atividade na semana carregada ou se estiver selecionado.
  const comAtividade = new Set(atividades.map((x) => String(x.eletricista?.id)));
  const alternar = (id) => setFiltro((f) => (f.includes(id) ? f.filter((x) => x !== id) : [...f, id]));
  const filtroEletricistas = (
    <FiltroEletricistas
      eletricistas={eletricistas.filter((u) => u.ativo || filtro.includes(String(u.id)) || comAtividade.has(String(u.id)))}
      selecionados={filtro}
      todos={eletricistas}
      onAlternar={alternar}
      onLimpar={() => setFiltro([])}
    />
  );

  const anterior = () => setSegunda(somarDias(segunda, -7));
  const proxima = () => setSegunda(somarDias(segunda, 7));

  return (
    <>
      <div className="cabecalho agenda-cab">
        <div className="navegacao">
          <h1>{rotuloSemana(segunda)}</h1>
          {!celular && (
            <div className="setas">
              <button type="button" className="icone-botao" aria-label="Semana anterior" onClick={anterior}><IconeEsquerda /></button>
              <button type="button" onClick={() => setSegunda(semanaAtual)}>Hoje</button>
              <button type="button" className="icone-botao" aria-label="Próxima semana" onClick={proxima}><IconeDireita /></button>
            </div>
          )}
        </div>
        {celular ? (
          <button type="button" onClick={() => setSegunda(semanaAtual)}>Hoje</button>
        ) : (
          <div className="acoes-cab">
            <div className="legenda">
              <span><i className="cor agendada" /> Agendada</span>
              <span><i className="cor encerrada" /> Concluída / cancelada</span>
              <span><IconeAlerta tamanho={13} /> Conflito</span>
            </div>
            <button type="button" className="primario" onClick={() => novaOs(hoje(), '08:00')}><IconeMais />Nova OS</button>
          </div>
        )}
      </div>

      {erro && <p className="erro" role="alert">{erro}</p>}
      {aviso && <p className="aviso" role="status">{aviso}</p>}

      {filtroEletricistas}

      {celular ? (
        <>
          <ListaSemana
            segunda={segunda}
            atividades={atividades}
            onSemanaAnterior={anterior}
            onProximaSemana={proxima}
            onAbrir={(a) => setModal({ tela: 'detalhe', atividade: a })}
          />
          <button type="button" className="primario botao-flutuante" aria-label="Nova OS" onClick={() => novaOs(hoje(), '08:00')}><IconeMais tamanho={24} /></button>
        </>
      ) : (
        <Grade
          segunda={segunda}
          atividades={atividades}
          onNovaOs={novaOs}
          onAbrir={(itens) => setModal({ tela: 'detalhe', atividade: itens[0] })}
          onSoltar={soltar}
        />
      )}

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
            titulo: `Editar OS ${atividade.os_id}`,
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
        <EscolhaArraste
          modal={modal}
          onFechar={() => setModal(null)}
          onOsInteira={() => executar(() => deslocarOs(modal.atividade, { data: modal.data, hora_inicio: modal.hora_inicio }))}
          onSoEsta={() => moverSoEsta(modal.atividade, { data: modal.data, hora_inicio: modal.hora_inicio })}
        />
      )}
    </>
  );
}

const norm = (s) => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

// RF 1.13: botão-resumo + popover com busca e checkboxes. Esc e clique fora fecham.
function FiltroEletricistas({ eletricistas, selecionados, todos, onAlternar, onLimpar }) {
  const raiz = useRef(null);
  const botao = useRef(null);
  const [aberto, setAberto] = useState(false);
  const [busca, setBusca] = useState('');

  useEffect(() => {
    if (!aberto) return undefined;
    const fora = (e) => { if (!raiz.current.contains(e.target)) setAberto(false); };
    document.addEventListener('pointerdown', fora);
    return () => document.removeEventListener('pointerdown', fora);
  }, [aberto]);

  function fechar() {
    setAberto(false);
    setBusca('');
    botao.current?.focus();
  }

  const nomes = selecionados.map((id) => todos.find((u) => String(u.id) === id)?.nome).filter(Boolean);
  const resumo = !nomes.length ? 'Todos os eletricistas' : nomes.length <= 2 ? nomes.join(', ') : `${nomes.length} selecionados`;
  const visiveis = eletricistas.filter((u) => norm(u.nome).includes(norm(busca)));

  return (
    <div
      className="filtro-eletricistas"
      ref={raiz}
      onKeyDown={(e) => { if (e.key === 'Escape' && aberto) { e.stopPropagation(); fechar(); } }}
    >
      <button ref={botao} type="button" className="filtro-botao" aria-haspopup="dialog" aria-expanded={aberto} onClick={() => (aberto ? fechar() : setAberto(true))}>
        <span>{resumo}</span>
        <span className="filtro-seta" aria-hidden="true">▾</span>
        <span className="so-leitor"> Eletricistas</span>
      </button>
      {aberto && (
        <div className="filtro-popover" role="dialog" aria-label="Filtrar por eletricista">
          <input type="search" aria-label="Buscar eletricista" placeholder="Buscar eletricista" autoComplete="off" autoFocus value={busca} onChange={(e) => setBusca(e.target.value)} />
          <ul>
            {visiveis.map((u) => (
              <li key={u.id}>
                <label className="checkbox">
                  <input type="checkbox" checked={selecionados.includes(String(u.id))} onChange={() => onAlternar(String(u.id))} />
                  <i className="bolinha" style={u.cor ? { background: u.cor } : undefined} aria-hidden="true" />
                  {u.nome}{u.ativo ? '' : ' (inativo)'}
                </label>
              </li>
            ))}
            {!visiveis.length && <li className="vazio">Nenhum resultado</li>}
          </ul>
          <button type="button" className="discreto" disabled={!selecionados.length} onClick={onLimpar}>Limpar (todos)</button>
        </div>
      )}
    </div>
  );
}

// RF 1.14: ao arrastar uma atividade de OS com mais de uma agendada, pergunta o que mover
function EscolhaArraste({ modal, onFechar, onOsInteira, onSoEsta }) {
  const [opcao, setOpcao] = useState('so-esta');
  const { atividade: a } = modal;

  return (
    <Modal
      titulo="Remarcar atividade"
      variante="dialogo"
      onFechar={onFechar}
      rodape={(fechar) => (
        <>
          <button type="button" onClick={fechar}>Desfazer</button>
          <button type="button" className="primario" onClick={opcao === 'os' ? onOsInteira : onSoEsta}>Remarcar</button>
        </>
      )}
    >
      <div className="de-para">
        <div><span className="suave">De</span><s>{dataBr(a.data)} · {a.hora_inicio}</s></div>
        <IconeDireita />
        <div><span className="suave">Para</span><b>{dataBr(modal.data)} · {modal.hora_inicio}</b></div>
      </div>
      <p className="suave">"{a.tipo.nome}" faz parte da OS {a.os_id}, que tem {modal.agendadas} atividades agendadas. O que deseja mover?</p>
      <fieldset className="escolhas">
        <legend className="so-leitor">Opção de remarcação</legend>
        <label className="escolha">
          <input type="radio" name="opcao" checked={opcao === 'so-esta'} onChange={() => setOpcao('so-esta')} />
          <span><strong>Só esta atividade</strong>As demais atividades da OS não mudam.</span>
        </label>
        <label className="escolha">
          <input type="radio" name="opcao" checked={opcao === 'os'} onChange={() => setOpcao('os')} />
          <span><strong>A OS inteira</strong>Todas as atividades agendadas vão para este dia, uma após a outra, na ordem da OS.</span>
        </label>
      </fieldset>
    </Modal>
  );
}
