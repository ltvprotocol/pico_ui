export const isUserRejected = (err: any) => {
  const isReasonTrue = 
    err?.code === 4001 || 
    err?.error?.code === 4001 || 
    err?.message?.toLowerCase().includes('user denied') ||
    err?.reason?.toLowerCase().includes('rejected');

  return isReasonTrue;
};