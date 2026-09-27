import { createRoot } from 'react-dom/client';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router';
import { AuthProvider, RotaAutenticada } from './auth';
import Agenda from './pages/Agenda';
import Cliente from './pages/Cliente';
import ClienteNovo from './pages/ClienteNovo';
import Clientes from './pages/Clientes';
import Endereco from './pages/Endereco';
import Layout from './pages/Layout';
import Login from './pages/Login';
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
          <Route path="/clientes" element={<Clientes />} />
          <Route path="/clientes/novo" element={<ClienteNovo />} />
          <Route path="/clientes/:id" element={<Cliente />} />
          <Route path="/enderecos/:id" element={<Endereco />} />
        </Route>
      </Routes>
    </AuthProvider>
  </BrowserRouter>,
);
