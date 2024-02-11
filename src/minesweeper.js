import { SimpleSolver } from "./algorithms/simpleSolver.js";
var ROWS = 10;
var COLUMNS= 10;
var MINES = 20;
var NO_GUESS = true;
/** 
 * Select the solver to be used
 * 0 : SimpleSolver
 * 1 : UnarySolver
 * 2 : Arc-Consistent Solver (AC)
 * 3 : 2-Wise Consistency Solver (2WC)
 * 4 : 3-Wise Consistency Solver (3WC)
 * 5 : 4-Wise Consistency Solver (4WC)
 * 6 : 5-Wise Cosnsitency Solver (5WC)
 * 7 : Brute Force (BF)
*/
var SOLVER = 0; 
var START_ROW;
var START_COL;

export { ROWS, COLUMNS, MINES, START_ROW, START_COL}

import { UnarySolver } from "./algorithms/unarySolver.js";
import { AC } from "./algorithms/AC.js";
import { kWC } from "./algorithms/kWC.js";
import { BF } from "./algorithms/BF.js";

var board = []

var shuffledTiles = [];
var shuffledTilesIndex= 0;

var displayedMinesCount;
var numBoard = []

var tilesClicked = 0;
var flagEnabled = false;

var gameOver = false; 

export { numBoard }

window.onload = function() {
    startGame();
}

function startGame() {
    displayedMinesCount = MINES;
    document.getElementById("mines-count").innerText = displayedMinesCount.toString();
    document.getElementById("flag-button").addEventListener("click", setFlag);

    let boardWidth = (ROWS*30).toString() + "px";
    let boardHeight = (COLUMNS*30).toString() + "px";

    $("#board").css({"width": boardWidth, "height" : boardHeight});

    for (let r = 0; r < ROWS; r++) {
        let row = [];
        for (let c = 0; c < COLUMNS; c++) {
            let tile = document.createElement("div");
            tile.id = r.toString() + "-" + c.toString();
            tile.addEventListener("click", clickTile);  
            document.getElementById("board").append(tile);
            row.push(tile)
        }
        board.push(row);
    }
}

function clickTile() {
    if(gameOver || this.classList.contains("tile-clicked")) return;

    let tile = this;

    if(flagEnabled) {
        updateFlag(tile);
        return;
    }

    if(tile.innerText == "🚩") return;

    let coords = tile.id.split("-");
    let r = parseInt(coords[0]);
    let c = parseInt(coords[1]);

    if(tilesClicked == 0) {
        // Guarantee that 3x3 space around initial click is not a mine
        START_ROW = r;
        START_COL = c;

        for (let x = 0; x < ROWS; x++) {
            for (let y = 0; y < COLUMNS; y++) {
                if(x >= r-1 && x <= r+1 && y >= c-1 && y <= c+1) continue;
                shuffledTiles.push([x, y]);
            }
        }

        setMines();
    }

    if(numBoard[r][c] == -1) {
        alert("GAME OVER");
        gameOver = true;
        revealMines();
        return;
    }

    checkMine(r, c);
}

