import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { api } from '../api';
import Modal, { Confirmar } from '../agenda/Modal';
import {
  hoje, paraHora, paraMin, somarDias,
} from '../datas';
import {
  formatarDataHora, formatarDuracao, formatarEndereco, formatarReais,
} from '../formato';
import {
  IconeCheck, IconeDireita, IconeEditar, IconeLixo,
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
      <nav className="migalhas" aria-label="Caminho">
        <Link to="/orcamentos">Orçamentos</Link><IconeDireita tamanho={14} /><span aria-current="page">Nº {o.id}</span>
      </nav>

      <div className="cabecalho">
        <div>
          <h1>Orçamento nº {o.id} <span className={`badge ${o.status}`}>{STATUS_ORCAMENTO[o.status]}</span></h1>
          <p className="suave">Criado em {formatarDataHora(o.criado_em)}</p>
        </div>
        {/* RF 4.15: aceito ou recusado fica só para leitura */}
        {pendente && (
          <div className="acoes-cab">
            <button type="button" className="discreto perigo" onClick={() => setModal('excluir')}><IconeLixo />Excluir</button>
            <button type="button" onClick={() => setModal('recusar')}>Recusar</button>
            <button type="button" onClick={() => setModal('editar')}><IconeEditar />Editar</button>
            <button type="button" className="primario" onClick={() => setModal('aceitar')}><IconeCheck />Aceitar</button>
          </div>
        )}
      </div>

      {gerada && (
        <p className={gerada.aviso_conflito ? 'aviso' : 'sucesso'} role="status" style={{ marginBottom: 16 }}>
          OS nº {gerada.os_id} criada. <Link to="/agenda" state={{ data: gerada.data }}>Ver na agenda</Link>
          {gerada.aviso_conflito && <><br />Atenção: há conflito de horário com outra atividade. Ajuste na agenda se preferir.</>}
        </p>
      )}
      {!gerada && o.status === 'aceito' && (
        <p className="suave" style={{ marginBottom: 16 }}>
          {o.ordem_servico_id ? `Este orçamento gerou a OS nº ${o.ordem_servico_id}.` : 'A OS gerada por este orçamento foi excluída.'}
        </p>
      )}

      <div className="cartao" style={{ marginBottom: 16 }}>
        <dl className="dados">
          <div><dt>Cliente</dt><dd><Link to={`/clientes/${o.cliente.id}`}>{o.cliente.nome}</Link> · {o.cliente.telefone}</dd></div>
          <div><dt>Endereço</dt><dd><Link to={`/enderecos/${o.endereco.id}`}>{formatarEndereco(o.endereco)}</Link></dd></div>
          {o.observacao && <div className="inteiro"><dt>Observações</dt><dd style={{ whiteSpace: 'pre-wrap' }}>{o.observacao}</dd></div>}
        </dl>
      </div>

      <div className="tabela">
        <table>
          <thead>
            <tr>
              <th>Item</th>
              <th>Qtd.</th>
              <th>Valor unit.</th>
              <th>Tempo</th>
              <th>Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {o.itens.map((i) => (
              <tr key={i.id}>
                <td>
                  <span className="nome">
                    {i.descricao}
                    {!i.tipo && <span className="badge inativo">avulso</span>}
                    {i.tipo && !i.tipo.ativo && <span className="badge inativo">tipo inativo</span>}
                  </span>
                </td>
                <td data-rotulo="Qtd.">{i.quantidade}</td>
                <td data-rotulo="Valor unit.">{formatarReais(i.valor_unitario)}</td>
                <td data-rotulo="Tempo">{formatarDuracao(i.duracao_min)}</td>
                <td data-rotulo="Subtotal">{formatarReais(i.quantidade * i.valor_unitario)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="total-orcamento">Total<strong>{formatarReais(o.total)}</strong></p>

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

// RN 51: encadeia a partir de data/início; o item que não cabe mais no dia vai para o dia seguinte, no mesmo início
function sugerirHorarios(itens, data, inicio) {
  const base = paraMin(inicio);
  let dia = data;
  let min = base;
  return itens.map((item) => {
    if (min !== base && min + item.duracao_min > 1439) {
      dia = somarDias(dia, 1);
      min = base;
    }
    const horario = { data: dia, hora_inicio: paraHora(min) };
    min += item.duracao_min;
    return horario;
  });
}

// RN 52: cada atividade começa e termina no próprio dia
const fimDe = (horario, item) => (horario.hora_inicio ? paraMin(horario.hora_inicio) + item.duracao_min : null);

function AceitarOrcamento({ orcamento, onFechar, onAceito }) {
  const { itens } = orcamento;
  const [data, setData] = useState(hoje());
  const [inicio, setInicio] = useState('08:00');
  const [horarios, setHorarios] = useState(() => sugerirHorarios(itens, hoje(), '08:00'));
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);

  function mudarInicioGeral(novaData, novoInicio) {
    setData(novaData);
    setInicio(novoInicio);
    if (novaData && novoInicio) setHorarios(sugerirHorarios(itens, novaData, novoInicio));
  }

  const alterar = (i, campos) => setHorarios((atuais) => atuais.map((h, n) => (n === i ? { ...h, ...campos } : h)));
  const fins = itens.map((item, i) => fimDe(horarios[i], item));
  const valido = horarios.every((h, i) => h.data && fins[i] !== null && fins[i] <= 1439);
  const dias = new Set(horarios.map((h) => h.data)).size;

  async function aceitar(e) {
    e.preventDefault();
    setErro('');
    setEnviando(true);
    try {
      const resposta = await api(`/orcamentos/${orcamento.id}/aceitar`, { method: 'POST', body: { atividades: horarios } });
      onAceito({ ...resposta, data: horarios[0].data });
    } catch (err) {
      setErro(err.message);
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
        <label className="c3 meia">Começa em<input type="date" value={data} onChange={(e) => mudarInicioGeral(e.target.value, inicio)} required /></label>
        <label className="c3 meia">Início<input type="time" value={inicio} onChange={(e) => mudarInicioGeral(data, e.target.value)} required /></label>

        <div className="grupo-atividades">
          <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--texto-2)' }}>
            Agenda da OS · {dias === 1 ? '1 dia' : `${dias} dias`}
          </span>
          {itens.map((item, i) => {
            const cabe = fins[i] !== null && fins[i] <= 1439;
            return (
              <div key={item.id} className="card-atividade">
                <div className="tipo">
                  <span className="numero">{i + 1}</span>
                  <strong className="avulsa">{item.descricao} <span className="suave" style={{ fontWeight: 400 }}>· {formatarDuracao(item.duracao_min)}</span></strong>
                </div>
                <label className="data">Data<input type="date" value={horarios[i].data} onChange={(e) => alterar(i, { data: e.target.value })} required /></label>
                <label>Início<input type="time" value={horarios[i].hora_inicio} onChange={(e) => alterar(i, { hora_inicio: e.target.value })} required /></label>
                <label>Fim<input type="time" value={cabe ? paraHora(fins[i]) : ''} disabled /></label>
                {!cabe && horarios[i].hora_inicio && <p className="erro inteira" role="alert">Não cabe no dia: termina depois de 23h59. Escolha um início mais cedo.</p>}
              </div>
            );
          })}
        </div>
        {erro && <p className="erro" role="alert">{erro}</p>}
      </form>
    </Modal>
  );
}
