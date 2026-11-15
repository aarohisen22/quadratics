// Reads game controllers (and keyboard + mouse for player 1).
//
// Standard controller layout (Xbox names):
//   left stick = move, right stick = aim, A = jump, LB = run,
//   RT = fire, RB = throw shuriken, Y = switch weapon
//
// Who uses what:
//   1 player:  controller 1 and/or keyboard + mouse
//   2 players with 2 controllers: one each (keyboard + mouse also work for brother 1)
//   2 players with 1 controller:  brother 1 = keyboard + mouse, brother 2 = the controller
//   2 players, no controllers:    brother 1 = WASD + mouse, brother 2 = arrow keys
//     (brother 2 keys: arrows move, / fire, . throw shuriken, Right Shift jump, , switch weapon)
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
    this.prevThrow = [false, false];
    this.prevSwitch = [false, false];
    this.prevConfirm = false;
    this.prevMenu = {};
    addEventListener('keydown', e => { this.keys.add(e.code); });
    addEventListener('keyup', e => { this.keys.delete(e.code); });
    addEventListener('blur', () => this.keys.clear());
    dom.addEventListener('mousemove', e => {
      this.mouse.x = (e.clientX / innerWidth) * 2 - 1;
      this.mouse.y = -(e.clientY / innerHeight) * 2 + 1;
      this.mouse.active = true;
    });
    this.mouse.left = false;
    this.mouse.right = false;
    dom.addEventListener('mousedown', e => {
      if (e.button === 0) this.mouse.left = true;
      if (e.button === 2) this.mouse.right = true;
    });
    addEventListener('mouseup', e => {
      if (e.button === 0) this.mouse.left = false;
      if (e.button === 2) this.mouse.right = false;
    });
    dom.addEventListener('contextmenu', e => e.preventDefault());
  }

  pads() {
    return [...(navigator.getGamepads ? navigator.getGamepads() : [])].filter(Boolean);
  }

  // What player 0 or 1 wants to do this frame.
  // move.x = right, move.y = down the screen (toward the camera).
  read(index, playerCount = 1) {
    const pads = this.pads();
    let pad = null, keys = null;
    if (playerCount === 1) { pad = pads[0]; keys = 'main'; }
    else if (pads.length >= 2) { pad = pads[index]; keys = index === 0 ? 'main' : null; }
    else if (pads.length === 1) { pad = index === 1 ? pads[0] : null; keys = index === 0 ? 'main' : null; }
    else keys = index === 0 ? 'main' : 'arrows';

    const c = { move: { x: 0, y: 0, mag: 0 }, aim: null, aimMouse: false, run: false, jump: false, jumpPressed: false, fire: false, throw: false, throwPressed: false, switch: false, switchPressed: false, source: 'none' };

    if (pad) {
      c.source = 'pad';
      c.move = stick(pad.axes[0] || 0, pad.axes[1] || 0);
      const a = stick(pad.axes[2] || 0, pad.axes[3] || 0);
      if (a.mag > 0.3) c.aim = { x: a.x, y: a.y };
      c.run = !!(pad.buttons[4]?.pressed || pad.buttons[10]?.pressed);
      c.jump = !!pad.buttons[0]?.pressed;
      c.fire = (pad.buttons[7]?.value || 0) > 0.3;
      c.throw = !!pad.buttons[5]?.pressed;
      c.switch = !!pad.buttons[3]?.pressed;
    }

    if (keys === 'arrows') {
      const k = this.keys;
      const kx = (k.has('ArrowRight') ? 1 : 0) - (k.has('ArrowLeft') ? 1 : 0);
      const ky = (k.has('ArrowDown') ? 1 : 0) - (k.has('ArrowUp') ? 1 : 0);
      if (kx || ky) { const m = Math.hypot(kx, ky); c.move = { x: kx / m, y: ky / m, mag: 1 }; }
      c.source = 'keyboard';
      if (k.has('Slash')) c.fire = true;
      if (k.has('Period')) c.throw = true;
      if (k.has('ShiftRight')) c.jump = true;
      if (k.has('Comma')) c.switch = true;
    }

    if (keys === 'main') {
      const k = this.keys;
      const kx = (k.has('KeyD') ? 1 : 0) - (k.has('KeyA') ? 1 : 0);
      const ky = (k.has('KeyS') ? 1 : 0) - (k.has('KeyW') ? 1 : 0);
      if (kx || ky) {
        const m = Math.hypot(kx, ky);
        c.move = { x: kx / m, y: ky / m, mag: 1 };
        if (c.source === 'none') c.source = 'keyboard';
      }
      if (k.has('ShiftLeft') || (playerCount === 1 && k.has('ShiftRight'))) c.run = true;
      if (k.has('Space')) c.jump = true;
      if (this.mouse.left) c.fire = true;
      if (this.mouse.right || k.has('KeyE')) c.throw = true;
      if (k.has('KeyQ')) c.switch = true;
      if (!c.aim && this.mouse.active) c.aimMouse = true;
    }

    c.jumpPressed = c.jump && !this.prevJump[index];
    this.prevJump[index] = c.jump;
    c.throwPressed = c.throw && !this.prevThrow[index];
    this.prevThrow[index] = c.throw;
    c.switchPressed = c.switch && !this.prevSwitch[index];
    this.prevSwitch[index] = c.switch;
    return c;
  }

  // Menu buttons from any controller or the keyboard. Each is true only on the frame it is pressed.
  menu() {
    const k = this.keys, pads = this.pads();
    const any = fn => pads.some(fn);
    const now = {
      left: k.has('ArrowLeft') || k.has('KeyA') || any(p => p.buttons[14]?.pressed || p.axes[0] < -0.5),
      right: k.has('ArrowRight') || k.has('KeyD') || any(p => p.buttons[15]?.pressed || p.axes[0] > 0.5),
      confirm: k.has('Enter') || any(p => p.buttons[0]?.pressed || p.buttons[9]?.pressed),
      back: k.has('Escape') || any(p => p.buttons[1]?.pressed),
    };
    const out = {};
    for (const key in now) { out[key] = now[key] && !this.prevMenu[key]; }
    this.prevMenu = now;
    return out;
  }
}
