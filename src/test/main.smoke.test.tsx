import React from 'react';
import { act, screen } from '@testing-library/react';
import { beforeEach, vi } from 'vitest';

vi.mock('../App.tsx', () => ({
  default: () => <div>main-entry-smoke</div>,
}));

vi.mock('../i18n', () => ({}));
vi.mock('../index.css', () => ({}));

describe('main entry smoke test', () => {
  beforeEach(() => {
    vi.resetModules();
    document.body.innerHTML = '<div id="root"></div>';
  });

  it('mounts the root application without throwing', async () => {
    await act(async () => {
      await import('../main.tsx');
    });

    expect(screen.getByText('main-entry-smoke')).toBeInTheDocument();
  });
});
