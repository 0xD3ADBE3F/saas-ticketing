"use client";

import { useEffect } from "react";
import confetti from "canvas-confetti";

function randomInRange(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

export function ConfettiAnimation() {
  useEffect(() => {
    // Fire confetti cannons from random positions at the bottom
    const fireConfetti = () => {
      confetti({
        angle: randomInRange(55, 125),
        spread: randomInRange(50, 70),
        particleCount: randomInRange(50, 100),
        origin: {
          y: 1, // Start from bottom
          x: randomInRange(0.2, 0.8), // Random position between 20% and 80%
        },
        zIndex: 9999,
        startVelocity: randomInRange(45, 65),
        decay: randomInRange(0.88, 0.94),
        scalar: randomInRange(0.8, 1.2),
      });
    };

    // Fire multiple bursts from different positions
    const timings = [0, 200, 400, 600];

    timings.forEach((delay) => {
      setTimeout(() => {
        fireConfetti();
      }, delay);
    });

    // Cleanup
    return () => {
      confetti.reset();
    };
  }, []);

  return null;
}
