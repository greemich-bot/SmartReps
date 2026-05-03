import './App.css';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import Navigation from './components/Navigation';
import Dashboard from './pages/Dashboard.jsx';
import Goals from './pages/Goals';
import Exercises from './pages/Exercises';

function App() {
  return (
    <div className="App">
      <Router>
        <Navigation />  
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/goals" element={<Goals />} />
          <Route path="/exercises" element={<Exercises />} />
        </Routes>
      </Router>
    </div>
  );
}

export default App;