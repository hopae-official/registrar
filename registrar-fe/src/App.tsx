import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Header from './components/Header';
import Home from './pages/Home';
import SignIn from './pages/SignIn';
import SignUp from './pages/SignUp';
import Dashboard from './pages/Dashboard';
import RPDetail from './pages/RPDetail';
import RPPublicDetail from './pages/RPPublicDetail';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Header />
        <main className="main">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/sign-in" element={<SignIn />} />
            <Route path="/sign-up" element={<SignUp />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/dashboard/rp/:id" element={<RPDetail />} />
            <Route path="/rp/:id" element={<RPPublicDetail />} />
          </Routes>
        </main>
      </AuthProvider>
    </BrowserRouter>
  );
}
