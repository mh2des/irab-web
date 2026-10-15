/**
 * Scale the 1280 × 720 stage to the largest size that fits its viewport,
 * centred, so a projector, a laptop and a TV all show the same layout.
 */
export const STAGE_W = 1280;
export const STAGE_H = 720;

export function fitStage(viewport: HTMLElement, scaler: HTMLElement, stage: HTMLElement): () => void {
  const apply = () => {
    const s = Math.min(viewport.clientWidth / STAGE_W, viewport.clientHeight / STAGE_H);
    scaler.style.width = `${STAGE_W * s}px`;
    scaler.style.height = `${STAGE_H * s}px`;
    stage.style.transform = `scale(${s})`;
  };
  apply();
  const ro = new ResizeObserver(apply);
  ro.observe(viewport);
  return () => ro.disconnect();
}
