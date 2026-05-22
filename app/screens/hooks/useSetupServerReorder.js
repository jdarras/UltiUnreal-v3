import React from 'react';

function useSetupServerReorder({
  setCfg,
  reindexAndPersist,
  cfgRef,
}) {
  const dragInfoRef = React.useRef(null);

  const reorderWithin = React.useCallback(
    async (segment, fromIdx, toIdx) => {
      let next = null;
      setCfg((prev) => {
        const list = [...prev.machines];
        const capable = list.filter((machine) => machine.renderAvailability !== 'excluded');
        const excluded = list.filter((machine) => machine.renderAvailability === 'excluded');
        const targetSegment = segment === 'capable' ? capable : excluded;
        if (
          fromIdx < 0 ||
          fromIdx >= targetSegment.length ||
          toIdx < 0 ||
          toIdx >= targetSegment.length
        ) {
          return prev;
        }
        const [item] = targetSegment.splice(fromIdx, 1);
        targetSegment.splice(toIdx, 0, item);
        const merged = [...capable, ...excluded].map((machine, idx) => ({
          ...machine,
          sortIndex: idx,
        }));
        next = merged;
        return { ...prev, machines: merged };
      });
      if (next) await reindexAndPersist(next);
    },
    [setCfg, reindexAndPersist]
  );

  const onDragStart = React.useCallback((segment, idx) => {
    dragInfoRef.current = { segment, idx };
  }, []);

  const onDragOver = React.useCallback((event) => {
    event.preventDefault();
  }, []);

  const onDrop = React.useCallback(
    (segment, idx) => {
      const info = dragInfoRef.current;
      dragInfoRef.current = null;
      if (!info) return;
      if (info.segment !== segment) return;
      reorderWithin(segment, info.idx, idx);
    },
    [reorderWithin]
  );

  const onCardDragEnd = React.useCallback(() => {
    reindexAndPersist(cfgRef.current?.machines || []);
  }, [reindexAndPersist, cfgRef]);

  return {
    onDragStart,
    onDragOver,
    onDrop,
    onCardDragEnd,
  };
}

export { useSetupServerReorder };
