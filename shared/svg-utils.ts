export interface Point {
  x: number;
  y: number;
}

function degToRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

function rotatePoint(x: number, y: number, angle: number): Point {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return {
    x: x * cos - y * sin,
    y: x * sin + y * cos,
  };
}

function arcToBeziers(
  x1: number, y1: number,
  rx: number, ry: number,
  phi: number,
  largeArc: boolean,
  sweep: boolean,
  x2: number, y2: number
): Point[][] {
  if (rx === 0 || ry === 0) {
    return [
      [{ x: x1, y: y1 }, { x: x2, y: y2 }, { x: x2, y: y2 }, { x: x2, y: y2 }],
    ];
  }

  const cosPhi = Math.cos(phi);
  const sinPhi = Math.sin(phi);

  const x1p = (cosPhi * (x1 - x2)) / 2 + (sinPhi * (y1 - y2)) / 2;
  const y1p = (-sinPhi * (x1 - x2)) / 2 + (cosPhi * (y1 - y2)) / 2;

  rx = Math.abs(rx);
  ry = Math.abs(ry);

  const lambda = (x1p * x1p) / (rx * rx) + (y1p * y1p) / (ry * ry);
  if (lambda > 1) {
    const sqrtLambda = Math.sqrt(lambda);
    rx *= sqrtLambda;
    ry *= sqrtLambda;
  }

  const rxSq = rx * rx;
  const rySq = ry * ry;
  const x1pSq = x1p * x1p;
  const y1pSq = y1p * y1p;

  let sq = (rxSq * rySq - rxSq * y1pSq - rySq * x1pSq) / (rxSq * y1pSq + rySq * x1pSq);
  if (sq < 0) sq = 0;
  const coef = (largeArc !== sweep ? 1 : -1) * Math.sqrt(sq);

  const cxp = (coef * rx * y1p) / ry;
  const cyp = (-coef * ry * x1p) / rx;

  const cx = cosPhi * cxp - sinPhi * cyp + (x1 + x2) / 2;
  const cy = sinPhi * cxp + cosPhi * cyp + (y1 + y2) / 2;

  function angle(ux: number, uy: number, vx: number, vy: number): number {
    const dot = ux * vx + uy * vy;
    const len = Math.sqrt((ux * ux + uy * uy) * (vx * vx + vy * vy));
    let ang = Math.acos(Math.max(-1, Math.min(1, dot / len)));
    if (ux * vy - uy * vx < 0) ang = -ang;
    return ang;
  }

  const theta1 = angle(1, 0, (x1p - cxp) / rx, (y1p - cyp) / ry);
  let dTheta = angle(
    (x1p - cxp) / rx, (y1p - cyp) / ry,
    (-x1p - cxp) / rx, (-y1p - cyp) / ry
  );

  if (!sweep && dTheta > 0) dTheta -= 2 * Math.PI;
  if (sweep && dTheta < 0) dTheta += 2 * Math.PI;

  const segments = Math.max(1, Math.ceil(Math.abs(dTheta) / (Math.PI / 2)));
  const delta = dTheta / segments;
  const t = (4 / 3) * Math.tan(delta / 4);

  const curves: Point[][] = [];
  let theta = theta1;

  for (let i = 0; i < segments; i++) {
    const cosTheta1 = Math.cos(theta);
    const sinTheta1 = Math.sin(theta);
    const theta2 = theta + delta;
    const cosTheta2 = Math.cos(theta2);
    const sinTheta2 = Math.sin(theta2);

    const ep1 = rotatePoint(rx * cosTheta1, ry * sinTheta1, phi);
    const ep2 = rotatePoint(rx * cosTheta2, ry * sinTheta2, phi);
    const c1 = rotatePoint(rx * (cosTheta1 - t * sinTheta1), ry * (sinTheta1 + t * cosTheta1), phi);
    const c2 = rotatePoint(rx * (cosTheta2 + t * sinTheta2), ry * (sinTheta2 - t * cosTheta2), phi);

    curves.push([
      { x: cx + ep1.x, y: cy + ep1.y },
      { x: cx + c1.x, y: cy + c1.y },
      { x: cx + c2.x, y: cy + c2.y },
      { x: cx + ep2.x, y: cy + ep2.y },
    ]);

    theta = theta2;
  }

  return curves;
}

export interface NormalizedCommand {
  type: 'M' | 'L' | 'C' | 'Z';
  points: Point[];
}

