import React, { useEffect, useRef } from 'react';

const Background = () => {
  const canvasRef = useRef(null);
  const mouseRef = useRef({ x: null, y: null }); // null means no hover yet

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    // Grid config
    const rows = 20;
    const cols = 40;
    const baseSize = 4;
    const glowRadius = 100; // pixels (about 3-4cm on screen)
    const maxGlowMultiplier = 1.25; // 25% size increase

    // Calculate grid spacing
    let cellWidth = canvas.width / cols;
    let cellHeight = canvas.height / rows;

    // Create particles
    const particles = [];
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const x = col * cellWidth + cellWidth / 2;
        const y = row * cellHeight + cellHeight / 2;
        particles.push({ x, y, size: baseSize, baseSize });
      }
    }

    // Mouse move handler
    const handleMouseMove = (e) => {
      mouseRef.current.x = e.clientX;
      mouseRef.current.y = e.clientY;
    };

    // Mouse out (no hover)
    const handleMouseOut = () => {
      mouseRef.current.x = null;
      mouseRef.current.y = null;
    };

    // Resize handler
    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;

      cellWidth = canvas.width / cols;
      cellHeight = canvas.height / rows;

      particles.forEach((p, idx) => {
        const row = Math.floor(idx / cols);
        const col = idx % cols;
        p.x = col * cellWidth + cellWidth / 2;
        p.y = row * cellHeight + cellHeight / 2;
      });
    };
    const animate = () => {
      ctx.fillStyle = '#0a0a0a'; 
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      particles.forEach((p) => {
        if (mouseRef.current.x !== null && mouseRef.current.y !== null) {
          const dx = p.x - mouseRef.current.x;
          const dy = p.y - mouseRef.current.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < glowRadius) {
            const intensity = 1 - dist / glowRadius;
            p.size = p.baseSize * (1 + intensity * (maxGlowMultiplier - 1));

            const glowSize = p.size * 3;
            const gradient = ctx.createRadialGradient(p.x, p.y, p.size, p.x, p.y, glowSize);
            gradient.addColorStop(0, `rgba(0, 255, 255, ${intensity * 0.7})`);
            gradient.addColorStop(1, 'rgba(0, 255, 255, 0)');

            ctx.beginPath();
            ctx.fillStyle = gradient;
            ctx.arc(p.x, p.y, glowSize, 0, Math.PI * 2);
            ctx.fill();

            // Draw main dot with neon color
            ctx.beginPath();
            ctx.shadowColor = 'cyan';
            ctx.shadowBlur = 15 * intensity;
            ctx.fillStyle = `rgba(0, 255, 255, ${0.8 + 0.2 * intensity})`;
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();

            ctx.shadowBlur = 0; // reset shadow
          } else {
            // Reset size
            p.size = p.baseSize;

            ctx.beginPath();
            ctx.fillStyle = '#22ffff';
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
          }
        } else {
          // No mouse: draw normal dot
          p.size = p.baseSize;
          ctx.beginPath();
          ctx.fillStyle = '#22ffff';
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
        }
      });

      requestAnimationFrame(animate);
    };

    animate();

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseout', handleMouseOut);
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseout', handleMouseOut);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        zIndex: -1,
        pointerEvents: 'none',
        backgroundColor: '#0a0a0a',
        display: 'block',
      }}
    />
  );
};

export default Background;
