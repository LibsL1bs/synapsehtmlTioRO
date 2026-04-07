import { useEffect, useRef } from "react";

interface Node {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  phase: number;
  targetX?: number;
  targetY?: number;
}

// Generate points along a hexagon path
function getHexagonPoints(cx: number, cy: number, radius: number, count: number): { x: number; y: number }[] {
  const points: { x: number; y: number }[] = [];
  const vertices: { x: number; y: number }[] = [];

  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i - Math.PI / 2;
    vertices.push({
      x: cx + radius * Math.cos(angle),
      y: cy + radius * Math.sin(angle),
    });
  }

  for (let i = 0; i < count; i++) {
    const t = (i / count) * 6;
    const edgeIndex = Math.floor(t) % 6;
    const edgeFraction = t - Math.floor(t);
    const v1 = vertices[edgeIndex];
    const v2 = vertices[(edgeIndex + 1) % 6];
    points.push({
      x: v1.x + (v2.x - v1.x) * edgeFraction,
      y: v1.y + (v2.y - v1.y) * edgeFraction,
    });
  }

  return points;
}

export function NeuralMesh({ className = "", variant = "expand" }: { className?: string; variant?: "expand" | "converge" | "pulse" }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const nodesRef = useRef<Node[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = canvas.offsetWidth * dpr;
      canvas.height = canvas.offsetHeight * dpr;
      ctx.scale(dpr, dpr);
    };
    resize();
    window.addEventListener("resize", resize);

    const W = () => canvas.offsetWidth;
    const H = () => canvas.offsetHeight;
    const NODE_COUNT = 80;
    const CONNECTION_DIST = 180;

    if (nodesRef.current.length === 0) {
      nodesRef.current = Array.from({ length: NODE_COUNT }, () => ({
        x: Math.random() * W(),
        y: Math.random() * H(),
        vx: (Math.random() - 0.5) * 0.15,
        vy: (Math.random() - 0.5) * 0.15,
        size: Math.random() * 1.5 + 0.5,
        phase: Math.random() * Math.PI * 2,
      }));
    }

    // For converge variant: assign each node a random target point on the hexagon edge
    if (variant === "converge") {
      const hexIconSize = H() * 0.85; // 85vh
      const hexCx = W() - 0.50 * hexIconSize; // center accounting for right-0 + translate-x-[25%]
      const hexCy = H() / 2;
      const hexRadius = hexIconSize * 0.42; // match visual hexagon radius
      const hexPoints = getHexagonPoints(hexCx, hexCy, hexRadius, NODE_COUNT);
      for (let i = 0; i < nodesRef.current.length; i++) {
        const target = hexPoints[i % hexPoints.length];
        nodesRef.current[i].targetX = target.x;
        nodesRef.current[i].targetY = target.y;
      }
    }

    const cx = () => W() / 2;
    const cy = () => H() / 2;

    let time = 0;
    const animate = () => {
      time += 0.005;
      const w = W();
      const h = H();
      ctx.clearRect(0, 0, w, h);

      const nodes = nodesRef.current;

      // Update positions
      for (const node of nodes) {
        if (variant === "converge") {
          // Move toward individual target on the hexagon edge
          const tx = node.targetX ?? cx();
          const ty = node.targetY ?? cy();
          const dx = tx - node.x;
          const dy = ty - node.y;
          node.vx += dx * 0.00008;
          node.vy += dy * 0.00008;
        } else if (variant === "pulse") {
          const dx = cx() - node.x;
          const dy = cy() - node.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const pulse = Math.sin(time * 2 + node.phase) * 0.02;
          node.vx += (dx / (dist + 1)) * pulse;
          node.vy += (dy / (dist + 1)) * pulse;
        }

        node.x += node.vx;
        node.y += node.vy;
        node.vx *= 1;
        node.vy *= 1;

        if (node.x < 0 || node.x > w) node.vx *= -1;
        if (node.y < 0 || node.y > h) node.vy *= -1;
        node.x = Math.max(0, Math.min(w, node.x));
        node.y = Math.max(0, Math.min(h, node.y));
      }

      // Draw connections
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x;
          const dy = nodes[i].y - nodes[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < CONNECTION_DIST) {
            const alpha = (1 - dist / CONNECTION_DIST) * 0.35;
            ctx.strokeStyle = `rgba(255, 60, 60, ${alpha})`;
            ctx.lineWidth = 0.8;
            ctx.beginPath();
            ctx.moveTo(nodes[i].x, nodes[i].y);
            ctx.lineTo(nodes[j].x, nodes[j].y);
            ctx.stroke();
          }
        }
      }

      // Draw nodes
      for (const node of nodes) {
        const glow = (Math.sin(time * 3 + node.phase) + 1) / 2;
        const alpha = 0.5 + glow * 0.5;
        ctx.fillStyle = `rgba(255, 60, 60, ${alpha})`;
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.size * 1.8, 0, Math.PI * 2);
        ctx.fill();
      }

      animRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(animRef.current);
    };
  }, [variant]);

  return <canvas ref={canvasRef} className={`w-full h-full ${className}`} />;
}
