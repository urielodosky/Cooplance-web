import { Routes, Route } from 'react-router-dom'
import Navbar from './components/layout/Navbar'
import Home from './pages/Home'
import RoleInfo from './pages/RoleInfo'
import Register from './features/auth/pages/Register'
import Dashboard from './pages/Dashboard'
import Explore from './pages/Explore'
import Companies from './pages/Companies'
import Community from './pages/Community'
import CreateService from './features/services/pages/CreateService'
import Login from './features/auth/pages/Login'
import VerifyEmail from './features/auth/pages/VerifyEmail'
import Badges from './pages/Badges'
import Settings from './pages/Settings'
import ServiceDetail from './features/services/pages/ServiceDetail'
import ExploreClients from './pages/ExploreClients'
import ForgotPassword from './features/auth/pages/ForgotPassword'
import ResetPassword from './features/auth/pages/ResetPassword'
import CreateProject from './pages/CreateProject'
import Chat from './pages/Chat'
import NotificationsPage from './pages/NotificationsPage'
import Events from './pages/Events'
import ProjectDetail from './pages/ProjectDetail'
import CompanyDetail from './pages/CompanyDetail'
import ClientDetail from './pages/ClientDetail'
import HelpCenter from './pages/HelpCenter'
import ExploreTeams from './pages/ExploreTeams'
import SupportChatbot from './components/common/SupportChatbot'
import FreelancerDetail from './pages/FreelancerDetail'
import CreateTeam from './features/teams/pages/CreateTeam'
import TeamDashboard from './features/teams/pages/TeamDashboard'
import TeamList from './features/teams/pages/TeamList'
import TeamPublicProfile from './features/teams/pages/TeamPublicProfile'
import Wallet from './pages/Wallet'
import AdminFinanceDashboard from './pages/AdminFinanceDashboard'
import ProtectedRoute from './components/common/ProtectedRoute'
import { ThemeProvider } from './context/ThemeContext'
import { TeamProvider } from './context/TeamContext'
import { ChatProvider } from './context/ChatContext'
import React, { useEffect } from 'react'
import { isConfigured } from './lib/supabase'
import ConfigRequired from './components/common/ConfigRequired'

function App() {
  // ─── Early Exit if Config Missing ──────────────────────────────────────────
  if (!isConfigured) {
    return <ConfigRequired />;
  }

  useEffect(() => {
    // Automatic seeding is now disabled to allow for a clean start as requested.
    // If you need to re-seed demo data, you can do so from the Settings or Login page.
    console.log("Cooplance initialized. Automatic seeding skipped.");
  }, []);

  return (
    <ThemeProvider>
      <TeamProvider>
        <div>
          <Navbar />
          <main>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/info/:roleId" element={<RoleInfo />} />
              <Route path="/register" element={<Register />} />
              <Route path="/verify-email" element={<VerifyEmail />} />
              <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/create-service" element={<ProtectedRoute><CreateService /></ProtectedRoute>} />
              <Route path="/explore" element={<Explore />} />
              <Route path="/companies" element={<Companies />} />
              <Route path="/company/:id" element={<CompanyDetail />} />
              <Route path="/client/:id" element={<ClientDetail />} />
              <Route path="/freelancer/:id" element={<FreelancerDetail />} />
              <Route path="/help" element={<HelpCenter />} />
              <Route path="/community" element={<Community />} />
              <Route path="/login" element={<Login />} />
              <Route path="/badges" element={<ProtectedRoute><Badges /></ProtectedRoute>} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/service/:id" element={<ServiceDetail />} />
              <Route path="/explore-clients" element={<ExploreClients />} />
              <Route path="/project/:id" element={<ProjectDetail />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/create-project" element={<ProtectedRoute><CreateProject /></ProtectedRoute>} />
              <Route path="/create-team" element={<ProtectedRoute><CreateTeam /></ProtectedRoute>} />
              <Route path="/explore-teams" element={<ExploreTeams />} />
              <Route path="/my-coops" element={<ProtectedRoute><TeamList /></ProtectedRoute>} />
              <Route path="/team/:teamId" element={<ProtectedRoute><TeamDashboard /></ProtectedRoute>} />
              <Route path="/team/:teamId/public" element={<TeamPublicProfile />} />
              <Route path="/profile/:id" element={<FreelancerDetail />} />
              <Route path="/chat" element={<ProtectedRoute><Chat /></ProtectedRoute>} />
              <Route path="/chat/:chatId" element={<ProtectedRoute><Chat /></ProtectedRoute>} />
              <Route path="/notifications" element={<ProtectedRoute><NotificationsPage /></ProtectedRoute>} />
              <Route path="/wallet" element={<ProtectedRoute><Wallet /></ProtectedRoute>} />
              <Route path="/events" element={<Events />} />
              <Route path="/admin-cooplance-secret" element={<ProtectedRoute><AdminFinanceDashboard /></ProtectedRoute>} />
            </Routes>
          </main>
          <SupportChatbot />
        </div>
      </TeamProvider>
    </ThemeProvider>
  )
}

export default App
