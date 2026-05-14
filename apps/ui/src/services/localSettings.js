const STORAGE_KEYS = {
  onboardingComplete: 'familyHub.onboardingComplete',
  displayModePreference: 'familyHub.displayModePreference',
};

export function loadOnboardingComplete() {
  return localStorage.getItem(STORAGE_KEYS.onboardingComplete) === 'true';
}

export function saveOnboardingComplete(value) {
  localStorage.setItem(STORAGE_KEYS.onboardingComplete, String(Boolean(value)));
}

export function loadDisplayModePreference() {
  const value = localStorage.getItem(STORAGE_KEYS.displayModePreference);
  return ['auto', 'day', 'night'].includes(value) ? value : 'auto';
}

export function saveDisplayModePreference(value) {
  const safeValue = ['auto', 'day', 'night'].includes(value) ? value : 'auto';
  localStorage.setItem(STORAGE_KEYS.displayModePreference, safeValue);
}

export function resetLocalSettings() {
  Object.values(STORAGE_KEYS).forEach((key) => localStorage.removeItem(key));
}
