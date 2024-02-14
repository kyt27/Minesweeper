export function mineSearch(numBoard, prevVisited, x, y) {
    let ROWS = board.length;
    let COLUMNS = board[0].length;
    let visited = [];
    let activeMines = [];

    for(let i = 0; i < ROWS; i++)
        visited.push(Array(COLUMNS).fill(false));
    visited[x][y] = true;

    let queue = [[x, y]];
    
    while (queue.length > 0) {
        let [r, c] = queue.shift();
        for(let x = Math.max(0, r-1); x < Math.min(ROWS, r+2); x++) {
            for(let y = Math.max(0, c-1); y < Math.min(COLUMNS, c+2); y++) {
                if(visited[x][y]) continue;
                if(!prevVisited[x][y]) {
                    queue.push([x, y]);
                    continue;
                }
                if(numBoard[x][y] == -1) {
                    activeMines.push([x, y]);
                }
            }
        }
    }

    return activeMines;
}