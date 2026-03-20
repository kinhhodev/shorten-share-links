import test from 'node:test';
import assert from 'node:assert/strict';
import { randomCode } from '../links/code';

test('randomCode returns expected length and base62 charset', () => {
  const code = randomCode(12);
  assert.equal(code.length, 12);
  assert.match(code, /^[0-9a-zA-Z]+$/);
});

