import React from "react";
export const NoticeContext = React.createContext({
  notice: { text: '', type: '' },
  showNotice: () => {},
  clearNotice: () => {},
});
