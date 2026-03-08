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
