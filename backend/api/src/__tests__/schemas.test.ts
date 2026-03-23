import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CreateLinkBodySchema,
  LinkProjectsResponseSchema,
  LinkTrashResponseSchema,
} from '../../../shared/src/index';

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

test('LinkTrashResponseSchema parses trash list', () => {
  const ok = LinkTrashResponseSchema.parse({
    items: [
      {
        batchId: '123e4567-e89b-12d3-a456-426614174000',
        project: 'marketing',
        deletedAt: '2025-01-01T00:00:00.000Z',
        linkCount: 3,
        displayLabel: 'marketing (1)',
      },
    ],
  });
  assert.equal(ok.items[0]!.displayLabel, 'marketing (1)');
});

