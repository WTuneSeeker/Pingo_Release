import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Configurator from './pages/Configurator';
import PlayBingo from './pages/PlayBingo';
import Community from './pages/Community';
import Navbar from './components/Navbar';
import Join from './pages/Join';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-50 text-gray-900">
        <Navbar />
        <main className="container mx-auto px-4 py-8">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/create" element={<Configurator />} />
            
            {/* Standaard route om een kaart te spelen (alleen) */}
            <Route path="/play/:id" element={<PlayBingo />} />
            
            {/* NIEUW: Route voor groepsessies (multiplayer) */}
            {/* We gebruiken dezelfde PlayBingo component, maar met een sessionId */}
            <Route path="/play-session/:sessionId" element={<PlayBingo />} />
            
            <Route path="/community" element={<Community />} />
            <Route path="/join" element={<Join />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;