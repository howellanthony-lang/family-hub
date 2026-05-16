export const tabs = [
  { id: 'Home',      label: 'Home' },
  { id: 'Calendar',  label: 'Calendar' },
  { id: 'SmartHome', label: 'Smart Home' },
  { id: 'Photos',    label: 'Photos' },
  { id: 'Meals',     label: 'Meals' },
  { id: 'Tasks',     label: 'Tasks' },
  { id: 'Settings',  label: 'Settings' },
];

export const API_BASE = typeof window !== 'undefined'
  ? `${window.location.protocol}//${window.location.hostname}:3001`
  : 'http://localhost:3001';
