import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { IntakeSourceEditor } from '../components/IntakeSourceEditor';

const files = [
  { name: 'SKILL.md', path: 'bundle/SKILL.md', type: '.md', size: 16, role: 'primary' as const, source: 'upload' as const, text: '# Original skill', preview: '# Original skill', isPrimaryCandidate: true },
  { name: 'policy.md', path: 'bundle/docs/policy.md', type: '.md', size: 8, role: 'context' as const, source: 'upload' as const, text: '# Policy', preview: '# Policy', isPrimaryCandidate: false },
  { name: 'logo.png', path: 'bundle/assets/logo.png', type: 'image/png', size: 32, role: 'context' as const, source: 'upload' as const, isPrimaryCandidate: false },
];

describe('IntakeSourceEditor', () => {
  it('edits text source, marks primary files, and restores the imported content', () => {
    const onUpdateFile = vi.fn();
    render(<IntakeSourceEditor files={files} primaryPath="bundle/SKILL.md" isBusy={false} language="en" onSelectPrimary={vi.fn()} onUpdateFile={onUpdateFile} onAnalyze={vi.fn()} />);

    fireEvent.change(screen.getByRole('textbox', { name: 'SKILL.md source content' }), { target: { value: '# Edited skill' } });
    expect(onUpdateFile).toHaveBeenCalledWith('bundle/SKILL.md', '# Edited skill');

    fireEvent.click(screen.getByRole('button', { name: 'policy.md bundle/docs/policy.md' }));
    expect(screen.getByRole('textbox', { name: 'policy.md source content' })).toHaveValue('# Policy');
    expect(screen.getByText('Primary')).toBeInTheDocument();
  });

  it('does not display unreadable files as editable text', () => {
    render(<IntakeSourceEditor files={files} primaryPath="bundle/SKILL.md" isBusy={false} language="en" onSelectPrimary={vi.fn()} onUpdateFile={vi.fn()} onAnalyze={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'logo.png bundle/assets/logo.png' }));
    expect(screen.getByText(/not readable text/i)).toBeInTheDocument();
    expect(screen.queryByRole('textbox', { name: /logo\.png source content/i })).not.toBeInTheDocument();
  });
});
