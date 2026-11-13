import { useEffect, useRef, useState } from 'react';
import { api } from '../api';
import { hoje, paraHora, paraMin } from '../datas';
import { carregarEletricistas, oferecer } from '../eletricistas';
import { formatarDataHora } from '../formato';
import { IconeLixo, IconeMais } from '../icones';
import Modal from './Modal';
import SelectBusca from '../SelectBusca';
import SeletorClienteEndereco from './SeletorClienteEndereco';

// Fim = início + duração padrão do tipo (RF 1.8, RN 2)
function fimPara(inicio, tipo) {
  if (!inicio || !tipo) return '';
  return paraHora((paraMin(inicio) + tipo.duracao_padrao_min) % 1440);
}

const SEM_TIPO_ATIVO = 'Não há tipos de atividade ativos. Cadastre ou reative um tipo para criar uma OS.';

// RF 1.9: nova linha começa no fim da anterior, na mesma data; o tipo fica para o usuário escolher
function linhaApos(anterior, tipos, chave, eletricistaId) {
  if (!tipos.some((t) => t.ativo)) return null;
  return { chave, tipo_atividade_id: '', data: anterior.data, hora_inicio: anterior.hora_fim, hora_fim: '', eletricista_id: eletricistaId };
}

export default function OsForm({ osId, data, hora, titulo, adicionarAtividade, onFechar, onSalvo }) {
  const [tipos, setTipos] = useState(null);
  const [clienteId, setClienteId] = useState('');
  const [enderecoId, setEnderecoId] = useState('');
  const [eletricistas, setEletricistas] = useState([]);
  const [eletricistaId, setEletricistaId] = useState('');
  const [observacoesEndereco, setObservacoesEndereco] = useState([]);
  const [observacao, setObservacao] = useState('');
  const [linhas, setLinhas] = useState([]);
  const [alterado, setAlterado] = useState(false);
  const [orcamentoId, setOrcamentoId] = useState(null);
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);
  const chave = useRef(0);
  const novaChave = () => ++chave.current;

  const tipoPorId = (id) => tipos?.find((t) => String(t.id) === String(id));

  useEffect(() => {
    Promise.all([api('/tipos-atividade'), osId ? api(`/os/${osId}`) : null, carregarEletricistas()])
      .then(([listaTipos, os, listaEletricistas]) => {
        setEletricistas(listaEletricistas);
        setTipos(listaTipos);
        if (os) {
          setClienteId(String(os.cliente.id));
          setOrcamentoId(os.orcamento_id);
          setEnderecoId(os.endereco ? String(os.endereco.id) : '');
          setObservacao(os.observacao ?? '');
          setEletricistaId(os.eletricista ? String(os.eletricista.id) : '');
          const existentes = os.atividades.map((a) => ({
            // atividade avulsa (item avulso do orçamento) não tem tipo e mantém a descrição (RF 6.3)
            chave: novaChave(), id: a.id, tipoOriginal: a.tipo.id, tipo_atividade_id: a.tipo.id ? String(a.tipo.id) : '', avulsa: a.tipo.id ? null : a.tipo.nome,
            data: a.data, hora_inicio: a.hora_inicio, hora_fim: a.hora_fim, eletricista_id: a.eletricista ? String(a.eletricista.id) : '',
            // RN 9: concluída/cancelada fica só leitura na edição
            encerrada: a.status === 'agendada' ? null : a.status, nome: a.tipo.nome,
          }));
          const nova = adicionarAtividade && linhaApos(existentes[existentes.length - 1], listaTipos, novaChave(), os.eletricista ? String(os.eletricista.id) : '');
          setLinhas(nova ? [...existentes, nova] : existentes);
        } else {
          setLinhas([{
            chave: novaChave(), tipo_atividade_id: '', data: data ?? hoje(), hora_inicio: hora ?? '08:00', hora_fim: '', eletricista_id: '',
          }]);
        }
      })
      .catch((err) => setErro(err.message));
  }, [osId, data, hora, adicionarAtividade]);

  // RF 3.6 / RF 3.7: observações do endereço, mais recente primeiro (a API já ordena)
  useEffect(() => {
    setObservacoesEndereco([]);
    let ativo = true;
    if (enderecoId) api(`/enderecos/${enderecoId}/observacoes`).then((l) => { if (ativo) setObservacoesEndereco(l); }).catch((err) => { if (ativo) setErro(err.message); });
    return () => { ativo = false; };
  }, [enderecoId]);

  function alterarLinha(chaveLinha, campos) {
    setLinhas((atuais) => atuais.map((l) => {
      if (l.chave !== chaveLinha) return l;
      const nova = { ...l, ...campos };
      if ('tipo_atividade_id' in campos || 'hora_inicio' in campos) {
        nova.hora_fim = fimPara(nova.hora_inicio, tipoPorId(nova.tipo_atividade_id)) || nova.hora_fim;
      }
      return nova;
    }));
  }

  function adicionarLinha() {
    const nova = linhaApos(linhas[linhas.length - 1], tipos, novaChave(), eletricistaId);
    if (nova) {
      setLinhas([...linhas, nova]);
      setAlterado(true);
    }
    else setErro(SEM_TIPO_ATIVO);
  }

  // RF 6.22: a atividade acompanha o responsável da OS enquanto não for alterada por atividade
  function trocarResponsavel(novo) {
    setLinhas((atuais) => atuais.map((l) => (!l.encerrada && (!l.eletricista_id || l.eletricista_id === eletricistaId) ? { ...l, eletricista_id: novo } : l)));
    setEletricistaId(novo);
  }

  async function salvar(e) {
    e.preventDefault();
    setErro('');
    if (!clienteId) { setErro('Selecione o cliente.'); return; }
    setEnviando(true);
    const body = {
      cliente_id: clienteId,
      endereco_id: enderecoId,
      observacao,
      eletricista_id: eletricistaId,
      atividades: linhas.map(({ id, tipo_atividade_id, data: d, hora_inicio, hora_fim, eletricista_id }) => ({ id, tipo_atividade_id, data: d, hora_inicio, hora_fim, eletricista_id: eletricista_id || eletricistaId })),
    };
    try {
      onSalvo(await api(osId ? `/os/${osId}` : '/os', { method: osId ? 'PUT' : 'POST', body }));
    } catch (err) {
      setErro(err.message);
      setEnviando(false);
    }
  }

  return (
    <Modal
      titulo={titulo}
      largo
      confirmarSaida={alterado}
      onFechar={onFechar}
      rodape={(fechar) => (
        <>
          <button type="button" onClick={fechar}>Cancelar</button>
          <button className="primario" form="form-os" disabled={enviando || !tipos}>{enviando ? 'Salvando…' : osId ? 'Salvar OS' : 'Criar OS'}</button>
        </>
      )}
    >
      {!tipos && !erro && <p className="carregando">Carregando…</p>}
      {tipos && (
        <form id="form-os" className="campos" onSubmit={salvar} onChange={() => setAlterado(true)}>
          {/* RN 57: OS gerada por orçamento não troca de cliente */}
          <SeletorClienteEndereco clienteId={clienteId} enderecoId={enderecoId} onCliente={setClienteId} onEndereco={setEnderecoId} bloqueado={!!orcamentoId} />
          {orcamentoId && <span className="dica">OS gerada pelo orçamento nº {orcamentoId}; o cliente não pode ser trocado.</span>}

          <label>
            Eletricista responsável
            <SelectBusca value={eletricistaId} onChange={trocarResponsavel} required
              opcoes={oferecer(eletricistas, eletricistaId).map((u) => ({ valor: u.id, rotulo: `${u.nome}${u.ativo ? '' : ' (inativo)'}`, desabilitada: !u.ativo }))} />
          </label>

          {observacoesEndereco.length > 0 && (
            <details className="obs-endereco" open>
              <summary>{observacoesEndereco.length === 1 ? '1 observação deste endereço' : `${observacoesEndereco.length} observações deste endereço`}</summary>
              <ul>
                {observacoesEndereco.map((o) => (
                  <li key={o.id}>{o.texto} <time dateTime={o.criado_em}>· {formatarDataHora(o.criado_em)}</time></li>
                ))}
              </ul>
            </details>
          )}

          <div className="grupo-atividades">
            <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--texto-2)' }}>Atividades</span>
            {linhas.map((l, i) => (
              <div key={l.chave} className="card-atividade">
                <div className="tipo">
                  <span className="numero">{i + 1}</span>
                  {l.encerrada ? (
                    <strong className="avulsa">{l.nome} <span className={`pilula ${l.encerrada}`}>{l.encerrada === 'concluida' ? 'Concluída' : 'Cancelada'}</span></strong>
                  ) : l.avulsa ? <strong className="avulsa">{l.avulsa} <span className="badge inativo">avulsa</span></strong> : (
                    <SelectBusca
                      ariaLabel={`Tipo (${i + 1}ª atividade)`}
                      value={l.tipo_atividade_id}
                      onChange={(v) => alterarLinha(l.chave, { tipo_atividade_id: v })}
                      required
                      placeholder="Selecione a atividade"
                      opcoes={tipos.filter((t) => t.ativo || String(t.id) === String(l.tipoOriginal)).map((t) => ({ valor: t.id, rotulo: `${t.nome} · ${t.duracao_padrao_min} min${t.ativo ? '' : ' (inativo)'}`, desabilitada: !t.ativo }))}
                    />
                  )}
                  {linhas.length > 1 && !l.encerrada && (
                    <button type="button" className="icone-botao discreto perigo" aria-label={`Remover ${i + 1}ª atividade`} onClick={() => { setLinhas(linhas.filter((x) => x.chave !== l.chave)); setAlterado(true); }}>
                      <IconeLixo />
                    </button>
                  )}
                </div>
                <label className="inteira">
                  Eletricista
                  <SelectBusca value={l.eletricista_id} disabled={!!l.encerrada} onChange={(v) => alterarLinha(l.chave, { eletricista_id: v })} required
                    opcoes={oferecer(eletricistas, l.eletricista_id).map((u) => ({ valor: u.id, rotulo: `${u.nome}${u.ativo ? '' : ' (inativo)'}`, desabilitada: !u.ativo }))} />
                </label>
                <label className="data">Data<input type="date" value={l.data} disabled={!!l.encerrada} onChange={(e) => alterarLinha(l.chave, { data: e.target.value })} required /></label>
                <label>Início<input type="time" value={l.hora_inicio} disabled={!!l.encerrada} onChange={(e) => alterarLinha(l.chave, { hora_inicio: e.target.value })} required /></label>
                <label>Fim<input type="time" value={l.hora_fim} disabled={!!l.encerrada} onChange={(e) => alterarLinha(l.chave, { hora_fim: e.target.value })} required /></label>
              </div>
            ))}
            <button type="button" className="tracejado" onClick={adicionarLinha}><IconeMais />Adicionar atividade</button>
          </div>

          <label>
            <span>Observações da OS <span className="opcional">(opcional)</span></span>
            <textarea value={observacao} onChange={(e) => setObservacao(e.target.value)} rows={3} placeholder="O que o cliente relatou" />
          </label>

          {erro && <p className="erro" role="alert">{erro}</p>}
        </form>
      )}
      {!tipos && erro && <p className="erro" role="alert">{erro}</p>}
    </Modal>
  );
}
