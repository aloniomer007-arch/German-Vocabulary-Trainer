
import React from 'react';
import { PieceType, Color } from '../types';

interface PieceIconProps {
  type: PieceType;
  color: Color;
}

// Minimalistic Chess Set SVGs
const PieceIcon: React.FC<PieceIconProps> = ({ type, color }) => {
  const isWhite = color === 'w';
  const strokeColor = isWhite ? '#000' : '#fff';
  const fillColor = isWhite ? '#fff' : '#000';

  const icons: Record<PieceType, React.ReactNode> = {
    p: (
      <svg viewBox="0 0 45 45">
        <path d="M22.5 9c-2.21 0-4 1.79-4 4 0 .89.29 1.71.78 2.38C17.33 16.5 16 18.59 16 21c0 2.03.94 3.84 2.41 5.03-3 1.06-7.41 5.55-7.41 13.47h23c0-7.92-4.41-12.41-7.41-13.47 1.47-1.19 2.41-3 2.41-5.03 0-2.41-1.33-4.5-3.28-5.62.49-.67.78-1.49.78-2.38 0-2.21-1.79-4-4-4z" stroke={strokeColor} fill={fillColor} />
      </svg>
    ),
    r: (
      <svg viewBox="0 0 45 45">
        <path d="M9 39h27v-3H9v3zM12 36h21l-2-20H14l-2 20zM11 14V9h4v2h5V9h5v2h5V9h4v5" stroke={strokeColor} fill={fillColor} />
      </svg>
    ),
    n: (
      <svg viewBox="0 0 45 45">
        <path d="M22 10c10.5 1 16.5 8 16 29H15c0-9 10-6.5 8-21" stroke={strokeColor} fill={fillColor} />
        <path d="M24 18c.3 1.2 1.5 1.7 2.5 1.3.8-.4 1.2-1.3.8-2.1" fill="none" stroke={strokeColor} />
      </svg>
    ),
    b: (
      <svg viewBox="0 0 45 45">
        <path d="M9 36c3.39-.97 10.11.43 13.5-2 3.39 2.43 10.11 1.03 13.5 2 0 0 0 3-13.5 3S9 36 9 36z" stroke={strokeColor} fill={fillColor} />
        <path d="M15 32c2.5 2.5 12.5 2.5 15 0 .5-1.5 0-2 0-2 0-2.5-2.5-4-2.5-4 5.5-1.5 6-11.5-5-15.5-11 4-10.5 14-5 15.5 0 0-2.5 1.5-2.5 4 0 0-.5.5 0 2z" stroke={strokeColor} fill={fillColor} />
      </svg>
    ),
    q: (
      <svg viewBox="0 0 45 45">
        <path d="M8 12a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM24.5 7.5a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM41 12a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM9 26c8.5-1.5 21-1.5 27 0l2-12-7 11V11l-5.5 13.5-3-15-3 15-5.5-13.5V25l-7-11 2 12z" stroke={strokeColor} fill={fillColor} />
        <path d="M9 26c0 2 1.5 2 2.5 4 2.5 5 2.5 5 2.5 11h22c0-6 0-6 2.5-11 1-2 2.5-2 2.5-4" stroke={strokeColor} fill={fillColor} />
      </svg>
    ),
    k: (
      <svg viewBox="0 0 45 45">
        <path d="M22.5 11.63V6M20 8h5M22.5 25s4.5-7.5 3-10c-1.5-2.5-6-2.5-6 0-1.5 2.5 3 10 3 10z" stroke={strokeColor} fill={fillColor} />
        <path d="M11.5 37c5.5 3.5 15.5 3.5 21 0v-7s9-4.5 6-10.5c-4-1-1 4-1 4s0 3.5-5 5.5c-3 1.5-3.5 0-3.5 0V18c0-2-1.5-3.5-3.5-3.5S23 16 23 18v11c0 0-.5 1.5-3.5 0-5-2-5-5.5-5-5.5s3-5-1-4c-3 6 6 10.5 6 10.5v7z" stroke={strokeColor} fill={fillColor} />
      </svg>
    ),
  };

  return icons[type] || null;
};

export default PieceIcon;