export function normalizeSvgPath(pathData: string, scale: number = 1): NormalizedCommand[] {
  const commands: NormalizedCommand[] = [];
  const regex = /([MmLlHhVvCcSsQqTtAaZz])([^MmLlHhVvCcSsQqTtAaZz]*)/g;
  
  let match;
  let currentX = 0;
  let currentY = 0;
  let startX = 0;
  let startY = 0;
  let lastControlX = 0;
  let lastControlY = 0;

  while ((match = regex.exec(pathData)) !== null) {
    const cmd = match[1];
    const argsStr = match[2].trim();
    const args = argsStr.length > 0 
      ? argsStr.split(/[\s,]+/).map(Number).filter((n) => !isNaN(n))
      : [];

    switch (cmd) {
      case 'M':
        for (let i = 0; i < args.length; i += 2) {
          currentX = args[i] * scale;
          currentY = args[i + 1] * scale;
          if (i === 0) {
            startX = currentX;
            startY = currentY;
            commands.push({ type: 'M', points: [{ x: currentX, y: currentY }] });
          } else {
            commands.push({ type: 'L', points: [{ x: currentX, y: currentY }] });
          }
        }
        break;

      case 'm':
        for (let i = 0; i < args.length; i += 2) {
          currentX += args[i] * scale;
          currentY += args[i + 1] * scale;
          if (i === 0) {
            startX = currentX;
            startY = currentY;
            commands.push({ type: 'M', points: [{ x: currentX, y: currentY }] });
          } else {
            commands.push({ type: 'L', points: [{ x: currentX, y: currentY }] });
          }
        }
        break;

      case 'L':
        for (let i = 0; i < args.length; i += 2) {
          currentX = args[i] * scale;
          currentY = args[i + 1] * scale;
          commands.push({ type: 'L', points: [{ x: currentX, y: currentY }] });
        }
        break;

      case 'l':
        for (let i = 0; i < args.length; i += 2) {
          currentX += args[i] * scale;
          currentY += args[i + 1] * scale;
          commands.push({ type: 'L', points: [{ x: currentX, y: currentY }] });
        }
        break;

      case 'H':
        for (const arg of args) {
          currentX = arg * scale;
          commands.push({ type: 'L', points: [{ x: currentX, y: currentY }] });
        }
        break;

      case 'h':
        for (const arg of args) {
          currentX += arg * scale;
          commands.push({ type: 'L', points: [{ x: currentX, y: currentY }] });
        }
        break;

      case 'V':
        for (const arg of args) {
          currentY = arg * scale;
          commands.push({ type: 'L', points: [{ x: currentX, y: currentY }] });
        }
        break;

      case 'v':
        for (const arg of args) {
          currentY += arg * scale;
          commands.push({ type: 'L', points: [{ x: currentX, y: currentY }] });
        }
        break;

      case 'C':
        for (let i = 0; i < args.length; i += 6) {
          const c1x = args[i] * scale;
          const c1y = args[i + 1] * scale;
          const c2x = args[i + 2] * scale;
          const c2y = args[i + 3] * scale;
          const ex = args[i + 4] * scale;
          const ey = args[i + 5] * scale;
          commands.push({
            type: 'C',
            points: [{ x: c1x, y: c1y }, { x: c2x, y: c2y }, { x: ex, y: ey }],
          });
          lastControlX = c2x;
          lastControlY = c2y;
          currentX = ex;
          currentY = ey;
        }
        break;

      case 'c':
        for (let i = 0; i < args.length; i += 6) {
          const c1x = currentX + args[i] * scale;
          const c1y = currentY + args[i + 1] * scale;
          const c2x = currentX + args[i + 2] * scale;
          const c2y = currentY + args[i + 3] * scale;
          const ex = currentX + args[i + 4] * scale;
          const ey = currentY + args[i + 5] * scale;
          commands.push({
            type: 'C',
            points: [{ x: c1x, y: c1y }, { x: c2x, y: c2y }, { x: ex, y: ey }],
          });
          lastControlX = c2x;
          lastControlY = c2y;
          currentX = ex;
          currentY = ey;
        }
        break;

      case 'S':
        for (let i = 0; i < args.length; i += 4) {
          const c1x = 2 * currentX - lastControlX;
          const c1y = 2 * currentY - lastControlY;
          const c2x = args[i] * scale;
          const c2y = args[i + 1] * scale;
          const ex = args[i + 2] * scale;
          const ey = args[i + 3] * scale;
          commands.push({
            type: 'C',
            points: [{ x: c1x, y: c1y }, { x: c2x, y: c2y }, { x: ex, y: ey }],
          });
          lastControlX = c2x;
          lastControlY = c2y;
          currentX = ex;
          currentY = ey;
        }
        break;

      case 's':
        for (let i = 0; i < args.length; i += 4) {
          const c1x = 2 * currentX - lastControlX;
          const c1y = 2 * currentY - lastControlY;
          const c2x = currentX + args[i] * scale;
          const c2y = currentY + args[i + 1] * scale;
          const ex = currentX + args[i + 2] * scale;
          const ey = currentY + args[i + 3] * scale;
          commands.push({
            type: 'C',
            points: [{ x: c1x, y: c1y }, { x: c2x, y: c2y }, { x: ex, y: ey }],
          });
          lastControlX = c2x;
          lastControlY = c2y;
          currentX = ex;
          currentY = ey;
        }
        break;

      case 'Q':
        for (let i = 0; i < args.length; i += 4) {
          const qx = args[i] * scale;
          const qy = args[i + 1] * scale;
          const ex = args[i + 2] * scale;
          const ey = args[i + 3] * scale;
          const c1x = currentX + (2 / 3) * (qx - currentX);
          const c1y = currentY + (2 / 3) * (qy - currentY);
          const c2x = ex + (2 / 3) * (qx - ex);
          const c2y = ey + (2 / 3) * (qy - ey);
          commands.push({
            type: 'C',
            points: [{ x: c1x, y: c1y }, { x: c2x, y: c2y }, { x: ex, y: ey }],
          });
          lastControlX = qx;
          lastControlY = qy;
          currentX = ex;
          currentY = ey;
        }
        break;

      case 'q':
        for (let i = 0; i < args.length; i += 4) {
          const qx = currentX + args[i] * scale;
          const qy = currentY + args[i + 1] * scale;
          const ex = currentX + args[i + 2] * scale;
          const ey = currentY + args[i + 3] * scale;
          const c1x = currentX + (2 / 3) * (qx - currentX);
          const c1y = currentY + (2 / 3) * (qy - currentY);
          const c2x = ex + (2 / 3) * (qx - ex);
          const c2y = ey + (2 / 3) * (qy - ey);
          commands.push({
            type: 'C',
            points: [{ x: c1x, y: c1y }, { x: c2x, y: c2y }, { x: ex, y: ey }],
          });
          lastControlX = qx;
          lastControlY = qy;
          currentX = ex;
          currentY = ey;
        }
        break;

      case 'T':
        for (let i = 0; i < args.length; i += 2) {
          const qx = 2 * currentX - lastControlX;
          const qy = 2 * currentY - lastControlY;
          const ex = args[i] * scale;
          const ey = args[i + 1] * scale;
          const c1x = currentX + (2 / 3) * (qx - currentX);
          const c1y = currentY + (2 / 3) * (qy - currentY);
          const c2x = ex + (2 / 3) * (qx - ex);
          const c2y = ey + (2 / 3) * (qy - ey);
          commands.push({
            type: 'C',
            points: [{ x: c1x, y: c1y }, { x: c2x, y: c2y }, { x: ex, y: ey }],
          });
          lastControlX = qx;
          lastControlY = qy;
          currentX = ex;
          currentY = ey;
        }
        break;

      case 't':
        for (let i = 0; i < args.length; i += 2) {
          const qx = 2 * currentX - lastControlX;
          const qy = 2 * currentY - lastControlY;
          const ex = currentX + args[i] * scale;
          const ey = currentY + args[i + 1] * scale;
          const c1x = currentX + (2 / 3) * (qx - currentX);
          const c1y = currentY + (2 / 3) * (qy - currentY);
          const c2x = ex + (2 / 3) * (qx - ex);
          const c2y = ey + (2 / 3) * (qy - ey);
          commands.push({
            type: 'C',
            points: [{ x: c1x, y: c1y }, { x: c2x, y: c2y }, { x: ex, y: ey }],
          });
          lastControlX = qx;
          lastControlY = qy;
          currentX = ex;
          currentY = ey;
        }
        break;

      case 'A':
        for (let i = 0; i < args.length; i += 7) {
          const rx = args[i] * scale;
          const ry = args[i + 1] * scale;
          const phi = degToRad(args[i + 2]);
          const largeArc = args[i + 3] === 1;
          const sweep = args[i + 4] === 1;
          const ex = args[i + 5] * scale;
          const ey = args[i + 6] * scale;

          const curves = arcToBeziers(currentX, currentY, rx, ry, phi, largeArc, sweep, ex, ey);
          for (const curve of curves) {
            commands.push({
              type: 'C',
              points: [curve[1], curve[2], curve[3]],
            });
          }
          currentX = ex;
          currentY = ey;
        }
        break;

      case 'a':
        for (let i = 0; i < args.length; i += 7) {
          const rx = args[i] * scale;
          const ry = args[i + 1] * scale;
          const phi = degToRad(args[i + 2]);
          const largeArc = args[i + 3] === 1;
          const sweep = args[i + 4] === 1;
          const ex = currentX + args[i + 5] * scale;
          const ey = currentY + args[i + 6] * scale;

          const curves = arcToBeziers(currentX, currentY, rx, ry, phi, largeArc, sweep, ex, ey);
          for (const curve of curves) {
            commands.push({
              type: 'C',
              points: [curve[1], curve[2], curve[3]],
            });
          }
          currentX = ex;
          currentY = ey;
        }
        break;

      case 'Z':
      case 'z':
        if (currentX !== startX || currentY !== startY) {
          commands.push({ type: 'L', points: [{ x: startX, y: startY }] });
        }
        commands.push({ type: 'Z', points: [] });
        currentX = startX;
        currentY = startY;
        break;
    }
  }

  return commands;
}

