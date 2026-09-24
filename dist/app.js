(() => {
  "use strict";

  const FRAME_COUNT = 200;
  const FRAME_PATH = (index) => `./frames/ezgif-frame-${String(index).padStart(3, "0")}.jpg`;
  const section = document.querySelector(".sequence");
  const sticky = document.querySelector(".sequence__sticky");
  const canvas = document.querySelector(".sequence__canvas");
  const copy = document.querySelector(".hero-copy");
  const parlorAnnotation = document.querySelector(".parlor-annotation");
  const hint = document.querySelector(".sequence__hint");
  const loading = document.querySelector(".sequence__loading");
  const context = canvas.getContext("2d", { alpha: false, desynchronized: true });
  const frames = new Array(FRAME_COUNT);

  let loadedCount = 0;
  let currentFrame = 0;
  let drawnFrame = -1;
  let ticking = false;
  let viewportWidth = 0;
  let viewportHeight = 0;
  let pixelRatio = 1;

  const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

  function loadFrame(index) {
    if (frames[index]) return frames[index];

    const image = new Image();
    const frame = { image, loaded: false, failed: false };
    frames[index] = frame;
    image.decoding = "async";

    image.addEventListener("load", () => {
      frame.loaded = true;
      loadedCount += 1;
      loading.style.setProperty("--load-progress", loadedCount / FRAME_COUNT);

      if (index === currentFrame || drawnFrame < 0) drawBestFrame(currentFrame);
      if (loadedCount === FRAME_COUNT) loading.classList.add("is-ready");
    });

    image.addEventListener("error", () => {
      frame.failed = true;
    });

    image.src = FRAME_PATH(index + 1);
    return frame;
  }

  function findClosestLoaded(index) {
    if (frames[index]?.loaded) return index;

    for (let offset = 1; offset < FRAME_COUNT; offset += 1) {
      const before = index - offset;
      const after = index + offset;
      if (before >= 0 && frames[before]?.loaded) return before;
      if (after < FRAME_COUNT && frames[after]?.loaded) return after;
    }

    return -1;
  }

  function drawImageCover(image) {
    const imageRatio = image.naturalWidth / image.naturalHeight;
    const canvasRatio = viewportWidth / viewportHeight;
    let sourceX = 0;
    let sourceY = 0;
    let sourceWidth = image.naturalWidth;
    let sourceHeight = image.naturalHeight;

    if (canvasRatio > imageRatio) {
      sourceHeight = image.naturalWidth / canvasRatio;
      sourceY = (image.naturalHeight - sourceHeight) * 0.5;
    } else {
      sourceWidth = image.naturalHeight * canvasRatio;
      sourceX = (image.naturalWidth - sourceWidth) * 0.5;
    }

    context.drawImage(
      image,
      sourceX,
      sourceY,
      sourceWidth,
      sourceHeight,
      0,
      0,
      canvas.width,
      canvas.height,
    );
  }

  function drawBestFrame(index) {
    const bestIndex = findClosestLoaded(index);
    if (bestIndex < 0 || bestIndex === drawnFrame) return;
    drawImageCover(frames[bestIndex].image);
    drawnFrame = bestIndex;
  }

  function resizeCanvas() {
    const rect = sticky.getBoundingClientRect();
    viewportWidth = Math.max(1, rect.width);
    viewportHeight = Math.max(1, rect.height);
    pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(viewportWidth * pixelRatio);
    canvas.height = Math.round(viewportHeight * pixelRatio);
    canvas.style.width = `${viewportWidth}px`;
    canvas.style.height = `${viewportHeight}px`;
    drawnFrame = -1;
    drawBestFrame(currentFrame);
  }

  function updateFromScroll() {
    ticking = false;
    const rect = section.getBoundingClientRect();
    const scrollable = Math.max(1, section.offsetHeight - sticky.offsetHeight);
    const progress = clamp(-rect.top / scrollable, 0, 1);
    const nextFrame = Math.round(progress * (FRAME_COUNT - 1));

    if (nextFrame !== currentFrame) {
      currentFrame = nextFrame;
      loadFrame(currentFrame);
      loadFrame(clamp(currentFrame - 1, 0, FRAME_COUNT - 1));
      loadFrame(clamp(currentFrame + 1, 0, FRAME_COUNT - 1));
      drawBestFrame(currentFrame);
    }

    const copyProgress = clamp(progress / 0.075, 0, 1);
    const easedCopy = 1 - Math.pow(1 - copyProgress, 3);
    copy.style.setProperty("--copy-opacity", 1 - easedCopy);
    copy.style.setProperty("--copy-z", `${-34 * easedCopy}px`);
    copy.style.setProperty("--copy-scale", 1 - 0.17 * easedCopy);
    copy.style.setProperty("--copy-blur", `${2.5 * easedCopy}px`);
    copy.style.setProperty("--copy-events", copyProgress > 0.7 ? "none" : "auto");
    hint.style.setProperty("--hint-opacity", 1 - clamp(progress / 0.025, 0, 1));

    const annotationIn = clamp((nextFrame - 120) / 16, 0, 1);
    const annotationOut = 1 - clamp((nextFrame - 178) / 12, 0, 1);
    const annotationVisibility = Math.min(annotationIn, annotationOut);
    const easedAnnotation = annotationVisibility * annotationVisibility * (3 - 2 * annotationVisibility);
    parlorAnnotation.style.setProperty("--annotation-opacity", easedAnnotation);
    parlorAnnotation.style.setProperty("--annotation-y", `${12 * (1 - easedAnnotation)}px`);
    parlorAnnotation.style.setProperty("--annotation-scale", 0.98 + 0.02 * easedAnnotation);
  }

  function requestScrollUpdate() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(updateFromScroll);
  }

  function preloadSequence() {
    loadFrame(0);

    for (let index = 9; index < FRAME_COUNT; index += 10) loadFrame(index);

    const fillSequence = () => {
      for (let index = 0; index < FRAME_COUNT; index += 1) loadFrame(index);
    };

    if ("requestIdleCallback" in window) {
      window.requestIdleCallback(fillSequence, { timeout: 1200 });
    } else {
      window.setTimeout(fillSequence, 250);
    }
  }

  window.addEventListener("scroll", requestScrollUpdate, { passive: true });
  window.addEventListener("resize", () => {
    resizeCanvas();
    requestScrollUpdate();
  }, { passive: true });
  window.addEventListener("orientationchange", resizeCanvas, { passive: true });

  resizeCanvas();
  updateFromScroll();
  preloadSequence();
})();
