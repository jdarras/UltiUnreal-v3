import test from 'node:test';
import assert from 'node:assert/strict';

import {
  normalizeProjectMetaStatus,
  buildProjectDetailPayload,
  buildProjectDetailPreserved,
  buildMergedProjectMeta,
  buildProjectListPatchFromPayload,
  buildProjectListPatchFromMergedMeta,
  mapProjectById,
} from '../../app/screens/hooks/projectDetailPersistenceHelpers.js';

test('normalizeProjectMetaStatus normalizes PAS and keeps other values', () => {
  assert.equal(normalizeProjectMetaStatus('PAS'), 'PAD');
  assert.equal(normalizeProjectMetaStatus('READY'), 'READY');
  assert.equal(normalizeProjectMetaStatus(''), '');
  assert.equal(normalizeProjectMetaStatus(undefined), '');
});

test('buildProjectDetailPayload maps meta values with fallbacks and pv override', () => {
  const payload = buildProjectDetailPayload({
    meta: {
      status: 'PAS',
      type: 'cinematic',
      usageMode: 'auto_render',
      category: 'A',
      fileVersion: 'v1',
      referents: { lead: 'julien' },
      note: 'hello',
    },
    pvValue: 'v2',
    wrcNamesValue: ['WRC-1'],
    keywords: ['alpha', 'beta'],
  });

  assert.deepEqual(payload, {
    status: 'PAD',
    type: 'cinematic',
    usageMode: 'auto_render',
    syncIncluded: false,
    category: 'A',
    fileVersion: 'v2',
    referents: { lead: 'julien' },
    keywords: ['alpha', 'beta'],
    note: 'hello',
    wrcNames: ['WRC-1'],
  });
});

test('buildProjectDetailPreserved keeps editable fields only', () => {
  const preserved = buildProjectDetailPreserved({
    status: 'READY',
    type: 'shot',
    usageMode: 'manual',
    note: 'note',
    keywords: ['k1'],
    referents: { sup: 'a' },
    ignored: 'x',
  });

  assert.deepEqual(preserved, {
    status: 'READY',
    type: 'shot',
    usageMode: 'manual',
    note: 'note',
    keywords: ['k1'],
    referents: { sup: 'a' },
  });
});

test('buildMergedProjectMeta merges preserved fields and referents, sets favorite boolean', () => {
  const merged = buildMergedProjectMeta({
    metaRaw: {
      status: 'RAW',
      type: 'rawType',
      usageMode: 'rawMode',
      note: 'rawNote',
      keywords: ['raw'],
      referents: { a: 1, b: 1 },
      untouched: true,
    },
    preserved: {
      status: 'KEEP',
      type: 'keepType',
      usageMode: 'keepMode',
      note: 'keepNote',
      keywords: ['keep'],
      referents: { b: 2, c: 3 },
    },
    isFavorite: true,
  });

  assert.deepEqual(merged, {
    status: 'KEEP',
    type: 'keepType',
    usageMode: 'keepMode',
    note: 'keepNote',
    keywords: ['keep'],
    referents: { a: 1, b: 2, c: 3 },
    untouched: true,
    favorite: true,
  });
});

test('buildProjectListPatchFromPayload formats fields and normalizes path', () => {
  const patch = buildProjectListPatchFromPayload({
    pathValue: 'D:/MyProj/Project.uproject',
    wrcNamesValue: ['Main'],
    payload: {
      note: 'n',
      status: 'OK',
      type: 't',
      usageMode: 'u',
      category: 'c',
      fileVersion: 'v',
      referents: { x: 1 },
      keywords: ['k'],
    },
  });

  assert.deepEqual(patch, {
    uproject: 'D:\\MyProj\\Project.uproject',
    wrcNames: ['Main'],
    note: 'n',
    metaStatus: 'OK',
    metaType: 't',
    metaUsageMode: 'u',
    metaCategory: 'c',
    metaFileVersion: 'v',
    metaReferents: { x: 1 },
    metaKeywords: ['k'],
  });
});

test('buildProjectListPatchFromMergedMeta handles non-array keywords', () => {
  const patch = buildProjectListPatchFromMergedMeta({
    pathValue: '',
    wrcNamesValue: [],
    mergedMeta: {
      note: 'n2',
      status: 'S',
      type: 'T',
      usageMode: 'U',
      category: 'C',
      fileVersion: 'V',
      referents: { r: 1 },
      keywords: 'not-array',
    },
  });

  assert.deepEqual(patch, {
    uproject: undefined,
    wrcNames: [],
    note: 'n2',
    metaStatus: 'S',
    metaType: 'T',
    metaUsageMode: 'U',
    metaCategory: 'C',
    metaFileVersion: 'V',
    metaReferents: { r: 1 },
    metaKeywords: [],
  });
});

test('mapProjectById updates only target project and keeps existing uproject if patch omits it', () => {
  const projects = [
    { id: '0001', name: 'A', uproject: 'A.uproject', metaType: 'old' },
    { id: '0002', name: 'B', uproject: 'B.uproject', metaType: 'old' },
  ];

  const updated = mapProjectById(projects, '0002', () => ({
    metaType: 'new',
    uproject: undefined,
  }));

  assert.deepEqual(updated, [
    { id: '0001', name: 'A', uproject: 'A.uproject', metaType: 'old' },
    { id: '0002', name: 'B', uproject: 'B.uproject', metaType: 'new' },
  ]);
});
