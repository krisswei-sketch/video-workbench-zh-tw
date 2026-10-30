import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { initialSteps, classifyCommand, classifyFiles, applyCodexEvent, finishAgentSteps, beginRepair } from './general/events.ts';
import { runStatus } from '../src/general/general-logic.ts';
import type { GeneralRun } from '../src/general/general-contract.ts';

test('真實命令形態：寫子頁面優先於指令碼里的 check；hfx 與即時 progress 不漏報', () => {
  for (const cmd of ['mkdir -p compositions assets fonts .tmp; curl -o fonts/x.ttf url', 'python3 - <<\'PY\'\nPath("compositions/scene-2.html").write_text(html)', 'cat > .tmp/build.py <<\'PY\'\n# hfx check\nwrite_text("index.html")', 'film progress code']) {
    assert.equal(classifyCommand(cmd)?.step, 'code', cmd);
  }
  assert.equal(classifyCommand('hfx check')?.step, 'self-check');
  assert.equal(classifyCommand('hfx look 12')?.step, 'self-check');
  assert.equal(classifyFiles(['plan.json', 'compositions/scene-2.html'])?.step, 'code');
  let steps = initialSteps('topic', 'first');
  steps = applyCodexEvent(steps, { type: 'item.started', item: { type: 'command_execution', command: 'mkdir -p compositions assets' } }, '2026-10-28T12:00:00Z').steps;
  assert.equal(steps.find(s => s.id === 'code')?.state, 'running');
  assert.equal(steps.find(s => s.id === 'code')?.startedAt, '2026-10-28T12:00:00Z');
  steps = finishAgentSteps(steps, '2026-10-28T12:00:10Z');
  assert.equal(steps.find(s => s.id === 'self-check')?.state, 'skipped');
  const rendered = finishAgentSteps(steps.map(s => s.id === 'render' ? { ...s, state: 'running', startedAt: '2026-10-28T12:00:10Z' } : s), '2026-10-28T12:00:12Z');
  assert.equal(rendered.find(s => s.id === 'render')?.state, 'done', '舊格式的算圖已實際完成，不應和後續機檢同時執行');
});
test('真實返工保留第一輪時間，第二輪帶問題；狀態文字可直接展示', () => {
  const run: GeneralRun = { id: 'test', agent: 'codex', state: 'running', purpose: 'first', startedAt: '2026-10-28T12:00:00Z', queued: 0, steps: initialSteps('topic', 'first') };
  beginRepair(run, '長度不對', '2026-10-28T12:01:00Z');
  assert.equal(run.round, 2);
  assert.equal(run.rounds?.[0].round, 1);
  assert.equal(run.steps.find(s => s.id === 'code')?.state, 'running');
  assert.match(runStatus({ run, versions: [] }).text, /第 2 輪：修正 長度不對/);
});
test('hfx plan 在寫頁面前一次給全規則，15 秒骨架滿足數量與長度', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'task14-plan-'));
  try {
    const result = execFileSync(process.execPath, [path.resolve('server/general/kit/hfx.mjs'), 'plan', '15'], { cwd: dir, env: { ...process.env, CW_WORK: dir }, encoding: 'utf8' });
    assert.match(result, /至少 3.*最多 8/);
    const plan = JSON.parse(result.slice(result.indexOf('['))) as { start: number; end: number }[];
    assert.equal(plan.length, 3);
    assert.equal(plan.at(-1)?.end, 15);
    assert.ok(plan.every(p => p.end - p.start <= 8));
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
