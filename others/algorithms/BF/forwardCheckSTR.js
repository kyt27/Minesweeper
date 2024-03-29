import { constraintFilter } from './forwardCheck';
import { revise } from '../STR2';

/**
 * Reduces the domains based on the newDomains, adding necessary elements to the queue, and storing reductions in
 * reduced
 * @param {Map<number, Set<boolean>>} reduced map of reduced domains
 * @param {Map<number, Set<boolean>>} newDomains current valid variable domains
 * @param {Map<number, Set<boolean>>} domains old valid variable domains
 * @param {Constraint[]} queue list of unvisited constraints
 * @param {Map<number, Constraint[]>} constraintMap variables mapped to the constraints relevant to their forward check
 * @param {Constraint} constraint current constraint being reduced
 * @returns {boolean} true if reductions are consistent, false if a domain was destroyed
 */
const reduce = (reduced, newDomains, domains, queue, constraintMap, constraint) => {
  // reduce the domains
  let consistent = true;
  newDomains.forEach((values, key) => {
    if (domains.get(key).size !== values.size) {
      domains.set(key, new Set([...domains.get(key)].filter(x => {
        if (values.has(x)) {
          return true;
        }
        reduced.get(key).add(x);
        return false;
      })));
      constraintMap.get(key).forEach(element => {
        if (element !== constraint && !queue.includes(element)) {
          queue.push(element);
        }
      });
      // check for destroyed domains
      if (domains.get(key).size === 0) {
        consistent = false;
      }
    }
  });
  return consistent;
};

/**
 * Restores the reductions of the given key.
 * @param {number} restoreKey variable key to restore reductions from
 * @param {number[]} assignmentOrder order of variable assignments
 * @param {Map<number, Constraint[]>} constraintMap variables mapped to the constraints relevant to their forward check
 * @param {Map<(number|Constraint), Set<(boolean|number)>[]>} reductions variables and constraints mapped to their
 * domain and tuple reductions respectively
 * @param {Map<number, Set<boolean>>} domains variables mapped to their valid domain
 * @param {object} diagnostics execution metrics object
 * @param {number} diagnostics.tuplesKilled number of tuples killed
 */
const restore = (restoreKey, assignmentOrder, constraintMap, reductions, domains, diagnostics) => {
  const futureConstraints = new Set();
  assignmentOrder.slice(assignmentOrder.indexOf(restoreKey) + 1).forEach(key => {
    [...reductions.get(key).pop()].forEach(d => domains.get(key).add(d));
    constraintMap.get(key).forEach(constraint => futureConstraints.add(constraint));
  });
  constraintMap.get(restoreKey).forEach(constraint => futureConstraints.add(constraint));

  futureConstraints.forEach(constraint => {
    const tuplesToRestore = [...reductions.get(constraint).pop()];
    tuplesToRestore.forEach(id => constraint.revive(id));
    diagnostics.tuplesKilled -= tuplesToRestore.length;
  });
};

/**
 * Maintains GAC on all future variables and constraints using STR based on the current variable assignment.
 * @param {Object[]} stack current variable assignments
 * @param {number} stack[].key variable key
 * @param {boolean} stack[].value variable assignment
 * @param {Map<number, Constraint[]>} constraintMap variables mapped to the constraints relevant to their forward check
 * @param {Map<number, Set<boolean>>} domains current variable domains
 * @param {Map<(number|Constraint), Set<(boolean|number)>[]>} reductions variables and constraints mapped to their
 * domain and tuple reductions respectively
 * @param {Object} diagnostics execution metrics object
 * @param {number} diagnostics.tuplesKilled number of tuples killed
 * @returns {boolean} true if consistent, false otherwise
 */
