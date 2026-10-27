import { createRoot } from 'react-dom/client';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router';
import { AuthProvider, RotaAutenticada } from './auth';
import Agenda from './pages/Agenda';
import Cliente from './pages/Cliente';
import Clientes from './pages/Clientes';
import Endereco from './pages/Endereco';
import Layout from './pages/Layout';
import Login from './pages/Login';
import TiposAtividade from './pages/TiposAtividade';
import Usuarios from './pages/Usuarios';
import './estilo.css';

createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route element={<RotaAutenticada><Layout /></RotaAutenticada>}>
          <Route path="/" element={<Navigate to="/agenda" replace />} />
          <Route path="/agenda" element={<Agenda />} />
          <Route path="/usuarios" element={<Usuarios />} />
          <Route path="/tipos-atividade" element={<TiposAtividade />} />
          <Route path="/clientes" element={<Clientes />} />
          <Route path="/clientes/:id" element={<Cliente />} />
          <Route path="/enderecos/:id" element={<Endereco />} />
        </Route>
      </Routes>
    </AuthProvider>
  </BrowserRouter>,
);
