import {
    ROWS,
    COLUMNS,
    MINES,
} from "../minesweeper.js";
import { mineSearch } from "./algoUtils.js";

export class SimpleSolver {
    numBoard;

    activeCells;

    initialClickedRow;
    initialClickedColumn;

    visited;
    vsitCount;
    unusedCells;

    constructor(initialClickedRow, initialClickedColumn, numBoard) {
        this.numBoard = numBoard;

        this.activeCells = [];
        this.initialClickedRow = initialClickedRow;
        this.initialClickedColumn = initialClickedColumn;

        this.visited = []
        this.visitCount = 0;
        this.unusedCells = [];

        for(let r = 0; r < ROWS; r++) {
            this.visited.push(Array(COLUMNS).fill(false));
        }
    }

    visit(r, c) {
        this.visited[r][c] = true;
        this.visitCount++;
    }

    pushUnused() {
        this.activeCells = this.unusedCells.concat(this.activeCells);
        this.unusedCells = [];
    }

    solve() {
        this.visit(this.initialClickedRow, this.initialClickedColumn);
        this.activeCells.push([this.initialClickedRow, this.initialClickedColumn]);

        while(this.activeCells.length > 0) {
            let coords = this.activeCells.pop();
            let r = coords[0];
            let c = coords[1];

            if(this.numBoard[r][c] == -1) {
                this.visit(r, c);
                continue;
            }

            let minesCount = 0;
            let visitedMines = 0;
            let unvisitedCells = 0;

            for(let x = Math.max(0, r-1); x < Math.min(ROWS, r+2); x++) {
                for(let y = Math.max(0, c-1); y < Math.min(COLUMNS, c+2); y++) {
                    if(this.numBoard[x][y] == -1) {
                        minesCount++;
                        if(this.visited[x][y]) visitedMines++;
                    }
                    if(!this.visited[x][y]) unvisitedCells++;
                }
            }

            if(minesCount == 0 || minesCount - visitedMines == 0 || minesCount - visitedMines - unvisitedCells == 0) {
                this.visited[r][c] = true;
                this.pushUnused();
                for(let x = Math.max(0, r-1); x < Math.min(ROWS, r+2); x++) {
                    for(let y = Math.max(0, c-1); y < Math.min(COLUMNS, c+2); y++) {
                        if(!this.visited[x][y]) {
                            this.visit(r, c);
                            this.activeCells.push([x, y]);
                        }
                    }
                }
                continue;
            }

            this.unusedCells.push([r, c]);
        }

        let activeMines = [];

        for(let i=0; i<this.unusedCells.length; i++) {
            let r = this.unusedCells[i][0];
            let c = this.unusedCells[i][1];
            if(this.numBoard[r][c] == -1) activeMines.push([r, c]);
        }

        return activeMines;
        
        if(this.visitCount < ROWS, COLUMNS && activeMines.length == 0) {
            for(let x = 0; x < ROWS; r++) {
                if(activeMines.length > 0) break;

                for(let y = 0; y < COLUMNS; c++) {
                    if(!this.visited[x][y]) {
                        activeMines = mineSearch(visited, r, c);
                    }
                }
            }
        }
    }
}