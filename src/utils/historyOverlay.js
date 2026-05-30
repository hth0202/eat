// Global stack for managing overlay back-navigation.
// Each overlay pushes a fake history entry on open and registers its close fn.
// Pressing back calls only the topmost close fn, not all listeners.

const stack = [];
let ignoreNextPop = false;

window.addEventListener('popstate', () => {
  if (ignoreNextPop) {
    ignoreNextPop = false;
    return;
  }
  const fn = stack.pop();
  if (fn) fn();
});

export function pushOverlay(fn) {
  history.pushState({ overlay: true }, '');
  stack.push(fn);
}

export function removeOverlay(fn, wasClosedByPop) {
  const idx = stack.lastIndexOf(fn);
  if (idx !== -1) stack.splice(idx, 1);
  // If closed by button, pop the fake history entry we pushed.
  // Guard with history.state check to avoid going back past the app's origin.
  if (!wasClosedByPop && history.state?.overlay) {
    ignoreNextPop = true;
    history.back();
  }
}
