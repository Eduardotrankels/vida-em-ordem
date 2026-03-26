export type TourTargetRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type MeasurableTourTarget = {
  measureInWindow?: (
    callback: (x: number, y: number, width: number, height: number) => void
  ) => void;
} | null;

export function hasTourRectChanged(
  current: TourTargetRect | null,
  next: TourTargetRect
) {
  if (!current) return true;

  return (
    Math.abs(current.x - next.x) > 1 ||
    Math.abs(current.y - next.y) > 1 ||
    Math.abs(current.width - next.width) > 1 ||
    Math.abs(current.height - next.height) > 1
  );
}

export function measureTourTarget(
  target: MeasurableTourTarget,
  onMeasured: (rect: TourTargetRect) => void
) {
  if (!target?.measureInWindow) return;

  const runMeasurement = () => {
    target.measureInWindow?.((x, y, width, height) => {
      if (width <= 0 || height <= 0) return;

      onMeasured({ x, y, width, height });
    });
  };

  runMeasurement();
  setTimeout(runMeasurement, 32);
}
