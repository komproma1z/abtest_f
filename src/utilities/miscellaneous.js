export const addLastValueField = items => {
  for (let item of items) {
    item["lastValue"] = "";
  }
}