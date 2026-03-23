import test from 'node:test';
import assert from 'node:assert/strict';
import { codeForCustomAliasAttempt } from '../links/customAliasCode';
import { randomCode } from '../links/code';

test('randomCode returns expected length and base62 charset', () => {
  const code = randomCode(12);
  assert.equal(code.length, 12);
  assert.match(code, /^[0-9a-zA-Z]+$/);
});

test('codeForCustomAliasAttempt appends -1, -2 on collisions path', () => {
  assert.equal(codeForCustomAliasAttempt('hoc-tieng-anh', 0), 'hoc-tieng-anh');
  assert.equal(codeForCustomAliasAttempt('hoc-tieng-anh', 1), 'hoc-tieng-anh-1');
  assert.equal(codeForCustomAliasAttempt('hoc-tieng-anh', 2), 'hoc-tieng-anh-2');
});

test('codeForCustomAliasAttempt fits max 64 chars', () => {
  const long = 'a'.repeat(64);
  assert.equal(codeForCustomAliasAttempt(long, 0)?.length, 64);
  const withSuffix = codeForCustomAliasAttempt(long, 1);
  assert.ok(withSuffix && withSuffix.length <= 64);
  assert.match(withSuffix!, /-1$/);
});

