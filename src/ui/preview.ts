import type { Vec3 } from "../interaction/types";
const edges = [
  [0, 1],
  [1, 2],
  [2, 3],
  [3, 4],
  [0, 5],
  [5, 6],
  [6, 7],
  [7, 8],
  [5, 9],
  [9, 10],
  [10, 11],
  [11, 12],
  [9, 13],
  [13, 14],
  [14, 15],
  [15, 16],
  [13, 17],
  [0, 17],
  [17, 18],
  [18, 19],
  [19, 20],
];
export function drawSkeleton(
  canvas: HTMLCanvasElement,
  points: Vec3[],
  width: number,
  height: number,
) {
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }
  const c = canvas.getContext("2d");
  if (!c) return;
  c.clearRect(0, 0, width, height);
  if (!points.length) return;
  c.strokeStyle = "#9feaff";
  c.lineWidth = 2;
  for (const [a, b] of edges) {
    c.beginPath();
    c.moveTo(points[a].x * width, points[a].y * height);
    c.lineTo(points[b].x * width, points[b].y * height);
    c.stroke();
  }
  for (const p of points) {
    c.beginPath();
    c.arc(p.x * width, p.y * height, 3, 0, Math.PI * 2);
    c.fillStyle = "#fff";
    c.fill();
  }
}
