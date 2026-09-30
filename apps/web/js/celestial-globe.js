const radians = (degrees) => degrees * Math.PI / 180;

function rotatePoint(latitude, longitude, rotationX, rotationY) {
  const lat = radians(latitude);
  const lon = radians(longitude + rotationY);
  const cosLat = Math.cos(lat);
  const x = cosLat * Math.sin(lon);
  const sourceY = Math.sin(lat);
  const sourceZ = cosLat * Math.cos(lon);
  const tilt = radians(rotationX);
  return {
    x,
    y: sourceY * Math.cos(tilt) - sourceZ * Math.sin(tilt),
    z: sourceY * Math.sin(tilt) + sourceZ * Math.cos(tilt),
  };
}

export function createCelestialGlobe(root, {
  locations, activeId, onSelect, textureUrl, chronicles = [], onChronicleSelect = () => {},
}) {
  if (!root) return () => {};
  const events = new AbortController();
  const canvas = document.createElement('canvas');
  const markerLayer = document.createElement('div');
  const texture = new Image();
  const textureCanvas = document.createElement('canvas');
  const textureContext = textureCanvas.getContext('2d', { willReadFrequently: true });
  const sphereCanvas = document.createElement('canvas');
  const sphereContext = sphereCanvas.getContext('2d');
  canvas.className = 'celestial-globe__canvas';
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', '可旋转的手绘异世界星球，埃瑞瑞恩是其中一个地点');
  markerLayer.className = 'celestial-globe__markers';
  root.append(canvas, markerLayer);

  const markers = locations.map((location) => {
    const label = location.globe.label || location.name;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `globe-marker${location.id === activeId ? ' is-active' : ''}`;
    button.dataset.scene = location.id;
    button.setAttribute('aria-label', `打开${label}地图`);
    button.innerHTML = `<span>✦</span><b><small>CELESTIAL-01 · 已发现区域</small>${label}</b>`;
    button.addEventListener('click', () => focusLocation(location), { signal: events.signal });
    markerLayer.append(button);
    return { location, button };
  });

  const context = canvas.getContext('2d');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const inertiaFactor = window.matchMedia('(pointer: coarse)').matches ? .55 : 1;
  let textureData = null;
  let rotationX = -8;
  let rotationY = -58;
  let width = 0;
  let height = 0;
  let radius = 0;
  let centerX = 0;
  let centerY = 0;
  let dragging = false;
  let hovering = false;
  let previousX = 0;
  let previousY = 0;
  let frame = 0;
  let lastTime = performance.now();
  let running = false;
  let destroyed = false;
  let velocityX = 0;
  let velocityY = 0;
  let targetRotation = null;
  let selectionTimer = 0;
  let resizeFrame = 0;
  let routeStartedAt = 0;
  let routeTarget = locations.find(item => item.id === activeId) || locations[0] || null;
  let chronicleMarkers = [];

  function prepareTexture() {
    const targetWidth = 1024;
    const targetHeight = 512;
    textureCanvas.width = targetWidth;
    textureCanvas.height = targetHeight;
    textureContext.drawImage(texture, 0, 0, targetWidth, targetHeight);
    textureData = textureContext.getImageData(0, 0, targetWidth, targetHeight);
    draw();
  }

  texture.addEventListener('load', prepareTexture, { once: true, signal: events.signal });
  texture.src = textureUrl;
  if (texture.complete && texture.naturalWidth) prepareTexture();

  function resize() {
    const bounds = root.getBoundingClientRect();
    const scale = Math.min(window.devicePixelRatio || 1, 2);
    width = bounds.width;
    height = bounds.height;
    canvas.width = Math.max(1, Math.round(width * scale));
    canvas.height = Math.max(1, Math.round(height * scale));
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    context.setTransform(scale, 0, 0, scale, 0, 0);
    radius = Math.min(width, height) * .405;
    centerX = width / 2;
    centerY = height / 2 + 4;
    const renderSize = Math.max(180, Math.min(320, Math.round(radius * 2)));
    sphereCanvas.width = renderSize;
    sphereCanvas.height = renderSize;
    draw();
  }

  function project(latitude, longitude) {
    const point = rotatePoint(latitude, longitude, rotationX, rotationY);
    return {
      x: centerX + point.x * radius,
      y: centerY - point.y * radius,
      z: point.z,
    };
  }

  function paintTexture() {
    if (!textureData || !sphereCanvas.width) return false;
    const size = sphereCanvas.width;
    const half = size / 2;
    const output = sphereContext.createImageData(size, size);
    const target = output.data;
    const source = textureData.data;
    const sourceWidth = textureData.width;
    const sourceHeight = textureData.height;
    const tilt = radians(rotationX);
    const tiltCos = Math.cos(tilt);
    const tiltSin = Math.sin(tilt);
    const spin = radians(rotationY);

    for (let py = 0; py < size; py += 1) {
      const screenY = (half - py - .5) / half;
      for (let px = 0; px < size; px += 1) {
        const screenX = (px + .5 - half) / half;
        const distance = screenX * screenX + screenY * screenY;
        if (distance > 1) continue;
        const screenZ = Math.sqrt(1 - distance);
        const worldY = screenY * tiltCos + screenZ * tiltSin;
        const worldZ = -screenY * tiltSin + screenZ * tiltCos;
        const longitude = Math.atan2(screenX, worldZ) - spin;
        const latitude = Math.asin(Math.max(-1, Math.min(1, worldY)));
        const u = ((longitude / (Math.PI * 2) + .5) % 1 + 1) % 1;
        const v = Math.max(0, Math.min(.9999, .5 - latitude / Math.PI));
        const sourceX = Math.floor(u * sourceWidth);
        const sourceY = Math.floor(v * sourceHeight);
        const sourceIndex = (sourceY * sourceWidth + sourceX) * 4;
        const targetIndex = (py * size + px) * 4;
        const light = .56 + .48 * Math.max(0, screenZ * .86 - screenX * .2 + screenY * .13);
        const edge = Math.min(1, screenZ * 4.2);
        target[targetIndex] = Math.min(255, source[sourceIndex] * light);
        target[targetIndex + 1] = Math.min(255, source[sourceIndex + 1] * light);
        target[targetIndex + 2] = Math.min(255, source[sourceIndex + 2] * light * 1.03);
        target[targetIndex + 3] = Math.round(255 * edge);
      }
    }
    sphereContext.putImageData(output, 0, 0);
    return true;
  }

  function drawSphere() {
    if (paintTexture()) {
      context.save();
      context.beginPath();
      context.arc(centerX, centerY, radius, 0, Math.PI * 2);
      context.clip();
      context.drawImage(sphereCanvas, centerX - radius, centerY - radius, radius * 2, radius * 2);
      const shade = context.createRadialGradient(centerX - radius * .35, centerY - radius * .42, radius * .1, centerX + radius * .22, centerY + radius * .1, radius * 1.14);
      shade.addColorStop(0, 'rgba(205, 239, 255, .18)');
      shade.addColorStop(.48, 'rgba(30, 73, 101, .02)');
      shade.addColorStop(1, 'rgba(1, 13, 25, .64)');
      context.fillStyle = shade;
      context.fillRect(centerX - radius, centerY - radius, radius * 2, radius * 2);
      context.restore();
    } else {
      const fallback = context.createRadialGradient(centerX - radius * .35, centerY - radius * .4, radius * .08, centerX, centerY, radius * 1.15);
      fallback.addColorStop(0, 'rgba(124, 188, 218, .72)');
      fallback.addColorStop(.55, 'rgba(20, 73, 108, .9)');
      fallback.addColorStop(1, 'rgba(4, 24, 42, .96)');
      context.beginPath();
      context.arc(centerX, centerY, radius, 0, Math.PI * 2);
      context.fillStyle = fallback;
      context.fill();
    }

    context.beginPath();
    context.arc(centerX, centerY, radius, 0, Math.PI * 2);
    context.strokeStyle = 'rgba(207, 235, 246, .58)';
    context.lineWidth = 1.2;
    context.shadowColor = 'rgba(91, 190, 230, .48)';
    context.shadowBlur = 15;
    context.stroke();
    context.shadowBlur = 0;
    context.beginPath();
    context.ellipse(centerX, centerY + radius * .1, radius * 1.2, radius * .31, radians(-8), 0, Math.PI * 2);
    context.strokeStyle = 'rgba(221, 188, 125, .3)';
    context.lineWidth = 1;
    context.stroke();
  }

  function drawRoute(time = performance.now()) {
    if (!routeTarget) return;
    const targetLatitude = routeTarget.globe?.latitude ?? routeTarget.latitude ?? 32;
    const targetLongitude = routeTarget.globe?.longitude ?? routeTarget.longitude ?? 42;
    const points = Array.from({ length: 32 }, (_, index) => {
      const progress = index / 31;
      return project(-18 + progress * (targetLatitude + 18) + Math.sin(progress * Math.PI) * 9, -112 + progress * (targetLongitude + 112));
    });
    const activeProgress = routeStartedAt
      ? (reducedMotion ? 1 : Math.min(1, (time - routeStartedAt) / 1200))
      : 0;
    context.save();
    context.lineCap = 'round';
    for (let index = 1; index < points.length; index += 1) {
      const from = points[index - 1];
      const to = points[index];
      if (from.z <= .02 || to.z <= .02) continue;
      context.beginPath();
      context.moveTo(from.x, from.y);
      context.lineTo(to.x, to.y);
      const reached = index / (points.length - 1) <= activeProgress;
      context.strokeStyle = reached ? 'rgba(239, 204, 137, .78)' : 'rgba(198, 225, 235, .16)';
      context.lineWidth = reached ? 1.55 : .75;
      context.shadowColor = reached ? 'rgba(231, 191, 111, .55)' : 'transparent';
      context.shadowBlur = reached ? 6 : 0;
      context.stroke();
    }
    context.restore();
  }

  function draw(time = performance.now()) {
    if (!width || !height) return;
    context.clearRect(0, 0, width, height);
    drawSphere();
    drawRoute(time);
    [...markers, ...chronicleMarkers].forEach(({ location, button }) => {
      const point = project(location.globe.latitude, location.globe.longitude);
      const visible = point.z > .02;
      button.hidden = !visible;
      button.style.left = `${point.x}px`;
      button.style.top = `${point.y}px`;
      button.style.setProperty('--depth', Math.max(.72, point.z));
      button.style.zIndex = `${Math.round(point.z * 100)}`;
    });
  }

  function animate(time) {
    if (!running || destroyed) return;
    const delta = Math.min(40, time - lastTime);
    lastTime = time;
    if (!reducedMotion && !dragging) {
      if (targetRotation) {
        let distanceY = ((targetRotation.y - rotationY + 540) % 360) - 180;
        rotationX += (targetRotation.x - rotationX) * Math.min(1, delta * .012);
        rotationY += distanceY * Math.min(1, delta * .012);
        if (Math.abs(distanceY) < .15 && Math.abs(targetRotation.x - rotationX) < .15) targetRotation = null;
      } else if (Math.abs(velocityX) + Math.abs(velocityY) > .006) {
        rotationY += velocityX;
        rotationX = Math.max(-55, Math.min(55, rotationX + velocityY));
        const friction = Math.pow(.91, delta / 16.67);
        velocityX *= friction;
        velocityY *= friction;
      } else if (!hovering) rotationY = (rotationY + delta * .001) % 360;
    }
    draw(time);
    frame = requestAnimationFrame(animate);
  }

  canvas.addEventListener('pointerdown', (event) => {
    dragging = true;
    targetRotation = null;
    velocityX = 0;
    velocityY = 0;
    previousX = event.clientX;
    previousY = event.clientY;
    canvas.setPointerCapture(event.pointerId);
    root.classList.add('is-dragging');
  }, { signal: events.signal });
  canvas.addEventListener('pointermove', (event) => {
    if (!dragging) return;
    const deltaX = event.clientX - previousX;
    const deltaY = event.clientY - previousY;
    // The globe behaves like a surface held under the pointer: dragging right
    // moves the visible map right, and dragging down moves it down. The old
    // vertical subtraction inverted only that axis and made diagonal drags arc
    // in an unexpected direction.
    velocityX = deltaX * .42 * inertiaFactor;
    velocityY = deltaY * .32 * inertiaFactor;
    rotationY += velocityX;
    rotationX = Math.max(-55, Math.min(55, rotationX + velocityY));
    previousX = event.clientX;
    previousY = event.clientY;
  }, { signal: events.signal });
  const stopDragging = () => { dragging = false; root.classList.remove('is-dragging'); };
  canvas.addEventListener('pointerup', stopDragging, { signal: events.signal });
  canvas.addEventListener('pointercancel', stopDragging, { signal: events.signal });
  root.addEventListener('pointerenter', () => { hovering = true; }, { signal: events.signal });
  root.addEventListener('pointerleave', () => { hovering = false; stopDragging(); }, { signal: events.signal });
  root.addEventListener('focusin', () => { hovering = true; }, { signal: events.signal });
  root.addEventListener('focusout', () => { hovering = false; }, { signal: events.signal });

  const observer = new ResizeObserver(() => {
    cancelAnimationFrame(resizeFrame);
    resizeFrame = requestAnimationFrame(resize);
  });
  observer.observe(root);
  resize();
  root.dataset.rendering = 'false';

  function start() {
    if (destroyed || running) return;
    running = true;
    root.dataset.rendering = 'true';
    lastTime = performance.now();
    draw();
    frame = requestAnimationFrame(animate);
  }

  function pause() {
    if (!running) return;
    running = false;
    root.dataset.rendering = 'false';
    cancelAnimationFrame(frame);
    frame = 0;
  }

  function destroy() {
    if (destroyed) return;
    pause();
    destroyed = true;
    clearTimeout(selectionTimer);
    cancelAnimationFrame(resizeFrame);
    events.abort();
    observer.disconnect();
    texture.src = '';
    textureData = null;
    root.replaceChildren();
    delete root.dataset.rendering;
  }

  function focusLocation(location) {
    markers.forEach(({ location: item, button }) => button.classList.toggle('is-selected', item.id === location.id));
    if (reducedMotion) {
      onSelect(location.id);
      return;
    }
    targetRotation = {
      x: Math.max(-55, Math.min(55, -location.globe.latitude * .48)),
      y: -location.globe.longitude,
    };
    velocityX = 0;
    velocityY = 0;
    routeTarget = location;
    routeStartedAt = performance.now();
    root.classList.add('is-focusing');
    clearTimeout(selectionTimer);
    selectionTimer = window.setTimeout(() => { root.classList.remove('is-focusing'); onSelect(location.id); }, 720);
  }

  function chronicleCoordinates(entry) {
    const x = Number(entry.coordinates?.x);
    const y = Number(entry.coordinates?.y);
    if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
    return { latitude: Math.max(-68, Math.min(68, 72 - y * 1.42)), longitude: x * 3.6 - 180 };
  }

  function renderChronicles(entries = []) {
    chronicleMarkers.forEach(({ button }) => button.remove());
    chronicleMarkers = entries.filter(entry => entry.status !== 'locked').map(entry => {
      const globe = chronicleCoordinates(entry);
      if (!globe) return null;
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `globe-chronicle-marker${entry.status === 'discovered' ? ' is-unread' : ''}`;
      button.dataset.chronicleId = entry.id;
      button.setAttribute('aria-label', `打开航行记录 ${String(entry.recordNumber).padStart(4, '0')}：${entry.title}`);
      button.innerHTML = `<span aria-hidden="true">◇</span><b><small>VOYAGE RECORD · ${String(entry.recordNumber).padStart(4, '0')}</small>${entry.title}</b>`;
      button.addEventListener('click', () => {
        routeTarget = globe;
        routeStartedAt = performance.now();
        targetRotation = { x: Math.max(-55, Math.min(55, -globe.latitude * .48)), y: -globe.longitude };
        root.classList.add('is-focusing');
        clearTimeout(selectionTimer);
        selectionTimer = window.setTimeout(() => { root.classList.remove('is-focusing'); onChronicleSelect(entry.id); }, 720);
      }, { signal: events.signal });
      markerLayer.append(button);
      return { location: { ...entry, globe }, button };
    }).filter(Boolean);
    draw();
  }

  renderChronicles(chronicles);

  return {
    start,
    pause,
    destroy,
    setChronicles: renderChronicles,
    setAtmosphere({ weather = 'clear', period = 'day' } = {}) { root.dataset.weather = weather; root.dataset.period = period; },
    get running() { return running; },
    get rotation() { return { x: rotationX, y: rotationY }; },
  };
}