const forwardCheckSTR = (stack, constraintMap, domains, reductions, diagnostics) => {
  const current = stack.slice(-1)[0];
  const future = [...constraintMap.keys()].slice(stack.length);
  const reduced = new Map();
  const futureConstraints = new Set();
  future.forEach(key => {
    reduced.set(key, new Set());
    constraintMap.get(key).forEach(constraint => futureConstraints.add(constraint));
  });
  reduced.set(current.key, new Set());
  domains.set(current.key, new Set([...domains.get(current.key)].filter(x => {
    if (x === current.value) {
      return true;
    }
    reduced.get(current.key).add(x);
    return false;
  })));

  const queue = [];
  constraintMap.get(current.key).forEach(constraint => {
    queue.push(constraint);
    futureConstraints.add(constraint);
  });
  futureConstraints.forEach(constraint => reduced.set(constraint, new Set()));
  let consistent = true;

  while (consistent && queue.length > 0) {
    // revise the next constraint in the queue
    const constraint = queue.shift();
    const newDomains = revise(constraint, domains, diagnostics, reduced);
    if (newDomains) {
      [...newDomains.keys()].forEach(key => {
        if (!future.includes(key)) {
          newDomains.delete(key);
        }
      });

      // update the future domains and add any affected constraints back to the queue
      consistent = reduce(reduced, newDomains, domains, queue, constraintMap, constraint);
    } else {
      consistent = false;
    }
  }

  if (consistent) {
    reduced.get(current.key).forEach(value => domains.get(current.key).add(value));
    reduced.delete(current.key);
    reduced.forEach((values, key) => reductions.get(key).push(values));
  } else {
    reduced.forEach((values, key) => {
      if (typeof key === 'number') {
        values.forEach(value => domains.get(key).add(value));
      } else {
        values.forEach(value => key.revive(value));
      }
    });
  }

  return consistent;
};

/**
 * Attempts to assign the current variable a consistent value.
 * @param {Object[]} stack past variable assignments
 * @param {number} stack[].key variable key
 * @param {boolean} stack[].value variable assignment
 * @param {number} key variable to be assigned
 * @param {Map<number, Constraint[]>} constraintMap variables mapped to the constraints relevant to their forward checks
 * @param {Map<number, Set<boolean>>} domains current variable domains
 * @param {Map<(number|Constraint), Set<(boolean|number)>[]>} reductions variables and constraints mapped to their
 * domain and tuple reductions respectively
 * @param {Object} diagnostics execution metrics object
 * @param {number} diagnostics.timeChecking number of ms spent forward checking
 * @returns {boolean} true if labeling was successful, false if unlabeling needed
 */
const label = (stack, key, constraintMap, domains, reductions, diagnostics) => {
  let consistent = false;
  while (domains.get(key).size > 0 && !consistent) {
    stack.push({
      key,
      value: [...domains.get(key)][0],
    });
    const startTime = performance.now();
    if (forwardCheckSTR(stack, constraintMap, domains, reductions, diagnostics)) {
      consistent = true;
    } else {
      const value = stack.pop().value;
      domains.get(key).delete(value);
      reductions.get(key).slice(-1)[0].add(value);
    }
    diagnostics.timeChecking += performance.now() - startTime;
  }
  return consistent;
};

/**
 * Restores the domain of the current variable and removes the previous variable assignment from the stack.
 * @param {Object[]} stack past variable assignments
 * @param {number} stack[].key variable key
 * @param {boolean} stack[].value variable assignment
 * @param {number[]} assignmentOrder order of variable assignments
 * @param {Map<number, Constraint[]>} constraintMap variables mapped to the constraints relevant to their forward check
 * @param {Map<number, Set<boolean>>} domains current variable domains
 * @param {Map<(number|Constraint), Set<(boolean|number)>[]>} reductions variables and constraints mapped to their
 * domain and tuple reductions respectively
 * @param {Object} diagnostics execution metrics object
 * @param {number} diagnostics.tuplesKilled number of tuples killed
 * @return {boolean} true if consistent, false if more unlabeling needed
 */
const unlabel = (stack, assignmentOrder, constraintMap, domains, reductions, diagnostics) => {
  const variable = stack.pop();
  if (variable) {
    restore(variable.key, assignmentOrder, constraintMap, reductions, domains, diagnostics);
    domains.get(variable.key).delete(variable.value);
    reductions.get(variable.key).slice(-1)[0].add(variable.value);
    if (domains.get(variable.key).size > 0) {
      return true;
    }
  }
  return false;
};

/**
 * Searches the subspace until a solution is found or the entire subspace is traversed.
 * @param {Object[]} stack variable assignments
 * @param {number} stack[].key variable key
 * @param {boolean} stack[].boolean variable assignment
 * @param {Map<number, Set<boolean>>} domains variables mapped to the allowed values of the subspace
 * @param {Map<(number|Constraint), Set<(boolean|number)>[]>} reductions variables and constraints mapped to their
 * domain and tuple reductions respectively
 * @param {Map<number, Constraint[]>} constraintMap variables mapped to the constraints relevant to their forward check
 * @param {number[]} assignmentOrder order of variable assignments
 * @param {Object} diagnostics search metrics object
 * @param {number} diagnostics.nodesVisited number of nodes the search visited
 * @param {number} diagnostics.backtracks number of backtracks the search required
 * @param {number} diagnostics.timeChecking number of ms the search required
 * @returns {boolean} true if solution was found, false if no solution exists
 */
