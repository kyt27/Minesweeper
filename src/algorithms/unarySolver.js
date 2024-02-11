import {
    ROWS,
    COLUMNS,
    MINES,
} from "../minesweeper.js";

export class UnarySolver {
    constructor(initialClickedRow, initialClickedColumn, numBoard) {
        this.numBoard = numBoard;

        this.activeCells = [];
        this.initialClickedRow = initialClickedRow;
        this.initialClickedColumn = initialClickedColumn;

        this.visited = []
        this.unusedCells = [];

        for(let r = 0; r < ROWS; r++) {
            this.visited.push(Array(COLUMNS).fill(false));
        }
    }

}