import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Header from './components/Header';
import Home from './pages/Home';
import SignIn from './pages/SignIn';
import SignUp from './pages/SignUp';
import Dashboard from './pages/Dashboard';
import RegisterRP from './pages/RegisterRP';
import RPDetail from './pages/RPDetail';
import RPPublicDetail from './pages/RPPublicDetail';
import BecomeIntermediary from './pages/BecomeIntermediary';

function Footer() {
  return (
    <footer className="footer">
      <div className="footer-inner">
        <div className="footer-brand">
          <span className="footer-brand-title">
            Wallet RP Registrar
          </span>
          <p>
            Official registry for Wallet-Relying Parties under the EU Digital
            Identity Wallet framework.
          </p>
        </div>
        <div className="footer-links">
          <div className="footer-col">
            <h4>Registry</h4>
            <Link to="/">Browse Parties</Link>
            <Link to="/sign-in">Operator Sign In</Link>
          </div>
          <div className="footer-col">
            <h4>Resources</h4>
            <a href="https://ec.europa.eu/digital-building-blocks/sites/display/EUDIGITALIDENTITYWALLET" target="_blank" rel="noopener noreferrer">
              EUDI Wallet
            </a>
          </div>
        </div>
      </div>
      <div className="footer-bottom">
        <span>EUDI Wallet Registrar &mdash; Demo</span>
      </div>
    </footer>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <div className="app-layout">
          <Header />
          <main className="main">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/sign-in" element={<SignIn />} />
              <Route path="/sign-up" element={<SignUp />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/dashboard/register" element={<RegisterRP />} />
              <Route path="/dashboard/rp/:id" element={<RPDetail />} />
              <Route path="/dashboard/rp/:id/become-intermediary" element={<BecomeIntermediary />} />
              <Route path="/rp/:id" element={<RPPublicDetail />} />
            </Routes>
          </main>
          <Footer />
        </div>
      </AuthProvider>
    </BrowserRouter>
  );
}
