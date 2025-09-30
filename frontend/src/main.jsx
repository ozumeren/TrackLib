import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { MantineProvider } from '@mantine/core';
import App from './App.jsx';
import { AuthProvider } from './AuthContext';
import '@mantine/core/styles.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  // StrictMode etiketlerini bu test için geçici olarak kaldırıyoruz.
  // <React.StrictMode> 
    <BrowserRouter>
      <MantineProvider withGlobalStyles withNormalizeCSS>
        <AuthProvider>
          <App />
        </AuthProvider>
      </MantineProvider>
    </BrowserRouter>
);

