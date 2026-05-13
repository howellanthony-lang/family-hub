import React from 'react';
import { createRoot } from 'react-dom/client';
import './style.css';

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

function App() {
  const now = new Date();
  const today = now.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <main className="app">
      <section className="hero">
        <div>
          <p className="eyebrow">Family Hub</p>
          <h1>{getGreeting()}</h1>
          <p className="date">{today}</p>
        </div>
        <div className="time">{now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</div>
      </section>

      <section className="grid">
        <Card title="Today" items={["Morning summary", "Calendar view", "Priority to-do list"]} />
        <Card title="Calendar" items={["Month / week / day views", "Google sync", "Apple / iCloud sync"]} />
        <Card title="Chores" items={["Assigned tasks", "Points", "Leaderboard"]} />
        <Card title="Meals" items={["Meal ideas", "Weekly planner", "Grocery links"]} />
        <Card title="Grocery" items={["Quick add", "Checklist", "Shared list"]} />
        <Card title="Photos" items={["Shared folder", "Slideshow", "Idle photo frame mode"]} />
        <Card title="Weather" items={["Forecast", "Daily summary", "Outdoor planning"]} />
        <Card title="Setup" items={["One QR setup", "Family members", "Remote access"]} />
      </section>
    </main>
  );
}

function Card({ title, items }) {
  return (
    <article className="card">
      <h2>{title}</h2>
      <ul>
        {items.map((item) => <li key={item}>{item}</li>)}
      </ul>
    </article>
  );
}

createRoot(document.getElementById('root')).render(<App />);
