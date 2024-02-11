// kWC - k-Wise Consistent

import {
    ROWS,
    COLUMNS,
    MINES,
} from "../minesweeper.js";

export class kWC {
    constructor(initialClickedRow, initialClickedColumn, numBoard, K) {
        this.numBoard = numBoard;
        this.K = K;

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