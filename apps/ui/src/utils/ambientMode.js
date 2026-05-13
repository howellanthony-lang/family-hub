export function getGreeting() {
  const hour = new Date().getHours();

  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

export function getAmbientMode() {
  const hour = new Date().getHours();

  if (hour >= 6 && hour < 9) return 'Morning';
  if (hour >= 9 && hour < 17) return 'Day';
  if (hour >= 17 && hour < 22) return 'Evening';

  return 'Night';
}
