import test from 'node:test';
import assert from 'node:assert/strict';
import { isHostPrivateOrLocal, isSafeHttpUrlForRedirect } from '../security/urlPolicy';

test('isHostPrivateOrLocal detects localhost and RFC1918', () => {
  assert.equal(isHostPrivateOrLocal('localhost'), true);
  assert.equal(isHostPrivateOrLocal('127.0.0.1'), true);
  assert.equal(isHostPrivateOrLocal('10.0.0.1'), true);
  assert.equal(isHostPrivateOrLocal('192.168.1.1'), true);
  assert.equal(isHostPrivateOrLocal('172.16.0.1'), true);
  assert.equal(isHostPrivateOrLocal('example.com'), false);
});

test('isSafeHttpUrlForRedirect rejects javascript and data', () => {
  assert.equal(isSafeHttpUrlForRedirect('https://example.com/path'), true);
  assert.equal(isSafeHttpUrlForRedirect('javascript:alert(1)'), false);
  assert.equal(isSafeHttpUrlForRedirect('data:text/html,hi'), false);
  assert.equal(isSafeHttpUrlForRedirect('https://user:pass@example.com/'), false);
});
