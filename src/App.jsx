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
import SupportChatbot from './components/common/SupportChatbot'
import FreelancerDetail from './pages/FreelancerDetail'
import CreateTeam from './features/teams/pages/CreateTeam'
import TeamDashboard from './features/teams/pages/TeamDashboard'
import TeamList from './features/teams/pages/TeamList'
import TeamPublicProfile from './features/teams/pages/TeamPublicProfile'
import Wallet from './pages/Wallet'
import AdminFinanceDashboard from './pages/AdminFinanceDashboard'
import { ThemeProvider } from './context/ThemeContext'
import { TeamProvider } from './context/TeamContext'
import { ChatProvider } from './context/ChatContext'
import { seedDatabase } from './utils/seedData'
import { useEffect } from 'react'

function App() {
  useEffect(() => {
    // Check if we need to seed data (only once)
    const hasSeeded = localStorage.getItem('cooplance_seeded_v25'); // Increment version to force re-seed
    if (!hasSeeded) {
      seedDatabase();
      localStorage.setItem('cooplance_seeded_v25', 'true');
      window.location.reload();
    }
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
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/create-service" element={<CreateService />} />
              <Route path="/explore" element={<Explore />} />
              <Route path="/companies" element={<Companies />} />
              <Route path="/company/:id" element={<CompanyDetail />} />
              <Route path="/client/:id" element={<ClientDetail />} />
              <Route path="/freelancer/:id" element={<FreelancerDetail />} />
              <Route path="/help" element={<HelpCenter />} />
              <Route path="/community" element={<Community />} />
              <Route path="/login" element={<Login />} />
              <Route path="/badges" element={<Badges />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/service/:id" element={<ServiceDetail />} />
              <Route path="/explore-clients" element={<ExploreClients />} />
              <Route path="/project/:id" element={<ProjectDetail />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/create-project" element={<CreateProject />} />
              <Route path="/create-team" element={<CreateTeam />} />
              <Route path="/my-coops" element={<TeamList />} />
              <Route path="/team/:teamId" element={<TeamDashboard />} />
              <Route path="/team/:teamId/public" element={<TeamPublicProfile />} />
              <Route path="/profile/:id" element={<FreelancerDetail />} />
              <Route path="/chat" element={<Chat />} />
              <Route path="/chat/:chatId" element={<Chat />} />
              <Route path="/notifications" element={<NotificationsPage />} />
              <Route path="/wallet" element={<Wallet />} />
              <Route path="/events" element={<Events />} />
              <Route path="/admin-cooplance-secret" element={<AdminFinanceDashboard />} />
            </Routes>
          </main>
          <SupportChatbot />
        </div>
      </TeamProvider>
    </ThemeProvider>
  )
}

export default App
