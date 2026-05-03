import React from 'react';
// import './Goals.css'; // Uncomment this once you add styles to your Goals.css file

function Goals() {
  return (
    <div className="goals-container">
      <h1>My Fitness Goals</h1>
      
      <div className="goals-list">
        <ul>
          <li>Drink 8 glasses of water</li>
          <li>Complete a 30-minute workout</li>
          <li>Sleep 8 hours</li>
        </ul>
      </div>
    </div>
  );
}

// This line fixes the "does not provide an export named 'default'" error
export default Goals;
