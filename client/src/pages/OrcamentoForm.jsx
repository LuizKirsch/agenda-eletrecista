import { useEffect, useRef, useState } from 'react';
import { api } from '../api';
import Modal from '../agenda/Modal';
import SelectBusca from '../SelectBusca';
import SeletorClienteEndereco from '../agenda/SeletorClienteEndereco';
import { formatarReais } from '../formato';
import { IconeLixo, IconeMais } from '../icones';

// RF 4.9: tempo sugerido = quantidade × duração padrão do tipo, dentro de 5 a 720 min
const tempoPara = (tipo, quantidade) => Math.min(720, Math.max(5, (Number(quantidade) || 1) * tipo.duracao_padrao_min));

// tipo_atividade_id: '' = ainda não escolhido (o select é obrigatório), AVULSO = item fora do catálogo
const AVULSO = 'avulso';
const itemVazio = (chave) => ({ chave, tipo_atividade_id: '', descricao: '', quantidade: 1, valor_unitario: '', duracao_min: '' });

const centavos = (i) => (Number(i.quantidade) || 0) * Math.round((Number(i.valor_unitario) || 0) * 100);

export default function OrcamentoForm({ orcamento, onFechar, onSalvo }) {
  const [tipos, setTipos] = useState(null);
  const [clienteId, setClienteId] = useState(orcamento ? String(orcamento.cliente.id) : '');
  const [enderecoId, setEnderecoId] = useState(orcamento ? String(orcamento.endereco.id) : '');
  const [observacao, setObservacao] = useState(orcamento?.observacao ?? '');
  const [itens, setItens] = useState([]);
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [alterado, setAlterado] = useState(false);
  const chave = useRef(0);
  const novaChave = () => ++chave.current;

  const tipoPorId = (id) => tipos?.find((t) => String(t.id) === String(id));
  // RN 49: o tipo que já estava no orçamento continua disponível mesmo inativo
  const tiposDoOrcamento = new Set(orcamento?.itens.filter((i) => i.tipo).map((i) => String(i.tipo.id)));

  useEffect(() => {
    Promise.all([api('/tipos-atividade')])
      .then(([listaTipos]) => {
        setTipos(listaTipos);
        setItens(orcamento
          ? orcamento.itens.map((i) => ({
            chave: novaChave(),
            tipo_atividade_id: i.tipo ? String(i.tipo.id) : AVULSO,
            descricao: i.descricao,
            quantidade: i.quantidade,
            valor_unitario: i.valor_unitario,
            duracao_min: i.duracao_min,
          }))
          : [itemVazio(novaChave())]);
      })
      .catch((err) => setErro(err.message));
  }, [orcamento]);

  function alterarItem(chaveItem, campos) {
    setItens((atuais) => atuais.map((i) => {
      if (i.chave !== chaveItem) return i;
      const novo = { ...i, ...campos };
      const tipo = tipoPorId(novo.tipo_atividade_id);
      // RN 45: o item do catálogo copia nome e valor padrão
      if ('tipo_atividade_id' in campos && tipo) {
        Object.assign(novo, { descricao: tipo.nome, valor_unitario: tipo.valor_padrao ?? '', duracao_min: tempoPara(tipo, novo.quantidade) });
      } else if ('quantidade' in campos && tipo) {
        novo.duracao_min = tempoPara(tipo, novo.quantidade);
      }
      return novo;
    }));
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
      itens: itens.map(({ tipo_atividade_id: tipoId, descricao, quantidade, valor_unitario: valor, duracao_min: duracao }) => ({
        tipo_atividade_id: tipoId === AVULSO ? null : tipoId, descricao, quantidade, valor_unitario: valor, duracao_min: duracao,
      })),
    };
    try {
      onSalvo(await api(orcamento ? `/orcamentos/${orcamento.id}` : '/orcamentos', { method: orcamento ? 'PUT' : 'POST', body }));
    } catch (err) {
      setErro(err.message);
      setEnviando(false);
    }
  }

  const total = itens.reduce((t, i) => t + centavos(i), 0) / 100;

  return (
    <Modal
      titulo={orcamento ? `Editar orçamento nº ${orcamento.id}` : 'Novo orçamento'}
      largo
      confirmarSaida={alterado}
      onFechar={onFechar}
      rodape={(fechar) => (
        <>
          <button type="button" onClick={fechar}>Cancelar</button>
          <button className="primario" form="form-orcamento" disabled={enviando || !tipos}>{enviando ? 'Salvando…' : 'Salvar orçamento'}</button>
        </>
      )}
    >
      {!tipos && !erro && <p className="carregando">Carregando…</p>}
      {tipos && (
        <form id="form-orcamento" className="campos" onSubmit={salvar} onChange={() => setAlterado(true)}>
          <SeletorClienteEndereco clienteId={clienteId} enderecoId={enderecoId} onCliente={setClienteId} onEndereco={setEnderecoId} />

          <div className="grupo-atividades">
            <span style={{ fontSize: 'calc(13px * var(--fonte))', fontWeight: 500, color: 'var(--texto-2)' }}>Itens de serviço</span>
            {itens.map((item, n) => (
              <div key={item.chave} className="card-atividade">
                <div className="tipo">
                  <span className="numero">{n + 1}</span>
                  <SelectBusca
                    ariaLabel={`Atividade (${n + 1}º item)`}
                    value={item.tipo_atividade_id}
                    onChange={(v) => alterarItem(item.chave, { tipo_atividade_id: v })}
                    required
                    placeholder="Selecione a atividade"
                    opcoes={[
                      { valor: AVULSO, rotulo: 'Avulso (fora do catálogo)' },
                      ...tipos.filter((t) => t.ativo || tiposDoOrcamento.has(String(t.id))).map((t) => ({ valor: t.id, rotulo: `${t.nome}${t.ativo ? '' : ' (inativo)'}`, desabilitada: !t.ativo })),
                    ]}
                  />
                  {itens.length > 1 && (
                    <button type="button" className="icone-botao discreto perigo" aria-label={`Remover ${n + 1}º item`} onClick={() => { setItens(itens.filter((x) => x.chave !== item.chave)); setAlterado(true); }}>
                      <IconeLixo />
                    </button>
                  )}
                </div>
                <label className="inteira">Descrição<input value={item.descricao} maxLength={100} onChange={(e) => alterarItem(item.chave, { descricao: e.target.value })} required /></label>
                <label>Quantidade<input type="number" inputMode="numeric" min={1} step={1} value={item.quantidade} onChange={(e) => alterarItem(item.chave, { quantidade: e.target.value })} required /></label>
                <label>Valor unitário (R$)<input type="number" inputMode="decimal" min={0} step={0.01} value={item.valor_unitario} onChange={(e) => alterarItem(item.chave, { valor_unitario: e.target.value })} required /></label>
                <label>Tempo (min)<input type="number" inputMode="numeric" min={5} max={720} step={1} value={item.duracao_min} onChange={(e) => alterarItem(item.chave, { duracao_min: e.target.value })} required /></label>
                <span className="inteira suave" style={{ fontSize: 'calc(13px * var(--fonte))' }}>Subtotal {formatarReais(centavos(item) / 100)}</span>
              </div>
            ))}
            <button type="button" className="tracejado" onClick={() => { setItens([...itens, itemVazio(novaChave())]); setAlterado(true); }}>
              <IconeMais />Adicionar item
            </button>
          </div>

          <p className="total-orcamento">Total<strong>{formatarReais(total)}</strong></p>

          <label>
            <span>Observações <span className="opcional">(opcional)</span></span>
            <textarea value={observacao} onChange={(e) => setObservacao(e.target.value)} rows={3} placeholder="Condições, prazo, o que não está incluso" />
          </label>

          {erro && <p className="erro" role="alert">{erro}</p>}
        </form>
      )}
      {!tipos && erro && <p className="erro" role="alert">{erro}</p>}
    </Modal>
  );
}
