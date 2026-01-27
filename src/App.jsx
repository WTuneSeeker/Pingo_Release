import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Configurator from './pages/Configurator'; // Wordt gebruikt voor Create én Edit
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
            
            {/* Create Route */}
            <Route path="/create" element={<Configurator />} />
            
            {/* 👇 DEZE MISTE NOG: Edit Route (gebruikt ook Configurator) */}
            <Route path="/edit/:id" element={<Configurator />} />
            
            {/* Standaard route om een kaart te spelen (alleen) */}
            <Route path="/play/:id" element={<PlayBingo />} />
            
            {/* Route voor groepsessies (multiplayer) */}
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