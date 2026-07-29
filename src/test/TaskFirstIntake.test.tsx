import { fireEvent, render, screen } from '@testing-library/react';
import type { ComponentProps } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { TaskFirstIntake } from '../components/TaskFirstIntake';

function renderIntake(overrides: Partial<ComponentProps<typeof TaskFirstIntake>> = {}) {
  const props = { inputText: '', skillUrl: '', onInputTextChange: vi.fn(), onSkillUrlChange: vi.fn(), onPrimaryAction: vi.fn(), onImportUrl: vi.fn(), onUploadFiles: vi.fn(), onUploadFolder: vi.fn(), onSelectTask: vi.fn(), onActiveTabChange: vi.fn(), ...overrides };
  render(<TaskFirstIntake {...props} />);
  return props;
}

describe('TaskFirstIntake', () => {
  it('presents the four task choices and reports a selection', () => {
    const props = renderIntake();
    expect(screen.getByRole('radio', { name: /審查一個 skill/i })).toHaveAttribute('aria-checked', 'true');
    fireEvent.click(screen.getByRole('radio', { name: /審查 skill bundle/i }));
    expect(props.onSelectTask).toHaveBeenCalledWith('compare');
    expect(screen.getByRole('radio', { name: /審查 skill bundle/i })).toHaveAttribute('aria-checked', 'true');
  });
  it('uses one task-card tab stop and supports the complete radio arrow-key contract', () => {
    const props = renderIntake();
    const review = screen.getByRole('radio', { name: /審查一個 skill/i });
    const bundle = screen.getByRole('radio', { name: /審查 skill bundle/i });
    const demo = screen.getByRole('radio', { name: /開啟示範工作區/i });

    expect(review).toHaveAttribute('tabindex', '0');
    expect(bundle).toHaveAttribute('tabindex', '-1');

    review.focus();
    fireEvent.keyDown(review, { key: 'ArrowRight' });
    expect(bundle).toHaveFocus();
    expect(bundle).toHaveAttribute('aria-checked', 'true');
    expect(bundle).toHaveAttribute('tabindex', '0');
    expect(review).toHaveAttribute('tabindex', '-1');

    fireEvent.keyDown(bundle, { key: 'End' });
    expect(demo).toHaveFocus();
    expect(demo).toHaveAttribute('aria-checked', 'true');
    expect(props.onSelectTask).toHaveBeenCalledWith('compare');
    expect(props.onSelectTask).toHaveBeenCalledWith('demo');
  });
  it('keeps paste input controlled and starts its primary action', () => {
    const props = renderIntake({ inputText: '# imported skill' });
    fireEvent.change(screen.getByRole('textbox', { name: '貼上要審查的內容' }), { target: { value: '# updated skill' } });
    fireEvent.click(screen.getByRole('button', { name: /開始解析並進入審查/i }));
    expect(props.onInputTextChange).toHaveBeenCalledWith('# updated skill');
    expect(props.onPrimaryAction).toHaveBeenCalledOnce();
  });
  it('supports keyboard navigation and controlled selection for intake tabs', () => {
    const props = renderIntake({ activeTab: 'paste' });
    fireEvent.keyDown(screen.getByRole('tab', { name: '貼上內容' }), { key: 'ArrowRight' });
    expect(props.onActiveTabChange).toHaveBeenCalledWith('upload');
  });
  it('delegates upload actions and makes selected upload count visible', () => {
    const props = renderIntake({ pendingUploadCount: 2 });
    fireEvent.click(screen.getByRole('tab', { name: '上傳檔案' }));
    fireEvent.click(screen.getByRole('button', { name: '選擇檔案' }));
    fireEvent.click(screen.getByRole('button', { name: '掃描資料夾' }));
    expect(screen.getByText('已選擇 2 個檔案')).toBeInTheDocument();
    expect(props.onUploadFiles).toHaveBeenCalledOnce();
    expect(props.onUploadFolder).toHaveBeenCalledOnce();
  });
  it('delegates URL input and import, and exposes error and status semantics', () => {
    const props = renderIntake({ skillUrl: 'https://github.com/openai/skills/blob/main/SKILL.md', error: '網址格式無效', status: { label: '準備就緒', detail: 'Parser 已連線', tone: 'success' } });
    fireEvent.click(screen.getByRole('tab', { name: '從 URL 取得' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'Skill URL' }), { target: { value: 'https://example.com/skill.md' } });
    fireEvent.click(screen.getByRole('button', { name: '匯入 URL' }));
    expect(props.onSkillUrlChange).toHaveBeenCalledWith('https://example.com/skill.md');
    expect(props.onImportUrl).toHaveBeenCalledOnce();
    expect(screen.getByRole('alert')).toHaveTextContent('網址格式無效');
    expect(screen.getByRole('status')).toHaveTextContent('準備就緒 · Parser 已連線');
  });
});
