import { BrowserRouter, Routes, Route, Link } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import Header from './components/Header'
import { Toaster } from '@/components/ui/sonner'
import Home from './pages/Home'
import SignIn from './pages/SignIn'
import SignUp from './pages/SignUp'
import Onboarding from './pages/Onboarding'
import Dashboard from './pages/Dashboard'
import RegisterRP from './pages/RegisterRP'
import RPDetail from './pages/RPDetail'
import RPPublicDetail from './pages/RPPublicDetail'
import RegisterIntermediary from './pages/intermediary/RegisterIntermediary'
import IntermediaryDashboard from './pages/intermediary/IntermediaryDashboard'
import RegisterMediatedRP from './pages/intermediary/RegisterMediatedRP'
import MediatedRPDetail from './pages/intermediary/MediatedRPDetail'

function Footer() {
  return (
    <footer className="border-t border-border bg-muted/30">
      <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-10 sm:px-6 md:grid-cols-2 lg:px-8">
        <div className="max-w-sm space-y-2">
          <span className="font-semibold tracking-tight">Wallet RP Registrar</span>
          <p className="text-sm text-muted-foreground">
            Official registry for Wallet-Relying Parties under the EU Digital Identity Wallet
            framework.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-8 text-sm">
          <div className="flex flex-col gap-2">
            <h4 className="font-medium">Registry</h4>
            <Link to="/" className="text-muted-foreground transition-colors hover:text-foreground">
              Browse Parties
            </Link>
            <Link
              to="/sign-in"
              className="text-muted-foreground transition-colors hover:text-foreground"
            >
              Operator Sign In
            </Link>
          </div>
          <div className="flex flex-col gap-2">
            <h4 className="font-medium">Resources</h4>
            <a
              href="https://ec.europa.eu/digital-building-blocks/sites/display/EUDIGITALIDENTITYWALLET"
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground transition-colors hover:text-foreground"
            >
              EUDI Wallet
            </a>
          </div>
        </div>
      </div>
      <div className="border-t border-border">
        <div className="mx-auto w-full max-w-6xl px-4 py-4 text-xs text-muted-foreground sm:px-6 lg:px-8">
          EUDI Wallet Registrar &mdash; Demo
        </div>
      </div>
    </footer>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <div className="flex min-h-screen flex-col bg-background">
          <Header />
          <main className="flex-1">
            <Routes>
              {/* Public */}
              <Route path="/" element={<Home />} />
              <Route path="/rp/:id" element={<RPPublicDetail />} />
              <Route path="/sign-in" element={<SignIn />} />
              <Route path="/sign-up" element={<SignUp />} />

              {/* Onboarding */}
              <Route path="/onboarding" element={<Onboarding />} />

              {/* WRP Portal */}
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/dashboard/register" element={<RegisterRP />} />
              <Route path="/dashboard/rp/:id" element={<RPDetail />} />

              {/* Intermediary Portal */}
              <Route path="/dashboard/register-intermediary" element={<RegisterIntermediary />} />
              <Route path="/dashboard/intermediary/:id" element={<IntermediaryDashboard />} />
              <Route
                path="/dashboard/intermediary/:id/register-rp"
                element={<RegisterMediatedRP />}
              />
              <Route path="/dashboard/intermediary/:id/rp/:rpId" element={<MediatedRPDetail />} />
            </Routes>
          </main>
          <Footer />
        </div>
        <Toaster richColors position="top-center" />
      </AuthProvider>
    </BrowserRouter>
  )
}
