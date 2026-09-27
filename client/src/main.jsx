import { createRoot } from 'react-dom/client';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router';
import { AuthProvider, RotaAutenticada } from './auth';
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
          {/* espaço reservado; o módulo Agenda substitui */}
          <Route path="/agenda" element={<h1>Agenda</h1>} />
          <Route path="/usuarios" element={<Usuarios />} />
        </Route>
      </Routes>
    </AuthProvider>
  </BrowserRouter>,
);
