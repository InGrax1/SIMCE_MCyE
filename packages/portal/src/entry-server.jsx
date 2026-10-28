import { renderToString } from 'react-dom/server';
import { App } from './App.jsx';

export function render(contenido) {
  return renderToString(<App contenido={contenido} />);
}
