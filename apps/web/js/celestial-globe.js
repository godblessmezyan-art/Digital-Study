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
  locations, activeId, onSelect, textureUrl,
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
  canvas.setAttribute('aria-label', '可旋转的手绘异世界星球，天空之城是其中一个地点');
  markerLayer.className = 'celestial-globe__markers';
  root.append(canvas, markerLayer);

  const markers = locations.map((location) => {
    const label = location.globe.label || location.name;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `globe-marker${location.id === activeId ? ' is-active' : ''}`;
    button.dataset.scene = location.id;
    button.setAttribute('aria-label', `打开${label}地图`);
    button.innerHTML = `<span>✦</span><b>${label}</b>`;
    button.addEventListener('click', () => onSelect(location.id), { signal: events.signal });
    markerLayer.append(button);
    return { location, button };
  });

  const context = canvas.getContext('2d');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
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

  function draw() {
    if (!width || !height) return;
    context.clearRect(0, 0, width, height);
    drawSphere();
    markers.forEach(({ location, button }) => {
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
    if (!reducedMotion && !dragging && !hovering) rotationY = (rotationY + delta * .001) % 360;
    draw();
    frame = requestAnimationFrame(animate);
  }

  canvas.addEventListener('pointerdown', (event) => {
    dragging = true;
    previousX = event.clientX;
    previousY = event.clientY;
    canvas.setPointerCapture(event.pointerId);
    root.classList.add('is-dragging');
  }, { signal: events.signal });
  canvas.addEventListener('pointermove', (event) => {
    if (!dragging) return;
    rotationY += (event.clientX - previousX) * .45;
    rotationX = Math.max(-55, Math.min(55, rotationX - (event.clientY - previousY) * .25));
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

  const observer = new ResizeObserver(resize);
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
    events.abort();
    observer.disconnect();
    texture.src = '';
    textureData = null;
    root.replaceChildren();
    delete root.dataset.rendering;
  }

  return { start, pause, destroy, get running() { return running; } };
}
