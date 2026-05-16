import { useEffect, useMemo, useState } from 'react';
import './styles.css';

import { tabs } from './data/mockData';
import { getEffectiveAmbientMode, getModeLabel } from './utils/ambientMode';
import { loadDisplayModePreference, saveDisplayModePreference } from './services/localSettings';

import BottomDock from './components/BottomDock';
import HomeScreen from './screens/Home';
import CalendarScreen from './screens/Calendar';
import SmartHomeScreen from './screens/SmartHome';
import PhotosScreen from './screens/Photos';
import MealsScreen from './screens/Meals';
import TasksScreen from './screens/Tasks';
import SettingsScreen from './screens/Settings';

export default function App() {
  const [activeTab, setActiveTab] = useState('Home');
  const [displayModePreference, setDisplayModePreference] = useState(loadDisplayModePreference());

  useEffect(() => { saveDisplayModePreference(displayModePreference); }, [displayModePreference]);

  const today = useMemo(() => new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' }), []);
  const ambientMode = getEffectiveAmbientMode(displayModePreference);
  const modeLabel = getModeLabel(displayModePreference, ambientMode);
  const modeClass = `mode-${ambientMode.toLowerCase()}`;

  return (
    <main className={`app-shell ${modeClass}`}>
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />
      <section className="app-frame">
        {activeTab === 'Home'      && <HomeScreen today={today} ambientMode={modeLabel} />}
        {activeTab === 'Calendar'  && <CalendarScreen />}
        {activeTab === 'SmartHome' && <SmartHomeScreen />}
        {activeTab === 'Photos'    && <PhotosScreen />}
        {activeTab === 'Meals'     && <MealsScreen />}
        {activeTab === 'Tasks'     && <TasksScreen />}
        {activeTab === 'Settings'  && <SettingsScreen displayModePreference={displayModePreference} setDisplayModePreference={setDisplayModePreference} />}
      </section>
      <BottomDock tabs={tabs} activeTab={activeTab} setActiveTab={setActiveTab} />
    </main>
  );
}
