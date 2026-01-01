export interface WordDefinition {
  word: string;
  def: string;
}

export interface Coordinate {
  row: number;
  col: number;
}

export interface GridCell {
  id: string; // "row-col"
  row: number;
  col: number;
  letter: string;
}

export interface GameState {
  grid: GridCell[][];
  foundWords: string[];
}
