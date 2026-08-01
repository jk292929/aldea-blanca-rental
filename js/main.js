// Aldea Blanca — small progressive-enhancement touches.
// No dependencies; everything works with this script absent.

// Fill the walk-time ruler once it scrolls into view, echoing the
// "0 → 5 → 15 minutes on foot" thesis with a single deliberate motion.
const ruler = document.querySelector('[data-ruler-fill]');
if (ruler && 'IntersectionObserver' in window) {
  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        ruler.style.width = '98%';
        observer.disconnect();
      }
    }
  }, { threshold: 0.5 });
  observer.observe(ruler);
} else if (ruler) {
  ruler.style.width = '98%';
}
