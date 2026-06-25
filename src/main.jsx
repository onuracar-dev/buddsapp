import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';
import { BrowserRouter } from 'react-router-dom';
import './i18n'; // Çoklu dil desteği
import { AuthProvider } from './contexts/AuthContext.jsx';
import { ThemeProvider } from './contexts/ThemeContext.jsx';

// Başlangıçta temayı ve vurgu rengini ayarla
const savedTheme = localStorage.getItem('theme') || 'system';
const savedAccent = localStorage.getItem('accent') || 'blue';
document.documentElement.setAttribute('data-theme', savedTheme);
document.documentElement.setAttribute('data-accent', savedAccent);

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <App />
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
