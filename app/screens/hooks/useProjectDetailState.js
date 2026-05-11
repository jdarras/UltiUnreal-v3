import { useState } from 'react';

export function useProjectDetailState() {
  const [detailId, setDetailId] = useState('');
  const [detailName, setDetailName] = useState('');
  const [detailPath, setDetailPath] = useState('');
  const [detailWrcNames, setDetailWrcNames] = useState([]);
  const [detailMeta, setDetailMeta] = useState(null);
  const [detailInsights, setDetailInsights] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailMsg, setDetailMsg] = useState('');
  const [detailIsNew, setDetailIsNew] = useState(false);
  const [projectVersion, setProjectVersion] = useState('');
  const [projectVersionMsg, setProjectVersionMsg] = useState('');
  const [projectVersionMsgType, setProjectVersionMsgType] = useState('');
  const [projectVersionBusy, setProjectVersionBusy] = useState(false);
  const [indexationMsg, setIndexationMsg] = useState('');
  const [indexationMsgType, setIndexationMsgType] = useState('');
  const [intervenantsMsg, setIntervenantsMsg] = useState('');
  const [intervenantsMsgType, setIntervenantsMsgType] = useState('');
  const [renderBridgeStatus, setRenderBridgeStatus] = useState(null);
  const [renderBridgeBusy, setRenderBridgeBusy] = useState(false);
  const [renderBridgeMsg, setRenderBridgeMsg] = useState('');
  const [renderBridgeMsgType, setRenderBridgeMsgType] = useState('');
  const [mapsMsg, setMapsMsg] = useState('');
  const [mapsMsgType, setMapsMsgType] = useState('');
  const [mapsBusy, setMapsBusy] = useState(false);
  const [keywordsInput, setKeywordsInput] = useState('');

  return {
    detailId,
    setDetailId,
    detailName,
    setDetailName,
    detailPath,
    setDetailPath,
    detailWrcNames,
    setDetailWrcNames,
    detailMeta,
    setDetailMeta,
    detailInsights,
    setDetailInsights,
    detailLoading,
    setDetailLoading,
    detailMsg,
    setDetailMsg,
    detailIsNew,
    setDetailIsNew,
    projectVersion,
    setProjectVersion,
    projectVersionMsg,
    setProjectVersionMsg,
    projectVersionMsgType,
    setProjectVersionMsgType,
    projectVersionBusy,
    setProjectVersionBusy,
    indexationMsg,
    setIndexationMsg,
    indexationMsgType,
    setIndexationMsgType,
    intervenantsMsg,
    setIntervenantsMsg,
    intervenantsMsgType,
    setIntervenantsMsgType,
    renderBridgeStatus,
    setRenderBridgeStatus,
    renderBridgeBusy,
    setRenderBridgeBusy,
    renderBridgeMsg,
    setRenderBridgeMsg,
    renderBridgeMsgType,
    setRenderBridgeMsgType,
    mapsMsg,
    setMapsMsg,
    mapsMsgType,
    setMapsMsgType,
    mapsBusy,
    setMapsBusy,
    keywordsInput,
    setKeywordsInput,
  };
}

export default useProjectDetailState;
