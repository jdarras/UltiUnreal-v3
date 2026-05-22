import React from 'react';

const EMPTY_CFG = {
  machines: [],
};

export function useSetupServerConfigState() {
  const [cfg, setCfg] = React.useState(EMPTY_CFG);
  const cfgRef = React.useRef(cfg);

  React.useEffect(() => {
    cfgRef.current = cfg;
  }, [cfg]);

  return {
    cfg,
    setCfg,
    cfgRef,
  };
}
