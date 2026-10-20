// Lecture des préréglages Unreal (WRC) : types reconnus, champs produits,
// noms uniques sans boucle sans fin, valeurs par défaut, dispositions.
const test = require('node:test');
const assert = require('node:assert/strict');

const {
  inferRenderFormFieldKindFromWrcRawType: inferKind,
  buildRenderFormFieldsFromWrcPreset,
  buildRenderFormFieldsFromWrcLayoutFieldIds,
  extractWrcLayoutFieldIds,
  normalizeRenderFormDefaultValueFromWrc: normalizeDefault,
  pickReadableWrcIdentifier,
} = require('../../main/server-postprod-wrc-fields.cjs');

const valueTypeOf = (rawType) => inferKind(rawType).valueType;

test('simple Unreal types map to the matching input', () => {
  const expected = {
    bool: 'boolean', BoolProperty: 'boolean',
    int32: 'integer', uint8: 'integer', IntProperty: 'integer', Int64Property: 'integer', ByteProperty: 'integer',
    float: 'number', DoubleProperty: 'number',
    FVector: 'vector3', FRotator: 'vector3', FVector2D: 'vector2', FIntPoint: 'vector2',
    FLinearColor: 'color', FColor: 'color',
    ESomeEnum: 'enum', EnumProperty: 'enum',
    FString: 'string', TextProperty: 'string', '': 'string',
    FDateTime: 'date', UTexture2D: 'image',
  };
  for (const [rawType, valueType] of Object.entries(expected)) {
    assert.equal(valueTypeOf(rawType), valueType, rawType);
  }
});

test('containers, enums and object references are not mistaken for the type they contain', () => {
  const expected = {
    'TArray<int32>': 'json', 'TArray<FVector>': 'json', 'TArray<bool>': 'json',
    'TMap<FString,float>': 'json', 'TSet<FName>': 'json', ArrayProperty: 'json',
    'TEnumAsByte<EFoo>': 'enum',
    UMaterialInterface: 'json', 'UPointLightComponent*': 'json', 'TSoftObjectPtr<UTexture2D>': 'json',
    'TSubclassOf<AActor>': 'json', ObjectProperty: 'json', FConstraintSettings: 'json', FTransform: 'json',
    FPaintBrush: 'string',
  };
  for (const [rawType, valueType] of Object.entries(expected)) {
    assert.equal(valueTypeOf(rawType), valueType, rawType);
  }
});

test('exposed properties become form fields with their group, type and default value', () => {
  const preset = {
    Preset: {
      Groups: [{
        Name: 'Titrage',
        ExposedProperties: [
          { PropertyId: 'Titre', Path: 'Texte', DefaultValue: 'Bonjour\n  le monde', UnderlyingProperty: { Type: 'FString' } },
          { PropertyId: 'Visible', Path: 'bVisible', DefaultValue: 'true', UnderlyingProperty: { Type: 'bool' } },
          { Type: 'Function', Name: 'Lancer', Arguments: [] },
        ],
      }],
    },
  };
  const fields = buildRenderFormFieldsFromWrcPreset(preset, ' titres.wrc ');
  assert.deepEqual(
    fields.map(({ fieldKey, groupName, valueType, defaultValue, sortOrder, wrcFile }) => (
      { fieldKey, groupName, valueType, defaultValue, sortOrder, wrcFile }
    )),
    [
      { fieldKey: 'Titre', groupName: 'Titrage', valueType: 'string', defaultValue: 'Bonjour le monde', sortOrder: 1, wrcFile: 'titres.wrc' },
      { fieldKey: 'Visible', groupName: 'Titrage', valueType: 'boolean', defaultValue: true, sortOrder: 2, wrcFile: 'titres.wrc' },
    ]
  );
});

test('the same property listed twice is kept once', () => {
  const entry = { PropertyId: 'Titre', Path: 'Texte', Type: 'Property' };
  const fields = buildRenderFormFieldsFromWrcPreset({ ExposedProperties: [entry, { ...entry }] }, '');
  assert.equal(fields.length, 1);
});

test('duplicate names get distinct suffixes, even at maximum length (no endless loop)', () => {
  const longId = 'Mon_Parametre_'.repeat(10);
  const preset = { ExposedProperties: [
    { PropertyId: longId, Path: 'a.b', Type: 'Property' },
    { PropertyId: longId, Path: 'a.c', Type: 'Property' },
    { PropertyId: longId, Path: 'a.d', Type: 'Property' },
  ] };
  const fields = buildRenderFormFieldsFromWrcPreset(preset, '');
  const keys = fields.map((field) => field.fieldKey);
  assert.equal(new Set(keys).size, 3);
  assert.ok(keys.every((key) => key.length <= 120));
  assert.match(keys[1], /_2$/);
  assert.equal(new Set(fields.map((field) => field.payloadKey.toLowerCase())).size, 3);

  const layout = buildRenderFormFieldsFromWrcLayoutFieldIds(['A'.repeat(130), 'a'.repeat(130), 'short', 'SHORT']);
  assert.equal(new Set(layout.map((field) => field.fieldKey.toLowerCase())).size, 4);
  assert.equal(new Set(layout.map((field) => field.payloadKey.toLowerCase())).size, 4);
});

test('a readable name is preferred over an opaque identifier', () => {
  assert.equal(pickReadableWrcIdentifier('8F1A2B3C4D5E6F708192A3B4C5D6E7F8', 'Titre'), 'Titre');
  assert.equal(pickReadableWrcIdentifier('8F1A2B3C4D5E6F708192A3B4C5D6E7F8'), '8F1A2B3C4D5E6F708192A3B4C5D6E7F8');
  assert.equal(pickReadableWrcIdentifier('', null), '');
});

test('default values are converted to the field type', () => {
  assert.equal(normalizeDefault('boolean', '1'), true);
  assert.equal(normalizeDefault('boolean', 'maybe'), false);
  assert.equal(normalizeDefault('integer', '12.9'), 12);
  assert.equal(normalizeDefault('number', 'abc'), '');
  assert.deepEqual(normalizeDefault('vector3', '(X=1.5,Y=-2,Z=3)'), { x: 1.5, y: -2, z: 3 });
  assert.deepEqual(normalizeDefault('vector3', { Pitch: 10, Yaw: 20 }), { x: 10, y: 20, z: null });
  assert.deepEqual(normalizeDefault('vector2', [4, 5, 6]), { x: 4, y: 5 });
  assert.equal(normalizeDefault('color', '(R=1,G=0.5,B=0,A=1)'), '#FF8000');
  assert.equal(normalizeDefault('color', { R: 255, G: 0, B: 128 }), '#FF0080');
  assert.equal(normalizeDefault('color', 'pas une couleur'), '#ffffff');
  assert.deepEqual(normalizeDefault('json', '{"a":1}'), { a: 1 });
  assert.deepEqual(normalizeDefault('json', 'cassé'), {});
});

test('layout field ids are read from GUID objects or strings, without duplicates', () => {
  const ids = extractWrcLayoutFieldIds({
    Layout: {
      Groups: [
        { Fields: [{ A: 1, B: 2, C: 3, D: 4294967295 }, '0000000100000002000000030000000a'] },
        { fields: ['0000000100000002000000030000000A'] },
      ],
    },
  });
  assert.deepEqual(ids, ['00000001000000020000000300000000'.slice(0, 24) + 'FFFFFFFF', '0000000100000002000000030000000A']);
});
