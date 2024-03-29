import Constraint from 'objects/Constraint';
import { isOnFringe } from 'reducers/board/cellUtils';

/**
 * Creates a variable for each fringe cell.
 * @param {Object[][]} cells matrix of cells
 * @returns {Object[]} array of variable objects
 */
const getVariables = cells => {
  const variables = [];
  const numRows = cells.size;
  const numCols = cells.get(0).size;

  // find all fringe cells and create a variable object for them
  for (let row = 0; row < numRows; row++) {
    for (let col = 0; col < numCols; col++) {
      if (cells.getIn([row, col, 'isHidden']) && isOnFringe(cells, row, col)) {
        const key = (row * numCols) + col;
        // variable object
        variables.push({
          col,                                              // column of cell
          isFlagged: cells.getIn([row, col, 'isFlagged']),  // state of cell
          key,                                              // variable number
          row,                                              // row of cell
        });
      }
    }
  }

  return variables;
};

/**
 * Generates the variables and constraints that form the csp model of the minesweeper game.
 * @param {Immutable.List<Immutable.List<{}>>} cells state of the board cell matrix
 * @returns {Immutable.Map} csp model with list of constraints and variables
 */
export default (csp, cells) => {
  // get the variables
  let variables = getVariables(cells);

  // generate the constraints
  const constraints = [];
  for (let row = 0; row < cells.size; row++) {
    for (let col = 0; col < cells.get(0).size; col++) {
      if (!cells.getIn([row, col, 'isHidden']) && cells.getIn([row, col, 'content']) > 0) {
        let numMines = cells.getIn([row, col, 'content']);
        const variablesInScope = variables.filter(variable => {
          const rowDiff = Math.abs(variable.row - row);
          const colDiff = Math.abs(variable.col - col);
          if (rowDiff <= 1 && colDiff <= 1) {
            if (variable.isFlagged) {
              numMines--;
              return false;
            }
            return true;
          }
          return false;
        });
        if (variablesInScope.length > 0 || numMines < 0) {
          constraints.push(new Constraint(variablesInScope, row, col, numMines));
        }
      }
    }
  }
  variables = variables.filter(variable => !variable.isFlagged);
  variables.forEach(variable => { delete variable.isFlagged; });

  return csp.withMutations(c => {
    c.set('constraints', constraints);
    c.set('variables', variables);
    c.delete('components');
  });
};



// WEBPACK FOOTER //
// ./src/csp/generateCSP.js