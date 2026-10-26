import test from 'node:test';
import assert from 'node:assert';
import { FruitManager } from '../src/core/fruitManager.js';
import fs from 'node:fs/promises';
import path from 'node:path';

test('FruitManager creates, lists, and manages fruits', async () => {
  const manager = new FruitManager();
  const testFruitName = 'test-demo-site';

  // 1. Create fruit
  const created = await manager.createFruit(testFruitName);
  assert.strictEqual(created.name, testFruitName);

  // 2. List fruits
  const list = await manager.listFruits();
  assert.ok(list.some(f => f.name === testFruitName));

  // 3. Load fruit
  const loaded = await manager.loadFruit(testFruitName);
  assert.strictEqual(loaded.name, testFruitName);
  assert.strictEqual(loaded.config.targetType, 'post');

  // 4. Update config
  const updated = await manager.updateFruitConfig(testFruitName, {
    targetType: 'page',
    notion: {
      apiKey: 'secret_test123',
      databaseId: 'db-test-456'
    }
  });
  assert.strictEqual(updated.targetType, 'page');
  assert.strictEqual(updated.notion.apiKey, 'secret_test123');

  // 5. Delete fruit
  await manager.deleteFruit(testFruitName);
  const listAfterDelete = await manager.listFruits();
  assert.ok(!listAfterDelete.some(f => f.name === testFruitName));
});
