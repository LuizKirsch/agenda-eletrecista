import { useEffect, useState } from 'react';
import SelectBusca from '../SelectBusca';
import { api } from '../api';
import { useAuth } from '../auth';
import Modal, { Confirmar } from '../agenda/Modal';
import { IconeEditar, IconeLixo, IconeMais, iniciais } from '../icones';
import { PERFIS } from './Layout';

export default function Usuarios() {
  const { usuario: logado } = useAuth();
  const ehSecretaria = logado.perfil === 'secretaria'; // cadastrar/editar/excluir: só a secretária
  const [usuarios, setUsuarios] = useState([]);
  const [form, setForm] = useState(null); // null | { usuario?: {...} }
  const [excluindo, setExcluindo] = useState(null);
  const [erro, setErro] = useState('');

  useEffect(() => {
    api('/usuarios').then(setUsuarios).catch((err) => setErro(err.message));
  }, []);

  async function excluir() {
    await api(`/usuarios/${excluindo.id}`, { method: 'DELETE' });
    setUsuarios((lista) => lista.filter((x) => x.id !== excluindo.id));
    setExcluindo(null);
  }

  function salvo(u) {
    setUsuarios((lista) => (form.usuario ? lista.map((x) => (x.id === u.id ? u : x)) : [...lista, u]));
    setForm(null);
  }

  return (
    <>
      <div className="cabecalho">
        <div>
          <h1>Usuários</h1>
          <p className="suave">Quem tem acesso ao sistema.</p>
        </div>
        {ehSecretaria && <button type="button" className="primario" onClick={() => setForm({})}><IconeMais />Novo usuário</button>}
      </div>

      {erro && <p className="erro" role="alert" style={{ marginBottom: 16 }}>{erro}</p>}

      {usuarios.length > 0 && (
        <div className="tabela">
          <table>
            <thead>
              <tr>
                <th>Nome</th>
                <th>Login</th>
                <th>Perfil</th>
                <th><span className="so-leitor">Ações</span></th>
              </tr>
            </thead>
            <tbody>
              {usuarios.map((u) => (
                <tr key={u.id} className={u.ativo ? undefined : 'inativo'}>
                  <td>
                    <span className="nome">
                      <span className="avatar">{iniciais(u.nome)}</span>
                      {u.nome}
                      {u.id === logado.id && <span className="suave" style={{ fontWeight: 400, fontSize: 12 }}>(você)</span>}
                    </span>
                  </td>
                  <td className="suave">{u.login}</td>
                  <td>
                    <span className={`badge ${u.perfil}`}>{PERFIS[u.perfil]}</span>
                    {!u.ativo && <> <span className="badge inativo">Inativo</span></>}
                  </td>
                  <td className="acoes">
                    {ehSecretaria && (
                      <>
                        <button type="button" className="icone-botao discreto" aria-label={`Editar ${u.nome}`} onClick={() => { setErro(''); setForm({ usuario: u }); }}><IconeEditar /></button>
                        {u.id !== logado.id && (
                          <button type="button" className="icone-botao discreto perigo" aria-label={`Excluir ${u.nome}`} onClick={() => { setErro(''); setExcluindo(u); }}><IconeLixo /></button>
                        )}
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {excluindo && (
        <Confirmar titulo="Excluir usuário" subtitulo={excluindo.nome} rotulo="Excluir usuário" rotuloEnviando="Excluindo…" onFechar={() => setExcluindo(null)} onConfirmar={excluir}>
          O usuário será excluído e perderá o acesso ao sistema. Essa ação não pode ser desfeita.
        </Confirmar>
      )}

      {form && <FormUsuario editando={form.usuario} proprio={form.usuario?.id === logado.id} onFechar={() => setForm(null)} onSalvo={salvo} />}
    </>
  );
}

function FormUsuario({ editando, proprio, onFechar, onSalvo }) {
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [perfil, setPerfil] = useState(editando?.perfil ?? '');

  async function salvar(e) {
    e.preventDefault();
    const { nome, login, senha, perfil, ativo } = e.currentTarget.elements;
    const body = { nome: nome.value, login: login.value, senha: senha.value, perfil: perfil.value };
    setErro('');
    setEnviando(true);
    try {
      onSalvo(editando
        ? await api(`/usuarios/${editando.id}`, { method: 'PUT', body: { ...body, ativo: ativo.checked } })
        : await api('/usuarios', { method: 'POST', body }));
    } catch (err) {
      setErro(err.message);
      setEnviando(false);
    }
  }

  return (
    <Modal
      titulo={editando ? `Editar ${editando.nome}` : 'Novo usuário'}
      variante="dialogo"
      onFechar={onFechar}
      rodape={(fechar) => (
        <>
          <button type="button" onClick={fechar}>Cancelar</button>
          <button className="primario" form="form-usuario" disabled={enviando}>{enviando ? 'Salvando…' : 'Salvar usuário'}</button>
        </>
      )}
    >
      <form id="form-usuario" className="campos" onSubmit={salvar}>
        <label>Nome<input name="nome" maxLength={100} defaultValue={editando?.nome} required autoFocus /></label>
        <label className="c3">Login<input name="login" maxLength={60} defaultValue={editando?.login} autoComplete="off" autoCapitalize="none" required /></label>
        <label className="c3">
          Perfil
          <SelectBusca name="perfil" required value={perfil} onChange={setPerfil} disabled={proprio}
            opcoes={[{ valor: 'eletricista', rotulo: 'Eletricista' }, { valor: 'secretaria', rotulo: 'Secretária' }]} />
        </label>
        <label>
          Senha
          <input name="senha" type="password" autoComplete="new-password" required={!editando} />
          {editando && <span className="dica">Deixe em branco para manter a senha atual.</span>}
        </label>
        {editando && (
          <label className="checkbox">
            <input name="ativo" type="checkbox" defaultChecked={editando.ativo} disabled={proprio} />
            Ativo (pode acessar o sistema)
          </label>
        )}
        {erro && <p className="erro" role="alert">{erro}</p>}
      </form>
    </Modal>
  );
}
