export function isSuperset<T>(supersetCandidate: Set<T>, targetSet: Set<T>) {
  for (const element of targetSet) {
    if (supersetCandidate.has(element)) continue;
    return false;
  }
  return true;
}

export function isSubset<T>(subsetCandidate: Set<T>, referenceSet: Set<T>) {
  for (const element of subsetCandidate) {
    if (referenceSet.has(element)) continue;
    return false;
  }
  return true;
}


export function areEqualSets<T>(setA: Set<T>, setB: Set<T>) {
  if (setA.size !== setB.size) return false;
  for (const element of setA) {
    if (!setB.has(element)) return false;
  }
  return true;
}