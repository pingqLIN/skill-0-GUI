import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SideEditor } from '../components/SideEditor';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

describe('SideEditor', () => {
  it('renders and saves phase edits with list fields preserved as arrays', () => {
    const onSave = vi.fn();

    render(
      <SideEditor
        config={{
          type: 'phase',
          payload: {
            id: 'B',
            name: 'Assess',
            input: ['source skill'],
            tasks: ['scan dependencies'],
            output: ['risk report'],
          },
        }}
        onClose={vi.fn()}
        onSave={onSave}
      />,
    );

    fireEvent.change(screen.getByDisplayValue('Assess'), {
      target: { value: 'Assess Risk' },
    });
    fireEvent.change(screen.getByDisplayValue('source skill'), {
      target: { value: 'source skill\nsupporting manifest' },
    });
    fireEvent.change(screen.getByDisplayValue('scan dependencies'), {
      target: { value: 'scan dependencies\nrank findings' },
    });
    fireEvent.change(screen.getByDisplayValue('risk report'), {
      target: { value: 'risk report\noperator summary' },
    });

    fireEvent.click(screen.getByText('editor.save'));

    expect(onSave).toHaveBeenCalledWith({
      id: 'B',
      name: 'Assess Risk',
      input: ['source skill', 'supporting manifest'],
      tasks: ['scan dependencies', 'rank findings'],
      output: ['risk report', 'operator summary'],
    });
  });
});
