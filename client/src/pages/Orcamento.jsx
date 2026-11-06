import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { api } from '../api';
import SelectBusca from '../SelectBusca';
import { carregarEletricistas, oferecer } from '../eletricistas';
import Modal, { Confirmar } from '../agenda/Modal';
import {
  hoje, paraHora, paraMin,
} from '../datas';
import {
  formatarDataHora, formatarDuracao, formatarEndereco, formatarReais, formatarTelefone,
} from '../formato';
import {
  IconeCheck, IconeDireita, IconeEditar, IconeImprimir, IconeLixo,
} from '../icones';
import OrcamentoForm from './OrcamentoForm';
import { STATUS_ORCAMENTO } from './Orcamentos';

export default function Orcamento() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [orcamento, setOrcamento] = useState(null);
  const [erroCarregar, setErroCarregar] = useState('');
  const [gerada, setGerada] = useState(null); // { os_id, data, aviso_conflito }
  const [modal, setModal] = useState(null); // 'editar' | 'aceitar' | 'recusar' | 'excluir'

  useEffect(() => {
    api(`/orcamentos/${id}`).then(setOrcamento).catch((err) => setErroCarregar(err.message));
  }, [id]);

  if (erroCarregar) return <p className="erro" role="alert">{erroCarregar}</p>;
  if (!orcamento) return <p className="carregando">Carregando…</p>;

  const o = orcamento;
  const pendente = o.status === 'pendente';

  return (
    <>
      <nav className="migalhas nao-imprime" aria-label="Caminho">
        <Link to="/orcamentos">Orçamentos</Link><IconeDireita tamanho={14} /><span aria-current="page">Nº {o.id}</span>
      </nav>

      <div className="cabecalho">
        <div>
          <h1>Orçamento nº {o.id} <span className={`badge ${o.status}`}>{STATUS_ORCAMENTO[o.status]}</span></h1>
          <p className="suave">Criado em {formatarDataHora(o.criado_em)}</p>
        </div>
        <div className="acoes-cab nao-imprime">
          {/* RF 4.18: imprimir permite salvar como PDF, em qualquer status */}
          <button type="button" onClick={() => window.print()}><IconeImprimir />Exportar PDF</button>
          {/* RF 4.15: aceito ou recusado fica só para leitura */}
          {pendente && (<>
            <button type="button" className="discreto perigo" onClick={() => setModal('excluir')}><IconeLixo />Excluir</button>
            <button type="button" onClick={() => setModal('recusar')}>Recusar</button>
            <button type="button" onClick={() => setModal('editar')}><IconeEditar />Editar</button>
            <button type="button" className="primario" onClick={() => setModal('aceitar')}><IconeCheck />Aceitar</button>
          </>)}
        </div>
      </div>

      {gerada && (
        <p className={`nao-imprime ${gerada.aviso_conflito ? 'aviso' : 'sucesso'}`} role="status" style={{ marginBottom: 16 }}>
          OS nº {gerada.os_id} criada. <Link to="/agenda" state={{ data: gerada.data }}>Ver na agenda</Link>
          {gerada.aviso_conflito && <><br />Atenção: há conflito de horário com outra atividade. Ajuste na agenda se preferir.</>}
        </p>
      )}
      {!gerada && o.status === 'aceito' && (
        <p className="suave nao-imprime" style={{ marginBottom: 16 }}>
          {o.ordem_servico_id ? `Este orçamento gerou a OS nº ${o.ordem_servico_id}.` : 'A OS gerada por este orçamento foi excluída.'}
        </p>
      )}

      <div className="cartao" style={{ marginBottom: 16 }}>
        <dl className="dados">
          <div><dt>Cliente</dt><dd><Link to={`/clientes/${o.cliente.id}`}>{o.cliente.nome}</Link> · {formatarTelefone(o.cliente.telefone)}</dd></div>
          <div><dt>Endereço</dt><dd><Link to={`/enderecos/${o.endereco.id}`}>{formatarEndereco(o.endereco)}</Link></dd></div>
          {o.observacao && <div className="inteiro"><dt>Observações</dt><dd style={{ whiteSpace: 'pre-wrap' }}>{o.observacao}</dd></div>}
        </dl>
      </div>

      <ItensOrcamento itens={o.itens} total={o.total} />

      <Versoes orcamentoId={o.id} atual={o} />

      {modal === 'editar' && (
        <OrcamentoForm
          orcamento={o}
          onFechar={() => setModal(null)}
          onSalvo={(salvo) => { setOrcamento(salvo); setModal(null); }}
        />
      )}
      {modal === 'recusar' && (
        <Confirmar
          titulo="Recusar orçamento"
          subtitulo={`Nº ${o.id} · ${o.cliente.nome}`}
          rotulo="Recusar orçamento"
          rotuloEnviando="Recusando…"
          onFechar={() => setModal(null)}
          onConfirmar={async () => {
            setOrcamento(await api(`/orcamentos/${id}/recusar`, { method: 'POST' }));
            setModal(null);
          }}
        >
          Depois de recusado, o orçamento não pode mais ser aceito nem editado e fica só para consulta.
        </Confirmar>
      )}
      {/* RN 55: exclusão com confirmação, leva os itens junto */}
      {modal === 'excluir' && (
        <Confirmar
          titulo="Excluir orçamento"
          subtitulo={`Nº ${o.id} · ${o.cliente.nome}`}
          rotulo="Excluir orçamento"
          rotuloEnviando="Excluindo…"
          onFechar={() => setModal(null)}
          onConfirmar={async () => {
            await api(`/orcamentos/${id}`, { method: 'DELETE' });
            navigate('/orcamentos');
          }}
        >
          O orçamento e {o.itens.length === 1 ? 'seu item' : `seus ${o.itens.length} itens`} serão excluídos. Essa ação não pode ser desfeita.
        </Confirmar>
      )}
      {modal === 'aceitar' && (
        <AceitarOrcamento
          orcamento={o}
          onFechar={() => setModal(null)}
          onAceito={async (resposta) => {
            setModal(null);
            setGerada(resposta);
            setOrcamento(await api(`/orcamentos/${id}`));
          }}
        />
      )}
    </>
  );
}

