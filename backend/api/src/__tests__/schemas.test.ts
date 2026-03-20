import test from 'node:test';
import assert from 'node:assert/strict';
import { CreateLinkBodySchema } from '../../../shared/src/index';

test('CreateLinkBodySchema validates URLs', () => {
  assert.throws(() => CreateLinkBodySchema.parse({ longUrl: 'not-a-url' }));
  const ok = CreateLinkBodySchema.parse({ longUrl: 'https://example.com/a/b?c=d' });
  assert.equal(ok.longUrl, 'https://example.com/a/b?c=d');
});

