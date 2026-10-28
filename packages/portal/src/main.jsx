import React from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';
import { App } from './App.jsx';
import './styles.css';

const raiz = document.getElementById('root');
const contenidoInicial = document.getElementById('contenido-publicado');
const contenido = contenidoInicial ? JSON.parse(contenidoInicial.textContent) : undefined;
const aplicacion = (
  <React.StrictMode>
    <App contenido={contenido} />
  </React.StrictMode>
);

if (raiz.hasChildNodes()) {
  hydrateRoot(raiz, aplicacion);
} else {
  createRoot(raiz).render(aplicacion);
}
