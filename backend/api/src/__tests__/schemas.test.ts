import test from 'node:test';
import assert from 'node:assert/strict';
import { CreateLinkBodySchema, LinkProjectsResponseSchema } from '../../../shared/src/index';

test('CreateLinkBodySchema validates URLs', () => {
  assert.throws(() => CreateLinkBodySchema.parse({ longUrl: 'not-a-url' }));
  const ok = CreateLinkBodySchema.parse({ longUrl: 'https://example.com/a/b?c=d' });
  assert.equal(ok.longUrl, 'https://example.com/a/b?c=d');
});

test('LinkProjectsResponseSchema parses project summary', () => {
  const ok = LinkProjectsResponseSchema.parse({
    items: [
      { project: 'toeic', total: 3, activeCount: 2 },
      { project: null, total: 1, activeCount: 1 },
    ],
  });
  assert.equal(ok.items.length, 2);
  assert.equal(ok.items[1]!.project, null);
});

