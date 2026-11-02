// joystick.js - 行動裝置雙虛擬搖桿與觸控操作控制器
// 支援手機與平板觸控螢幕：左側搖桿走動、右側滑動視角

class MobileJoystickController {
  constructor() {
    this.container = null;
    this.knob = null;
    this.isActive = false;
    this.touchId = null;
    this.startPos = { x: 0, y: 0 };
    this.maxRadius = 45;
  }

  init() {
    this.container = document.getElementById("virtualJoystickZone");
    this.knob = document.getElementById("joystickKnob");
    if (!this.container || !this.knob) return;

    this.bindTouchEvents();
  }

  bindTouchEvents() {
    this.container.addEventListener("touchstart", (e) => {
      e.preventDefault();
      const touch = e.touches[0];
      this.touchId = touch.identifier;
      this.isActive = true;

      const rect = this.container.getBoundingClientRect();
      this.startPos = {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2
      };
      this.updateKnob(touch.clientX, touch.clientY);
    }, { passive: false });

    window.addEventListener("touchmove", (e) => {
      if (!this.isActive) return;
      for (let i = 0; i < e.touches.length; i++) {
        if (e.touches[i].identifier === this.touchId) {
          e.preventDefault();
          this.updateKnob(e.touches[i].clientX, e.touches[i].clientY);
          break;
        }
      }
    }, { passive: false });

    const handleEnd = (e) => {
      if (!this.isActive) return;
      for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === this.touchId) {
          this.reset();
          break;
        }
      }
    };

    window.addEventListener("touchend", handleEnd);
    window.addEventListener("touchcancel", handleEnd);
  }

  updateKnob(clientX, clientY) {
    const dx = clientX - this.startPos.x;
    const dy = clientY - this.startPos.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const angle = Math.atan2(dy, dx);

    const clampedDist = Math.min(dist, this.maxRadius);
    const knobX = Math.cos(angle) * clampedDist;
    const knobY = Math.sin(angle) * clampedDist;

    this.knob.style.transform = `translate(${knobX}px, ${knobY}px)`;

    // 映射到 avatar.keys
    if (window.temple3d && window.temple3d.avatar) {
      const keys = window.temple3d.avatar.keys;
      const deadZone = 12;

      keys.left = knobX < -deadZone;
      keys.right = knobX > deadZone;
      keys.forward = knobY < -deadZone;
      keys.backward = knobY > deadZone;
    }
  }

  reset() {
    this.isActive = false;
    this.touchId = null;
    if (this.knob) {
      this.knob.style.transform = `translate(0px, 0px)`;
    }

    if (window.temple3d && window.temple3d.avatar) {
      const keys = window.temple3d.avatar.keys;
      keys.forward = false;
      keys.backward = false;
      keys.left = false;
      keys.right = false;
    }
  }
}

window.mobileJoystick = new MobileJoystickController();

