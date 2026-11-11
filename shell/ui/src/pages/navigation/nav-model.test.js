import { test } from 'node:test';
import assert from 'node:assert/strict';
import { flatten, isComplete, move, moveBy, remove, setDepth, toTree } from './nav-model.js';

const item = (id, depth = 0) => ({ id, label: id, icon: '', target: { kind: 'home' }, depth });
const shape = (flat) => flat.map((entry) => `${entry.id}${entry.depth ? '>' : ''}`).join(' ');

// A, B(b1, b2), C
const sample = () => [item('A'), item('B'), item('b1', 1), item('b2', 1), item('C')];

test('pohon <-> daftar datar bolak-balik utuh', () => {
  const tree = toTree(sample());
  assert.deepEqual(tree.map((entry) => [entry.id, entry.children.map((child) => child.id)]), [
    ['A', []],
    ['B', ['b1', 'b2']],
    ['C', []],
  ]);
  assert.equal(shape(flatten(tree)), 'A B b1> b2> C');
  assert.equal('depth' in tree[0], false);
});

test('item utama pindah bersama submenunya', () => {
  assert.equal(shape(move(sample(), 1, 0)), 'B b1> b2> A C');
  assert.equal(shape(move(sample(), 1, 5)), 'A C B b1> b2>');
  assert.equal(shape(move(sample(), 1, 3)), 'A B b1> b2> C', 'jatuh di dalam bloknya sendiri = tidak berubah');
});

test('submenu bisa pindah ke induk lain, dan item pertama selalu utama', () => {
  assert.equal(shape(move(sample(), 2, 5)), 'A B b2> C b1>');
  assert.equal(shape(move(sample(), 2, 0)), 'b1 A B b2> C');
});

test('geser naik dan turun', () => {
  assert.equal(shape(moveBy(sample(), 4, -1)), 'A C B b1> b2>');
  assert.equal(shape(moveBy(sample(), 0, 1)), 'B b1> b2> A C');
  assert.equal(shape(moveBy(sample(), 2, 1)), 'A B b2> b1> C');
  assert.equal(shape(moveBy(sample(), 0, -1)), 'A B b1> b2> C');
  assert.equal(shape(moveBy(sample(), 4, 1)), 'A B b1> b2> C');
});

test('ubah tingkat dan hapus', () => {
  assert.equal(shape(setDepth(sample(), 4, 1)), 'A B b1> b2> C>');
  assert.equal(shape(setDepth(sample(), 0, 1)), 'A B b1> b2> C', 'item pertama tidak bisa jadi submenu');
  assert.equal(shape(setDepth(sample(), 2, 0)), 'A B b1 b2> C', 'b2 ikut menjadi submenu b1');
  assert.equal(shape(remove(sample(), 1)), 'A b1 b2 C', 'submenu naik tingkat, tidak ikut terhapus');
  assert.equal(shape(remove(sample(), 2)), 'A B b2> C');
});

test('kelengkapan tujuan', () => {
  assert.equal(isComplete({ kind: 'home' }), true);
  assert.equal(isComplete({ kind: 'url', url: ' ' }), false);
  assert.equal(isComplete({ kind: 'post', postType: 'blog' }), false);
  assert.equal(isComplete({ kind: 'post', postType: 'blog', id: 'abc' }), true);
  assert.equal(isComplete({ kind: 'page' }), false);
});
