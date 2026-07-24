import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { App } from './app/App';
import { AuthProvider } from './app/providers/AuthProvider';
import { ServicesProvider } from './app/providers/ServicesProvider';
import './app/styles.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: false },
    mutations: { retry: 0 },
  },
});

const root = document.getElementById('root');
if (!root) throw new Error('No se encontró el contenedor principal.');

createRoot(root).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ServicesProvider>
        <BrowserRouter>
          <AuthProvider>
            <App />
          </AuthProvider>
        </BrowserRouter>
      </ServicesProvider>
    </QueryClientProvider>
  </StrictMode>,
);
