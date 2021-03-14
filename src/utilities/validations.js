export const areAllFieldsValid = items => {
  for (let item of items) {
    if(item.lastValue === undefined) return true;
    if(item.lastValue.includes("_")) return false;
  }

  return true;
}