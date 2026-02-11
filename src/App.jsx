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
import SetupGame from './pages/SetupGame';
import RankedArena from './pages/RankedArena';
import ClassicSetup from './pages/ClassicSetup'; // <--- NIEUWE IMPORT
import NotFound from './pages/NotFound';

// Components
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import ScrollToTop from './components/ScrollToTop';

const PageLayout = ({ children }) => {
  const location = useLocation();
  const isHomePage = location.pathname === '/';
  return (
    <main className={`flex-grow ${isHomePage ? 'container mx-auto px-4 py-0' : 'container mx-auto px-4 py-8'}`}>
      {children}
    </main>
  );
};

function App() {
  return (
    <Router>
      <ScrollToTop />
      
      <div className="min-h-screen bg-gray-50 text-gray-900 flex flex-col">
        <Navbar />
        <PageLayout>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/dashboard" element={<Dashboard />} />
            
            <Route path="/create" element={<Configurator />} />
            <Route path="/edit/:id" element={<Configurator />} />
            
            {/* SETUP ROUTES: */}
            <Route path="/setup/:cardId" element={<SetupGame />} />
            <Route path="/setup/:cardId/:sessionId" element={<SetupGame />} />

            {/* CLASSIC BINGO SETUP ROUTE: */}
            <Route path="/classic-setup" element={<ClassicSetup />} /> {/* <--- TOEGEVOEGD */}

            <Route path="/play/:id" element={<PlayBingo />} />
            <Route path="/play-session/:sessionId" element={<PlayBingo />} />
            
            {/* RANKED ARENA ROUTES: */}
            <Route path="/ranked-arena" element={<RankedArena />} />
            <Route path="/ranked-lobby" element={<RankedArena />} /> {/* Alias voor consistentie */}

            <Route path="/community" element={<Community />} />
            <Route path="/join" element={<Join />} />
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