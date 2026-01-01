import React, { useState, useEffect, useMemo } from 'react';
import { generateGrid, CHEMISTRY_DATA } from './utils/gameGenerator';
import { playSound } from './utils/sound';
import { GridCell, Coordinate } from './types';
import { 
  LucideRefreshCw, 
  LucideCheckCircle2, 
  LucideFlaskConical, 
  LucideTimer, 
  LucideTimerOff,
  LucidePlay,
  LucideHelpCircle,
  LucideSearch,
  LucideLightbulb
} from 'lucide-react';

const GRID_SIZE = 15;
const MAX_HINTS = 3;

export default function App() {
  // Game Flow State
  const [gameStarted, setGameStarted] = useState(false);
  
  // Game Data State
  const [grid, setGrid] = useState<GridCell[][]>([]);
  const [solutions, setSolutions] = useState<Record<string, string[]>>({});
  const [foundWords, setFoundWords] = useState<string[]>([]);
  const [foundCellIds, setFoundCellIds] = useState<Set<string>>(new Set());
  const [lastFoundWord, setLastFoundWord] = useState<string | null>(null);
  
  // Hint State
  const [hintsRemaining, setHintsRemaining] = useState(MAX_HINTS);
  const [activeHintCellId, setActiveHintCellId] = useState<string | null>(null);

  // Timer State
  const [timerEnabled, setTimerEnabled] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Selection State
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionStart, setSelectionStart] = useState<Coordinate | null>(null);
  const [selectionEnd, setSelectionEnd] = useState<Coordinate | null>(null);

  const isGameWon = foundWords.length === CHEMISTRY_DATA.length;

  // Initialize game
  const startNewGame = () => {
    const { grid: newGrid, solutions: newSolutions } = generateGrid();
    setGrid(newGrid);
    setSolutions(newSolutions);
    setFoundWords([]);
    setFoundCellIds(new Set());
    setLastFoundWord(null);
    setElapsedSeconds(0);
    setHintsRemaining(MAX_HINTS);
    setActiveHintCellId(null);
    playSound('select'); // Subtle sound to confirm reset
  };

  useEffect(() => {
    startNewGame();
  }, []);

  // Timer Effect
  useEffect(() => {
    let interval: number;
    if (timerEnabled && !isGameWon && gameStarted) {
      interval = window.setInterval(() => {
        setElapsedSeconds(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timerEnabled, isGameWon, gameStarted]);

  // -- Hint Logic --
  const useHint = () => {
    if (hintsRemaining <= 0 || isGameWon) return;

    // Find unfound words
    const unfound = CHEMISTRY_DATA.filter(w => !foundWords.includes(w.word));
    if (unfound.length === 0) return;

    // Pick random word
    const targetWord = unfound[Math.floor(Math.random() * unfound.length)];
    const wordCoords = solutions[targetWord.word];
    
    if (wordCoords && wordCoords.length > 0) {
      // Reveal the first letter cell
      const firstCellId = wordCoords[0];
      setActiveHintCellId(firstCellId);
      setHintsRemaining(prev => prev - 1);
      playSound('hint');

      // Clear the highlight after 2 seconds
      setTimeout(() => {
        setActiveHintCellId(null);
      }, 2000);
    }
  };

  // -- Selection Logic Helpers --

  const getSelectedCells = (start: Coordinate, end: Coordinate): string[] => {
    const cells: string[] = [];
    const dRow = end.row - start.row;
    const dCol = end.col - start.col;
    
    const isHorizontal = dRow === 0;
    const isVertical = dCol === 0;
    const isDiagonal = Math.abs(dRow) === Math.abs(dCol);

    if (!isHorizontal && !isVertical && !isDiagonal) return [`${start.row}-${start.col}`];

    const steps = Math.max(Math.abs(dRow), Math.abs(dCol));
    const stepRow = dRow === 0 ? 0 : dRow / steps;
    const stepCol = dCol === 0 ? 0 : dCol / steps;

    for (let i = 0; i <= steps; i++) {
      const r = start.row + (i * stepRow);
      const c = start.col + (i * stepCol);
      cells.push(`${Math.round(r)}-${Math.round(c)}`);
    }
    return cells;
  };

  const getWordFromIds = (ids: string[]) => {
    return ids.map(id => {
      const [r, c] = id.split('-').map(Number);
      return grid[r][c].letter;
    }).join('');
  };

  // -- Event Handlers --

  const handlePointerDown = (e: React.PointerEvent, r: number, c: number) => {
    e.preventDefault();
    setIsSelecting(true);
    setSelectionStart({ row: r, col: c });
    setSelectionEnd({ row: r, col: c });
    playSound('select');
    (e.target as Element).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isSelecting) return;
    
    // Hit testing to find which cell we are over
    const element = document.elementFromPoint(e.clientX, e.clientY);
    const cellElement = element?.closest('[data-cell="true"]');
    
    if (cellElement) {
      const row = parseInt(cellElement.getAttribute('data-row') || '-1');
      const col = parseInt(cellElement.getAttribute('data-col') || '-1');
      if (row >= 0 && col >= 0) {
        setSelectionEnd({ row, col });
      }
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isSelecting || !selectionStart || !selectionEnd) return;
    
    const ids = getSelectedCells(selectionStart, selectionEnd);
    const selectedWord = getWordFromIds(ids);
    const reversedWord = selectedWord.split('').reverse().join('');
    
    checkWord(selectedWord, ids);
    // Also check reverse if the user dragged backwards
    if (selectedWord !== reversedWord) {
       checkWord(reversedWord, ids);
    }

    setIsSelecting(false);
    setSelectionStart(null);
    setSelectionEnd(null);
    (e.target as Element).releasePointerCapture(e.pointerId);
  };

  const checkWord = (word: string, ids: string[]) => {
    // Check if word exists in list and hasn't been found yet
    const target = CHEMISTRY_DATA.find(w => w.word === word);
    if (target && !foundWords.includes(word)) {
      // Success!
      setFoundWords(prev => {
        const newFound = [...prev, word];
        if (newFound.length === CHEMISTRY_DATA.length) {
          playSound('win');
        } else {
          playSound('found');
        }
        return newFound;
      });
      setFoundCellIds(prev => {
        const next = new Set(prev);
        ids.forEach(id => next.add(id));
        return next;
      });
      setLastFoundWord(word);

      // Auto-hide toast after 4 seconds
      setTimeout(() => {
        setLastFoundWord(current => current === word ? null : current);
      }, 4000);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const toggleTimer = () => {
    playSound('click');
    const newState = !timerEnabled;
    setTimerEnabled(newState);
    if (!newState) {
      setElapsedSeconds(0);
    }
  };

  const handleStartGame = () => {
    playSound('click');
    setGameStarted(true);
    startNewGame();
  };

  // Derived state for rendering
  const currentSelectionIds = useMemo(() => {
    if (!isSelecting || !selectionStart || !selectionEnd) return new Set<string>();
    return new Set(getSelectedCells(selectionStart, selectionEnd));
  }, [isSelecting, selectionStart, selectionEnd]);


  // -- START SCREEN --
  if (!gameStarted) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-2xl w-full bg-chem-800 rounded-2xl shadow-2xl overflow-hidden border border-chem-700">
          <div className="bg-chem-900 p-8 text-center border-b border-chem-700">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-chem-800 mb-6 border-2 border-chem-accent/30 shadow-[0_0_30px_rgba(20,184,166,0.2)]">
              <LucideFlaskConical className="w-10 h-10 text-chem-accent" />
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">Coordination Chemistry</h1>
            <p className="text-chem-accent uppercase tracking-widest text-sm font-semibold">Search & Define</p>
          </div>
          
          <div className="p-8 space-y-8">
            <div className="grid md:grid-cols-3 gap-6">
              <div className="flex flex-col items-center text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-chem-700 flex items-center justify-center text-white font-bold text-lg">1</div>
                <h3 className="font-bold text-chem-highlight">Read Clue</h3>
                <p className="text-sm text-slate-400">Read the definition in the sidebar to identify the chemistry term.</p>
              </div>
              <div className="flex flex-col items-center text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-chem-700 flex items-center justify-center text-white font-bold text-lg">2</div>
                <h3 className="font-bold text-chem-highlight">Solve It</h3>
                <p className="text-sm text-slate-400">Deduce the word. Use the blank letter slots as a hint for length.</p>
              </div>
              <div className="flex flex-col items-center text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-chem-700 flex items-center justify-center text-white font-bold text-lg">3</div>
                <h3 className="font-bold text-chem-highlight">Find It</h3>
                <p className="text-sm text-slate-400">Search horizontally, vertically, or diagonally in the grid to select it.</p>
              </div>
            </div>

            <button 
              onClick={handleStartGame}
              className="w-full py-4 bg-chem-accent hover:bg-chem-highlight text-chem-900 font-bold text-lg rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg flex items-center justify-center gap-3"
            >
              <LucidePlay className="fill-current w-5 h-5" />
              Start Challenge
            </button>
          </div>
        </div>
      </div>
    );
  }

  // -- GAME SCREEN --
  return (
    <div className="flex flex-col h-full max-w-7xl mx-auto w-full p-4 lg:flex-row gap-6 animate-[fadeIn_0.5s_ease-out]">
      
      {/* Header Mobile */}
      <div className="lg:hidden mb-2">
        <h1 className="text-xl font-bold text-chem-accent flex items-center gap-2">
          <LucideFlaskConical className="w-5 h-5" />
          Coordination Chem
        </h1>
        <p className="text-slate-400 text-xs">Read the definitions, find the words.</p>
      </div>

      {/* Main Grid Area */}
      <div className="flex-grow flex flex-col items-center justify-center relative">
        <div 
          className="grid gap-[2px] p-2 bg-chem-800 rounded-lg shadow-2xl touch-none select-none w-full max-w-[min(90vw,600px)] aspect-square"
          style={{ gridTemplateColumns: `repeat(${GRID_SIZE}, minmax(0, 1fr))` }}
          onPointerLeave={() => setIsSelecting(false)}
        >
          {grid.map((row, r) => 
            row.map((cell, c) => {
              const id = `${r}-${c}`;
              const isFound = foundCellIds.has(id);
              const isSelected = currentSelectionIds.has(id);
              const isHint = id === activeHintCellId;

              return (
                <div
                  key={id}
                  data-cell="true"
                  data-row={r}
                  data-col={c}
                  onPointerDown={(e) => handlePointerDown(e, r, c)}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  className={`
                    flex items-center justify-center relative
                    text-[10px] sm:text-xs md:text-base lg:text-lg font-bold uppercase rounded-[2px] transition-all duration-150 cursor-pointer
                    ${isHint ? 'bg-purple-500 text-white scale-110 shadow-[0_0_15px_rgba(168,85,247,0.8)] z-20' : ''}
                    ${isSelected && !isHint
                      ? 'bg-chem-selection text-chem-900 shadow-[0_0_10px_rgba(250,204,21,0.5)] z-10 scale-110' 
                      : isFound && !isHint
                        ? 'bg-chem-found text-chem-900' 
                        : !isHint && !isSelected ? 'bg-chem-700 text-slate-300 hover:bg-chem-600' : ''}
                  `}
                >
                  {cell.letter}
                </div>
              );
            })
          )}
        </div>

        {/* Success Toast Notification */}
        {lastFoundWord && (
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 w-full max-w-sm px-4 pointer-events-none z-50 animate-[fadeIn_0.3s_ease-out]">
            <div className="bg-chem-found text-chem-900 font-bold p-4 rounded-xl shadow-[0_0_30px_rgba(16,185,129,0.4)] flex items-center gap-3 justify-center transform scale-110">
              <LucideCheckCircle2 className="w-8 h-8" />
              <div className="flex flex-col">
                <span className="text-xs opacity-75 uppercase tracking-wider">Correct!</span>
                <span className="text-xl tracking-wide">{lastFoundWord}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Sidebar / Bottom Bar */}
      <div className="w-full lg:w-[400px] flex flex-col gap-4 bg-chem-800/80 p-5 rounded-xl border border-chem-700/50 backdrop-blur-sm h-[400px] lg:h-auto">
        
        {/* Header Desktop */}
        <div className="hidden lg:flex justify-between items-start">
           <div>
            <h1 className="text-2xl font-bold text-chem-accent flex items-center gap-2">
              <LucideFlaskConical className="w-6 h-6" />
              Clues
            </h1>
            <p className="text-slate-400 text-xs mt-1">Deduce & Find</p>
           </div>
           
           <button 
             onClick={() => { playSound('click'); setGameStarted(false); }} 
             className="text-slate-500 hover:text-white p-1"
             title="Show Help"
           >
             <LucideHelpCircle className="w-5 h-5" />
           </button>
        </div>

        {/* Controls Bar (Timer & Hint) */}
        <div className="flex gap-2">
          {/* Timer Control */}
          <div className="flex-grow bg-chem-900/50 p-3 rounded-lg flex items-center justify-between border border-chem-700/30">
            <div className="flex items-center gap-2">
              {timerEnabled ? <LucideTimer className="w-5 h-5 text-chem-accent" /> : <LucideTimerOff className="w-5 h-5 text-slate-500" />}
              <span className="text-xs lg:text-sm text-slate-400 font-mono">
                 {timerEnabled ? formatTime(elapsedSeconds) : "--:--"}
              </span>
            </div>
            
             <button 
              onClick={toggleTimer}
              className={`text-xs px-2 py-1 rounded transition-colors border ${
                timerEnabled ? 'text-slate-400 border-transparent hover:text-white' : 'bg-chem-700 hover:bg-chem-600 text-white border-chem-600'
              }`}
             >
               {timerEnabled ? 'Stop' : 'Start'}
             </button>
          </div>

          {/* Hint Button */}
           <button 
             onClick={useHint}
             disabled={hintsRemaining === 0 || isGameWon}
             className={`
               flex flex-col items-center justify-center px-4 py-2 rounded-lg border transition-all
               ${hintsRemaining > 0 && !isGameWon
                 ? 'bg-purple-900/30 border-purple-500/50 hover:bg-purple-900/50 text-purple-200' 
                 : 'bg-chem-900/30 border-chem-700/30 text-slate-600 cursor-not-allowed'}
             `}
             title="Reveal the start of a hidden word"
           >
             <div className="flex items-center gap-1">
               <LucideLightbulb className={`w-4 h-4 ${hintsRemaining > 0 ? 'fill-current' : ''}`} />
               <span className="font-bold">{hintsRemaining}</span>
             </div>
             <span className="text-[10px] uppercase tracking-wider opacity-75">Hint</span>
           </button>
        </div>

        {/* Word List / Clues */}
        <div className="flex-grow overflow-y-auto pr-2 custom-scrollbar">
          <div className="space-y-3">
            {CHEMISTRY_DATA.map((item, idx) => {
              const isFound = foundWords.includes(item.word);
              return (
                <div 
                  key={item.word}
                  className={`
                    p-3 rounded-lg border transition-all duration-300 relative overflow-hidden group
                    ${isFound 
                      ? 'bg-chem-900/30 border-chem-found/20' 
                      : 'bg-chem-900/30 border-chem-700/50 hover:border-chem-600'}
                  `}
                >
                  {/* Status Indicator */}
                  <div className="absolute right-3 top-3">
                     {isFound ? (
                       <LucideCheckCircle2 className="w-5 h-5 text-chem-found" />
                     ) : (
                       <LucideSearch className="w-4 h-4 text-slate-600 group-hover:text-slate-500" />
                     )}
                  </div>

                  <div className="pr-6">
                    {/* Definition */}
                    <p className={`text-sm leading-relaxed mb-2 ${isFound ? 'text-slate-500' : 'text-slate-200'}`}>
                      {item.def}
                    </p>
                    
                    {/* Word / Blanks */}
                    <div className="flex gap-1">
                      {isFound ? (
                        <span className="font-mono font-bold text-chem-found tracking-widest">{item.word}</span>
                      ) : (
                         // Render Blanks
                         <div className="flex gap-1" title={`${item.word.length} letters`}>
                           {item.word.split('').map((_, i) => (
                             <div key={i} className="w-5 h-6 border-b-2 border-slate-600 flex items-end justify-center">
                               {/* Optional hint: show first letter? No, keep it hard */}
                             </div>
                           ))}
                           <span className="ml-2 text-xs text-slate-500 self-center font-mono">
                             ({item.word.length})
                           </span>
                         </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer Controls */}
        <div className="pt-2 flex justify-between items-center text-xs text-slate-500 border-t border-chem-700/50">
          <span>{foundWords.length} / {CHEMISTRY_DATA.length} Found</span>
          <button
            onClick={startNewGame}
            className="flex items-center gap-1 hover:text-chem-accent transition-colors"
          >
            <LucideRefreshCw className="w-3 h-3" />
            Reset Board
          </button>
        </div>
      </div>
    </div>
  );
}
