import { Suspense, lazy } from 'react';

const ProductionLayoutTabs = lazy(() => import('./ProductionLayoutTabs.jsx'));
const ProductionLayoutCanvas = lazy(() => import('./ProductionLayoutCanvas.jsx'));
const ProductionSidebar = lazy(() => import('./ProductionSidebar.jsx'));

export default function ProductionWorkspace({
  lazyFallback,
  layoutTabsProps,
  layoutCanvasProps,
  sidebarProps,
}) {
  return (
    <div className="mt-8">
      <Suspense fallback={lazyFallback}>
        <ProductionLayoutTabs {...layoutTabsProps} />
      </Suspense>
      <Suspense fallback={lazyFallback}>
        <ProductionLayoutCanvas {...layoutCanvasProps} />
      </Suspense>
      <Suspense fallback={lazyFallback}>
        <ProductionSidebar {...sidebarProps} />
      </Suspense>
    </div>
  );
}
