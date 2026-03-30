declare module '@bottomlessmargaritas/doc-bar' {
  import type { FC } from 'react';

  interface AppDocBarProps {
    appName?: string;
    position?: 'bottom' | 'top';
    fixed?: boolean;
    theme?: 'dark' | 'light';
  }

  const AppDocBar: FC<AppDocBarProps>;
  export default AppDocBar;
}
