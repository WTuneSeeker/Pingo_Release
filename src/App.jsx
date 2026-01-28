import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { Analytics } from '@vercel/analytics/react';

// Pages
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Configurator from './pages/Configurator';
import PlayBingo from './pages/PlayBingo';
import Community from './pages/Community';
import Join from './pages/Join';
import NotFound from './pages/NotFound'; // <--- NIEUW: Importeer de 404 pagina

// Components
import Navbar from './components/Navbar';
import Footer from './components/Footer';

// 1. Slimme Layout Wrapper
const PageLayout = ({ children }) => {
  const location = useLocation();
  
  // Check of we op de homepagina zijn
  const isHomePage = location.pathname === '/';

  return (
    <main 
      className={`flex-grow ${
        isHomePage 
          ? 'container mx-auto px-4 py-0'  // Home: Wel marges zijkant, GEEN padding boven/onder
          : 'container mx-auto px-4 py-8'  // Andere pagina's: Marges + Padding boven/onder
      }`}
    >
      {children}
    </main>
  );
};

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-50 text-gray-900 flex flex-col">
        <Navbar />
        
        {/* 2. De Wrapper om de Routes heen */}
        <PageLayout>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/dashboard" element={<Dashboard />} />
            
            {/* Create & Edit */}
            <Route path="/create" element={<Configurator />} />
            <Route path="/edit/:id" element={<Configurator />} />
            
            {/* Play Routes */}
            <Route path="/play/:id" element={<PlayBingo />} />
            <Route path="/play-session/:sessionId" element={<PlayBingo />} />
            
            <Route path="/community" element={<Community />} />
            <Route path="/join" element={<Join />} />

            {/* 404 CATCH-ALL ROUTE (Moet altijd als laatste staan) */}
            <Route path="*" element={<NotFound />} />
            
          </Routes>
        </PageLayout>

        <Footer />
        <Analytics />
      </div>
    </Router>
  );
}

export default App;