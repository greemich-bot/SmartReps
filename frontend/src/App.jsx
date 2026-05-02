import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Goals from './pages/Goals';
import Exercises from './pages/Exercises';

function App() {
  return (
    <Router>
      <div style={{ minHeight: '100vh', backgroundColor: '#121212', color: 'white' }}>
        {/* Navigation Bar */}
        <nav style={{ padding: '1rem', background: '#1a1a1a', display: 'flex', gap: '20px', borderBottom: '1px solid #333' }}>
          <Link to="/" style={{ color: '#646cff', textDecoration: 'none', fontWeight: 'bold' }}>🏠 Dashboard</Link>
          <Link to="/goals" style={{ color: '#646cff', textDecoration: 'none', fontWeight: 'bold' }}>🎯 Goals</Link>
          <Link to="/exercises" style={{ color: '#646cff', textDecoration: 'none', fontWeight: 'bold' }}>💪 Exercises</Link>
        </nav>

        {/* Page Content */}
        <div style={{ padding: '2rem' }}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/goals" element={<Goals />} />
            <Route path="/exercises" element={<Exercises />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App;

