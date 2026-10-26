import React from 'react';

/** true inside the «ShortFlow» composition: key moments use the owner's Google Flow frames (src/flow.tsx) */
export const FlowCtx = React.createContext(false);
export const useFlow = () => React.useContext(FlowCtx);