export function commandsToPoints(commands: NormalizedCommand[], samplesPerCurve: number = 10): Point[] {
  const points: Point[] = [];
  let currentX = 0;
  let currentY = 0;

  for (const cmd of commands) {
    switch (cmd.type) {
      case 'M':
        currentX = cmd.points[0].x;
        currentY = cmd.points[0].y;
        points.push({ x: currentX, y: currentY });
        break;

      case 'L':
        currentX = cmd.points[0].x;
        currentY = cmd.points[0].y;
        points.push({ x: currentX, y: currentY });
        break;

      case 'C': {
        const [c1, c2, end] = cmd.points;
        for (let i = 1; i <= samplesPerCurve; i++) {
          const t = i / samplesPerCurve;
          const mt = 1 - t;
          const x =
            mt * mt * mt * currentX +
            3 * mt * mt * t * c1.x +
            3 * mt * t * t * c2.x +
            t * t * t * end.x;
          const y =
            mt * mt * mt * currentY +
            3 * mt * mt * t * c1.y +
            3 * mt * t * t * c2.y +
            t * t * t * end.y;
          points.push({ x, y });
        }
        currentX = end.x;
        currentY = end.y;
        break;
      }

      case 'Z':
        break;
    }
  }

  return points;
}

export const PRIMITIVE_SHAPES: Record<string, string> = {
  // Classic shapes
  heart: "M 0 -30 C -25 -55 -50 -30 -50 -5 C -50 20 0 50 0 50 C 0 50 50 20 50 -5 C 50 -30 25 -55 0 -30 Z",
  star: "M 0 -50 L 11 -16 L 48 -16 L 18 8 L 29 42 L 0 20 L -29 42 L -18 8 L -48 -16 L -11 -16 Z",
  arrow: "M 0 -50 L 25 -10 L 12 -10 L 12 50 L -12 50 L -12 -10 L -25 -10 Z",
  moon: "M 20 -35 C -15 -35 -35 -10 -35 20 C -35 45 -10 55 20 50 C -5 45 -15 25 -15 5 C -15 -20 0 -35 20 -35 Z",
  crown: "M -40 30 L -40 -10 L -20 10 L 0 -30 L 20 10 L 40 -10 L 40 30 Z",
  lightning: "M 10 -50 L -20 0 L 0 0 L -10 50 L 30 -5 L 10 -5 Z",
  leaf: "M 0 50 C -40 30 -45 -10 -30 -40 C -10 -55 20 -50 35 -30 C 50 -5 45 35 0 50 Z M 0 50 L 0 -20",
  mushroom: "M -35 10 C -35 -25 -15 -45 0 -45 C 15 -45 35 -25 35 10 L 15 10 L 15 45 L -15 45 L -15 10 Z",
  cactus: "M -8 50 L -8 -5 L -25 -5 L -25 -25 L -8 -25 L -8 -50 L 8 -50 L 8 -25 L 25 -25 L 25 -5 L 8 -5 L 8 50 Z",
  cat: "M -25 45 L -25 0 L -40 -25 L -25 -15 L -15 -35 L 0 -25 L 15 -35 L 25 -15 L 40 -25 L 25 0 L 25 45 Z",
  diamond: "M 0 -50 L 35 0 L 0 50 L -35 0 Z",
  circle: "M 0 -40 C 22 -40 40 -22 40 0 C 40 22 22 40 0 40 C -22 40 -40 22 -40 0 C -40 -22 -22 -40 0 -40 Z",
  infinity: "M -50 0 C -50 -18 -38 -25 -25 -25 C -12 -25 0 -12 0 0 C 0 12 12 25 25 25 C 38 25 50 18 50 0 C 50 -18 38 -25 25 -25 C 12 -25 0 -12 0 0 C 0 12 -12 25 -25 25 C -38 25 -50 18 -50 0 Z",
  flame: "M 0 -50 C 15 -30 25 -10 20 10 C 18 25 5 35 0 50 C -5 35 -18 25 -20 10 C -25 -10 -15 -30 0 -50 Z",
  music: "M 8 -40 L 8 25 C 8 35 -2 40 -12 35 C -22 30 -22 15 -12 10 C -2 5 8 10 8 25 L 8 -40 L 25 -50 L 25 -25 Z",
  peace: "M 0 -45 C 25 -45 45 -25 45 0 C 45 25 25 45 0 45 C -25 45 -45 25 -45 0 C -45 -25 -25 -45 0 -45 L 0 -35 C -19 -35 -35 -19 -35 0 C -35 19 -19 35 0 35 C 19 35 35 19 35 0 C 35 -19 19 -35 0 -35 L 0 -45 Z",
  
  // Retro Tech
  glasses: "M -50 -5 L -50 5 L -35 5 L -35 15 C -35 25 -25 25 -15 25 L -5 25 C 5 25 5 15 5 5 L 5 -5 C 5 -15 5 -25 -5 -25 L -15 -25 C -25 -25 -35 -25 -35 -15 L -35 -5 L -50 -5 Z M 5 0 L 15 0 M 15 -5 L 15 5 L 30 5 L 30 15 C 30 25 40 25 50 25 L 60 25 C 70 25 70 15 70 5 L 70 -5 C 70 -15 70 -25 60 -25 L 50 -25 C 40 -25 30 -25 30 -15 L 30 -5 L 15 -5 Z",
  floppy: "M -40 -45 L -40 45 L 40 45 L 40 -35 L 30 -45 L -40 -45 Z M -25 -45 L -25 -20 L 25 -20 L 25 -45 Z M -25 15 L -25 45 L 25 45 L 25 15 Z M 15 -40 L 15 -25 L 20 -25 L 20 -40 Z",
  cd: "M 0 -45 C 25 -45 45 -25 45 0 C 45 25 25 45 0 45 C -25 45 -45 25 -45 0 C -45 -25 -25 -45 0 -45 Z M 0 -12 C 7 -12 12 -7 12 0 C 12 7 7 12 0 12 C -7 12 -12 7 -12 0 C -12 -7 -7 -12 0 -12 Z",
  computer: "M -45 -35 L -45 15 L 45 15 L 45 -35 L -45 -35 Z M -35 -25 L -35 5 L 35 5 L 35 -25 L -35 -25 Z M -15 15 L -15 25 L 15 25 L 15 15 Z M -25 25 L -25 35 L 25 35 L 25 25 Z",
  brickphone: "M -20 -50 L -20 50 L 20 50 L 20 -50 L -20 -50 Z M -15 -45 L -15 -20 L 15 -20 L 15 -45 L -15 -45 Z M -12 -12 L -4 -12 L -4 -4 L -12 -4 Z M 4 -12 L 12 -12 L 12 -4 L 4 -4 Z M -12 4 L -4 4 L -4 12 L -12 12 Z M 4 4 L 12 4 L 12 12 L 4 12 Z M -12 20 L -4 20 L -4 28 L -12 28 Z M 4 20 L 12 20 L 12 28 L 4 28 Z M -12 36 L -4 36 L -4 44 L -12 44 Z M 4 36 L 12 36 L 12 44 L 4 44 Z",
  sodacan: "M -20 -50 L -25 -40 L -25 45 C -25 50 -15 50 0 50 C 15 50 25 50 25 45 L 25 -40 L 20 -50 L -20 -50 Z M -18 -45 L 18 -45 M -8 -50 L -8 -55 L 8 -55 L 8 -50 M 25 -20 L 35 -30 L 45 -25 L 45 5 L 35 10 L 25 5",
  
  // Space & Planets
  saturn: "M 0 -25 C 30 -25 40 -15 40 0 C 40 15 30 25 0 25 C -30 25 -40 15 -40 0 C -40 -15 -30 -25 0 -25 Z M -55 -8 C -45 -12 -20 -10 0 -8 C 20 -6 45 -4 55 -8 M -55 8 C -45 4 -20 6 0 8 C 20 10 45 12 55 8",
  jupiter: "M 0 -40 C 30 -40 45 -22 45 0 C 45 22 30 40 0 40 C -30 40 -45 22 -45 0 C -45 -22 -30 -40 0 -40 Z M -40 -20 L 40 -20 M -42 -8 L 42 -8 M -42 8 L 42 8 M -40 20 L 40 20",
  orbit: "M 0 -15 C 8 -15 15 -8 15 0 C 15 8 8 15 0 15 C -8 15 -15 8 -15 0 C -15 -8 -8 -15 0 -15 Z M 0 -45 C 25 -45 45 -25 45 0 C 45 25 25 45 0 45 C -25 45 -45 25 -45 0 C -45 -25 -25 -45 0 -45 Z M 35 -25 C 40 -25 45 -20 45 -15 C 45 -10 40 -5 35 -5 C 30 -5 25 -10 25 -15 C 25 -20 30 -25 35 -25 Z",
  
  // Nature & Food
  spaghetti: "M -35 -20 C -35 -40 -20 -45 0 -45 C 20 -45 35 -40 35 -20 L 35 30 C 35 45 20 50 0 50 C -20 50 -35 45 -35 30 L -35 -20 Z M -20 -15 C -20 5 -15 20 0 25 C 15 20 20 5 20 -15 M -25 0 C -10 10 10 10 25 0 M -15 20 L -10 35 M 0 22 L 0 38 M 15 20 L 10 35",
  brain: "M 0 -40 C -15 -40 -25 -35 -30 -25 C -40 -25 -45 -15 -45 0 C -45 15 -40 25 -30 30 C -25 40 -15 45 0 45 C 15 45 25 40 30 30 C 40 25 45 15 45 0 C 45 -15 40 -25 30 -25 C 25 -35 15 -40 0 -40 Z M 0 -30 L 0 35 M -20 -20 C -10 -15 10 -15 20 -20 M -25 0 C -15 5 15 5 25 0 M -20 20 C -10 25 10 25 20 20",
  dinosaur: "M -10 -50 L -5 -40 L 5 -40 L 10 -50 L 10 -35 L 20 -25 L 40 -20 L 45 -10 L 35 -5 L 25 -10 L 15 -5 L 15 10 L 25 25 L 25 45 L 15 45 L 15 30 L 5 20 L -5 20 L -15 30 L -15 45 L -25 45 L -25 25 L -15 10 L -15 -5 L -25 -15 L -25 -30 L -15 -35 L -10 -50 Z",
  
  // Dice
  dice1: "M -35 -35 L 35 -35 L 35 35 L -35 35 L -35 -35 Z M 0 -5 C 3 -5 5 -3 5 0 C 5 3 3 5 0 5 C -3 5 -5 3 -5 0 C -5 -3 -3 -5 0 -5 Z",
  dice2: "M -35 -35 L 35 -35 L 35 35 L -35 35 L -35 -35 Z M -18 -18 C -15 -18 -13 -16 -13 -13 C -13 -10 -15 -8 -18 -8 C -21 -8 -23 -10 -23 -13 C -23 -16 -21 -18 -18 -18 Z M 18 18 C 21 18 23 16 23 13 C 23 10 21 8 18 8 C 15 8 13 10 13 13 C 13 16 15 18 18 18 Z",
  dice3: "M -35 -35 L 35 -35 L 35 35 L -35 35 L -35 -35 Z M -18 -18 C -15 -18 -13 -16 -13 -13 C -13 -10 -15 -8 -18 -8 C -21 -8 -23 -10 -23 -13 C -23 -16 -21 -18 -18 -18 Z M 0 -5 C 3 -5 5 -3 5 0 C 5 3 3 5 0 5 C -3 5 -5 3 -5 0 C -5 -3 -3 -5 0 -5 Z M 18 18 C 21 18 23 16 23 13 C 23 10 21 8 18 8 C 15 8 13 10 13 13 C 13 16 15 18 18 18 Z",
  dice4: "M -35 -35 L 35 -35 L 35 35 L -35 35 L -35 -35 Z M -18 -18 C -15 -18 -13 -16 -13 -13 C -13 -10 -15 -8 -18 -8 C -21 -8 -23 -10 -23 -13 C -23 -16 -21 -18 -18 -18 Z M 18 -18 C 21 -18 23 -16 23 -13 C 23 -10 21 -8 18 -8 C 15 -8 13 -10 13 -13 C 13 -16 15 -18 18 -18 Z M -18 18 C -15 18 -13 16 -13 13 C -13 10 -15 8 -18 8 C -21 8 -23 10 -23 13 C -23 16 -21 18 -18 18 Z M 18 18 C 21 18 23 16 23 13 C 23 10 21 8 18 8 C 15 8 13 10 13 13 C 13 16 15 18 18 18 Z",
  dice5: "M -35 -35 L 35 -35 L 35 35 L -35 35 L -35 -35 Z M -18 -18 C -15 -18 -13 -16 -13 -13 C -13 -10 -15 -8 -18 -8 C -21 -8 -23 -10 -23 -13 C -23 -16 -21 -18 -18 -18 Z M 18 -18 C 21 -18 23 -16 23 -13 C 23 -10 21 -8 18 -8 C 15 -8 13 -10 13 -13 C 13 -16 15 -18 18 -18 Z M 0 -5 C 3 -5 5 -3 5 0 C 5 3 3 5 0 5 C -3 5 -5 3 -5 0 C -5 -3 -3 -5 0 -5 Z M -18 18 C -15 18 -13 16 -13 13 C -13 10 -15 8 -18 8 C -21 8 -23 10 -23 13 C -23 16 -21 18 -18 18 Z M 18 18 C 21 18 23 16 23 13 C 23 10 21 8 18 8 C 15 8 13 10 13 13 C 13 16 15 18 18 18 Z",
  dice6: "M -35 -35 L 35 -35 L 35 35 L -35 35 L -35 -35 Z M -18 -23 C -15 -23 -13 -21 -13 -18 C -13 -15 -15 -13 -18 -13 C -21 -13 -23 -15 -23 -18 C -23 -21 -21 -23 -18 -23 Z M 18 -23 C 21 -23 23 -21 23 -18 C 23 -15 21 -13 18 -13 C 15 -13 13 -15 13 -18 C 13 -21 15 -23 18 -23 Z M -18 -5 C -15 -5 -13 -3 -13 0 C -13 3 -15 5 -18 5 C -21 5 -23 3 -23 0 C -23 -3 -21 -5 -18 -5 Z M 18 -5 C 21 -5 23 -3 23 0 C 23 3 21 5 18 5 C 15 5 13 3 13 0 C 13 -3 15 -5 18 -5 Z M -18 13 C -15 13 -13 15 -13 18 C -13 21 -15 23 -18 23 C -21 23 -23 21 -23 18 C -23 15 -21 13 -18 13 Z M 18 13 C 21 13 23 15 23 18 C 23 21 21 23 18 23 C 15 23 13 21 13 18 C 13 15 15 13 18 13 Z",
  
  // Clock faces
  clock3: "M 0 -45 C 25 -45 45 -25 45 0 C 45 25 25 45 0 45 C -25 45 -45 25 -45 0 C -45 -25 -25 -45 0 -45 Z M 0 -38 L 0 -32 M 38 0 L 32 0 M 0 38 L 0 32 M -38 0 L -32 0 M 0 0 L 0 -20 M 0 0 L 22 0",
  clock6: "M 0 -45 C 25 -45 45 -25 45 0 C 45 25 25 45 0 45 C -25 45 -45 25 -45 0 C -45 -25 -25 -45 0 -45 Z M 0 -38 L 0 -32 M 38 0 L 32 0 M 0 38 L 0 32 M -38 0 L -32 0 M 0 0 L 0 -20 M 0 0 L 0 22",
  clock9: "M 0 -45 C 25 -45 45 -25 45 0 C 45 25 25 45 0 45 C -25 45 -45 25 -45 0 C -45 -25 -25 -45 0 -45 Z M 0 -38 L 0 -32 M 38 0 L 32 0 M 0 38 L 0 32 M -38 0 L -32 0 M 0 0 L 0 -20 M 0 0 L -22 0",
  clock12: "M 0 -45 C 25 -45 45 -25 45 0 C 45 25 25 45 0 45 C -25 45 -45 25 -45 0 C -45 -25 -25 -45 0 -45 Z M 0 -38 L 0 -32 M 38 0 L 32 0 M 0 38 L 0 32 M -38 0 L -32 0 M 0 0 L 0 -20 M 0 0 L 0 -28",
  
  // Stick Figures - Different Poses
  stickStand: "M 0 -45 C 8 -45 12 -38 12 -33 C 12 -28 8 -22 0 -22 C -8 -22 -12 -28 -12 -33 C -12 -38 -8 -45 0 -45 Z M 0 -22 L 0 15 M 0 -8 L -25 5 M 0 -8 L 25 5 M 0 15 L -15 50 M 0 15 L 15 50",
  stickWave: "M 0 -45 C 8 -45 12 -38 12 -33 C 12 -28 8 -22 0 -22 C -8 -22 -12 -28 -12 -33 C -12 -38 -8 -45 0 -45 Z M 0 -22 L 0 15 M 0 -8 L -25 5 M 0 -8 L 20 -25 L 30 -35 M 0 15 L -15 50 M 0 15 L 15 50",
  stickJump: "M 0 -45 C 8 -45 12 -38 12 -33 C 12 -28 8 -22 0 -22 C -8 -22 -12 -28 -12 -33 C -12 -38 -8 -45 0 -45 Z M 0 -22 L 0 15 M 0 -8 L -30 -20 M 0 -8 L 30 -20 M 0 15 L -20 35 L -30 25 M 0 15 L 20 35 L 30 25",
  stickDance: "M 0 -45 C 8 -45 12 -38 12 -33 C 12 -28 8 -22 0 -22 C -8 -22 -12 -28 -12 -33 C -12 -38 -8 -45 0 -45 Z M 0 -22 L 0 15 M 0 -8 L -25 -20 M 0 -8 L 25 15 M 0 15 L -20 45 M 0 15 L 25 40",
  stickSit: "M 0 -45 C 8 -45 12 -38 12 -33 C 12 -28 8 -22 0 -22 C -8 -22 -12 -28 -12 -33 C -12 -38 -8 -45 0 -45 Z M 0 -22 L 0 15 M 0 -8 L -25 5 M 0 -8 L 25 5 M 0 15 L -25 15 L -25 50 M 0 15 L 25 15 L 25 50",
  stickRun: "M 0 -45 C 8 -45 12 -38 12 -33 C 12 -28 8 -22 0 -22 C -8 -22 -12 -28 -12 -33 C -12 -38 -8 -45 0 -45 Z M 0 -22 L 5 15 M 0 -8 L -30 -5 M 0 -8 L 30 -15 M 5 15 L -15 45 M 5 15 L 30 35",
  
  // Emoji Faces
  emojiHappy: "M 0 -45 C 25 -45 45 -25 45 0 C 45 25 25 45 0 45 C -25 45 -45 25 -45 0 C -45 -25 -25 -45 0 -45 Z M -15 -10 C -12 -10 -10 -8 -10 -5 C -10 -2 -12 0 -15 0 C -18 0 -20 -2 -20 -5 C -20 -8 -18 -10 -15 -10 Z M 15 -10 C 18 -10 20 -8 20 -5 C 20 -2 18 0 15 0 C 12 0 10 -2 10 -5 C 10 -8 12 -10 15 -10 Z M -20 15 C -10 25 10 25 20 15",
  emojiSad: "M 0 -45 C 25 -45 45 -25 45 0 C 45 25 25 45 0 45 C -25 45 -45 25 -45 0 C -45 -25 -25 -45 0 -45 Z M -15 -10 C -12 -10 -10 -8 -10 -5 C -10 -2 -12 0 -15 0 C -18 0 -20 -2 -20 -5 C -20 -8 -18 -10 -15 -10 Z M 15 -10 C 18 -10 20 -8 20 -5 C 20 -2 18 0 15 0 C 12 0 10 -2 10 -5 C 10 -8 12 -10 15 -10 Z M -20 25 C -10 15 10 15 20 25",
  emojiWink: "M 0 -45 C 25 -45 45 -25 45 0 C 45 25 25 45 0 45 C -25 45 -45 25 -45 0 C -45 -25 -25 -45 0 -45 Z M -20 -5 L -10 -5 M 15 -10 C 18 -10 20 -8 20 -5 C 20 -2 18 0 15 0 C 12 0 10 -2 10 -5 C 10 -8 12 -10 15 -10 Z M -20 15 C -10 25 10 25 20 15",
  emojiLove: "M 0 -45 C 25 -45 45 -25 45 0 C 45 25 25 45 0 45 C -25 45 -45 25 -45 0 C -45 -25 -25 -45 0 -45 Z M -15 -15 C -18 -18 -22 -15 -22 -10 C -22 -5 -15 0 -15 0 C -15 0 -8 -5 -8 -10 C -8 -15 -12 -18 -15 -15 Z M 15 -15 C 12 -18 8 -15 8 -10 C 8 -5 15 0 15 0 C 15 0 22 -5 22 -10 C 22 -15 18 -18 15 -15 Z M -20 18 C -10 28 10 28 20 18",
  emojiCool: "M 0 -45 C 25 -45 45 -25 45 0 C 45 25 25 45 0 45 C -25 45 -45 25 -45 0 C -45 -25 -25 -45 0 -45 Z M -28 -8 L -5 -8 L -5 2 L -28 2 L -28 -8 Z M 5 -8 L 28 -8 L 28 2 L 5 2 L 5 -8 Z M -20 18 C -10 25 10 25 20 18",
  emojiShock: "M 0 -45 C 25 -45 45 -25 45 0 C 45 25 25 45 0 45 C -25 45 -45 25 -45 0 C -45 -25 -25 -45 0 -45 Z M -15 -12 C -12 -12 -8 -8 -8 -5 C -8 -2 -12 2 -15 2 C -18 2 -22 -2 -22 -5 C -22 -8 -18 -12 -15 -12 Z M 15 -12 C 18 -12 22 -8 22 -5 C 22 -2 18 2 15 2 C 12 2 8 -2 8 -5 C 8 -8 12 -12 15 -12 Z M 0 15 C 8 15 12 20 12 25 C 12 30 8 35 0 35 C -8 35 -12 30 -12 25 C -12 20 -8 15 0 15 Z",
  
  // 8-bit Style
  bit8Heart: "M -30 -15 L -30 -30 L -15 -30 L -15 -45 L 0 -45 L 0 -30 L 15 -30 L 15 -45 L 30 -45 L 30 -30 L 45 -30 L 45 -15 L 45 0 L 30 0 L 30 15 L 15 15 L 15 30 L 0 30 L 0 45 L -15 45 L -15 30 L -30 30 L -30 15 L -45 15 L -45 0 L -45 -15 L -30 -15 Z",
  bit8Star: "M 0 -45 L 0 -30 L -15 -30 L -15 -15 L -30 -15 L -30 0 L -45 0 L -45 15 L -30 15 L -30 30 L -15 30 L -15 45 L 0 45 L 0 30 L 15 30 L 15 15 L 30 15 L 30 0 L 45 0 L 45 -15 L 30 -15 L 30 -30 L 15 -30 L 15 -45 L 0 -45 Z",
  bit8Person: "M -8 -50 L 8 -50 L 8 -35 L -8 -35 L -8 -50 Z M -15 -35 L 15 -35 L 15 -5 L -15 -5 L -15 -35 Z M -23 -20 L -15 -20 L -15 0 L -23 0 L -23 -20 Z M 15 -20 L 23 -20 L 23 0 L 15 0 L 15 -20 Z M -15 -5 L -8 -5 L -8 30 L -15 30 L -15 -5 Z M 8 -5 L 15 -5 L 15 30 L 8 30 L 8 -5 Z M -15 30 L -8 30 L -8 50 L -15 50 L -15 30 Z M 8 30 L 15 30 L 15 50 L 8 50 L 8 30 Z",
  bit8Invader: "M -30 -30 L -15 -30 L -15 -45 L 0 -45 L 0 -30 L 15 -30 L 15 -45 L 30 -45 L 30 -30 L 45 -30 L 45 0 L 30 0 L 30 15 L 15 15 L 15 30 L 0 30 L 0 15 L -15 15 L -15 30 L -30 30 L -30 15 L -45 15 L -45 0 L -30 0 L -30 -30 Z M -22 -15 L -8 -15 L -8 0 L -22 0 L -22 -15 Z M 8 -15 L 22 -15 L 22 0 L 8 0 L 8 -15 Z",
};

