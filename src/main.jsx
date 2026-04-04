import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import { AuthProvider } from './features/auth/context/AuthContext'
import { ServiceProvider } from './features/services/context/ServiceContext'
import { JobProvider } from './context/JobContext'
import { ChatProvider } from './context/ChatContext'
import { BadgeNotificationProvider } from './context/BadgeNotificationContext'
import { NotificationProvider } from './context/NotificationContext'
import ErrorBoundary from './components/common/ErrorBoundary'
import './styles/main.scss'

// Global Error Catcher
window.addEventListener('error', (event) => {
  console.error("🔥 FATAL CRASH:", event.error);
  const root = document.getElementById('root');
  if (root) {
      root.innerHTML = `<div style="color: #ff8080; padding: 30px; font-family: monospace; background: #111; z-index: 999999; position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; overflow: auto;">
          <h2>CRASH DETECTED</h2>
          <strong>Error:</strong> ${event.error?.message || event.message}<br/><br/>
          <strong>Stack:</strong><br/><pre style="white-space: pre-wrap;">${event.error?.stack || 'No stack trace'}</pre>
      </div>`;
  }
});

window.addEventListener('unhandledrejection', (event) => {
  const root = document.getElementById('root');
  if (root) {
      root.innerHTML = `<div style="color: #ff8080; padding: 30px; font-family: monospace; background: #111; z-index: 999999; position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; overflow: auto;">
          <h2>UNHANDLED PROMISE REJECTION</h2>
          <strong>Reason:</strong> ${event.reason?.message || event.reason}<br/><br/>
          <strong>Stack:</strong><br/><pre style="white-space: pre-wrap;">${event.reason?.stack || 'No stack trace'}</pre>
      </div>`;
  }
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <ServiceProvider>
            <JobProvider>
              <ChatProvider>
                <BadgeNotificationProvider>
                  <NotificationProvider>
                    <App />
                  </NotificationProvider>
                </BadgeNotificationProvider>
              </ChatProvider>
            </JobProvider>
          </ServiceProvider>
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>
)
