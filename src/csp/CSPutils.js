/**
 * Creates a grid of cell domains and whether the cell is solved
 * @param {number} ROWS number of rows in grid
 * @param {number} COLUMNS number of columns in grid
 * @param {number} START_ROW initial clicked row 
 * @param {number} START_COL initial clicked column
 * @param {number[][]} numBoard 
 * @returns {Object[][]} array of array of objects containing boolean for solved and list for possible domain
 */
export function generateDomainBoard(ROWS, COLUMNS, START_ROW, START_COL, numBoard) {
    let domainBoard = [];
    for(let r = 0; r < ROWS; r++) {
        let rows = [];
        for(let c = 0; c < COLUMNS; c++) {
            rows += {
                'solved': false, 
                'value': numBoard[r][c],
                'domain': [-1, 1]            
            }
        }
        domainBoard += rows;
    }

    for (let x = Math.max(0, START_ROW-1); x < Math.min(ROWS, START_ROW+2); x++) {
        for (let y = Math.max(0, START_COL-1); y <  Math.min(COLUMNS, START_COL+2); y++) {
            domainBoard[x][y]['solved'] = true;
            domainBoard[x][y]['domain'] = [1];
        }
    }

    return domainBoard;
}

/**
 * Computes whether given cell is a fringe cell
 * Computed by checking for each cell, whether it is unsolved and there is a neighbouring solved cell
 * @param {Object[][]} domainBoard from generateDomainBoard 
 * @param {number} r 
 * @param {number} c 
 * @returns {number[][]} returns coordinates of revealed cells around fringe cells (empty list means not a fringe cell) 
 */
function isFringe(domainBoard, r, c) {
    if(r < 0 || c < 0 || r >= domainBoard.length || c >= domainBoard[0].length) throw "invalid isFringe parameters";
    if(domainBoard[r][c]['solved'] == true) return [];

    const ROWS = domainBoard.length;
    const COLUMNS = domainBoard[0].length;

    let list = [];

    for (let x = Math.max(0, r-1); x < Math.min(ROWS, r+2); x++) {
        for (let y = Math.max(0, c-1); y <  Math.min(COLUMNS, c+2); y++) {
            if(x == r && y == c) continue;
            if(domainBoard[x][y]['solved'] == true) list.push([x, y]);
        }
    }
    return list;
}

/**
 * Computes all fringe cells on the current board
 * @param {Object[][]} domainBoard from generateDomainBoard 
 * @returns {Object} returns both array of array of booleans for fringe cells and the same fringe cells in list form
 */
export function findFringeCells(domainBoard) {
    let board = []

    const ROWS = domainBoard.length;
    const COLUMNS = domainBoard[0].length;

    for(let r = 0; r < ROWS; r++) {
        board.push(Array(COLUMNS).fill(false));
    }
    let list = [];
    let set = new Set();

    for (let x = 0; x < ROWS; x++) {
        for (let y = 0; y < COLUMNS; y++) {
            let numCells = isFringe(domainBoard, x, y);

            if(numCells.length)
            if(isFringe(domainBoard, x, y).length > 0) {
                board[x][y] = true;
                list.push([x, y]);


            }
        }
    }

    return {
        'fringeBoard': board, 
        'list': list
    };
}

export function updateSolved(domainBoard, fringe) {
    const fringeList = fringe['list'];
    const ROWS = domainBoard.length;
    const COLUMNS = domainBoard[0].length;

    for (let coords in fringeList) {
        let r = coords[0];
        let c = coords[1];

        if(domainBoard[r][c]['domain'].length > 1) continue;
        if(domainBoard[r][c]['domain'][0] * domainBoard[r][c]['value'] < 0) throw "error in solver";

        domainBoard[r][c]['solved'] = true;

        if(domainBoard[r][c]['value'] == -1) {
            for (let x = Math.max(0, r-1); x < Math.min(ROWS, r+2); x++) {
                for (let y = Math.max(0, c-1); y <  Math.min(COLUMNS, c+2); y++) {
                    if(domainBoard[x][y]['value'] == -1) continue;
                    domainBoard[x][y]['value']--;
                }
            }
        }
    }

    return domainBoard
}