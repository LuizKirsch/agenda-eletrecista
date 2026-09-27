import { useEffect, useRef, useState } from 'react';
import { api } from '../api';
import { hoje, paraHora, paraMin } from '../datas';
import { formatarDataHora, formatarEndereco } from '../formato';
import Modal from './Modal';

// Fim = início + duração padrão do tipo (RF 1.8, RN 2)
function fimPara(inicio, tipo) {
  if (!inicio || !tipo) return '';
  return paraHora((paraMin(inicio) + tipo.duracao_padrao_min) % 1440);
}

const SEM_TIPO_ATIVO = 'Não há tipos de atividade ativos. Cadastre ou reative um tipo para criar uma OS.';

// RF 1.9: nova linha começa no fim da anterior, na mesma data
function linhaApos(anterior, tipos, chave) {
  const tipo = tipos.find((t) => t.ativo);
  if (!tipo) return null;
  return {
    chave, tipo_atividade_id: String(tipo.id), data: anterior.data,
    hora_inicio: anterior.hora_fim, hora_fim: fimPara(anterior.hora_fim, tipo),
  };
}

export default function OsForm({ osId, data, hora, titulo, adicionarAtividade, onFechar, onSalvo }) {
  const [tipos, setTipos] = useState(null);
  const [clientes, setClientes] = useState([]);
  const [clienteId, setClienteId] = useState('');
  const [enderecos, setEnderecos] = useState([]);
  const [enderecoId, setEnderecoId] = useState('');
  const [observacoesEndereco, setObservacoesEndereco] = useState([]);
  const [observacao, setObservacao] = useState('');
  const [linhas, setLinhas] = useState([]);
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);
  const chave = useRef(0);
  const novaChave = () => ++chave.current;

  const tipoPorId = (id) => tipos?.find((t) => String(t.id) === String(id));

  useEffect(() => {
    Promise.all([api('/clientes'), api('/tipos-atividade'), osId ? api(`/os/${osId}`) : null])
      .then(([listaClientes, listaTipos, os]) => {
        setClientes(listaClientes);
        setTipos(listaTipos);
        if (os) {
          setClienteId(String(os.cliente.id));
          setEnderecoId(os.endereco ? String(os.endereco.id) : '');
          setObservacao(os.observacao ?? '');
          const existentes = os.atividades.map((a) => ({
            chave: novaChave(), id: a.id, tipoOriginal: a.tipo.id, tipo_atividade_id: String(a.tipo.id),
            data: a.data, hora_inicio: a.hora_inicio, hora_fim: a.hora_fim,
          }));
          const nova = adicionarAtividade && linhaApos(existentes[existentes.length - 1], listaTipos, novaChave());
          setLinhas(nova ? [...existentes, nova] : existentes);
        } else {
          const tipo = listaTipos.find((t) => t.ativo);
          const inicio = hora ?? '08:00';
          setLinhas([{
            chave: novaChave(), tipo_atividade_id: String(tipo.id), data: data ?? hoje(), hora_inicio: inicio, hora_fim: fimPara(inicio, tipo),
          }]);
        }
      })
      .catch((err) => setErro(err.message));
  }, [osId, data, hora, adicionarAtividade]);

  useEffect(() => {
    setEnderecos([]);
    if (clienteId) api(`/clientes/${clienteId}`).then((c) => setEnderecos(c.enderecos)).catch((err) => setErro(err.message));
  }, [clienteId]);

  // RF 3.6 / RF 3.7: observações do endereço, mais recente primeiro (a API já ordena)
  useEffect(() => {
    setObservacoesEndereco([]);
    if (enderecoId) api(`/enderecos/${enderecoId}/observacoes`).then(setObservacoesEndereco).catch((err) => setErro(err.message));
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
    const nova = linhaApos(linhas[linhas.length - 1], tipos, novaChave());
    if (nova) setLinhas([...linhas, nova]);
    else setErro(SEM_TIPO_ATIVO);
  }

  async function salvar(e) {
    e.preventDefault();
    setErro('');
    setEnviando(true);
    const body = {
      cliente_id: clienteId,
      endereco_id: enderecoId || null,
      observacao,
      atividades: linhas.map(({ id, tipo_atividade_id, data: d, hora_inicio, hora_fim }) => ({ id, tipo_atividade_id, data: d, hora_inicio, hora_fim })),
    };
    try {
      onSalvo(await api(osId ? `/os/${osId}` : '/os', { method: osId ? 'PUT' : 'POST', body }));
    } catch (err) {
      setErro(err.message);
      setEnviando(false);
    }
  }

  return (
    <Modal titulo={titulo} onFechar={onFechar}>
      {!tipos && !erro && <p className="carregando">Carregando…</p>}
      {tipos && (
        <form className="cartao" onSubmit={salvar}>
          <label>
            Cliente *
            <select value={clienteId} onChange={(e) => { setClienteId(e.target.value); setEnderecoId(''); }} required>
              <option value="" disabled>Selecione</option>
              {clientes.map((c) => <option key={c.id} value={c.id}>{c.nome} · {c.telefone}</option>)}
            </select>
          </label>

          <label>
            Endereço
            <select value={enderecoId} onChange={(e) => setEnderecoId(e.target.value)} disabled={!clienteId}>
              <option value="">Sem endereço</option>
              {enderecos.map((en) => (
                <option key={en.id} value={en.id}>{en.identificacao ? `${en.identificacao} · ` : ''}{formatarEndereco(en)}</option>
              ))}
            </select>
          </label>

          {observacoesEndereco.length > 0 && (
            <div>
              <div className="rotulo">Observações do endereço</div>
              <ul className="lista">
                {observacoesEndereco.map((o) => (
                  <li key={o.id}>
                    <span>{formatarDataHora(o.criado_em)}</span>
                    <p className="texto">{o.texto}</p>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div>
            <div className="rotulo">Atividades *</div>
            {linhas.map((l, i) => (
              <div key={l.chave} className="linha-atividade">
                <select
                  aria-label={`Tipo (${i + 1}ª atividade)`}
                  value={l.tipo_atividade_id}
                  onChange={(e) => alterarLinha(l.chave, { tipo_atividade_id: e.target.value })}
                  required
                >
                  {tipos.filter((t) => t.ativo || String(t.id) === String(l.tipoOriginal)).map((t) => (
                    <option key={t.id} value={t.id}>{t.nome}{t.ativo ? '' : ' (inativo)'}</option>
                  ))}
                </select>
                <input type="date" aria-label={`Data (${i + 1}ª atividade)`} value={l.data} onChange={(e) => alterarLinha(l.chave, { data: e.target.value })} required />
                <input type="time" aria-label={`Início (${i + 1}ª atividade)`} value={l.hora_inicio} onChange={(e) => alterarLinha(l.chave, { hora_inicio: e.target.value })} required />
                <input type="time" aria-label={`Fim (${i + 1}ª atividade)`} value={l.hora_fim} onChange={(e) => alterarLinha(l.chave, { hora_fim: e.target.value })} required />
                {linhas.length > 1 && (
                  <button type="button" className="perigo" aria-label={`Remover ${i + 1}ª atividade`} onClick={() => setLinhas(linhas.filter((x) => x.chave !== l.chave))}>✕</button>
                )}
              </div>
            ))}
            <button type="button" className="adicionar-linha" onClick={adicionarLinha}>+ Adicionar atividade</button>
          </div>

          <label>Observações<textarea value={observacao} onChange={(e) => setObservacao(e.target.value)} rows={3} /></label>

          {erro && <p className="erro" role="alert">{erro}</p>}
          <button className="primario" disabled={enviando}>{enviando ? 'Salvando…' : osId ? 'Salvar OS' : 'Criar OS'}</button>
        </form>
      )}
      {!tipos && erro && <p className="erro" role="alert">{erro}</p>}
    </Modal>
  );
}
