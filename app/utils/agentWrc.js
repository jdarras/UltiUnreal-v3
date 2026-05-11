import { __agentRequest, __wrcBodyForProperty } from './agentHttp.js';

export function buildTargetsFromHosts(hosts, common) {
  const port = Number(common?.rcHttpPort || 30010);
  const preset = common?.webRemoteControlName || 'RemoteControlPreset';
  return (Array.isArray(hosts) ? hosts : [])
    .map(h => ({ ip: String(h?.ip || '').trim(), port, preset }))
    .filter(t => t.ip && t.port && preset);
}

export async function wrcGetPreset(ip, port, preset) {
  const url = `http://${ip}:${Number(port)}/remote/preset/${encodeURIComponent(preset)}`;
  return await __agentRequest('GET', url);
}

export async function wrcPutProperty(ip, port, preset, path, value, valueType) {
  const url = `http://${ip}:${Number(port)}/remote/preset/${encodeURIComponent(preset)}/property/${encodeURIComponent(path)}`;
  const body = __wrcBodyForProperty(value, valueType);
  return await __agentRequest('PUT', url, body);
}

export async function wrcCallFunction(ip, port, preset, displayName, parameters = {}) {
  const url = `http://${ip}:${Number(port)}/remote/preset/${encodeURIComponent(preset)}/function/${encodeURIComponent(displayName)}`;
  const body = { Parameters: parameters || {}, GenerateTransaction: true };
  return await __agentRequest('PUT', url, body);
}

export async function wrcPutPropertyForWidget(widget, hosts, common, value) {
  const tlist = buildTargetsFromHosts(hosts, common);
  const sel = widget?.targets || {};
  const path = widget?.binding?.path;
  let vtype = widget?.binding?.valueType || 'text';
  if (!path) return [];

  let sendValue = value;

  if (widget?.type === 'vector' && value && typeof value === 'object') {
    const propName = String(widget?.binding?.propertyName || '').toLowerCase();
    const t = String(vtype || '').toLowerCase();

    const isRotatorType =
      t === 'rotator' ||
      t === 'frotator' ||
      propName === 'rotation' ||
      propName.endsWith('.rotation') ||
      propName.includes('rotation');

    if (isRotatorType) {
      const X = value.X ?? value.x ?? value.Roll ?? value.roll ?? 0;
      const Y = value.Y ?? value.y ?? value.Pitch ?? value.pitch ?? 0;
      const Z = value.Z ?? value.z ?? value.Yaw ?? value.yaw ?? 0;

      sendValue = {
        Roll:  Number(X) || 0,
        Pitch: Number(Y) || 0,
        Yaw:   Number(Z) || 0,
      };

      vtype = 'rotator';
    }
  }

  console.debug('[UltiUnreal][WRC] put property', {
    widgetId: widget?.id,
    widgetLabel: widget?.label,
    path,
    valueType: vtype,
    value: sendValue,
    targets: tlist.filter((t) => !!sel[t.ip])
  });

  const tasks = tlist
    .filter((t) => !!sel[t.ip])
    .map((t) =>
      wrcPutProperty(t.ip, t.port, t.preset, path, sendValue, vtype)
    );

  return Promise.all(tasks);
}

export async function wrcCallFunctionForWidget(widget, hosts, common, overrideArgs = null) {
  const tlist = buildTargetsFromHosts(hosts, common);
  const sel = widget?.targets || {};
  const dn  = widget?.binding?.displayName;
  if (!dn) return [];

  const defaultArgs =
    widget?.binding?.argDefaults && typeof widget.binding.argDefaults === 'object'
      ? widget.binding.argDefaults
      : {};
  const currentArgs =
    widget?.binding?.argValues && typeof widget.binding.argValues === 'object'
      ? widget.binding.argValues
      : {};
  const mergedArgs = { ...defaultArgs, ...currentArgs };
  const rawArgs = overrideArgs && typeof overrideArgs === 'object'
    ? overrideArgs
    : mergedArgs;
  const parameters = {};

  if (rawArgs && typeof rawArgs === 'object') {
    for (const [key, val] of Object.entries(rawArgs)) {
      if (val === '' || val === null || typeof val === 'undefined') continue;
      parameters[key] = val;
    }
  }

  const targets = tlist.filter(t => !!sel[t.ip]);

  console.debug('[UltiUnreal][WRC] call function', {
    widgetId: widget?.id,
    widgetLabel: widget?.label,
    displayName: dn,
    parameters,
    targets
  });

  const payload = {
    widgetLabel: widget?.label,
    displayName: dn,
    targets,
    parameters,
  };

  console.debug('[UltiUnreal][WRC] Button widget → call function', payload);

  try {
    const results = await Promise.all(
      targets.map(t =>
        wrcCallFunction(t.ip, t.port, t.preset, dn, parameters)
      )
    );

    console.debug('[UltiUnreal][WRC] Button widget → results', results);
    return results;
  } catch (e) {
    console.error('[UltiUnreal][WRC] Button widget → ERROR', e);
    throw e;
  }
}

export async function wrcSendJoystickForWidget(widget, hosts, common, value) {
  const linkType = widget?.ui?.linkType || 'vector2d';
  const tlist = buildTargetsFromHosts(hosts, common);
  const sel = widget?.targets || {};

  const xVal = typeof value?.X === 'number' ? value.X : 0;
  const yVal = typeof value?.Y === 'number' ? value.Y : 0;

  if (linkType === 'manual') {
    const bx = widget?.joystickBindings?.x || {};
    const by = widget?.joystickBindings?.y || {};

    const tasks = [];

    console.debug('[UltiUnreal][WRC] joystick manual', {
      widgetId: widget?.id,
      widgetLabel: widget?.label,
      pathX: bx.path,
      pathY: by.path,
      valueX: xVal,
      valueY: yVal,
      targets: tlist.filter((t) => !!sel[t.ip])
    });

    for (const t of tlist) {
      if (!sel[t.ip]) continue;

      if (bx.path) {
        tasks.push(
          wrcPutProperty(
            t.ip,
            t.port,
            t.preset,
            bx.path,
            xVal,
            bx.valueType || 'float'
          )
        );
      }

      if (by.path) {
        tasks.push(
          wrcPutProperty(
            t.ip,
            t.port,
            t.preset,
            by.path,
            yVal,
            by.valueType || 'float'
          )
        );
      }
    }

    return Promise.all(tasks);
  }

  const path = widget?.binding?.path;
  if (!path) return [];

  const vtype = widget?.binding?.valueType || 'vector2d';
  const payload = { X: xVal, Y: yVal };

  console.debug('[UltiUnreal][WRC] joystick vector2d', {
    widgetId: widget?.id,
    widgetLabel: widget?.label,
    path,
    valueType: vtype,
    payload,
    targets: tlist.filter((t) => !!sel[t.ip])
  });

  const tasks = tlist
    .filter((t) => !!sel[t.ip])
    .map((t) =>
      wrcPutProperty(
        t.ip,
        t.port,
        t.preset,
        path,
        payload,
        vtype
      )
    );

  return Promise.all(tasks);
}
