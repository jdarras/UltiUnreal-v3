import { useState } from 'react';

export function useResourceDetailState() {
  const [detailUid, setDetailUid] = useState('');
  const [detailData, setDetailData] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailDraft, setDetailDraft] = useState({
    usage: '',
    style: '',
    ambiance: '',
    license: '',
    purchased: false,
    tested: false,
    favorite: false,
    ratingQuality: 0,
    ratingPerformance: 0,
    tags: '',
    note: '',
    epicAccount: '',
  });
  const [detailMsg, setDetailMsg] = useState('');
  const [_detailMsgType, setDetailMsgType] = useState('');
  const [detailBusy, setDetailBusy] = useState(false);
  const [detailDeleteBusy, setDetailDeleteBusy] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [tagInput, setTagInput] = useState('');
  const [lightboxIndex, setLightboxIndex] = useState(-1);

  return {
    detailUid,
    setDetailUid,
    detailData,
    setDetailData,
    detailLoading,
    setDetailLoading,
    detailDraft,
    setDetailDraft,
    detailMsg,
    setDetailMsg,
    setDetailMsgType,
    detailBusy,
    setDetailBusy,
    detailDeleteBusy,
    setDetailDeleteBusy,
    deleteConfirmOpen,
    setDeleteConfirmOpen,
    tagInput,
    setTagInput,
    lightboxIndex,
    setLightboxIndex,
  };
}

export default useResourceDetailState;
