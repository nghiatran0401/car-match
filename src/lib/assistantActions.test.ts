import { describe, expect, it } from 'vitest';
import { detectAssistantActions } from './assistantActions';
import { vehicles } from '../data/vehicles';

describe('detectAssistantActions', () => {
  it('detects compare + specific model actions', () => {
    const actions = detectAssistantActions({
      userText: 'so sanh ex5 giup toi',
      assistantText: 'Mình sẽ đưa EX5 vào danh sách so sánh.',
      vehicles,
    });
    expect(actions.some(action => action.kind === 'compare_add')).toBe(true);
  });

  it('detects navigation to quote', () => {
    const actions = detectAssistantActions({
      userText: 'cho toi bao gia',
      assistantText: 'Em sẽ dẫn anh/chị tới trang báo giá.',
      vehicles,
    });
    expect(actions.some(action => action.kind === 'navigate' && action.target === '/quote')).toBe(true);
  });

  it('detects recommendation filters from powertrain + budget', () => {
    const actions = detectAssistantActions({
      userText: 'toi can xe hybrid tam 1.3 ty',
      assistantText: 'Em lọc hybrid trong tầm ngân sách đó.',
      vehicles,
    });
    const controlsAction = actions.find(action => action.kind === 'set_controls');
    expect(controlsAction && controlsAction.kind === 'set_controls' ? controlsAction.controls.powertrainFilter : undefined).toBe('hybrid');
    expect(controlsAction && controlsAction.kind === 'set_controls' ? controlsAction.controls.budgetBand : undefined).toBe('1000-1400');
  });

  it('returns none action when no signal', () => {
    const actions = detectAssistantActions({
      userText: 'hello',
      assistantText: 'Hi there',
      vehicles,
    });
    expect(actions).toHaveLength(1);
    expect(actions[0]?.kind).toBe('none');
  });
});
