import BT from 'algorithms/BT/index';
import mWC from 'algorithms/mWC';
import STR2 from 'algorithms/STR2';
import {
  Algorithms,
} from 'enums';
import { getDomains } from 'algorithms/utils';

import generateCSP from './generateCSP';
import reduceComponents from './reduceComponents';
import { parseSolvable } from './solve';

/* Algorithms mapped to their corresponding display colors */
const algorithmColors = new Map([
  [Algorithms.Unary, 1],
  [Algorithms.BT, 2],
  [Algorithms.STR2, 3],
  [Algorithms.mWC1, 3],
  [Algorithms.mWC2, 4],
  [Algorithms.mWC3, 5],
  [Algorithms.mWC4, 6],
]);

/**
 * Checks csp model for any inconsistencies. Any unsatisfied constraints are highlighted red on the board and solving is
 * disabled to avoid errors.
 * @param {Immutable.Map} state state of the board
 * @returns {Immutable.Map} updated state with any inconsistencies highlighted red and solving disabled if inconsistent
 */
const checkConsistency = state => state.withMutations(s => {
  // remove previous inconsistency
  if (!s.getIn(['csp', 'isConsistent'])) {
    s.setIn(['csp', 'isConsistent'], true);
  }

  // color any inconsistent constraints
  let inconsistentCount = 0;
  s.getIn(['csp', 'components']).forEach(component => {
    component.constraints.forEach(constraint => {
      if (constraint.isAlive) {
        s.setIn(['minefield', 'cells', constraint.row, constraint.col, 'color'], -1);
        s.setIn(['csp', 'isConsistent'], false);
        inconsistentCount++;
      } else {
        s.setIn(['minefield', 'cells', constraint.row, constraint.col, 'color'], 0);
      }
    });
  });


  // Removes "Unary/GAC/mwC/Backbone finds 0 solvable cells" from solvable if nothing is found
  let totalCount = 0;
  s.getIn(['csp', 'solvable']).forEach((solvable) => {
    totalCount += solvable.length;
  });

  if (totalCount === 0) {
    s.deleteIn(['csp', 'solvable', 'Unary']);
    s.deleteIn(['csp', 'solvable', 'GAC']);
    s.deleteIn(['csp', 'solvable', '2wC']);
    s.deleteIn(['csp', 'solvable', '3wC']);
    s.deleteIn(['csp', 'solvable', '4wC']);
    s.deleteIn(['csp', 'solvable', 'Backbone']);
  }
});

/**
 * Color codes all cells that are solvable.
 * @param {object[][]} cells matrix of cell objects
 * @param {Immutable.Map} csp state of the csp model
 * @returns {object[][]} updated version of cells
 */
const colorSolvable = (cells, csp) => cells.withMutations(c => {
  // clear previous coloring
  csp.get('components').forEach(component => {
    component.variables.forEach(variable => {
      c.setIn([variable.row, variable.col, 'color'], 0);
      c.deleteIn([variable.row, variable.col, 'solution']);
    });
  });

  // color each solvable set of cells
  csp.get('solvable').forEach((solvable, algorithm) => {
    const color = algorithmColors.get(algorithm);
    solvable.forEach(cell => {
      c.setIn([cell.row, cell.col, 'color'], color);
      c.setIn([cell.row, cell.col, 'solution'], cell.value);
    });
  });
  return c;
});

/**
 * Filters current minefield components against the old components to find which ones have changed and need to be
 * reevaluated.
 * @param {object[]} oldComponents previous list of unique minefield components
 * @param {object[]} components current list of unique minefield components
 * @returns {number[]} list of current component indices that need to be reevaluated
 */
const filterComponents = (oldComponents, components) => {
  const activeComponents = [];
  if (oldComponents) {
    components.forEach((component, i) => {
      const changed = !oldComponents.some(oldComponent => oldComponent.id === component.id);
      if (changed) {
        activeComponents.push(i);
      }
    });
  } else {
    for (let i = 0; i < components.length; i++) {
      activeComponents.push(i);
    }
  }
  return activeComponents;
};

/**
 * Generates the csp model of the minefield. Enforces unary consistency and normalizes the constraints. Separates the
 * model into its distinct component problems. Enforces any further consistency algorithms specified by the state.
 * Checks that the proposed solution is consistent with all constraints.
 * @param {Immutable.Map} state state of the board
 * @param {boolean} [forceReevaluation=false] flag variable to force all components to be reevaluated whether they
 * changed or not
 * @returns {Immutable.Map} state with csp model, solvable cells colored, and any inconsistencies colored
 */
export default (state, forceReevaluation = false) => state.withMutations(s => {
  // generate the csp model of the minefield
  s.update('csp', c => generateCSP(c, s.getIn(['minefield', 'cells'])));

  // enfore unary consistency, normalize, and separate variables and constraints into individual components
  s.update('csp', c => reduceComponents(c));

  // filter out any components that did not change
  let activeComponents = [];
  if (forceReevaluation) {
    for (let i = 0; i < s.getIn(['csp', 'components']).length; i++) {
      activeComponents.push(i);
    }
  } else {
    activeComponents = filterComponents(state.getIn(['csp', 'components']), s.getIn(['csp', 'components']));
  }

  // get the variable domains
  const constraints = [];
  s.getIn(['csp', 'components']).forEach(component => constraints.push(...component.constraints));
  s.setIn(['csp', 'domains'], getDomains(constraints));

  // reduce the domains and tighten the constraints with STR
  if (s.getIn(['csp', 'algorithms', Algorithms.STR2, 'isActive'])) {
    s.deleteIn(['csp', 'solvable', Algorithms.mWC1]);
    activeComponents.forEach(componentIndex => {
      s.update('csp', c => STR2(c, componentIndex));
    });
  } else {
    s.deleteIn(['csp', 'solvable', Algorithms.STR2]);
  }

  // tighten the contstraints with PWC
  if (s.getIn(['csp', 'algorithms', Algorithms.mWC, 'isActive'])) {
    activeComponents.forEach(componentIndex => {
      s.update('csp', c => mWC(c, componentIndex, c.getIn(['algorithms', Algorithms.mWC, 'm'])));
    });
  } else {
    const names = [Algorithms.mWC1, Algorithms.mWC2, Algorithms.mWC3, Algorithms.mWC4];
    names.forEach(name => { s.deleteIn(['csp', 'solvable', name]); });
  }

  // solve the csp with BTS
  if (s.getIn(['csp', 'algorithms', Algorithms.BT, 'isActive'])
  && s.getIn(['csp', 'algorithms', Algorithms.BT, 'subSets', Algorithms.MAC])) {
    activeComponents.forEach(componentIndex => {
      s.update('csp', c => BT(c, componentIndex, c.getIn(['algorithms', Algorithms.BT, 'subSets'])));
    });
  } else {
    s.deleteIn(['csp', 'solvable', Algorithms.BT]);
  }

  // parse the solvable cells
  s.updateIn(['csp', 'solvable'], o => parseSolvable(o, s.getIn(['csp', 'variables'])));

  // color the solvable cells
  s.updateIn(['minefield', 'cells'], c => colorSolvable(c, s.get('csp')));

  // check for consistency
  return checkConsistency(s);
});



// WEBPACK FOOTER //
// ./src/csp/index.js