function setMines() {
    for(let r = 0; r < ROWS; r++) {
        numBoard.push(Array(COLUMNS).fill(0));
    }

    for(let i = shuffledTiles.length - 1; i > 0 ; i--) {
        const j = Math.floor(Math.random() * (i + 1)); 
        [shuffledTiles[i], shuffledTiles[j]] = [shuffledTiles[j], shuffledTiles[i]];
    }

    while(shuffledTilesIndex < MINES) {
        let coords = shuffledTiles[shuffledTilesIndex];
        let r = coords[0];
        let c = coords[1]
        numBoard[r][c] = -1;
        shuffledTilesIndex++;
        for (let x = Math.max(0, r-1); x < Math.min(ROWS, r+2); x++) {
            for (let y = Math.max(0, c-1); y <  Math.min(COLUMNS, c+2); y++) {
                if(x == r && y == c) continue;
                if(numBoard[x][y] >= 0) numBoard[x][y]++;
            }
        }

    }

    while(NO_GUESS) {
        let solver = null;
        switch(SOLVER) {
            case 0 : solver = new SimpleSolver(START_ROW, START_COL, numBoard); break;
            case 1 : solver = new UnarySolver(START_ROW, START_COL, numBoard); break;
            case 2 : solver = new AC(START_ROW, START_COL, numBoard); break;
            case 3 : solver = new kWC(START_ROW, START_COL, numBoard, 2); break;
            case 4 : solver = new kWC(START_ROW, START_COL, numBoard, 3); break;
            case 5 : solver = new kWC(START_ROW, START_COL, numBoard, 4); break;
            case 6 : solver = new kWC(START_ROW, START_COL, numBoard, 5); break;
            case 7 : solver = new BF(START_ROW, START_COL, numBoard); break;
        }
        if(!solver) throw "invalid SOLVER value";
        let activeList = solver.solve();
        if(activeList.length == 0) return;
        console.log(activeList);
        const i = Math.floor(Math.random() * (activeList.length));
        console.log(i);

        relocateMines(activeList[i][0], activeList[i][1]);
    }
}

function relocateMines(r, c) {
    if(shuffledTilesIndex >= shuffledTiles.length) throw "valid mines not found";
    let coords = shuffledTiles[shuffledTilesIndex];
    numBoard[coords[0]][coords[1]] = -1;
    numBoard[r][c] = 0;
    for (let x = Math.max(0, r-1); x < Math.min(ROWS, r+2); x++) {
        for (let y = Math.max(0, c-1); y <  Math.min(COLUMNS, c+2); y++) {
            if(x == r && y == c) continue;
            if(numBoard[x][y] == -1)numBoard[r][c]++;
        }
    }
    shuffledTilesIndex++;
}

function increaseMineCount() {
    displayedMinesCount++;
    document.getElementById("mines-count").innerText = displayedMinesCount.toString();
}

function decreaseMineCount() {
    displayedMinesCount--;
    document.getElementById("mines-count").innerText = displayedMinesCount.toString();
}

function setFlag() {
    if(flagEnabled) {
        flagEnabled = false;
        document.getElementById("flag-button").style.backgroundColor = "lightgray";
    } else {
        flagEnabled = true;
        document.getElementById("flag-button").style.backgroundColor = "darkgray";
    }
}

function updateFlag(tile) {
    if(tile.innerText == "") {
        decreaseMineCount();
        tile.innerText = "🚩";
    } else if(tile.innerText == "🚩") {
        increaseMineCount();
        tile.innerText = "";
    }
}

function revealMines(won = false) {
    for(let r = 0; r < ROWS; r++) {
        for(let c = 0; c < COLUMNS; c++) {
            let tile = board[r][c];
            if(numBoard[r][c] == -1) {
                if(!won) {
                    if(tile.innerText == "") tile.innerText = "💣";
                    tile.style.backgroundColor = "red";
                } 
                if(tile.innerText == "") tile.innerText = "🚩";
            }
        }
    }
}

function checkMine(r, c) {
    if(r < 0 || r >= ROWS || c < 0 || c >= COLUMNS) throw "invalid row/col in checkMine";
    board[r][c].classList.add("tile-clicked");
    tilesClicked++;

    if(board[r][c].innerText == "🚩") {
        board[r][c].innerText = "";
        increaseMineCount();
    }

    if(numBoard[r][c] > 0) {
        board[r][c].innerText = numBoard[r][c];
        board[r][c].classList.add("x" + numBoard[r][c].toString());
    } else {
        for(let x = Math.max(0, r-1); x < Math.min(ROWS, r+2); x++) {
            for(let y = Math.max(0, c-1); y < Math.min(COLUMNS, c+2); y++) {
                if(!board[x][y].classList.contains("tile-clicked")) checkMine(x, y);
            }
        }
    }

    if(tilesClicked == ROWS * COLUMNS - MINES) {
        document.getElementById("mines-count").innerText = "Cleared";
        revealMines(true);
        gameOver = true;
    }
}