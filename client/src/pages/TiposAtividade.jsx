import { useEffect, useRef, useState } from 'react';
import { api } from '../api';

export default function TiposAtividade({ onFechar }) {
  const dialogRef = useRef(null);
  const [tipos, setTipos] = useState(null);
  const [editandoId, setEditandoId] = useState(null);
  const [erro, setErro] = useState('');
  const [ocupado, setOcupado] = useState(false);

  useEffect(() => {
    dialogRef.current.showModal();
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
  const lerForm = (form) => ({ nome: form.elements.nome.value, duracao_padrao_min: Number(form.elements.duracao.value) });

  function adicionar(e) {
    e.preventDefault();
    const form = e.currentTarget;
    executar(async () => {
      const tipo = await api('/tipos-atividade', { method: 'POST', body: lerForm(form) });
      setTipos((lista) => [...lista, tipo]);
      form.reset();
    });
  }

  function salvarEdicao(e) {
    e.preventDefault();
    const form = e.currentTarget;
    executar(async () => {
      substituir(await api(`/tipos-atividade/${editandoId}`, { method: 'PUT', body: lerForm(form) }));
      setEditandoId(null);
    });
  }

  function alternarSituacao(t) {
    executar(async () => {
      substituir(await api(`/tipos-atividade/${t.id}/situacao`, { method: 'PATCH', body: { ativo: !t.ativo } }));
    });
  }

  function excluir(t) {
    if (!window.confirm(`Excluir o tipo "${t.nome}"?`)) return;
    executar(async () => {
      await api(`/tipos-atividade/${t.id}`, { method: 'DELETE' });
      setTipos((lista) => lista.filter((x) => x.id !== t.id));
    });
  }

  return (
    <dialog ref={dialogRef} className="modal" onClose={onFechar} aria-labelledby="titulo-tipos">
      <div className="cabecalho">
        <h2 id="titulo-tipos">Tipos de atividade</h2>
        <button type="button" onClick={() => dialogRef.current.close()}>Fechar</button>
      </div>

      <form className="cartao" onSubmit={adicionar}>
        <label>Nome *<input name="nome" maxLength={100} required /></label>
        <label>Duração padrão (min) *<input name="duracao" type="number" inputMode="numeric" min={5} max={720} step={1} required /></label>
        <button className="primario" disabled={ocupado}>Adicionar</button>
      </form>

      {erro && <p className="erro" role="alert">{erro}</p>}
      {tipos === null && !erro && <p className="carregando">Carregando…</p>}
      {tipos?.length === 0 && <p className="vazio">Nenhum tipo de atividade cadastrado.</p>}

      {/* inputs da linha em edição apontam para este form via atributo form= */}
      <form id="form-editar-tipo" onSubmit={salvarEdicao} />

      {tipos?.length > 0 && (
        <div className="tabela">
          <table>
            <thead>
              <tr>
                <th>Nome</th>
                <th>Duração (min)</th>
                <th>Uso em OS</th>
                <th>Situação</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {tipos.map((t) => (editandoId === t.id ? (
                <tr key={t.id}>
                  <td><input form="form-editar-tipo" name="nome" aria-label="Nome" maxLength={100} defaultValue={t.nome} required /></td>
                  <td>
                    <input form="form-editar-tipo" name="duracao" aria-label="Duração padrão (min)" type="number" inputMode="numeric"
                      min={5} max={720} step={1} defaultValue={t.duracao_padrao_min} required />
                  </td>
                  <td>{t.uso}</td>
                  <td>{t.ativo ? 'Ativo' : 'Inativo'}</td>
                  <td className="acoes">
                    <button form="form-editar-tipo" disabled={ocupado}>Salvar</button>
                    <button type="button" onClick={() => setEditandoId(null)}>Cancelar</button>
                  </td>
                </tr>
              ) : (
                <tr key={t.id} className={t.ativo ? undefined : 'inativo'}>
                  <td>{t.nome}</td>
                  <td>{t.duracao_padrao_min}</td>
                  <td>{t.uso}</td>
                  <td>{t.ativo ? 'Ativo' : 'Inativo'}</td>
                  <td className="acoes">
                    <button type="button" disabled={ocupado} onClick={() => { setErro(''); setEditandoId(t.id); }}>Editar</button>
                    <button type="button" disabled={ocupado} onClick={() => alternarSituacao(t)}>{t.ativo ? 'Desativar' : 'Reativar'}</button>
                    {t.uso === 0 && <button type="button" className="perigo" disabled={ocupado} onClick={() => excluir(t)}>Excluir</button>}
                  </td>
                </tr>
              )))}
            </tbody>
          </table>
        </div>
      )}
    </dialog>
  );
}
