'use client';

import * as React from 'react';
import createCache from '@emotion/cache';
import { useServerInsertedHTML } from '@mui/material-nextjs/v13-appRouter';
import { CacheProvider } from '@emotion/react';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import theme from './theme'; // Adjust path if your theme file is located differently

// This component is crucial for correct Material-UI SSR with Emotion in Next.js App Router.
// It collects the Emotion styles generated during SSR and injects them into the HTML.
export default function ThemeRegistry(props: { children: React.ReactNode }) {
  const { children } = props;

  // State to manage Emotion cache, ensuring a new cache is created per request on the server.
  const [{ cache, flush }] = React.useState(() => {
    const cache = createCache({ key: 'mui' });
    cache.compat = true;
    // Intercept Emotion's style insertion to collect styles on the server.
    const prevInsert = cache.insert;
    let inserted: string[] = [];
    cache.insert = (...args) => {
      const serialized = args[1];
      if (cache.inserted[serialized.name] === undefined) {
        inserted.push(serialized.name);
      }
      return prevInsert(...args);
    };
    const flush = () => {
      const prevInserted = inserted;
      inserted = [];
      return prev
