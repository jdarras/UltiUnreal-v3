import React from 'react';

function useLaunchControlUiState() {
  const [showUeLaunch, setShowUeLaunch] = React.useState(false);
  const [allowStartDesynced, setAllowStartDesynced] = React.useState(false);
  const [ueVersions, setUeVersions] = React.useState([]);
  const [rcHttpPort, setRcHttpPort] = React.useState(30010);

  return {
    showUeLaunch,
    setShowUeLaunch,
    allowStartDesynced,
    setAllowStartDesynced,
    ueVersions,
    setUeVersions,
    rcHttpPort,
    setRcHttpPort,
  };
}

export { useLaunchControlUiState };
