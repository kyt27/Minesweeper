export function generatePreset(board) {
    if(!board.isArray()) throw "not an array";
    if(!board[0].isArray()) throw "elements in array not array";
    
    let ROWS = board.length;
    let COLUMNS = board[0].length;

    for(let r = 1; r < ROWS; r++) {
        if(!board[r].isArray() || board[r].length != COLUMNS) throw "not square array of arrays";
    }

    let mineCount = 0;
    let numBoard = [];
    for(let r = 0; r < ROWS; r++) {
        numBoard.push(Array[COLUMNS].fill(0))
    }

    for(let r = 0; r < ROWS; r++) {
        for(let c = 0; c < COLUMNS; c++) {
            if(board[r][c] != 0 && board[r][c] != 1) throw `invalid value at row ${r} and col ${c}`
            if(board[r][c] == -1) {
                mineCount++;
                for (let x = Math.max(0, r-1); x < Math.min(ROWS, r+2); x++) {
                    for (let y = Math.max(0, c-1); y <  Math.min(COLUMNS, c+2); y++) {
                        if(x == r && y == c) numBoard[x][y] = -1;
                        else if(numBoard[x][y] >= 0) numBoard[x][y]++;
                    }
                }
            }
        }
    }
    

    return {
        'rows': ROWS,
        'columns': COLUMNS,
        'mines': mineCount,
        'numBoard': numBoard
    }
}