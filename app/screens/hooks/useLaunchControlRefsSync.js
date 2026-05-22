import React from 'react';

function useLaunchControlRefsSync({
  projectsData,
  rcHttpPort,
  refreshSec,
  useStartLayout,
  hasStartLayout,
  hosts,
}) {
  const projectsDataRef = React.useRef(projectsData);
  const commonCfgRef = React.useRef({});
  const rcHttpPortRef = React.useRef(rcHttpPort);
  const refreshSecRef = React.useRef(refreshSec);
  const useStartLayoutRef = React.useRef(useStartLayout);
  const hasStartLayoutRef = React.useRef(hasStartLayout);
  const wrcReadyRef = React.useRef(false);
  const hostsRef = React.useRef(hosts);

  React.useEffect(() => {
    projectsDataRef.current = projectsData;
  }, [projectsData]);

  React.useEffect(() => {
    rcHttpPortRef.current = rcHttpPort;
  }, [rcHttpPort]);

  React.useEffect(() => {
    refreshSecRef.current = refreshSec;
  }, [refreshSec]);

  React.useEffect(() => {
    useStartLayoutRef.current = useStartLayout;
  }, [useStartLayout]);

  React.useEffect(() => {
    hasStartLayoutRef.current = hasStartLayout;
  }, [hasStartLayout]);

  React.useEffect(() => {
    hostsRef.current = hosts;
  }, [hosts]);

  return {
    projectsDataRef,
    commonCfgRef,
    rcHttpPortRef,
    refreshSecRef,
    useStartLayoutRef,
    hasStartLayoutRef,
    wrcReadyRef,
    hostsRef,
  };
}

export { useLaunchControlRefsSync };
