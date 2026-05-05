import './App.css';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navigation from './components/Navigation';
import Dashboard from './pages/Dashboard.jsx';
import Goals from './pages/Goals';
import Exercises from './pages/Exercises';
import About from './pages/About';

function App() {
  return (
    <div className="App">
      <Router>
        <Navigation />  
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/goals" element={<Goals />} />
          <Route path="/exercises" element={<Exercises />} />
          <Route path="/about" element={<About />} />
        </Routes>
      </Router>
    </div>
  );
}

export default App;