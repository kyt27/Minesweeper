import {
    ROWS,
    COLUMNS,
    START_ROW,
    START_COL,
} from "../minesweeper.js";
import { findFringeCells } from "./CSPutils.js";

function generateConstraints(domainBoard, varLength, domains, index) {
    let constraints = [];
    
}

export function generateCSP(domainBoard) {
    let fringe = findFringeCells(domainBoard);
    let varLength = fringe['list'].length;
    let domains = [];

    let index = new Map();
    for (let l = 0; l < varLength; l++) {
        let temp = fringe['list'][l]
        index[temp] = l;
        domains.push(domainBoard[temp[0]][temp[1]['domain']]);
    }

    return {'varLength': varLength, 'domains': domains, 'constraints': generateConstraints(domainBoard, fringeBoard, varLength, domains, index)}
}

export function generatekDualCSP(k, csp) {

}

