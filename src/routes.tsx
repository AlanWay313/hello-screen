import { createBrowserRouter, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";

import App from "./App";
import DashboardPage from "./pages/Dashboard";
import Login from "./pages/Login";
import { Clientes } from "./pages/Clientes";
import { ClientePerfil } from "./pages/ClientePerfil";
import { Logs } from "./pages/Logs";
import Financeiro from "./pages/Financeiro";
import { Configuracoes } from "./pages/Configuracoes";
import { Usuarios } from "./pages/Usuarios";
import Conta from "./pages/Conta";
import { Changelog } from "./pages/Changelog";


const isLogged = (): boolean => {
  return !!localStorage.getItem("access_token");
};

const getIsAdmin = (): boolean => {
  const userData = localStorage.getItem("auth_user");
  if (!userData) return false;
  const user = JSON.parse(userData);
  return user?.admin || false;
};

const PrivateRoute = ({ element }: { element: JSX.Element }) => {
  const [auth, setAuth] = useState<boolean | null>(null);

  useEffect(() => {
    setAuth(isLogged());
  }, []);

  if (auth === null) return <div>Carregando...</div>;

  return auth ? element : <Navigate to="/login" />;
};

const AdminRoute = ({ element }: { element: JSX.Element }) => {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    setIsAdmin(getIsAdmin());
  }, []);

  if (isAdmin === null) return <div>Carregando...</div>;

  if (!isLogged()) return <Navigate to="/login" />;

  return isAdmin ? element : <Navigate to="/" />;
};

const RootRoute = ({ children }: { children: JSX.Element }) => {
  const [logged, setLogged] = useState<boolean | null>(null);

  useEffect(() => {
    setLogged(isLogged());
  }, []);

  if (logged === null) return <div>Carregando...</div>;

  return logged ? children : <Navigate to="/login" />;
};

export const routes = createBrowserRouter([
  {
    path: "/",
    element: (
      <RootRoute>
        <App />
      </RootRoute>
    ),
    children: [
      { path: "/", element: <PrivateRoute element={<DashboardPage />} /> },
      { path: "clientes", element: <PrivateRoute element={<Clientes />} /> },
      { path: "clientes/:documento", element: <PrivateRoute element={<ClientePerfil />} /> },
      { path: "logs", element: <PrivateRoute element={<Logs />} /> },
      { path: "financeiro", element: <AdminRoute element={<Financeiro />} /> },
      { path: "configuracoes", element: <PrivateRoute element={<Configuracoes />} /> },
      { path: "usuarios", element: <PrivateRoute element={<Usuarios />} /> },
      { path: "conta", element: <Conta />},
      { path: "changelog", element: <PrivateRoute element={<Changelog />} /> },
    ],
  },
  {
    path: "/login",
    element: isLogged() ? <Navigate to="/" /> : <Login />,
  },

],


);
