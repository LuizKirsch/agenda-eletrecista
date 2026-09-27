import { useEffect, useState } from 'react';
import { api } from '../api';
import { useAuth } from '../auth';

const PERFIS = { eletricista: 'Eletricista', secretaria: 'Secretária' };

export default function Usuarios() {
  const { usuario: logado } = useAuth();
  const ehSecretaria = logado.perfil === 'secretaria'; // editar/excluir: só a secretária
  const [usuarios, setUsuarios] = useState([]);
  const [editando, setEditando] = useState(null);
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    api('/usuarios').then(setUsuarios).catch((err) => setErro(err.message));
  }, []);

  function editar(u) {
    setErro('');
    setEditando(u);
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
  }

  async function excluir(u) {
    if (!window.confirm(`Excluir ${u.nome}?`)) return;
    setErro('');
    try {
      await api(`/usuarios/${u.id}`, { method: 'DELETE' });
      setUsuarios((lista) => lista.filter((x) => x.id !== u.id));
      if (editando?.id === u.id) setEditando(null);
    } catch (err) {
      setErro(err.message);
    }
  }

  async function salvar(e) {
    e.preventDefault();
    const form = e.currentTarget;
    const { nome, login, senha, perfil, ativo } = form.elements;
    const body = { nome: nome.value, login: login.value, senha: senha.value, perfil: perfil.value };
    setErro('');
    setEnviando(true);
    try {
      if (editando) {
        const salvo = await api(`/usuarios/${editando.id}`, { method: 'PUT', body: { ...body, ativo: ativo.checked } });
        setUsuarios((lista) => lista.map((x) => (x.id === salvo.id ? salvo : x)));
        setEditando(null);
      } else {
        const novo = await api('/usuarios', { method: 'POST', body });
        setUsuarios((lista) => [...lista, novo]);
        form.reset();
      }
    } catch (err) {
      setErro(err.message);
    } finally {
      setEnviando(false);
    }
  }

  const proprio = editando?.id === logado.id;

  return (
    <>
      <h1>Usuários</h1>
      <ul className="lista">
        {usuarios.map((u) => (
          <li key={u.id}>
            <strong>{u.nome}</strong>
            <span>{u.login} · {PERFIS[u.perfil]}{!u.ativo && ' · Inativo'}</span>
            {ehSecretaria && (
              <div className="acoes">
                <button type="button" onClick={() => editar(u)}>Editar</button>
                {u.id !== logado.id && <button type="button" className="perigo" onClick={() => excluir(u)}>Excluir</button>}
              </div>
            )}
          </li>
        ))}
      </ul>

      <h2>{editando ? `Editar ${editando.nome}` : 'Cadastrar usuário'}</h2>
      {/* key: remonta o formulário ao trocar de usuário, recarregando os defaultValue */}
      <form key={editando?.id ?? 'novo'} className="cartao" onSubmit={salvar}>
        <label>Nome<input name="nome" maxLength={100} defaultValue={editando?.nome} required /></label>
        <label>Login<input name="login" maxLength={60} defaultValue={editando?.login} autoComplete="off" autoCapitalize="none" required /></label>
        <label>
          Senha
          <input
            name="senha"
            type="password"
            autoComplete="new-password"
            required={!editando}
            placeholder={editando ? 'Deixe em branco para manter' : undefined}
          />
        </label>
        <label>
          Perfil
          <select name="perfil" required defaultValue={editando?.perfil ?? ''} disabled={proprio}>
            <option value="" disabled>Selecione</option>
            <option value="eletricista">Eletricista</option>
            <option value="secretaria">Secretária</option>
          </select>
        </label>
        {editando && (
          <label className="checkbox">
            <input name="ativo" type="checkbox" defaultChecked={editando.ativo} disabled={proprio} />
            Ativo (pode acessar o sistema)
          </label>
        )}
        {erro && <p className="erro" role="alert">{erro}</p>}
        <button className="primario" disabled={enviando}>{enviando ? 'Salvando…' : 'Salvar'}</button>
        {editando && <button type="button" onClick={() => setEditando(null)}>Cancelar</button>}
      </form>
    </>
  );
}
