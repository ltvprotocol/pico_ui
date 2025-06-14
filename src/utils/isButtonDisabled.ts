export const isButtonDisabled = (
  loading : boolean,
  amount : string,
  maxAvailable : string
) : boolean => {
  if(isNaN(parseFloat(maxAvailable))) {
    return true;
  }

  return (
    loading ||
    !amount ||
    parseFloat(amount) == 0 ||
    !maxAvailable ||
    parseFloat(amount) > parseFloat(maxAvailable)
  )
}