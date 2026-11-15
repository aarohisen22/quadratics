// Reads game controllers (and keyboard + mouse for player 1).
//
// Standard controller layout (Xbox names):
//   left stick = move, right stick = aim, A = jump, LB = run
const DEADZONE = 0.2;

function stick(x, y) {
  const mag = Math.hypot(x, y);
  if (mag < DEADZONE) return { x: 0, y: 0, mag: 0 };
  const scaled = Math.min(1, (mag - DEADZONE) / (1 - DEADZONE));
  return { x: (x / mag) * scaled, y: (y / mag) * scaled, mag: scaled };
}

export class Input {
  constructor(dom) {
    this.keys = new Set();
    this.mouse = { x: 0, y: 0, active: false };
    this.prevJump = [false, false];
    addEventListener('keydown', e => { this.keys.add(e.code); });
    addEventListener('keyup', e => { this.keys.delete(e.code); });
    addEventListener('blur', () => this.keys.clear());
    dom.addEventListener('mousemove', e => {
      this.mouse.x = (e.clientX / innerWidth) * 2 - 1;
      this.mouse.y = -(e.clientY / innerHeight) * 2 + 1;
      this.mouse.active = true;
    });
  }

  pads() {
    return [...(navigator.getGamepads ? navigator.getGamepads() : [])].filter(Boolean);
  }

  // What player 0 or 1 wants to do this frame.
  // move.x = right, move.y = down the screen (toward the camera).
  read(index) {
    const pad = this.pads()[index];
    const c = { move: { x: 0, y: 0, mag: 0 }, aim: null, aimMouse: false, run: false, jump: false, jumpPressed: false, source: 'none' };

    if (pad) {
      c.source = 'pad';
      c.move = stick(pad.axes[0] || 0, pad.axes[1] || 0);
      const a = stick(pad.axes[2] || 0, pad.axes[3] || 0);
      if (a.mag > 0.3) c.aim = { x: a.x, y: a.y };
      c.run = !!(pad.buttons[4]?.pressed || pad.buttons[10]?.pressed);
      c.jump = !!pad.buttons[0]?.pressed;
    }

    // Keyboard and mouse always work for player 1.
    if (index === 0) {
      const k = this.keys;
      const kx = (k.has('KeyD') ? 1 : 0) - (k.has('KeyA') ? 1 : 0);
      const ky = (k.has('KeyS') ? 1 : 0) - (k.has('KeyW') ? 1 : 0);
      if (kx || ky) {
        const m = Math.hypot(kx, ky);
        c.move = { x: kx / m, y: ky / m, mag: 1 };
        if (c.source === 'none') c.source = 'keyboard';
      }
      if (k.has('ShiftLeft') || k.has('ShiftRight')) c.run = true;
      if (k.has('Space')) c.jump = true;
      if (!c.aim && this.mouse.active) c.aimMouse = true;
    }

    c.jumpPressed = c.jump && !this.prevJump[index];
    this.prevJump[index] = c.jump;
    return c;
  }
}