export const SHAPE_LABELS: Record<string, string> = {
  // Classic
  heart: "Heart",
  star: "Star",
  arrow: "Arrow",
  moon: "Moon",
  crown: "Crown",
  lightning: "Lightning",
  leaf: "Leaf",
  mushroom: "Mushroom",
  cactus: "Cactus",
  cat: "Cat",
  diamond: "Diamond",
  circle: "Circle",
  infinity: "Infinity",
  flame: "Flame",
  music: "Music Note",
  peace: "Peace",
  
  // Retro Tech
  glasses: "Glasses",
  floppy: "Floppy Disk",
  cd: "CD/DVD",
  computer: "80s Computer",
  brickphone: "Brick Phone",
  sodacan: "Soda Can",
  
  // Space & Planets
  saturn: "Saturn",
  jupiter: "Jupiter",
  orbit: "Planet Orbit",
  
  // Nature & Food
  spaghetti: "Spaghetti Bowl",
  brain: "Brain",
  dinosaur: "Dinosaur",
  
  // Dice
  dice1: "Dice (1)",
  dice2: "Dice (2)",
  dice3: "Dice (3)",
  dice4: "Dice (4)",
  dice5: "Dice (5)",
  dice6: "Dice (6)",
  
  // Clocks
  clock3: "Clock (3:00)",
  clock6: "Clock (6:00)",
  clock9: "Clock (9:00)",
  clock12: "Clock (12:00)",
  
  // Stick Figures
  stickStand: "Stick Standing",
  stickWave: "Stick Waving",
  stickJump: "Stick Jumping",
  stickDance: "Stick Dancing",
  stickSit: "Stick Sitting",
  stickRun: "Stick Running",
  
  // Emoji Faces
  emojiHappy: "Happy Face",
  emojiSad: "Sad Face",
  emojiWink: "Wink Face",
  emojiLove: "Love Eyes",
  emojiCool: "Cool Shades",
  emojiShock: "Shocked",
  
  // 8-bit Style
  bit8Heart: "8-bit Heart",
  bit8Star: "8-bit Star",
  bit8Person: "8-bit Person",
  bit8Invader: "8-bit Invader",
};

// Shape categories for organized UI
export const SHAPE_CATEGORIES: Record<string, string[]> = {
  "Classic": ["heart", "star", "arrow", "moon", "crown", "lightning", "diamond", "circle", "infinity", "flame", "peace"],
  "Nature": ["leaf", "mushroom", "cactus", "cat", "dinosaur", "brain", "spaghetti"],
  "Retro Tech": ["glasses", "floppy", "cd", "computer", "brickphone", "sodacan", "music"],
  "Space": ["saturn", "jupiter", "orbit"],
  "Dice": ["dice1", "dice2", "dice3", "dice4", "dice5", "dice6"],
  "Clocks": ["clock3", "clock6", "clock9", "clock12"],
  "Stick Figures": ["stickStand", "stickWave", "stickJump", "stickDance", "stickSit", "stickRun"],
  "Emoji Faces": ["emojiHappy", "emojiSad", "emojiWink", "emojiLove", "emojiCool", "emojiShock"],
  "8-bit Pixel": ["bit8Heart", "bit8Star", "bit8Person", "bit8Invader"],
};
