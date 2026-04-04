import React, { useState } from "react";
import { readIdentity } from "../utils/identity";
import { createT } from "../i18n";
import { ColorWheelPopover } from "./colorwidget.jsx";

function getT() {
  const id = readIdentity() || {};
  const lang = String(id.lang || 'fr').trim();
  return createT(lang);
}

export default function BindingPicker({
  kind,
  presetData,
  value,
  onChange,
  valueMode,
  propertyLabel,
  hideArgs = false,
  argsValueKey = 'argValues',
  argsHeaderLabel = ''
}) {
  const t = getT();
  const v = value || {};
  const effectiveKind =
    kind || (v.kind === 'function' ? 'function' : 'property');
  const [argColorPicker, setArgColorPicker] = useState({
    open: false,
    name: '',
    hex: '#ffffff',
    alpha: 1
  });
    
      const props = presetData?.props || [];
      const funcs = presetData?.funcs || [];
      const mode = String(valueMode || '').toLowerCase();

      const normalizeTypeToken = (input) =>
        String(input || '')
          .toLowerCase()
          .replace(/[\s_\-]/g, '');

      const getFunctionParamType = (p) =>
        String(
          p?.Type ||
            p?.ParameterType ||
            p?.InnerType ||
            p?.type ||
            ''
        );

      const getFunctionParamName = (p, idx = 0) =>
        String(
          p?.Name ||
            p?.ParameterName ||
            p?.name ||
            `Param${idx + 1}`
        ).trim();

      const isBrowseFunctionArgType = (rawType) => {
        const t = normalizeTypeToken(rawType);
        if (!t) return false;
        return (
          t.includes('fstring') ||
          t === 'string' ||
          t.includes('ftext') ||
          t === 'text' ||
          t.includes('fname') ||
          t === 'name'
        );
      };

      const getBrowseFunctionArgMeta = (func) => {
        const params = Array.isArray(func?.parameters) ? func.parameters : [];
        if (params.length !== 1) return null;
        const p = params[0];
        const name = getFunctionParamName(p, 0);
        const rawType = getFunctionParamType(p);
        if (!name || !isBrowseFunctionArgType(rawType)) return null;
        return { name, rawType };
      };

      const listFuncs = React.useMemo(() => {
        if (!Array.isArray(funcs)) return [];
        if (mode !== 'browse') return funcs;
        return funcs.filter((f) => !!getBrowseFunctionArgMeta(f));
      }, [funcs, mode]);

      const argValues =
        v[argsValueKey] ||
        (argsValueKey !== 'argValues' ? v.argValues || {} : {});

            // ---- Fonctions : liste des owners et fonction courante ----
      const funcOwnerOptions = React.useMemo(() => {
        const set = new Set();
        (listFuncs || []).forEach((f) => {
          set.add(f.ownerName || '');
        });
        return Array.from(set);
      }, [listFuncs]);

      const currentFuncOwner = React.useMemo(() => {
        if (v.ownerName) return v.ownerName;
        const byDisplayName = (listFuncs || []).find(
          (f) => f.displayName === v.displayName
        );
        if (byDisplayName && byDisplayName.ownerName) return byDisplayName.ownerName;
        return funcOwnerOptions[0] || '';
      }, [v.ownerName, listFuncs, v.displayName, funcOwnerOptions]);

      const funcsForOwner = React.useMemo(() => {
        return (listFuncs || []).filter(
          (f) => (f.ownerName || '') === (currentFuncOwner || '')
        );
      }, [listFuncs, currentFuncOwner]);

      // Fonction réellement sélectionnée: owner + displayName.
      const selectedFunc = React.useMemo(() => {
        if (!v.displayName) return null;
        return (
          (funcsForOwner || []).find((f) => f.displayName === v.displayName) ||
          (listFuncs || []).find((f) => {
            if (f.displayName !== v.displayName) return false;
            if (!currentFuncOwner) return true;
            return (f.ownerName || '') === currentFuncOwner;
          }) ||
          null
        );
      }, [funcsForOwner, listFuncs, v.displayName, currentFuncOwner]);

      const missingFuncOwner =
        funcOwnerOptions.length > 0 && !currentFuncOwner;
      const missingFunction =
        funcsForOwner.length > 0 && !v.displayName;

      function handleArgChange(name, newValue) {
        const baseArgs =
          v[argsValueKey] ||
          (argsValueKey !== 'argValues' ? v.argValues || {} : {});
        const next = { ...(baseArgs || {}), [name]: newValue };
        onChange?.({ [argsValueKey]: next });
      }

      const getRawType = (p) => {
        const raw = p?.raw || {};
        const underlying =
          raw.UnderlyingProperty || raw.underlyingProperty || {};
        return String(
          underlying.Type ||
            underlying.type ||
            raw.Type ||
            raw.type ||
            ''
        ).toLowerCase();
      };

      const isTextLikeType = (pt, rawType) => {
        const t = String(rawType || pt || '').toLowerCase();
        return (
          pt === 'text' ||
          pt === 'string' ||
          pt === 'name' ||
          t.includes('ftext') ||
          t.includes('fstring') ||
          t.includes('fname') ||
          t.includes('text') ||
          t.includes('string') ||
          t.includes('name')
        );
      };

      const isPathLikeType = (pt, rawType) => {
        const t = String(rawType || pt || '').toLowerCase();
        return (
          t.includes('softobjectpath') ||
          t.includes('soft object path') ||
          t.includes('filepath') ||
          t.includes('file path')
        );
      };

      const isColorLikeType = (pt, rawType) => {
        const t = String(rawType || pt || '').toLowerCase();
        return (
          pt === 'color' ||
          t === 'color' ||
          t.includes('linearcolor') ||
          t === 'flinearcolor' ||
          t === 'fcolor' ||
          t.includes('fcolor')
        );
      };

      const isEnumLikeProperty = (p, pt, rawType) => {
        const t = String(rawType || pt || '').toLowerCase();
        if (
          t.includes('enum') ||
          t.includes('uenum') ||
          t.includes('enumproperty') ||
          t.includes('tenumasbyte<')
        ) {
          return true;
        }
        const raw = p?.raw || {};
        const underlying = raw.UnderlyingProperty || raw.underlyingProperty || {};
        const meta =
          underlying.Metadata ||
          underlying.metadata ||
          raw.Metadata ||
          raw.metadata ||
          {};
        const enumValues =
          meta.EnumValues || meta.enumvalues || p?.EnumValues || p?.enumValues;
        if (Array.isArray(enumValues)) return enumValues.length > 0;
        return String(enumValues || '').trim().length > 0;
      };

      const isNumericLikeType = (pt, rawType) => {
        const t = String(rawType || pt || '').toLowerCase();
        const isByte = t.includes('byte') || t.includes('uint8');
        const isInt64 =
          t.includes('int64') ||
          t.includes('integer64') ||
          t.includes('long long');
        const isInt = t.includes('int') && !t.includes('point') && !isByte;
        const isFloat = t.includes('float') || t.includes('double');
        return isByte || isInt64 || isInt || isFloat;
      };

      // ---- Propriétés : filtrage par type (valueType) si présent ----
      const listProps = React.useMemo(() => {
        if (!props.length) return props;

        return props.filter((p) => {
          const pt = String(p.type || '').toLowerCase();
          // On ne rejette plus les types inconnus tout de suite :
          // certains (FRotator, FVector2D, etc.) n'ont pas de "type" normalisé
          // mais on peut les reconnaître plus bas via p.raw / UnderlyingProperty.Type.

          // -------- Browse (média) --------
          if (mode === 'browse') {
            const rawType = getRawType(p);
            return isTextLikeType(pt, rawType) || isPathLikeType(pt, rawType);
          }

          // -------- Widget "Ajouter Texte" --------
          if (mode === 'text') {
            const rawType = getRawType(p);
            const isEnumLike = isEnumLikeProperty(p, pt, rawType);
            // On autorise :
            // - les nombres (int / float) pour pouvoir taper des chiffres dans le widget texte
            // - tout ce qui ressemble à FText / FString / FName / Name / String / Text
            const isNumeric =
              pt === 'int' ||
              pt === 'int32' ||
              pt === 'int64' ||
              pt === 'byte' ||
              pt === 'uint8' ||
              pt === 'float' ||
              pt === 'double';

            const isTextLike = isTextLikeType(pt, rawType);

            return (!isEnumLike && isNumeric) || isTextLike;
          }

            // -------- Slider --------
            if (mode === 'slider') {
              return pt === 'float' || pt === 'int';
            }

            // -------- Vector3 (Location / Scale / Rotation) --------
            if (mode === 'vector') {
              // On garde les FVector ET les FRotator
              if (pt === 'vector' || pt === 'rotator') {
                return true;
              }

              // Sécurité : si le type normalisé n'est pas parlant,
              // on regarde le type Unreal brut (FRotator, etc.)
              const raw = p.raw || {};
              const underlying =
                raw.UnderlyingProperty || raw.underlyingProperty || {};
              const rawType = String(
                underlying.Type ||
                  underlying.type ||
                  raw.Type ||
                  raw.type ||
                  ''
              ).toLowerCase();

              return rawType.includes('frotator') || rawType.includes('rotator');
            }

            // -------- Transform (FTransform) --------
            if (mode === 'transform') {
              return (
                pt === 'transform' ||
                pt === 'ftransform' ||
                pt.includes('transform')
              );
            }

            // -------- Rotator (FRotator) --------
            if (mode === 'rotator') {
              // On garde uniquement les propriétés de type Rotator
              return pt === 'rotator' || pt.includes('rotator');
            }

            // -------- Toggle (booléen) --------
            if (mode === 'toggle') {
              return pt === 'bool';
            }

            // -------- Color --------
            if (mode === 'color') {
              const rawType = getRawType(p);
              return isColorLikeType(pt, rawType);
            }

            // -------- Dropdown --------
            if (mode === 'dropdown') {
              const rawType = getRawType(p);
              const isEnumLike = isEnumLikeProperty(p, pt, rawType);
              const isTextLike = isTextLikeType(pt, rawType);
              const isNumeric = isNumericLikeType(pt, rawType);
              return !isEnumLike && (isTextLike || isNumeric);
            }

            // -------- Enum --------
            if (mode === 'enum') {
              const rawType = getRawType(p);
              return isEnumLikeProperty(p, pt, rawType);
            }

            // -------- Joystick : Vector2D (XY) --------
            if (mode === 'joystick_xy') {
              // pt = type "normalisé" (vector, float, text, etc.)
              // pour différencier Vector2D / Vector3, on regarde le type Unreal brut
              const raw = p.raw || {};
              const underlying =
                raw.UnderlyingProperty || raw.underlyingProperty || {};
              const rawType = String(
                underlying.Type ||
                  underlying.type ||
                  raw.Type ||
                  raw.type ||
                  ''
              ).toLowerCase();

              // Si on n'a pas de type brut, on retombe sur le type normalisé
              const t = rawType || pt;

              // On garde uniquement les FVector2D / Vector2D
              return (
                t.includes('vector2d') ||
                t.includes('vector 2d') ||
                t.includes('vector2')
              );
            }

            // -------- Bouton / autres --------
            return true;
        });
      }, [props, mode]);

      // ---- Propriétés : regroupement par asset / owner ----
      const ownerOptions = React.useMemo(() => {
        const set = new Set();
        (listProps || []).forEach((p) => {
          set.add(p.ownerName || '');
        });
        const arr = Array.from(set);
        // Si on a des owners non vides, on les privilégie en tête
        const nonEmpty = arr.filter((o) => o);
        const empty = arr.filter((o) => !o);
        return nonEmpty.length ? [...nonEmpty, ...empty] : empty;
      }, [listProps]);

      const currentProp = React.useMemo(() => {
        if (!v.path) return null;
        return (listProps || []).find((p) => p.path === v.path) || null;
      }, [listProps, v.path]);

      const currentOwner = React.useMemo(() => {
        if (
          v.ownerName &&
          ownerOptions.some((owner) => owner === v.ownerName)
        ) {
          return v.ownerName;
        }
        if (
          currentProp &&
          currentProp.ownerName &&
          ownerOptions.some((owner) => owner === currentProp.ownerName)
        ) {
          return currentProp.ownerName;
        }
        const firstNonEmpty = ownerOptions.find((o) => o) || '';
        return firstNonEmpty || ownerOptions[0] || '';
      }, [v.ownerName, currentProp, ownerOptions]);

      const propsForOwner = React.useMemo(() => {
        return (listProps || []).filter(
          (p) => (p.ownerName || '') === (currentOwner || '')
        );
      }, [listProps, currentOwner]);

      // Flags d'erreur pour les labels "Blueprint / Asset" et "Liaison propriété"
      const missingOwner = ownerOptions.length > 0 && !currentOwner;
      const missingProperty = !String(v.path || '').trim();

      // On préfère afficher le Name Unreal plutôt que le DisplayName
      function getPropName(p) {
        if (!p) return '';
        const raw = p.raw || {};
        const underlying = raw.UnderlyingProperty || raw.underlyingProperty || {};
        return (
          underlying.Name ||
          raw.Name ||
          raw.PropertyName ||
          p.displayName ||
          p.path ||
          ''
        );
      }

      return (
        <div className="uu-list">
          {/* ====== MODE FONCTION : uniquement la liste des arguments ====== */}
          {effectiveKind === 'function' && (
            <>
                      {/* 1) Choix de l'asset / blueprint qui contient la fonction */}
                      <div className="uu-row uu-binding-row">
                        <label
                          className={
                            `uu-label w-160 ${
                              missingFuncOwner ? 'uu-label-error' : ''
                            }`
                          }
                        >
                          {t('widgets.binding.blueprintAsset')}
                        </label>
                        <select
                          className="uu-input"
                          value={currentFuncOwner}
                          onChange={(e) => {
                            const owner = e.target.value || '';
                            onChange?.({
                              ownerName: owner,
                              displayName: '',
                              [argsValueKey]: {},
                              paramBools: {},
                              browseArgName: ''
                            });
                          }}
                        >
                          {funcOwnerOptions.length === 0 && (
                            <option value="">{t('widgets.binding.noFunction')}</option>
                          )}
                          {funcOwnerOptions.length > 0 &&
                            funcOwnerOptions.map((owner, idx) => (
                              <option
                                key={owner || `no-fowner-${idx}`}
                                value={owner}
                              >
                                {owner || t('widgets.binding.ownerNone')}
                              </option>
                            ))}
                        </select>
                      </div>

                      {/* 2) Choix de la fonction dans cet asset */}
                      <div className="uu-row uu-binding-row">
                        <label
                          className={
                            `uu-label w-160 ${
                              missingFunction ? 'uu-label-error' : ''
                            }`
                          }
                        >
                          {t('widgets.binding.function')}
                        </label>
                        <select
                          className="uu-input"
                          value={v.displayName || ''}
                          onChange={(e) => {
                            const displayName = e.target.value;
                            if (!displayName) {
                              onChange?.({
                                displayName: '',
                                [argsValueKey]: {},
                                browseArgName: ''
                              });
                              return;
                            }

                            const func =
                              (funcsForOwner || []).find(
                                (f) => f.displayName === displayName
                              ) ||
                              (listFuncs || []).find(
                                (f) => f.displayName === displayName
                              ) ||
                              null;

                            if (!func) {
                              onChange?.({
                                displayName,
                                [argsValueKey]: {},
                                paramBools: {},
                                browseArgName: ''
                              });
                              return;
                            }

                            const boolParams = {};
                            (func.parameters || []).forEach((p) => {
                              const typeStr = String(
                                p.Type ||
                                  p.ParameterType ||
                                  p.InnerType ||
                                  p.type ||
                                  ''
                              ).toLowerCase();
                              if (typeStr.includes('bool')) {
                                const name =
                                  p.Name ||
                                  p.ParameterName ||
                                  p.name ||
                                  '';
                                if (name) boolParams[name] = false; // par défaut : inverse du toggle
                              }
                            });

                            const browseArgMeta =
                              mode === 'browse'
                                ? getBrowseFunctionArgMeta(func)
                                : null;

                            onChange?.({
                              displayName,
                              ownerName: func.ownerName || currentFuncOwner,
                              [argsValueKey]: {},
                              paramBools: boolParams,
                              browseArgName: browseArgMeta?.name || ''
                            });
                          }}
                        >
                          <option value="">{t('widgets.binding.functionPlaceholder')}</option>
                          {funcsForOwner.map((f, idx) => (
                            <option
                              key={`${f.ownerName || ''}::${f.displayName}::${idx}`}
                              value={f.displayName}
                            >
                              {f.displayName}
                            </option>
                          ))}
                        </select>
                      </div>
              {selectedFunc &&
              
                Array.isArray(selectedFunc.parameters) &&
                selectedFunc.parameters.length > 0 &&
                !(mode === 'toggle' && effectiveKind === 'function') &&
                !hideArgs && (
                  <>
                    {String(argsHeaderLabel || '').trim() && (
                      <div className="uu-row uu-binding-row">
                        <label className="uu-label w-160">
                          {argsHeaderLabel}
                        </label>
                      </div>
                    )}
                    {selectedFunc.parameters.map((p, idx) => {
                      const name =
                        p.Name ||
                        p.ParameterName ||
                        p.name ||
                        `Param${idx + 1}`;

                      const typeStr = String(
                        p.Type ||
                          p.ParameterType ||
                          p.InnerType ||
                          p.type ||
                          ''
                      ).toLowerCase();

                      const labelNode = (
                        <>
                          <span>{name}</span>
                          {typeStr && (
                            <span className="uu-argtype"> ({typeStr})</span>
                          )}
                        </>
                      );

                      const key = name;
                      const current = argValues[key];

                      const isBool = typeStr.includes('bool');
                      const isFloat =
                        typeStr.includes('float') ||
                        typeStr.includes('double');

                      const isByte =
                        typeStr.includes('byte') ||
                        typeStr.includes('uint8');

                      const isInt64 =
                        typeStr.includes('int64') ||
                        typeStr.includes('long long');

                      const isInt =
                        typeStr.includes('int') &&
                        !isInt64 &&
                        !typeStr.includes('point') &&
                        !isByte;

                      const isVector = typeStr.includes('vector');

                      // Vector2D vs autres vecteurs
                      const isVector2D =
                        isVector &&
                        (typeStr.includes('vector2d') || typeStr.includes('vector2'));
                      const isVector3D = isVector && !isVector2D;

                      const isRotator = typeStr.includes('rotator');
                      const isColor =
                        typeStr.includes('linearcolor') ||
                        typeStr === 'flinearcolor' ||
                        typeStr === 'fcolor';
                      const isEnum = typeStr.includes('enum');

                      const isTextLike =
                        typeStr.includes('fname') ||
                        typeStr.includes('fstring') ||
                        typeStr.includes('ftext') ||
                        typeStr === 'name' ||
                        typeStr === 'string' ||
                        typeStr === 'text';

                      // ----- Enum -----
                      if (isEnum) {
                        let opts = p.EnumValues || p.enumValues;
                        if (!opts && p.Metadata) {
                          opts = p.Metadata.EnumValues || p.Metadata.enumvalues;
                        }
                        if (typeof opts === 'string') {
                          opts = opts.split(',').map((s) => s.trim()).filter(Boolean);
                        }
                        if (Array.isArray(opts) && opts.length) {
                          const longest = opts.reduce((m, v) => Math.max(m, String(v).length), 0);
                          const px = Math.min(Math.max(longest * 9 + 40, 160), 320);
                          return (
                            <div key={key} className="uu-row uu-binding-row">
                              <label className="uu-label w-160">
                                {labelNode}
                              </label>
                              <select
                                className="uu-input"
                                value={current ?? ''}
                                onChange={(e) => handleArgChange(key, e.target.value)}
                                style={{ width: px, maxWidth: 320, flex: '0 0 auto' }}
                              >
                                {opts.map((opt, i) => (
                                  <option key={`${key}-opt-${i}`} value={opt}>
                                    {opt}
                                  </option>
                                ))}
                              </select>
                            </div>
                          );
                        }
                      }

                      // ----- FVector2D : X / Y -----
                      if (isVector2D) {
                        const cur =
                          current && typeof current === 'object'
                            ? current
                            : {};
                        const x = cur.X ?? '';
                        const y = cur.Y ?? '';

                        return (
                          <div key={key} className="uu-row uu-row-nowrap" style={{ gap: 8 }}>
                            <label className="uu-label w-160">
                              {labelNode}
                            </label>
                            <input
                              className="uu-input uu-input-arg"
                              type="number"
                              placeholder="X"
                              style={{ width: 140, flex: '0 0 auto' }}
                              value={x === '' ? '' : String(x)}
                              onChange={(e) => {
                                const v = e.target.value;
                                handleArgChange(key, {
                                  ...cur,
                                  X: v === '' ? '' : Number(v)
                                });
                              }}
                            />
                            <input
                              className="uu-input uu-input-arg"
                              type="number"
                              placeholder="Y"
                              style={{ width: 140, flex: '0 0 auto' }}
                              value={y === '' ? '' : String(y)}
                              onChange={(e) => {
                                const v = e.target.value;
                                handleArgChange(key, {
                                  ...cur,
                                  Y: v === '' ? '' : Number(v)
                                });
                              }}
                            />
                          </div>
                        );
                      }

                      // ----- FVector : X / Y / Z -----
                      if (isVector3D) {
                        const cur =
                          current && typeof current === 'object'
                            ? current
                            : {};
                        const x = cur.X ?? '';
                        const y = cur.Y ?? '';
                        const z = cur.Z ?? '';

                        return (
                          <div key={key} className="uu-row uu-row-nowrap" style={{ gap: 8 }}>
                            <label className="uu-label w-160">
                              {labelNode}
                            </label>
                            <input
                              className="uu-input uu-input-arg"
                              type="number"
                              placeholder="X"
                              style={{ width: 140, flex: '0 0 auto' }}
                              value={x === '' ? '' : String(x)}
                              onChange={(e) => {
                                const v = e.target.value;
                                handleArgChange(key, {
                                  ...cur,
                                  X: v === '' ? '' : Number(v)
                                });
                              }}
                            />
                            <input
                              className="uu-input uu-input-arg"
                              type="number"
                              placeholder="Y"
                              style={{ width: 140, flex: '0 0 auto' }}
                              value={y === '' ? '' : String(y)}
                              onChange={(e) => {
                                const v = e.target.value;
                                handleArgChange(key, {
                                  ...cur,
                                  Y: v === '' ? '' : Number(v)
                                });
                              }}
                            />
                            <input
                              className="uu-input uu-input-arg"
                              type="number"
                              placeholder="Z"
                              style={{ width: 140, flex: '0 0 auto' }}
                              value={z === '' ? '' : String(z)}
                              onChange={(e) => {
                                const v = e.target.value;
                                handleArgChange(key, {
                                  ...cur,
                                  Z: v === '' ? '' : Number(v)
                                });
                              }}
                            />
                          </div>
                        );
                      }

                      // ----- FRotator : Pitch / Yaw / Roll -----
                      if (isRotator) {
                        const cur =
                          current && typeof current === 'object'
                            ? current
                            : {};

                        return (
                          <div key={key} className="uu-row uu-row-nowrap" style={{ gap: 8 }}>
                            <label className="uu-label w-160">
                              {labelNode}
                            </label>
                            <input
                              className="uu-input uu-input-arg"
                              type="number"
                              placeholder="Pitch"
                              style={{ width: 140, flex: '0 0 auto' }}
                              value={cur.Pitch ?? ''}
                              onChange={(e) => {
                                const v = e.target.value;
                                handleArgChange(key, {
                                  ...cur,
                                  Pitch: v === '' ? '' : Number(v)
                                });
                              }}
                            />
                            <input
                              className="uu-input uu-input-arg"
                              type="number"
                              placeholder="Yaw"
                              style={{ width: 140, flex: '0 0 auto' }}
                              value={cur.Yaw ?? ''}
                              onChange={(e) => {
                                const v = e.target.value;
                                handleArgChange(key, {
                                  ...cur,
                                  Yaw: v === '' ? '' : Number(v)
                                });
                              }}
                            />
                            <input
                              className="uu-input uu-input-arg"
                              type="number"
                              placeholder="Roll"
                              style={{ width: 140, flex: '0 0 auto' }}
                              value={cur.Roll ?? ''}
                              onChange={(e) => {
                                const v = e.target.value;
                                handleArgChange(key, {
                                  ...cur,
                                  Roll: v === '' ? '' : Number(v)
                                });
                              }}
                            />
                          </div>
                        );
                      }

                      // ----- FLinearColor / Color -----
                      if (isColor) {
                        const cur = current && typeof current === 'object' ? current : {};
                        const r = Number(cur.R ?? 1);
                        const g = Number(cur.G ?? 1);
                        const b = Number(cur.B ?? 1);
                        const a = Number(cur.A ?? 1);
                        const toHex = (v) =>
                          Math.max(0, Math.min(255, Math.round((Number.isFinite(v) ? v : 1) * 255)))
                            .toString(16)
                            .padStart(2, '0');
                        const hex = `#${toHex(r)}${toHex(g)}${toHex(b)}`;
                        const showPicker = argColorPicker.open && argColorPicker.name === key;

                        return (
                          <div key={key} className="uu-row uu-row-nowrap" style={{ gap: 10, position: 'relative', alignItems: 'center' }}>
                            <label className="uu-label w-160">
                              {labelNode}
                            </label>

                            <button
                              type="button"
                              className="uu-color-swatch"
                              style={{ background: hex }}
                              onClick={() =>
                                setArgColorPicker({
                                  open: true,
                                  name: key,
                                  hex,
                                  alpha: Number.isFinite(a) ? a : 1
                                })
                              }
                              title="Choisir une couleur"
                            />

                            <span className="uu-muted">{t('widgets.common.alpha')}</span>
                            <input
                              className="uu-input w-100 uu-input-alpha"
                              type="number"
                              min="0"
                              max="1"
                              step="0.01"
                              value={Number.isFinite(a) ? a : ''}
                              onChange={(e) => {
                                const val = e.target.value === '' ? '' : Number(e.target.value);
                                handleArgChange(key, {
                                  R: r,
                                  G: g,
                                  B: b,
                                  A: val === '' ? '' : Math.max(0, Math.min(1, val))
                                });
                                setArgColorPicker((prev) =>
                                  prev.name === key
                                    ? { ...prev, alpha: val === '' ? 1 : Math.max(0, Math.min(1, val)) }
                                    : prev
                                );
                              }}
                            />

                            {showPicker && (
                              <div className="uu-color-popover" style={{ top: 30, left: 180, zIndex: 60 }}>
                                <ColorWheelPopover
                                  hex={argColorPicker.hex}
                                  alpha={argColorPicker.alpha}
                                  onChange={(nextHex, nextAlpha) => {
                                    const m = /^#?([0-9a-fA-F]{6})$/.exec(nextHex || '');
                                    if (!m) return;
                                    const intVal = parseInt(m[1], 16);
                                    const nr = ((intVal >> 16) & 255) / 255;
                                    const ng = ((intVal >> 8) & 255) / 255;
                                    const nb = (intVal & 255) / 255;
                                    handleArgChange(key, {
                                      R: nr,
                                      G: ng,
                                      B: nb,
                                      A: nextAlpha
                                    });
                                    setArgColorPicker((prev) => ({
                                      ...prev,
                                      hex: nextHex,
                                      alpha: nextAlpha
                                    }));
                                  }}
                                  onClose={() =>
                                    setArgColorPicker({
                                      open: false,
                                      name: '',
                                      hex: '#ffffff',
                                      alpha: 1
                                    })
                                  }
                                />
                              </div>
                            )}
                          </div>
                        );
                      }

                      // ----- FTransform -----
                      const isTransform = typeStr.includes('transform');
                      if (isTransform) {
                        const cur = current && typeof current === 'object' ? current : {};
                        const t = cur.Translation || {};
                        const r = cur.Rotation || {};
                        const s = cur.Scale3D || {};
                        const update = (part, axis, val) => {
                          const next = {
                            Translation: { ...t },
                            Rotation: { ...r },
                            Scale3D: { ...s }
                          };
                          next[part][axis] = val;
                          handleArgChange(key, next);
                        };
                        const block = (title, part, axes) => (
                          <div className="uu-row uu-row-nowrap" key={`${key}-${part}`} style={{ gap: 8 }}>
                            <label className="uu-label w-160">{title}</label>
                            {axes.map((axis) => (
                              <input
                                key={`${key}-${part}-${axis}`}
                                className="uu-input uu-input-arg"
                                type="number"
                                placeholder={axis}
                                style={{ width: 140, flex: '0 0 auto' }}
                                value={
                                  part === 'Translation'
                                    ? t[axis] ?? ''
                                    : part === 'Rotation'
                                    ? r[axis] ?? ''
                                    : s[axis] ?? ''
                                }
                                onChange={(e) =>
                                  update(part, axis, e.target.value === '' ? '' : Number(e.target.value))
                                }
                              />
                            ))}
                          </div>
                        );

                        return (
                          <div key={key} className="uu-col" style={{ gap: 6 }}>
                            <div className="uu-label" style={{ marginLeft: '8px' }}>{labelNode}</div>
                            {block('Location', 'Translation', ['X', 'Y', 'Z'])}
                            {block('Rotation', 'Rotation', ['Roll', 'Pitch', 'Yaw'])}
                            {block('Scale', 'Scale3D', ['X', 'Y', 'Z'])}
                          </div>
                        );
                      }

                      // ----- Cas par défaut : bool / int / int64 / float / texte / name -----
                      return (
                        <div key={key} className="uu-row uu-binding-row">
                          <label className="uu-label w-160">
                            {labelNode}
                          </label>

                          {isBool ? (
                            <input
                              type="checkbox"
                              className="uu-checkbox-inline"
                              checked={!!current}
                              onChange={(e) =>
                                handleArgChange(key, e.target.checked)
                              }
                            />
                          ) : isTextLike ? (
                            <textarea
                              className="uu-input uu-input-textarea"
                              rows={1}
                              value={
                                current === undefined || current === null
                                  ? ''
                                  : String(current)
                              }
                              ref={(el) => {
                                if (!el) return;
                                el.style.height = 'auto';
                                el.style.height = `${el.scrollHeight}px`;
                              }}
                              onChange={(e) => {
                                const val = e.target.value;
                                handleArgChange(key, val);
                              }}
                              onInput={(e) => {
                                const el = e.target;
                                el.style.height = 'auto';
                                el.style.height = `${el.scrollHeight}px`;
                              }}
                              style={{ minHeight: '32px' }}
                            />
                          ) : (
                            <input
                              className={
                                isInt64
                                  ? 'uu-input uu-input-int64'
                                  : 'uu-input'
                              }
                              type={
                                isFloat || isInt || isInt64 || isByte
                                  ? 'number'
                                  : 'text'
                              }
                              min={isByte ? 0 : undefined}
                              max={isByte ? 255 : undefined}
                              step={isByte ? 1 : undefined}
                              style={{ width: 140, maxWidth: 200, flex: '0 0 auto' }}
                              value={
                                current === undefined ||
                                current === null
                                  ? ''
                                  : String(current)
                              }
                              onChange={(e) => {
                                let val = e.target.value;
                                if (isFloat || isInt || isInt64 || isByte) {
                                  if (e.target.value === '') {
                                    val = '';
                                  } else {
                                    const num = Number(e.target.value);
                                    if (isByte) {
                                      if (!Number.isFinite(num)) return;
                                      val = Math.max(0, Math.min(255, Math.round(num)));
                                    } else {
                                      val = num;
                                    }
                                  }
                                }
                                handleArgChange(key, val);
                              }}
                            />
                          )}
                        </div>
                      );
                    })}
                  </>
                )}
            </>
          )}

          {/* ====== MODE PROPRIÉTÉ : Blueprint + Propriété (Name) ====== */}
          {effectiveKind === 'property' && (
            <>
              {/* 1) Choix de l'asset / blueprint */}
              <div className="uu-row uu-binding-row">
                <label
                  className={
                    `uu-label w-160 ${
                      missingOwner ? 'uu-label-error' : ''
                    }`
                  }
                >
                  {t('widgets.binding.blueprintAsset')}
                </label>
                <select
                  className="uu-input"
                  value={currentOwner}
                  onChange={(e) => {
                    const owner = e.target.value || '';
                    onChange?.({
                      ownerName: owner,
                      path: '',
                      propertyName: ''
                    });
                  }}
                >
                  {ownerOptions.length === 0 && (
                    <option value="">
                      {t('widgets.binding.noProperty')}
                    </option>
                  )}
                  {ownerOptions.length > 0 &&
                    ownerOptions.map((owner, idx) => (
                      <option
                        key={owner || `no-owner-${idx}`}
                        value={owner}
                      >
                      {owner || t('widgets.binding.ownerNone')}
                    </option>
                  ))}
                </select>
              </div>

              {/* 2) Choix de la propriété dans cet asset */}
              <div className="uu-row uu-binding-row">
                <label
                  className={`uu-label w-160 ${
                    missingProperty ? 'uu-label-error' : ''
                  }`}
                >
                  {propertyLabel || t('widgets.binding.property')}
                </label>
                  <select
                    className="uu-input"
                    value={v.path || ''}
                    onChange={(e) => {
                      const path = e.target.value;

                      if (!path) {
                        // Chemin vide → on efface aussi les infos d'énum éventuelles
                        onChange?.({
                          path: '',
                          propertyName: '',
                          enumValues: undefined
                        });
                        return;
                      }

                      const prop =
                        (listProps || []).find((p) => p.path === path) ||
                        null;

                      if (!prop) {
                        onChange?.({
                          path,
                          propertyName: '',
                          enumValues: undefined
                        });
                        return;
                      }

                      const propName = getPropName(prop);

                      const payload = {
                        path,
                        ownerName: prop.ownerName || '',
                        propertyName: propName,
                        valueType: prop.type || v.valueType || ''
                      };

                      // Si on est en mode "enum", on récupère la liste des valeurs
                      // depuis UnderlyingProperty.Metadata.EnumValues.
                      if (mode === 'enum') {
                        const raw = prop.raw || {};
                        const underlying =
                          raw.UnderlyingProperty ||
                          raw.underlyingProperty ||
                          {};
                        const meta =
                          underlying.Metadata ||
                          underlying.metadata ||
                          raw.Metadata ||
                          raw.metadata ||
                          {};

                        const enumValuesStr =
                          meta.EnumValues || meta.enumvalues || '';
                        const enumValuesArr = String(enumValuesStr || '')
                          .split(',')
                          .map((s) => s.trim())
                          .filter(Boolean);

                        if (enumValuesArr.length > 0) {
                          payload.enumValues = enumValuesArr.map((val) => ({
                            label: val,
                            value: val
                          }));
                        } else {
                          payload.enumValues = undefined;
                        }
                      } else if (mode === 'dropdown') {
                        payload.enumValues = undefined;
                      }

                      onChange?.(payload);
                    }}
                  >
                  <option value="">{t('widgets.binding.propertyPlaceholder')}</option>
                  {propsForOwner.map((p, i) => {
                    const propName = getPropName(p);
                    return (
                      <option
                        key={`${p.ownerName || ''}::${p.path}::${i}`}
                        value={p.path}
                      >
                        {propName}
                      </option>
                    );
                  })}
                </select>
              </div>
            </>
          )}
        </div>
      );
    }
