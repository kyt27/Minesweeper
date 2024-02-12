import { 
    findFringeCells, 
    stringToNumArray 
} from "./CSPUtils.js";

function generateConstraints(domainBoard, fringe, varLength, index) {
    let fringeBoard = fringe['fringeBoard'];
    let solvedSet = fringe['solvedSet'];

    let cInd = Array(varLength).fill([]);
    let cVar = [];
    let cVal = [];

    let map = new Map();

    for (pair in solvedSet) {
        let p = stringToNumArray(pair);
        let r = p[0];
        let c = p[1];
        for (let x = Math.max(0, r-1); x < Math.min(ROWS, r+2); x++) {
            for (let y = Math.max(0, c-1); y <  Math.min(COLUMNS, c+2); y++) {

            }
        }
    }
}

export function generateCSP(domainBoard) {
    let fringe = findFringeCells(domainBoard);
    let varLength = fringe['list'].length;
    let domains = [];

    let index = new Map();
    for (let l = 0; l < varLength; l++) {
        let temp = fringe['list'][l]
        index.set(temp.toString(), l);
        domains.push(domainBoard[temp[0]][temp[1]['domain']]);
    }

    return {'varLength': varLength, 'domains': domains, 'constraints': generateConstraints(domainBoard, fringe, varLength, index)}
}

export function generatekDualCSP(k, csp) {

}

