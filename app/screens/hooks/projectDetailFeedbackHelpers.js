function clearMessagePair(setMessage, setMessageType) {
  if (typeof setMessage === 'function') setMessage('');
  if (typeof setMessageType === 'function') setMessageType('');
}

function setTypedMessage(setMessage, setMessageType, type, message) {
  if (typeof setMessageType === 'function') setMessageType(String(type || ''));
  if (typeof setMessage === 'function') setMessage(String(message || ''));
}

export { clearMessagePair, setTypedMessage };
