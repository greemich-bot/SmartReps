import { Link } from 'react-router-dom';
import './Navigation.css'; // Assuming you have some styles for the navigation
import React from 'react';
function Navigation() {
    return (
        <nav className="app-nav">
            <Link to="/">Dashboard</Link>
            <Link to="/goals">Goals</Link>
            <Link to="/exercises">Exercises</Link>
        </nav>
    );
}

export default Navigation;