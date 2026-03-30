'use client';

import '@bottomlessmargaritas/doc-bar/styles.css';

import AppDocBar from '@bottomlessmargaritas/doc-bar';

export default function DocBar() {
  return (
    <AppDocBar
      appName='Link Saver AI'
      position='bottom'
      fixed={true}
      theme='dark'
    />
  );
}
