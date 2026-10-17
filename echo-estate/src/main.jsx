import { StrictMode, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';

import { AuthProvider } from './services/auth.jsx';

const root = createRoot(document.getElementById('root'));

Promise.all([
  import('./App.jsx'),
  import('./components/ErrorBoundary.jsx')
])
  .then(([{ default: App }, { default: ErrorBoundary }]) => {
    root.render(
      createElement(
        StrictMode,
        null,
        createElement(
          ErrorBoundary,
          null,
          createElement(
            AuthProvider,
            null,
            createElement(App)
          )
        )
      )
    );
  })
  .catch((error) => {
    root.render(
      createElement(
        'main',
        {
          className:
            'page-shell grid min-h-screen place-items-center px-5'
        },
        createElement(
          'section',
          {
            className:
              'surface max-w-xl rounded-lg p-8 text-center'
          },
          createElement(
            'p',
            { className: 'eyebrow' },
            'Application startup error'
          ),
          createElement(
            'h1',
            {
              className:
                'mt-3 font-serif text-3xl text-white'
            },
            'Echo Estate could not start.'
          ),
          createElement(
            'p',
            {
              className: 'mt-4 text-sm leading-6',
              style: { color: '#777168' }
            },
            error.message ||
            'An unknown module error occurred.'
          ),
          createElement(
            'button',
            {
              className: 'gold-button mt-7',
              onClick: () => window.location.reload()
            },
            'Refresh page'
          )
        )
      )
    );
  });
