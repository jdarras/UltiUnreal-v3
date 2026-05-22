import React from 'react';

function useLaunchControlStartLayoutState() {
  const [useStartLayout, setUseStartLayout] = React.useState(false);
  const [hasStartLayout, setHasStartLayout] = React.useState(false);

  return {
    useStartLayout,
    setUseStartLayout,
    hasStartLayout,
    setHasStartLayout,
  };
}

export { useLaunchControlStartLayoutState };
