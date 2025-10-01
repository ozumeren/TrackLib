import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { MantineProvider } from '@mantine/core';
import { Notifications } from '@mantine/notifications'; // 1. YENİ: Bildirimleri import et
import App from './App.jsx';
import { AuthProvider } from './AuthContext';

import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css'; // 2. YENİ: Bildirim stillerini import et

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <MantineProvider withGlobalStyles withNormalizeCSS>
        <AuthProvider>
          {/* 3. YENİ: Bildirimlerin gösterileceği alanı ekle */}
          <Notifications /> 
          <App />
        </AuthProvider>
      </MantineProvider>
    </BrowserRouter>
  </React.StrictMode>,
);

