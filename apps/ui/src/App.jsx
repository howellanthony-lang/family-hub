import { useEffect, useMemo, useState } from 'react';
import './styles.css';

import { mockData, tabs } from './data/mockData';
import { getEffectiveAmbientMode, getModeLabel } from './utils/ambientMode';
import {
  loadDisplayModePreference,
  loadOnboardingComplete,
  saveDisplayModePreference,
  saveOnboardingComplete,
} from './services/localSettings';

import BottomDock from './components/BottomDock';
import HomeScreen from './screens/Home';
import CalendarScreen from './screens/Calendar';
import AutomationScreen from './screens/AutomationScreen';
import FamilyScreen from './screens/Family';
import PhotosScreen from './screens/PhotosScreen';
import SettingsScreen from './screens/Settings';
import Onboarding from './screens/Onboarding';

export default function App() {
  const [activeTab, setActiveTab] = useState('Home');
  const [onboardingComplete, setOnboardingComplete] = useState(loadOnboardingComplete());
  const [displayModePreference, setDisplayModePreference] = useState(loadDisplayModePreference());

  useEffect(() => {
    saveOnboardingComplete(onboardingComplete);
  }, [onboardingComplete]);

  useEffect(() => {
    saveDisplayModePreference(displayModePreference);
  }, [displayModePreference]);

  const today = useMemo(() => new Date().toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }), []);

  const ambientMode = getEffectiveAmbientMode(displayModePreference);
  const modeLabel = getModeLabel(displayModePreference, ambientMode);
  const modeClass = `mode-${ambientMode.toLowerCase()}`;

  if (!onboardingComplete) {
    return (
      <main className={`app-shell ${modeClass}`}>
        <div className="ambient ambient-one" />
        <div className="ambient ambient-two" />
        <section className="app-frame">
          <Onboarding
            ambientMode={modeLabel}
            onComplete={() => setOnboardingComplete(true)}
          />
        </section>
      </main>
    );
  }

  return (
    <main className={`app-shell ${modeClass}`}>
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />

      <section className="app-frame">
        {activeTab === 'Home' && (
          <HomeScreen mockData={mockData} today={today} ambientMode={modeLabel} />
        )}
        {activeTab === 'Calendar' && <CalendarScreen mockData={mockData} />}
        {activeTab === 'Automation' && <AutomationScreen mockData={mockData} />}
        {activeTab === 'Family' && <FamilyScreen mockData={mockData} />}
        {activeTab === 'Photos' && <PhotosScreen />}
        {activeTab === 'Settings' && (
          <SettingsScreen
            displayModePreference={displayModePreference}
            setDisplayModePreference={setDisplayModePreference}
          />
        )}
      </section>

      <BottomDock tabs={tabs} activeTab={activeTab} setActiveTab={setActiveTab} />
    </main>
  );
}
