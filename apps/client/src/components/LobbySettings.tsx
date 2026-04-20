import React from 'react';
import type { LobbySettings as LobbySettingsType } from '@farkle/shared/types';

interface Props {
  settings: LobbySettingsType;
  onChange: (s: LobbySettingsType) => void;
}

export default function LobbySettings({ settings, onChange }: Props) {
  return (
    <div className="p-4 border rounded bg-zinc-900 border-zinc-700 text-zinc-400 text-sm text-center">
      Advanced settings panel coming soon...
    </div>
  );
}
