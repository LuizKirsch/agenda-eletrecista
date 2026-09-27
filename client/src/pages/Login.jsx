import { useState } from 'react';
import { Navigate } from 'react-router';
import { useAuth } from '../auth';

export default function Login() {
  const { usuario, carregando, aviso, login } = useAuth();
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);

  if (carregando) return <p className="carregando">Carregando…</p>;
  if (usuario) return <Navigate to="/agenda" replace />;

  async function enviar(e) {
    e.preventDefault();
    const dados = new FormData(e.currentTarget);
    setErro('');
    setEnviando(true);
    try {
      await login(dados.get('login'), dados.get('senha'));
    } catch (err) {
      setErro(err.message);
      setEnviando(false);
    }
  }

  return (
    <main className="login">
      <form className="cartao" onSubmit={enviar}>
        <h1>Agenda do Eletricista</h1>
        <label>
          Login
          <input name="login" autoComplete="username" autoCapitalize="none" required />
        </label>
        <label>
          Senha
          <input name="senha" type="password" autoComplete="current-password" required />
        </label>
        {(erro || aviso) && <p className="erro" role="alert">{erro || aviso}</p>}
        <button className="primario" disabled={enviando}>{enviando ? 'Entrando…' : 'Entrar'}</button>
      </form>
    </main>
  );
}
