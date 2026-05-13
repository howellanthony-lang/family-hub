export default function BottomDock({ tabs, activeTab, setActiveTab }) {
  return (
    <nav className="bottom-dock">
      {tabs.map((tab) => (
        <button
          key={tab}
          className={activeTab === tab ? 'active' : ''}
          onClick={() => setActiveTab(tab)}
        >
          {tab}
        </button>
      ))}
    </nav>
  );
}
