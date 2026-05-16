export default function BottomDock({ tabs, activeTab, setActiveTab }) {
  return (
    <nav className="bottom-dock">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          className={activeTab === tab.id ? 'active' : ''}
          onClick={() => setActiveTab(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </nav>
  );
}
