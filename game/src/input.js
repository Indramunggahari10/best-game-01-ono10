// Keyboard + mouse, read once per frame. Arrows/WASD steer, Space (or Shift) dashes,
// P or Escape pauses, Enter/Space/click confirms on the title and game-over screens.
// The mouse steers too: hold the button and the ship eases toward the pointer.
export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_DASH = 4;

const STEER_KEYS = {
  ArrowLeft: [-1, 0], KeyA: [-1, 0],
  ArrowRight: [1, 0], KeyD: [1, 0],
  ArrowUp: [0, -1], KeyW: [0, -1],
  ArrowDown: [0, 1], KeyS: [0, 1],
};

export function createInput(canvas) {
  const held = new Set();
  const pressed = new Set();
  let mouse = null;
  let mouseDown = false;

  function onKeyDown(event) {
    if (STEER_KEYS[event.code] || event.code === 'Space') event.preventDefault();
    if (!event.repeat) pressed.add(event.code);
    held.add(event.code);
  }
  function onKeyUp(event) {
    held.delete(event.code);
  }
  function onMouseMove(event) {
    const rect = canvas.getBoundingClientRect();
    mouse = {
      x: ((event.clientX - rect.left) / rect.width) * canvas.width,
      y: ((event.clientY - rect.top) / rect.height) * canvas.height,
    };
  }
  function onMouseDown(event) {
    onMouseMove(event);
    mouseDown = true;
    pressed.add('Mouse');
  }
  function onMouseUp() {
    mouseDown = false;
  }

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  canvas.addEventListener('mousemove', onMouseMove);
  canvas.addEventListener('mousedown', onMouseDown);
  window.addEventListener('mouseup', onMouseUp);

  return {
    // A unit-ish steering vector for this frame: keys first, else the mouse pointer.
    steer(shipX, shipY) {
      let x = 0;
      let y = 0;
      for (const code of held) {
        const dir = STEER_KEYS[code];
        if (dir) {
          x += dir[0];
          y += dir[1];
        }
      }
      if (x !== 0 || y !== 0) {
        const len = Math.hypot(x, y);
        return { x: x / len, y: y / len, mouse: false };
      }
      if (mouse && mouseDown) {
        const dx = mouse.x - shipX;
        const dy = mouse.y - shipY;
        const dist = Math.hypot(dx, dy);
        if (dist > 12) return { x: dx / dist, y: dy / dist, mouse: true };
      }
      return { x: 0, y: 0, mouse: false };
    },

    // One-shot actions pressed since the last call; the set is cleared by reading.
    takeActions() {
      let actions = 0;
      if (pressed.has('Space') || pressed.has('Enter') || pressed.has('Mouse')) actions |= ACTION_CONFIRM;
      if (pressed.has('KeyP') || pressed.has('Escape')) actions |= ACTION_PAUSE;
      if (pressed.has('ShiftLeft') || pressed.has('ShiftRight')) actions |= ACTION_DASH;
      pressed.clear();
      return actions;
    },

    dashHeld() {
      return held.has('Space') || held.has('ShiftLeft') || held.has('ShiftRight');
    },
  };
}
