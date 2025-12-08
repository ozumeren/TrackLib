import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { MantineProvider } from '@mantine/core';
import { Notifications } from '@mantine/notifications'; // 1. YENİ: Bildirimleri import et
import App from './App.jsx';
import { AuthProvider } from './AuthContext';
import axios from 'axios';

import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css'; // 2. YENİ: Bildirim stillerini import et

// Axios global baseURL ayarı
axios.defaults.baseURL = import.meta.env.VITE_API_URL || 'https://api.strastix.com';
console.log('🔌 API URL:', axios.defaults.baseURL);

// Axios interceptor - her istekte token ekle
axios.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

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

