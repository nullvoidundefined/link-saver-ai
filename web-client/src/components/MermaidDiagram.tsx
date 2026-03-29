'use client';

import { useEffect, useId, useRef, useState } from 'react';

import mermaid from 'mermaid';

mermaid.initialize({
  startOnLoad: false,
  theme: 'dark',
  themeVariables: {
    background: '#0a0a0a',
    primaryColor: '#1e3a5f',
    primaryTextColor: '#ededed',
    primaryBorderColor: '#2d5a8e',
    lineColor: '#4a4a5a',
    secondaryColor: '#14532d',
    tertiaryColor: '#1a1a2e',
    edgeLabelBackground: '#1a1a1a',
    clusterBkg: '#111',
    titleColor: '#ededed',
    nodeTextColor: '#ededed',
  },
});

export default function MermaidDiagram({ chart }: { chart: string }) {
  const id = useId().replace(/:/g, '');
  const ref = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    mermaid
      .render(`mermaid-${id}`, chart)
      .then(({ svg: rendered }) => setSvg(rendered))
      .catch((err) => setError(String(err)));
  }, [chart, id]);

  if (error) {
    return (
      <pre style={{ color: '#f87171', fontSize: '0.8rem', padding: '1rem' }}>
        {error}
      </pre>
    );
  }

  return (
    <div
      ref={ref}
      style={{ overflowX: 'auto', margin: '1.5rem 0' }}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
