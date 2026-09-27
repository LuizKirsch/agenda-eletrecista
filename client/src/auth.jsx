import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { Navigate } from 'react-router';
import { api, definirAoReceber401 } from './api';

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [usuario, setUsuarioState] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [aviso, setAviso] = useState('');
  const usuarioRef = useRef(null);

  function setUsuario(u) {
    usuarioRef.current = u;
    setUsuarioState(u);
  }

  useEffect(() => {
    // 401 com alguém logado = sessão expirou; ao abrir o app sem sessão é só "não logado"
    definirAoReceber401(() => {
      if (usuarioRef.current) setAviso('Sua sessão expirou. Entre novamente.');
      setUsuario(null);
    });
    api('/auth/me')
      .then(setUsuario)
      .catch(() => {})
      .finally(() => setCarregando(false));
  }, []);

  async function login(login, senha) {
    const u = await api('/auth/login', { method: 'POST', body: { login, senha } });
    setAviso('');
    setUsuario(u);
  }

  async function logout() {
    usuarioRef.current = null; // saída voluntária não mostra "sessão expirou"
    await api('/auth/logout', { method: 'POST' }).catch(() => {});
    setUsuario(null);
  }

  return (
    <AuthContext.Provider value={{ usuario, carregando, aviso, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function RotaAutenticada({ children }) {
  const { usuario, carregando } = useAuth();
  if (carregando) return <p className="carregando">Carregando…</p>;
  return usuario ? children : <Navigate to="/login" replace />;
}
