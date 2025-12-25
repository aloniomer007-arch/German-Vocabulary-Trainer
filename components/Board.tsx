
import React, { useState, useCallback, useMemo } from 'react';
import { Chess } from 'chess.js';
import PieceIcon from './PieceIcon';
import { PieceType, Color } from '../types';

interface BoardProps {
  fen: string;
  onMove: (move: { from: string; to: string; promotion?: string }) => boolean;
  isAiThinking?: boolean;
}

const Board: React.FC<BoardProps> = ({ fen, onMove, isAiThinking }) => {
  const game = useMemo(() => new Chess(fen), [fen]);
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);
  const [hoveredSquare, setHoveredSquare] = useState<string | null>(null);

  const squares = useMemo(() => {
    const rows = [];
    const boardData = game.board();
    for (let i = 0; i < 8; i++) {
      for (let j = 0; j < 8; j++) {
        const squareName = String.fromCharCode(97 + j) + (8 - i);
        rows.push({
          pos: squareName,
          piece: boardData[i][j],
          color: (i + j) % 2 === 0 ? 'light' : 'dark',
        });
      }
    }
    return rows;
  }, [game]);

  const validMovesForSelected = useMemo(() => {
    if (!selectedSquare) return [];
    return game.moves({ square: selectedSquare as any, verbose: true }).map(m => m.to);
  }, [game, selectedSquare]);

  const handleSquareClick = (pos: string) => {
    if (isAiThinking) return;

    if (selectedSquare === pos) {
      setSelectedSquare(null);
      return;
    }

    // Attempting a move
    if (selectedSquare && validMovesForSelected.includes(pos)) {
      onMove({ from: selectedSquare, to: pos, promotion: 'q' });
      setSelectedSquare(null);
      return;
    }

    // Selecting a piece
    const piece = game.get(pos as any);
    if (piece && piece.color === game.turn()) {
      setSelectedSquare(pos);
    } else {
      setSelectedSquare(null);
    }
  };

  return (
    <div className="grid grid-cols-8 grid-rows-8 w-full h-full select-none cursor-pointer border border-slate-700">
      {squares.map(({ pos, piece, color }) => {
        const isSelected = selectedSquare === pos;
        const isValidMove = validMovesForSelected.includes(pos);
        const hasPiece = !!piece;
        
        return (
          <div
            key={pos}
            onClick={() => handleSquareClick(pos)}
            onMouseEnter={() => setHoveredSquare(pos)}
            onMouseLeave={() => setHoveredSquare(null)}
            className={`
              relative flex items-center justify-center transition-colors duration-200
              ${color === 'light' ? 'bg-[#f0d9b5]' : 'bg-[#b58863]'}
              ${isSelected ? 'ring-4 ring-inset ring-indigo-500 z-10' : ''}
              ${hoveredSquare === pos ? 'brightness-110' : ''}
            `}
          >
            {/* Valid Move Indicator */}
            {isValidMove && (
              <div className={`absolute w-4 h-4 rounded-full ${hasPiece ? 'border-4 border-black/20 w-10 h-10' : 'bg-black/20'}`} />
            )}
            
            {/* Piece */}
            {piece && (
              <div className={`w-[85%] h-[85%] transition-transform duration-200 ${isSelected ? 'scale-110' : 'scale-100 hover:scale-105'}`}>
                <PieceIcon type={piece.type as PieceType} color={piece.color as Color} />
              </div>
            )}

            {/* Coordinates */}
            {pos[0] === 'a' && (
              <span className={`absolute left-0.5 top-0 text-[10px] font-bold ${color === 'light' ? 'text-[#b58863]' : 'text-[#f0d9b5]'}`}>
                {pos[1]}
              </span>
            )}
            {pos[1] === '1' && (
              <span className={`absolute right-0.5 bottom-0 text-[10px] font-bold ${color === 'light' ? 'text-[#b58863]' : 'text-[#f0d9b5]'}`}>
                {pos[0]}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default Board;
