'use client';

import AppDocBar from '@bottomlessmargaritas/doc-bar';
import '@bottomlessmargaritas/doc-bar/styles.css';

export default function DocBar() {
  return (
    <AppDocBar
      appName="Link Saver AI"
      position="bottom"
      fixed={true}
      theme="dark"
    />
  );
}
