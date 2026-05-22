// app/screens/synchronisation.jsx
import { SyncClientPanel, SyncServerScreen } from './synchronisationSections';
import { useSynchronisationOrchestrator } from './hooks/useSynchronisationOrchestrator';

export default function SynchronisationScreen() {
  const { role, clientPanelProps, serverScreenProps } = useSynchronisationOrchestrator();

  if (role === 'client') {
    return <SyncClientPanel {...clientPanelProps} />;
  }

  if (role === 'server') {
    return <SyncServerScreen {...serverScreenProps} />;
  }

  return null;
}
