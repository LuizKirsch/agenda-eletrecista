import { useEffect, useState } from 'react';
import { useLocation } from 'react-router';
import { api } from '../api';
import Modal, { Confirmar } from '../agenda/Modal';
import { formatarDuracao, formatarReais } from '../formato';
import { IconeEditar, IconeLixo, IconeMais } from '../icones';

const uso = (n) => (n === 0 ? 'nenhum' : n === 1 ? '1 uso' : `${n} usos`);

// Página de tipos de atividade (RF 5.1 a 5.8). A agenda redireciona para cá, com uma mensagem,
// quando não há tipo ativo para criar uma OS (RF 5.8).
export default function TiposAtividade() {
  const { state } = useLocation();
  const [tipos, setTipos] = useState(null);
  const [form, setForm] = useState(null); // null | { tipo?: {...} }
  const [excluindo, setExcluindo] = useState(null);
  const [erro, setErro] = useState(state?.mensagem ?? '');
  const [ocupado, setOcupado] = useState(false);

  useEffect(() => {
    api('/tipos-atividade').then(setTipos).catch((err) => setErro(err.message));
  }, []);

  async function executar(acao) {
    setErro('');
    setOcupado(true);
    try {
      await acao();
    } catch (err) {
      setErro(err.message);
    } finally {
      setOcupado(false);
    }
  }

  const substituir = (tipo) => setTipos((lista) => lista.map((t) => (t.id === tipo.id ? tipo : t)));

  function alternarSituacao(t) {
    executar(async () => substituir(await api(`/tipos-atividade/${t.id}/situacao`, { method: 'PATCH', body: { ativo: !t.ativo } })));
  }

  return (
    <>
      <div className="cabecalho">
        <div>
          <h1>Tipos de atividade</h1>
          <p className="suave">Serviços que o eletricista faz. A duração padrão preenche o fim da atividade ao criar uma OS, e o valor padrão é sugerido no orçamento.</p>
        </div>
        <button type="button" className="primario" onClick={() => setForm({})}><IconeMais />Novo tipo</button>
      </div>

      {erro && !form && <p className="erro" role="alert" style={{ marginBottom: 16 }}>{erro}</p>}
      {tipos === null && !erro && <p className="carregando">Carregando…</p>}
      {tipos?.length === 0 && <p className="vazio">Nenhum tipo de atividade cadastrado.</p>}

      {tipos?.length > 0 && (
        <div className="tabela">
          <table>
            <thead>
              <tr>
                <th>Nome</th>
                <th>Duração</th>
                <th>Valor</th>
                <th>Uso</th>
                <th>Situação</th>
                <th><span className="so-leitor">Ações</span></th>
              </tr>
            </thead>
            <tbody>
              {tipos.map((t) => (
                <tr key={t.id} className={t.ativo ? undefined : 'inativo'}>
                  <td><span className="nome">{t.nome}</span></td>
                  <td>{formatarDuracao(t.duracao_padrao_min)}</td>
                  <td>{t.valor_padrao === null ? <span className="suave">sem valor</span> : formatarReais(t.valor_padrao)}</td>
                  <td data-rotulo="Uso">{uso(t.uso)}</td>
                  <td><span className={`badge ${t.ativo ? 'ativo' : 'inativo'}`}>{t.ativo ? 'Ativo' : 'Inativo'}</span></td>
                  <td className="acoes">
                    <button type="button" className="icone-botao discreto" aria-label={`Editar ${t.nome}`} disabled={ocupado} onClick={() => { setErro(''); setForm({ tipo: t }); }}><IconeEditar /></button>
                    <button type="button" className="discreto" disabled={ocupado} onClick={() => alternarSituacao(t)}>{t.ativo ? 'Desativar' : 'Reativar'}</button>
                    {t.uso === 0 && (
                      <button type="button" className="icone-botao discreto perigo" aria-label={`Excluir ${t.nome}`} disabled={ocupado} onClick={() => { setErro(''); setExcluindo(t); }}><IconeLixo /></button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {excluindo && (
        <Confirmar
          titulo="Excluir tipo de atividade"
          subtitulo={excluindo.nome}
          rotulo="Excluir tipo"
          rotuloEnviando="Excluindo…"
          onFechar={() => setExcluindo(null)}
          onConfirmar={async () => {
            await api(`/tipos-atividade/${excluindo.id}`, { method: 'DELETE' });
            setTipos((lista) => lista.filter((x) => x.id !== excluindo.id));
            setExcluindo(null);
          }}
        >
          O tipo será excluído do catálogo. Essa ação não pode ser desfeita.
        </Confirmar>
      )}

      {form && (
        <FormTipo
          tipo={form.tipo}
          onFechar={() => setForm(null)}
          onSalvo={(salvo) => {
            setTipos((lista) => (form.tipo ? lista.map((t) => (t.id === salvo.id ? salvo : t)) : [...lista, salvo]));
            setForm(null);
          }}
        />
      )}
    </>
  );
}

function FormTipo({ tipo, onFechar, onSalvo }) {
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);

  async function salvar(e) {
    e.preventDefault();
    const { nome, duracao: dur, valor } = e.currentTarget.elements;
    const body = { nome: nome.value, duracao_padrao_min: Number(dur.value), valor_padrao: valor.value };
    setErro('');
    setEnviando(true);
    try {
      onSalvo(await api(tipo ? `/tipos-atividade/${tipo.id}` : '/tipos-atividade', { method: tipo ? 'PUT' : 'POST', body }));
    } catch (err) {
      setErro(err.message);
      setEnviando(false);
    }
  }

  return (
    <Modal
      titulo={tipo ? 'Editar tipo de atividade' : 'Novo tipo de atividade'}
      variante="dialogo"
      onFechar={onFechar}
      rodape={(fechar) => (
        <>
          <button type="button" onClick={fechar}>Cancelar</button>
          <button className="primario" form="form-tipo" disabled={enviando}>{enviando ? 'Salvando…' : 'Salvar'}</button>
        </>
      )}
    >
      <form id="form-tipo" className="campos" onSubmit={salvar}>
        <label>Nome<input name="nome" maxLength={100} defaultValue={tipo?.nome} required autoFocus /></label>
        <label className="c3 meia">
          Duração padrão (min)
          <input name="duracao" type="number" inputMode="numeric" min={5} max={720} step={1} defaultValue={tipo?.duracao_padrao_min} required />
          <span className="dica">De 5 a 720 minutos</span>
        </label>
        <label className="c3 meia">
          <span>Valor padrão (R$) <span className="opcional">(opcional)</span></span>
          <input name="valor" type="number" inputMode="decimal" min={0} step={0.01} defaultValue={tipo?.valor_padrao ?? ''} />
          <span className="dica">Sugerido nos orçamentos</span>
        </label>
        {tipo && tipo.uso > 0 && (
          <p className="alerta"><span>Em uso ({uso(tipo.uso)}). Mudar a duração não altera o que já foi agendado, e mudar o valor não altera orçamentos já criados.</span></p>
        )}
        {erro && <p className="erro" role="alert">{erro}</p>}
      </form>
    </Modal>
  );
}