const search = (stack, domains, reductions, constraintMap, assignmentOrder, diagnostics) => {
  let consistent = true;
  let currentLevel = stack.length;

  while (currentLevel >= 0 && currentLevel < assignmentOrder.length) {
    const currentVariable = assignmentOrder[currentLevel];
    if (consistent) {
      consistent = label(stack, currentVariable, constraintMap, domains, reductions, diagnostics);
      diagnostics.nodesVisited++;
      if (consistent) {
        currentLevel++;
      }
    } else {
      consistent = unlabel(stack, assignmentOrder, constraintMap, domains, reductions, diagnostics);
      currentLevel--;
      diagnostics.backtracks++;
    }
  }
  return stack.length === assignmentOrder.length;
};

/**
 * Finds all solutions to the given csp and reduces them to the backbone.
 * @param {Map<number, Set<boolean>>} domains variables mapped to their allowed values
 * @param {Map<number, Constraint[]>} constraints variables mapped to their constraints
 * @param {number[]} assignmentOrder order of variable assignments
 * @param {Object} diagnostics search metrics object
 * @param {number} diagnostics.timeFiltering number of ms spent filtering the constraints
 * @param {number} diagnostics.nodesVisited number of nodes the search visited
 * @param {number} diagnostics.backtracks number of backtracks the search required
 * @param {number} diagnostics.timeChecking number of ms the search required
 * @returns {{key: number, value: boolean}[]} list of solvable variables
 */
export default (domains, constraints, assignmentOrder, diagnostics) => {
  if (!diagnostics.tuplesKilled) {
    diagnostics.tuplesKilled = 0;
  }
  // filter the constraints
  const filterTime = performance.now();
  const constraintMap = constraintFilter(constraints, assignmentOrder);
  diagnostics.timeFiltering += performance.now() - filterTime;

  const currentDomains = new Map();
  const reductions = new Map();
  assignmentOrder.forEach(key => {
    currentDomains.set(key, new Set([...domains.get(key)]));
    reductions.set(key, []);
    constraintMap.get(key).forEach(constraint => reductions.set(constraint, [new Set()]));
  });
  // pad the first variable's reductions to avoid index out of bounds issues
  if (assignmentOrder.length > 0) {
    reductions.get(assignmentOrder[0]).push(new Set());
  }
  let fullySearched = false;
  const stack = [];
  const solutions = [];

  while (!fullySearched) {
    if (search(stack, currentDomains, reductions, constraintMap, assignmentOrder, diagnostics)) {
      // save the solution
      solutions.push(stack.slice());

      // find the next variable that could be solved in a different way
      let next;
      while (!next && stack.length > 0) {
        const top = stack.pop();
        if (currentDomains.get(top.key).size > 1) {
          next = top;
        } else {  // restore the reductions to clean up for the next search
          restore(top.key, assignmentOrder, constraintMap, reductions, currentDomains, diagnostics);
        }
      }

      // remove the domain so the same solution isn't found again
      if (next) {
        restore(next.key, assignmentOrder, constraintMap, reductions, currentDomains, diagnostics);
        reductions.get(next.key).slice(-1)[0].add(next.value);
        currentDomains.get(next.key).delete(next.value);
      } else {
        fullySearched = true;
      }
    } else {
      fullySearched = true;
    }
  }

  // return the constraints to their previous state
  reductions.forEach((values, key) => {
    if (typeof key !== 'number') {
      values.forEach(value => key.revive(value));
    }
  });

  // reduce the solutions to the backbone
  const backbone = [];
  assignmentOrder.forEach((key, index) => {
    const solutionValues = new Set();
    solutions.forEach(solution => solutionValues.add(solution[index].value));
    if (solutionValues.size === 1) {
      backbone.push({
        key,
        value: [...solutionValues][0],
      });
    }
  });
  return backbone;
};



// WEBPACK FOOTER //
// ./src/algorithms/BT/forwardCheckSTR.js