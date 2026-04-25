import React from "react";

function pad2(value) {
  return String(Math.trunc(Number(value) || 0)).padStart(2, "0");
}

function nowParts() {
  const d = new Date();
  return {
    date: `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`,
    hour: pad2(d.getHours()),
    minute: pad2(d.getMinutes()),
  };
}

function parseLocalDateTime(value = "") {
  const raw = String(value || "").trim();
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(raw);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = Number(match[4]);
  const minute = Number(match[5]);
  if (!Number.isFinite(year) || year < 1900) return null;
  if (!Number.isFinite(month) || month < 1 || month > 12) return null;
  if (!Number.isFinite(day) || day < 1 || day > 31) return null;
  if (!Number.isFinite(hour) || hour < 0 || hour > 23) return null;
  if (!Number.isFinite(minute) || minute < 0 || minute > 59) return null;
  return {
    date: `${match[1]}-${match[2]}-${match[3]}`,
    hour: match[4],
    minute: match[5],
  };
}

function toLocalDateTime(parts = null) {
  const date = String(parts?.date || "").trim();
  const hour = String(parts?.hour || "").trim();
  const minute = String(parts?.minute || "").trim();
  if (!date || !hour || !minute) return "";
  return `${date}T${hour}:${minute}`;
}

function formatDisplay(value = "") {
  const parsed = parseLocalDateTime(value);
  if (!parsed) return "";
  const [year, month, day] = parsed.date.split("-");
  return `${day}/${month}/${year} ${parsed.hour}:${parsed.minute}`;
}

const HOURS = Array.from({ length: 24 }, (_, idx) => pad2(idx));
const MINUTES = Array.from({ length: 60 }, (_, idx) => pad2(idx));

export default function DateTimeConfirmPicker({
  value = "",
  onChange = null,
  disabled = false,
  placeholder = "jj/mm/aaaa hh:mm",
  applyLabel = "Valider",
  cancelLabel = "Annuler",
  clearLabel = "Effacer",
  allowClear = true,
  locale = "fr-FR",
}) {
  const rootRef = React.useRef(null);
  const localValue = String(value || "").trim();
  const [isOpen, setIsOpen] = React.useState(false);
  const [draft, setDraft] = React.useState(() => parseLocalDateTime(localValue) || nowParts());

  const resetDraftFromValue = React.useCallback(() => {
    setDraft(parseLocalDateTime(localValue) || nowParts());
  }, [localValue]);

  const openPicker = React.useCallback(() => {
    if (disabled) return;
    resetDraftFromValue();
    setIsOpen(true);
  }, [disabled, resetDraftFromValue]);

  const closePicker = React.useCallback(() => {
    setIsOpen(false);
  }, []);

  const handleCancel = React.useCallback(() => {
    resetDraftFromValue();
    closePicker();
  }, [resetDraftFromValue, closePicker]);

  const handleApply = React.useCallback(() => {
    const nextValue = toLocalDateTime(draft);
    if (!nextValue) return;
    if (typeof onChange === "function") onChange(nextValue);
    closePicker();
  }, [draft, onChange, closePicker]);

  const handleClear = React.useCallback(() => {
    if (typeof onChange === "function") onChange("");
    resetDraftFromValue();
    closePicker();
  }, [onChange, resetDraftFromValue, closePicker]);

  React.useEffect(() => {
    if (!isOpen) return undefined;
    const onPointerDown = (event) => {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(event.target)) {
        handleCancel();
      }
    };
    const onKeyDown = (event) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopPropagation();
      handleCancel();
    };
    document.addEventListener("mousedown", onPointerDown, true);
    document.addEventListener("touchstart", onPointerDown, true);
    document.addEventListener("keydown", onKeyDown, true);
    return () => {
      document.removeEventListener("mousedown", onPointerDown, true);
      document.removeEventListener("touchstart", onPointerDown, true);
      document.removeEventListener("keydown", onKeyDown, true);
    };
  }, [isOpen, handleCancel]);

  const displayValue = formatDisplay(localValue);

  return (
    <div className="uu-datetime-confirm" ref={rootRef}>
      <input
        type="text"
        className="uu-input uu-datetime-confirm-trigger"
        value={displayValue}
        placeholder={placeholder}
        readOnly
        disabled={disabled}
        onClick={openPicker}
      />

      {isOpen ? (
        <div className="uu-datetime-confirm-popover uu-card" role="dialog" aria-modal="false">
          <div className="uu-row uu-gap-8" style={{ alignItems: "center" }}>
            <input
              type="date"
              lang={locale}
              className="uu-input"
              style={{ minWidth: 170, flex: "1 1 auto" }}
              value={draft.date}
              onChange={(event) => {
                const nextDate = String(event?.target?.value || "").trim();
                setDraft((prev) => ({
                  ...prev,
                  date: nextDate,
                }));
              }}
            />
          </div>
          <div className="uu-row uu-gap-8" style={{ alignItems: "center", flexWrap: "nowrap" }}>
            <select
              className="uu-input"
              style={{ width: 88, flex: "0 0 88px" }}
              value={draft.hour}
              onChange={(event) => {
                const nextHour = String(event?.target?.value || "").trim();
                setDraft((prev) => ({
                  ...prev,
                  hour: nextHour,
                }));
              }}
            >
              {HOURS.map((hour) => (
                <option key={`dt-hour-${hour}`} value={hour}>
                  {hour}
                </option>
              ))}
            </select>
            <span style={{ fontWeight: 700, lineHeight: "36px", flex: "0 0 auto" }}>:</span>
            <select
              className="uu-input"
              style={{ width: 88, flex: "0 0 88px" }}
              value={draft.minute}
              onChange={(event) => {
                const nextMinute = String(event?.target?.value || "").trim();
                setDraft((prev) => ({
                  ...prev,
                  minute: nextMinute,
                }));
              }}
            >
              {MINUTES.map((minute) => (
                <option key={`dt-minute-${minute}`} value={minute}>
                  {minute}
                </option>
              ))}
            </select>
          </div>

          <div className="uu-row uu-gap-8" style={{ justifyContent: "flex-end" }}>
            {allowClear && localValue ? (
              <button
                className="uu-btn-ghost"
                type="button"
                onClick={handleClear}
              >
                {clearLabel}
              </button>
            ) : null}
            <button
              className="uu-btn-ghost"
              type="button"
              onClick={handleCancel}
            >
              {cancelLabel}
            </button>
            <button
              className="uu-btn uu-btn-primary"
              type="button"
              onClick={handleApply}
              disabled={!draft.date}
            >
              {applyLabel}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
