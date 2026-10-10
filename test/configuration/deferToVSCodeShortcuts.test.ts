import * as assert from 'assert';
import * as process from 'process';
import * as packagejson from '../../package.json';
import { Configuration } from '../../src/configuration/configuration';
import { Notation } from '../../src/configuration/notation';
import { vscodeConflictingKeys } from '../../src/configuration/vscodeConflictingKeys';

const conflictKeys = vscodeConflictingKeys(process.platform);
// Bound by both VSCodeVim and VS Code on every platform
const conflictingKey = '<C-BS>';
// Bound by VSCodeVim but not by VS Code on any platform
const nonConflictingKey = '<C-^>';

function newConfiguration(overrides: Partial<Configuration> = {}): Configuration {
  const configuration = new Configuration();
  // The class default is false; the setting's declared default is true.
  configuration.useCtrlKeys = true;
  Object.assign(configuration, overrides);
  return configuration;
}

suite('vim.deferToVSCodeShortcuts', () => {
  test('conflicting keys are deferred to VS Code when enabled', () => {
    assert.ok(conflictKeys.has(conflictingKey));
    const configuration = newConfiguration({ deferToVSCodeShortcuts: true });
    assert.strictEqual(configuration.resolveUseKey(conflictingKey), false);
  });

  test('conflicting keys are handled by Vim when disabled', () => {
    const configuration = newConfiguration({ deferToVSCodeShortcuts: false });
    assert.strictEqual(configuration.resolveUseKey(conflictingKey), true);
  });

  test('non-conflicting keys are still handled by Vim when enabled', () => {
    assert.ok(!conflictKeys.has(nonConflictingKey));
    const configuration = newConfiguration({ deferToVSCodeShortcuts: true });
    assert.strictEqual(configuration.resolveUseKey(nonConflictingKey), true);
  });

  test('vim.handleKeys exceptions keep Vim keys when enabled', () => {
    const configuration = newConfiguration({
      deferToVSCodeShortcuts: true,
      handleKeys: { [conflictingKey]: true },
    });
    assert.strictEqual(configuration.resolveUseKey(conflictingKey), true);
  });

  test('vim.handleKeys still delegates non-conflicting keys when enabled', () => {
    const configuration = newConfiguration({
      deferToVSCodeShortcuts: true,
      handleKeys: { [nonConflictingKey]: false },
    });
    assert.strictEqual(configuration.resolveUseKey(nonConflictingKey), false);
  });

  test('vim.useCtrlKeys=false still disables ctrl keys when enabled', () => {
    const configuration = newConfiguration({
      deferToVSCodeShortcuts: true,
      useCtrlKeys: false,
    });
    assert.strictEqual(configuration.resolveUseKey('<C-f>'), false);
    // <C-c> is still captured so that `vim.overrideCopy` works
    assert.strictEqual(configuration.resolveUseKey('<C-c>'), true);
  });

  test('every conflicting key is a VSCodeVim-bound key on this platform', () => {
    const boundKeys = new Set(
      packagejson.contributes.keybindings
        .filter((kb) => !kb.when.includes('listFocus') && !kb.command.startsWith('notebook'))
        .map((kb) => {
          let key = kb.key;
          if (process.platform === 'darwin') {
            key = kb.mac ?? key;
          } else if (process.platform === 'linux') {
            key = kb.linux ?? key;
          }
          return Notation.NormalizeKey(key, '\\');
        }),
    );
    for (const key of conflictKeys) {
      assert.ok(boundKeys.has(key), `${key} is not a VSCodeVim-bound key`);
    }
  });
});
