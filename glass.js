(() => {
  "use strict";
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
  const surfaces = [...document.querySelectorAll(".glass-surface, .glass-control")];

  surfaces.forEach(surface => {
    let frame = 0;
    let pointerX = 0;
    let pointerY = 0;
    const reset = () => {
      cancelAnimationFrame(frame);
      frame = 0;
      surface.style.removeProperty("--glass-x");
      surface.style.removeProperty("--glass-y");
      surface.classList.remove("glass-tracking");
    };
    surface.addEventListener("pointermove", event => {
      if (reducedMotion.matches || !finePointer.matches || event.pointerType === "touch") return;
      pointerX = event.clientX;
      pointerY = event.clientY;
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        const rect = surface.getBoundingClientRect();
        if (!rect.width || !rect.height) return;
        const x = Math.min(100, Math.max(0, (pointerX - rect.left) / rect.width * 100));
        const y = Math.min(100, Math.max(0, (pointerY - rect.top) / rect.height * 100));
        surface.style.setProperty("--glass-x", `${x}%`);
        surface.style.setProperty("--glass-y", `${y}%`);
        surface.classList.add("glass-tracking");
      });
    }, { passive: true });
    surface.addEventListener("pointerleave", reset);
    surface.addEventListener("pointercancel", reset);
    reducedMotion.addEventListener("change", reset);
  });

  // A separate overlay keeps the rings alive when a language button changes text.
  const rippleLayer = document.querySelector(".interaction-ripples");
  function rippleHost(target) {
    if (!(target instanceof Element) || target.closest('[aria-disabled="true"], [disabled]')) return null;
    return target.closest("a[href], button, .glass-surface");
  }
  function makeRipples(host, x, y) {
    if (!rippleLayer || reducedMotion.matches) return;
    while (rippleLayer.childElementCount >= 8) rippleLayer.firstElementChild.remove();
    const burst = document.createElement("span");
    burst.className = "ripple-burst";
    burst.style.left = `${x}px`;
    burst.style.top = `${y}px`;
    const rect = host.getBoundingClientRect();
    burst.style.setProperty("--wave-size", `${Math.min(160, Math.max(84, rect.height * 1.7))}px`);
    for (let i = 0; i < 3; i++) {
      const ring = document.createElement("span");
      ring.className = "ripple-ring";
      ring.style.setProperty("--wave-delay", `${i * .11}s`);
      burst.append(ring);
    }
    rippleLayer.append(burst);
    burst.addEventListener("animationend", event => {
      if (event.target === burst.lastElementChild) burst.remove();
    });
    window.setTimeout(() => burst.remove(), 1200);
  }
  document.addEventListener("pointerdown", event => {
    if (event.button !== 0) return;
    const host = rippleHost(event.target);
    if (host) makeRipples(host, event.clientX, event.clientY);
  }, { passive: true });
  document.addEventListener("click", event => {
    if (event.detail !== 0) return;
    const host = rippleHost(event.target);
    if (!host) return;
    const rect = host.getBoundingClientRect();
    makeRipples(host, rect.left + rect.width / 2, rect.top + rect.height / 2);
  });
  reducedMotion.addEventListener("change", () => {
    if (reducedMotion.matches) rippleLayer?.replaceChildren();
  });

  const nav = document.querySelector(".site-header nav");
  const lens = nav?.querySelector(".nav-lens");
  if (!nav || !lens) return;
  const links = [...nav.querySelectorAll("a")];
  let selected = links.find(link => link.getAttribute("href") === (window.location.hash || "#about")) || links[0];
  let lensTarget = selected;
  let lensFrame = 0;
  let current = null;
  let lastTime = null;
  let bounds = { width: 0, height: 0 };
  const velocity = { x: 0, y: 0, width: 0, height: 0 };
  const axes = Object.keys(velocity);
  function targetGeometry() {
    const rect = nav.getBoundingClientRect();
    if (!rect.width || !rect.height) return null;
    // On a phone the navigation may scroll horizontally. Its lens uses the
    // full content width, rather than clamping to the visible viewport.
    const contentWidth = Math.max(rect.width, ...links.map(link => link.offsetLeft + link.offsetWidth));
    bounds = { width: contentWidth, height: rect.height };
    const link = lensTarget;
    const width = Math.min(link.offsetWidth, contentWidth);
    const height = Math.min(link.offsetHeight, rect.height);
    const x = link.offsetLeft + width / 2;
    const y = link.offsetTop + height / 2;
    return {
      x: Math.max(width / 2, Math.min(contentWidth - width / 2, x)),
      y: Math.max(height / 2, Math.min(rect.height - height / 2, y)),
      width, height,
    };
  }
  function renderLens() {
    const stretch = reducedMotion.matches ? 0 : Math.min(Math.abs(velocity.x) / 5000, .035);
    const width = Math.max(1, Math.min(bounds.width, current.width * (1 + stretch)));
    const height = Math.max(1, Math.min(bounds.height, current.height * (1 - stretch * .4)));
    const left = Math.max(0, Math.min(bounds.width - width, current.x - width / 2));
    const top = Math.max(0, Math.min(bounds.height - height, current.y - height / 2));
    lens.style.width = `${width}px`;
    lens.style.height = `${height}px`;
    lens.style.transform = `translate3d(${left}px, ${top}px, 0)`;
  }
  function animateLens(time) {
    lensFrame = 0;
    const target = targetGeometry();
    if (!target) { lastTime = null; lens.classList.remove("is-animating"); return; }
    if (!current || reducedMotion.matches) {
      current = { ...target };
      axes.forEach(axis => { velocity[axis] = 0; });
    } else {
      // Exact damped motion avoids frame-rate-dependent stepping and keeps
      // velocity continuous when the pointer switches direction mid-slide.
      const delta = lastTime === null ? 0 : Math.min(.064, Math.max(0, (time - lastTime) / 1000));
      axes.forEach(axis => {
        const frequency = axis === "width" || axis === "height" ? 24 : 28;
        const damping = .90;
        const decayRate = damping * frequency;
        const oscillation = frequency * Math.sqrt(1 - damping * damping);
        const decay = Math.exp(-decayRate * delta);
        const cosine = Math.cos(oscillation * delta);
        const sine = Math.sin(oscillation * delta);
        const offset = current[axis] - target[axis];
        const speed = velocity[axis];
        current[axis] = target[axis] + decay * (offset * cosine + (speed + decayRate * offset) / oscillation * sine);
        velocity[axis] = decay * (speed * cosine - (decayRate * speed + frequency * frequency * offset) / oscillation * sine);
      });
    }
    lastTime = time;
    const settled = axes.every(axis => Math.abs(current[axis] - target[axis]) < .025 && Math.abs(velocity[axis]) < .2);
    if (settled || reducedMotion.matches) {
      current = { ...target };
      axes.forEach(axis => { velocity[axis] = 0; });
      lastTime = null;
      lens.classList.remove("is-animating");
    } else {
      lens.classList.add("is-animating");
      queueLens();
    }
    renderLens();
  }
  function queueLens() {
    if (!lensFrame) {
      if (lastTime === null) lastTime = performance.now();
      lensFrame = requestAnimationFrame(animateLens);
    }
  }
  function refreshLens() {
    if (!current || reducedMotion.matches) {
      cancelAnimationFrame(lensFrame);
      lensFrame = 0;
      animateLens(performance.now());
    } else queueLens();
  }
  function revealLensTarget() {
    const visibleLeft = nav.scrollLeft;
    const visibleRight = visibleLeft + nav.clientWidth;
    const left = lensTarget.offsetLeft;
    const right = left + lensTarget.offsetWidth;
    if (left < visibleLeft || right > visibleRight) {
      nav.scrollTo({
        left: left < visibleLeft ? Math.max(0, left - 4) : right - nav.clientWidth + 4,
        behavior: reducedMotion.matches ? "instant" : "smooth",
      });
    }
  }
  function updateSelection() {
    links.forEach(link => {
      if (link === selected) link.setAttribute("aria-current", "location");
      else link.removeAttribute("aria-current");
    });
    lensTarget = selected;
    revealLensTarget();
    refreshLens();
  }
  function selectFromHash() {
    selected = links.find(link => link.getAttribute("href") === (window.location.hash || "#about")) || links[0];
    updateSelection();
  }
  links.forEach(link => {
    function dockLens() {
      if (link.getAttribute("aria-disabled") === "true") return;
      lensTarget = link;
      revealLensTarget();
      refreshLens();
    }
    link.addEventListener("pointerenter", event => {
      if (finePointer.matches && event.pointerType !== "touch") dockLens();
    });
    link.addEventListener("focus", dockLens);
    link.addEventListener("click", event => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      if (!link.getAttribute("href")?.startsWith("#") || link.getAttribute("aria-disabled") === "true") return;
      selected = link;
      updateSelection();
    });
  });
  reducedMotion.addEventListener("change", refreshLens);
  window.addEventListener("hashchange", selectFromHash);
  window.addEventListener("resize", refreshLens, { passive: true });
  if ("ResizeObserver" in window) {
    const resize = new ResizeObserver(() => { revealLensTarget(); refreshLens(); });
    resize.observe(nav);
    links.forEach(link => resize.observe(link));
  }
  selectFromHash();
})();
