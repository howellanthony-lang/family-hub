import React, { useState } from 'react'
import ReactDOM from 'react-dom/client'
import OnboardingPage from './OnboardingPage.jsx'
import App from './App.jsx'

function Root() {
  const [done, setDone] = useState(() => localStorage.getItem('onboardingComplete') === '1')
  return done ? <App /> : <OnboardingPage onComplete={() => setDone(true)} />
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode><Root /></React.StrictMode>
)
