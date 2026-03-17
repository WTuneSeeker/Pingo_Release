import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation, Navigate } from 'react-router-dom';

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
import ClassicSetup from './pages/ClassicSetup'; 
import NotFound from './pages/NotFound';
import Premium from './pages/Premium';

// Components
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import ScrollToTop from './components/ScrollToTop';

/**
 * Finch Redirect Component
 * Stuurt de klant door naar je centrale portaal op Vercel
 */
const NavigateToPortal = () => {
  useEffect(() => {
    // VERVANG DEZE URL door de echte URL van je centrale finch-frontend op Vercel
    const PORTAL_URL = "https://finch-frontend-bice.vercel.app/login";
    window.location.href = PORTAL_URL;
  }, []);

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center text-white p-6 text-center">
      <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mb-6"></div>
      <h2 className="text-2xl font-black tracking-tighter italic uppercase italic">Finch Portal Laden</h2>
      <p className="text-gray-400 font-bold mt-2 text-sm uppercase tracking-widest">Je wordt doorverwezen naar de beheeromgeving...</p>
    </div>
  );
};

const PageLayout = ({ children }) => {
  const location = useLocation();
  const isHomePage = location.pathname === '/';
  
  // We verbergen de standaard layout voor de finch-redirect pagina
  const isFinchManage = location.pathname === '/finchmanage';

  if (isFinchManage) return <>{children}</>;

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 flex flex-col">
      <Navbar />
      <main className={`flex-grow ${isHomePage ? 'container mx-auto px-4 py-0' : 'container mx-auto px-4 py-8'}`}>
        {children}
      </main>
      <Footer />
    </div>
  );
};

function App() {
  return (
    <Router>
      <ScrollToTop />
      
      <PageLayout>
        <Routes>
          {/* --- FINCH CMS ROUTE --- */}
          <Route path="/finchmanage" element={<NavigateToPortal />} />

          {/* --- STANDAARD ROUTES --- */}
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/dashboard" element={<Dashboard />} />
          
          <Route path="/create" element={<Configurator />} />
          <Route path="/edit/:id" element={<Configurator />} />
          
          {/* SETUP ROUTES */}
          <Route path="/setup/:cardId" element={<SetupGame />} />
          <Route path="/setup/:cardId/:sessionId" element={<SetupGame />} />

          {/* CLASSIC BINGO SETUP ROUTE */}
          <Route path="/classic-setup" element={<ClassicSetup />} />

          <Route path="/play/:id" element={<PlayBingo />} />
          <Route path="/play-session/:sessionId" element={<PlayBingo />} />
        
          <Route path="/community" element={<Community />} />
          <Route path="/join" element={<Join />} />
          <Route path="/premium" element={<Premium />} />

          {/* 404 PAGE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </PageLayout>
    </Router>
  );
}

window.addEventListener("message", (event) => {
  // Alleen luisteren naar berichten van jouw portaal-URL
  if (event.origin !== "https://finch-frontend-bice.vercel.app") return;

  const { type, field, value } = event.data;
  
  if (type === "UPDATE_CONTENT") {
    // Zoek het element op de pagina en update de tekst direct
    const el = document.querySelector(`[data-finch-id="${field}"]`);
    if (el) el.innerText = value;
  }
});

export default App;