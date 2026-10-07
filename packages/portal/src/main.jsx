import React from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';
import { App } from './App.jsx';
import './styles.css';

const raiz = document.getElementById('root');
const aplicacion = (
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

if (raiz.hasChildNodes()) {
  hydrateRoot(raiz, aplicacion);
} else {
  createRoot(raiz).render(aplicacion);
}
