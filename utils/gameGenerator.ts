import { GridCell, WordDefinition } from '../types';

const GRID_SIZE = 15;
const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

export const CHEMISTRY_DATA: WordDefinition[] = [
  { word: "LIGAND", def: "An ion or molecule that binds to a central metal atom." },
  { word: "CHELATE", def: "A compound containing a ligand bonded to a central metal at two or more points." },
  { word: "ISOMER", def: "Compounds with the same formula but different arrangements of atoms." },
  { word: "SPECTROCHEMICAL", def: "A series ranking ligands by the strength of field they produce." },
  { word: "OCTAHEDRAL", def: "A molecular geometry with one atom at the center and six at the corners." },
  { word: "ENTROPY", def: "The driving thermodynamic force behind the Chelate Effect." },
  { word: "DENTICITY", def: "The number of donor groups in a single ligand that bind to a central metal." },
  { word: "JAHNTELLER", def: "Geometric distortion in non-linear molecular systems to reduce energy." },
  { word: "ORBITAL", def: "A mathematical function describing the wave-like behavior of an electron." },
  { word: "CHIRALITY", def: "A geometric property where a molecule is non-superimposable on its mirror image." }
];

const DIRECTIONS = [
  [0, 1],   // Horizontal Right
  [1, 0],   // Vertical Down
  [1, 1],   // Diagonal Down-Right
  [-1, 1],  // Diagonal Up-Right
  [0, -1],  // Horizontal Left
  [-1, 0],  // Vertical Up
  [-1, -1], // Diagonal Up-Left
  [1, -1]   // Diagonal Down-Left
];

function createEmptyGrid(): string[][] {
  const grid: string[][] = [];
  for (let i = 0; i < GRID_SIZE; i++) {
    const row: string[] = [];
    for (let j = 0; j < GRID_SIZE; j++) {
      row.push('');
    }
    grid.push(row);
  }
  return grid;
}

function canPlaceWord(grid: string[][], word: string, row: number, col: number, dRow: number, dCol: number): boolean {
  for (let i = 0; i < word.length; i++) {
    const r = row + i * dRow;
    const c = col + i * dCol;

    if (r < 0 || r >= GRID_SIZE || c < 0 || c >= GRID_SIZE) return false;
    
    // Check collision: if cell is not empty and letter doesn't match
    if (grid[r][c] !== '' && grid[r][c] !== word[i]) return false;
  }
  return true;
}

function placeWord(grid: string[][], word: string, row: number, col: number, dRow: number, dCol: number) {
  for (let i = 0; i < word.length; i++) {
    grid[row + i * dRow][col + i * dCol] = word[i];
  }
}

// Helper to calculate coordinates for a placed word
function getWordCoordinates(row: number, col: number, dRow: number, dCol: number, length: number): string[] {
  const coords: string[] = [];
  for (let i = 0; i < length; i++) {
    coords.push(`${row + i * dRow}-${col + i * dCol}`);
  }
  return coords;
}

export interface GeneratedGame {
  grid: GridCell[][];
  solutions: Record<string, string[]>; // Map word -> array of cell IDs
}

export function generateGrid(): GeneratedGame {
  let gridArray = createEmptyGrid();
  const solutions: Record<string, string[]> = {};
  
  // Sort words by length descending to make placement easier
  const wordsToPlace = [...CHEMISTRY_DATA].sort((a, b) => b.word.length - a.word.length);

  for (const { word } of wordsToPlace) {
    let placed = false;
    let attempts = 0;
    
    while (!placed && attempts < 100) {
      const direction = DIRECTIONS[Math.floor(Math.random() * DIRECTIONS.length)];
      const startRow = Math.floor(Math.random() * GRID_SIZE);
      const startCol = Math.floor(Math.random() * GRID_SIZE);
      
      if (canPlaceWord(gridArray, word, startRow, startCol, direction[0], direction[1])) {
        placeWord(gridArray, word, startRow, startCol, direction[0], direction[1]);
        // Store solution coordinates
        solutions[word] = getWordCoordinates(startRow, startCol, direction[0], direction[1], word.length);
        placed = true;
      }
      attempts++;
    }
    
    if (!placed) {
      console.warn(`Could not place word: ${word}`);
    }
  }

  // Fill empty spaces with random letters
  const resultGrid: GridCell[][] = [];
  for (let r = 0; r < GRID_SIZE; r++) {
    const rowCells: GridCell[] = [];
    for (let c = 0; c < GRID_SIZE; c++) {
      if (gridArray[r][c] === '') {
        gridArray[r][c] = ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
      }
      rowCells.push({
        id: `${r}-${c}`,
        row: r,
        col: c,
        letter: gridArray[r][c]
      });
    }
    resultGrid.push(rowCells);
  }

  return { grid: resultGrid, solutions };
}