// RN 66: o tempo dos itens não sai no PDF
function ItensOrcamento({ itens, total }) {
  return (
    <>
      <div className="tabela">
        <table>
          <thead>
            <tr>
              <th>Item</th>
              <th>Qtd.</th>
              <th>Valor unit.</th>
              <th className="nao-imprime">Tempo</th>
              <th>Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {itens.map((i) => (
              <tr key={i.id}>
                <td>
                  <span className="nome">
                    {i.descricao}
                    {!i.tipo && <span className="badge inativo">avulso</span>}
                    {i.tipo && !i.tipo.ativo && <span className="badge inativo nao-imprime">tipo inativo</span>}
                  </span>
                </td>
                <td data-rotulo="Qtd.">{i.quantidade}</td>
                <td data-rotulo="Valor unit.">{formatarReais(i.valor_unitario)}</td>
                <td data-rotulo="Tempo" className="nao-imprime">{formatarDuracao(i.duracao_min)}</td>
                <td data-rotulo="Subtotal">{formatarReais(i.quantidade * i.valor_unitario)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="total-orcamento">Total<strong>{formatarReais(total)}</strong></p>
    </>
  );
}

// RF 4.20: versões anteriores, só leitura; recarrega quando o orçamento atual muda (após editar)
function Versoes({ orcamentoId, atual }) {
  const [versoes, setVersoes] = useState([]);
  const [aberta, setAberta] = useState(null);
  const [erro, setErro] = useState('');

  useEffect(() => {
    api(`/orcamentos/${orcamentoId}/versoes`).then(setVersoes).catch((err) => setErro(err.message));
  }, [orcamentoId, atual]);

  async function abrir(numero) {
    setErro('');
    try {
      setAberta(await api(`/orcamentos/${orcamentoId}/versoes/${numero}`));
    } catch (err) {
      setErro(err.message);
    }
  }

  if (!versoes.length && !erro) return null;
  return (
    <section className="nao-imprime" style={{ marginTop: 24 }}>
      <h2>Histórico de versões</h2>
      {erro && <p className="erro" role="alert">{erro}</p>}
      <div className="tabela">
        <table>
          <thead><tr><th>Versão</th><th>Data</th><th>Autor</th><th aria-label="Ações" /></tr></thead>
          <tbody>
            <tr>
              <td><strong>{versoes.length + 1} (atual)</strong></td>
              <td data-rotulo="Data">—</td>
              <td data-rotulo="Autor">—</td>
              <td />
            </tr>
            {versoes.map((v) => (
              <tr key={v.numero}>
                <td>{v.numero}</td>
                <td data-rotulo="Data">{formatarDataHora(v.criado_em)}</td>
                <td data-rotulo="Autor">{v.autor ?? '—'}</td>
                <td><button type="button" className="discreto" onClick={() => abrir(v.numero)}>Ver</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {aberta && (
        <Modal
          titulo={`Versão ${aberta.numero}`}
          subtitulo={`${formatarDataHora(aberta.criado_em)}${aberta.autor ? ` · ${aberta.autor}` : ''} · só leitura`}
          variante="dialogo"
          largo
          onFechar={() => setAberta(null)}
          rodape={(fechar) => <button type="button" onClick={fechar}>Fechar</button>}
        >
          <dl className="dados" style={{ marginBottom: 16 }}>
            <div><dt>Cliente</dt><dd>{aberta.orcamento.cliente.nome} · {formatarTelefone(aberta.orcamento.cliente.telefone)}</dd></div>
            <div><dt>Endereço</dt><dd>{formatarEndereco(aberta.orcamento.endereco)}</dd></div>
            {aberta.orcamento.observacao && <div className="inteiro"><dt>Observações</dt><dd style={{ whiteSpace: 'pre-wrap' }}>{aberta.orcamento.observacao}</dd></div>}
          </dl>
          <ItensOrcamento itens={aberta.orcamento.itens} total={aberta.orcamento.total} />
        </Modal>
      )}
    </section>
  );
}

// RN 52: cada atividade começa e termina no próprio dia
const fimDe = (horario, item) => (horario.hora_inicio ? paraMin(horario.hora_inicio) + item.duracao_min : null);

function AceitarOrcamento({ orcamento, onFechar, onAceito }) {
  const { itens } = orcamento;
  const [eletricistas, setEletricistas] = useState([]);
  const [eletricistaId, setEletricistaId] = useState('');
  const [data, setData] = useState(hoje());
  const [inicio, setInicio] = useState('08:00');
  const [horarios, setHorarios] = useState(() => itens.map(() => ({ data: '', hora_inicio: '' })));
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [calculando, setCalculando] = useState(false);
  const [conflito, setConflito] = useState(false); // RN 68
  const [gatilho, setGatilho] = useState(0);
  const pedido = useRef(null); // menor índice a recalcular enquanto o debounce espera
  const atual = useRef({});
  const versao = useRef(0);
  atual.current = { data, inicio, eletricistaId, horarios };

  // RF 4.19 / RN 67: do item `de` em diante é recalculado pelo servidor; os anteriores ficam como estão
  function recalcular(de) {
    if (de >= itens.length) return;
    pedido.current = Math.min(pedido.current ?? de, de);
    setGatilho((g) => g + 1);
  }

  function mudarInicioGeral(novaData, novoInicio) {
    setData(novaData);
    setInicio(novoInicio);
    if (novaData && novoInicio) recalcular(0);
  }

  function mudarEletricistaGeral(v) {
    setEletricistaId(v);
    recalcular(0);
  }

  useEffect(() => {
    if (!gatilho) return undefined;
    const t = setTimeout(async () => {
      const de = pedido.current;
      pedido.current = null;
      const a = atual.current;
      if (!a.eletricistaId || !a.data || !a.inicio || a.horarios.slice(0, de).some((h) => !h.data || !h.hora_inicio)) return;
      const minha = ++versao.current;
      setCalculando(true);
      try {
        const r = await api(`/orcamentos/${orcamento.id}/recomendar`, {
          method: 'POST',
          body: {
            data: a.data,
            hora_inicio: a.inicio,
            eletricista_id: a.eletricistaId,
            a_partir_de: de,
            atividades: a.horarios.map((h) => ({ eletricista_id: h.eletricista_id || a.eletricistaId, data: h.data, hora_inicio: h.hora_inicio })),
          },
        });
        if (minha !== versao.current) return;
        setHorarios((hs) => hs.map((h, n) => (n < de ? h : { ...h, data: r[n]?.data ?? '', hora_inicio: r[n]?.hora_inicio ?? '', sem: !r[n] })));
        setErro('');
      } catch (err) {
        if (minha === versao.current) setErro(err.message);
      } finally {
        if (minha === versao.current) setCalculando(false);
      }
    }, 400);
    return () => clearTimeout(t);
  }, [gatilho, orcamento.id]);

  useEffect(() => {
    carregarEletricistas().then(setEletricistas).catch((err) => setErro(err.message));
  }, []);

  const alterar = (i, campos) => setHorarios((atuais) => atuais.map((h, n) => (n === i ? { ...h, ...campos } : h)));
  const trocarHorario = (i, campos) => { alterar(i, { ...campos, sem: false }); recalcular(i + 1); };
  const trocarEletricista = (i, v) => { alterar(i, { eletricista_id: v }); recalcular(i); };
  const fins = itens.map((item, i) => fimDe(horarios[i], item));
  const valido = eletricistaId && horarios.every((h, i) => h.data && fins[i] !== null && fins[i] <= 1439);
  const dias = new Set(horarios.map((h) => h.data).filter(Boolean)).size;

  // RN 68: se o confirmar achar conflito novo, a API recusa (codigo 'conflito') e a tela pergunta antes de gerar a OS
  async function aceitar(e, confirmarConflito = false) {
    e?.preventDefault();
    setErro('');
    setConflito(false);
    setEnviando(true);
    try {
      const resposta = await api(`/orcamentos/${orcamento.id}/aceitar`, {
        method: 'POST',
        body: {
          eletricista_id: eletricistaId,
          atividades: horarios.map((h) => ({ ...h, eletricista_id: h.eletricista_id || eletricistaId })),
          confirmar_conflito: confirmarConflito,
        },
      });
      onAceito({ ...resposta, data: horarios[0].data });
    } catch (err) {
      if (err.codigo === 'conflito') setConflito(true);
      else setErro(err.message);
      setEnviando(false);
    }
  }

  return (
    <Modal
      titulo="Aceitar orçamento"
      subtitulo={`Nº ${orcamento.id} · ${orcamento.cliente.nome}`}
      variante="dialogo"
      largo
      onFechar={onFechar}
      rodape={(fechar) => (
        <>
          <button type="button" onClick={fechar}>Cancelar</button>
          <button className="primario" form="form-aceitar" disabled={enviando || !valido}>{enviando ? 'Gerando OS…' : 'Aceitar e gerar OS'}</button>
        </>
      )}
    >
      <form id="form-aceitar" className="campos" onSubmit={aceitar}>
        <p className="suave" style={{ fontSize: 13 }}>
          Será criada uma OS com uma atividade por item, em sequência a partir do início escolhido. O item que não couber no dia vai para o dia seguinte, no mesmo horário; ajuste a data e o início de cada um se precisar. Depois de aceito, o orçamento não pode mais ser editado.
        </p>
        <label>
          Eletricista responsável
          <SelectBusca value={eletricistaId} onChange={mudarEletricistaGeral} required
            opcoes={oferecer(eletricistas).map((u) => ({ valor: u.id, rotulo: u.nome }))} />
        </label>
        <label className="c3 meia">Começa em<input type="date" value={data} onChange={(e) => mudarInicioGeral(e.target.value, inicio)} required /></label>
        <label className="c3 meia">Início<input type="time" value={inicio} onChange={(e) => mudarInicioGeral(data, e.target.value)} required /></label>

        <div className="grupo-atividades">
          <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--texto-2)' }}>
            Agenda da OS · {dias === 1 ? '1 dia' : `${dias} dias`}{calculando && ' · Calculando…'}
          </span>
          {itens.map((item, i) => {
            const cabe = fins[i] !== null && fins[i] <= 1439;
            return (
              <div key={item.id} className="card-atividade">
                <div className="tipo">
                  <span className="numero">{i + 1}</span>
                  <strong className="avulsa">{item.descricao} <span className="suave" style={{ fontWeight: 400 }}>· {formatarDuracao(item.duracao_min)}</span></strong>
                </div>
                <label className="inteira">
                  Eletricista
                  <SelectBusca value={horarios[i].eletricista_id || eletricistaId} onChange={(v) => trocarEletricista(i, v)} required
                    opcoes={oferecer(eletricistas).map((u) => ({ valor: u.id, rotulo: u.nome }))} />
                </label>
                <label className="data">Data<input type="date" value={horarios[i].data} onChange={(e) => trocarHorario(i, { data: e.target.value })} required /></label>
                <label>Início<input type="time" value={horarios[i].hora_inicio} onChange={(e) => trocarHorario(i, { hora_inicio: e.target.value })} required /></label>
                <label>Fim<input type="time" value={cabe ? paraHora(fins[i]) : ''} disabled /></label>
                {horarios[i].sem && <p className="erro inteira" role="status">Sem horário livre em 60 dias; informe à mão.</p>}
                {!cabe && horarios[i].hora_inicio && <p className="erro inteira" role="alert">Não cabe no dia: termina depois de 23h59. Escolha um início mais cedo.</p>}
              </div>
            );
          })}
        </div>
        {erro && <p className="erro" role="alert">{erro}</p>}
        {conflito && (
          <div className="aviso" role="alert">
            <p style={{ margin: '0 0 8px' }}>Algum horário passou a conflitar com outra atividade do eletricista desde a recomendação.</p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button type="button" disabled={enviando} onClick={() => { setConflito(false); recalcular(0); }}>Recalcular horários</button>
              <button type="button" className="primario" disabled={enviando} onClick={() => aceitar(null, true)}>Gerar OS mesmo assim</button>
            </div>
          </div>
        )}
      </form>
    </Modal>
  );
}
