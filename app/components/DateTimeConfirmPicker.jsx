import React from "react";

function pad2(value) {
  return String(Math.trunc(Number(value) || 0)).padStart(2, "0");
}

function nowParts() {
  const d = new Date();
  return {
    year: d.getFullYear(),
    month: d.getMonth() + 1,
    day: d.getDate(),
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
  return { year, month, day, hour: pad2(hour), minute: pad2(minute) };
}

function toLocalDateTime(parts = null) {
  const year = Number(parts?.year || 0);
  const month = Number(parts?.month || 0);
  const day = Number(parts?.day || 0);
  const hour = String(parts?.hour || "").trim();
  const minute = String(parts?.minute || "").trim();
  if (!year || !month || !day || !hour || !minute) return "";
  return `${year}-${pad2(month)}-${pad2(day)}T${hour}:${minute}`;
}

function formatDisplay(value = "") {
  const parsed = parseLocalDateTime(value);
  if (!parsed) return "";
  return `${pad2(parsed.day)}/${pad2(parsed.month)}/${parsed.year} ${parsed.hour}:${parsed.minute}`;
}

const HOURS = Array.from({ length: 24 }, (_, idx) => pad2(idx));
const MINUTES = Array.from({ length: 60 }, (_, idx) => pad2(idx));

const DAY_HEADERS = ["Lu", "Ma", "Me", "Je", "Ve", "Sa", "Di"];
const MONTH_NAMES = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];

function buildCalendarDays(year, month) {
  const firstDay = new Date(year, month - 1, 1).getDay();
  const startOffset = (firstDay + 6) % 7; // Lu=0 … Di=6
  const daysInMonth = new Date(year, month, 0).getDate();
  const cells = Array(startOffset).fill(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

export default function DateTimeConfirmPicker({
  value = "",
  onChange = null,
  disabled = false,
  placeholder = "jj/mm/aaaa hh:mm",
  applyLabel = "Valider",
  cancelLabel = "Annuler",
  clearLabel = "Effacer",
  allowClear = true,
}) {
  const rootRef = React.useRef(null);
  const localValue = String(value || "").trim();
  const [isOpen, setIsOpen] = React.useState(false);

  const initDraft = React.useCallback(() => parseLocalDateTime(localValue) || nowParts(), [localValue]);
  const [draft, setDraft] = React.useState(initDraft);
  const [calYear, setCalYear] = React.useState(() => draft.year);
  const [calMonth, setCalMonth] = React.useState(() => draft.month);

  const resetDraftFromValue = React.useCallback(() => {
    const parsed = parseLocalDateTime(localValue) || nowParts();
    setDraft(parsed);
    setCalYear(parsed.year);
    setCalMonth(parsed.month);
  }, [localValue]);

  const openPicker = React.useCallback(() => {
    if (disabled) return;
    resetDraftFromValue();
    setIsOpen(true);
  }, [disabled, resetDraftFromValue]);

  const closePicker = React.useCallback(() => setIsOpen(false), []);

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

  function prevMonth() {
    if (calMonth === 1) { setCalYear((y) => y - 1); setCalMonth(12); }
    else setCalMonth((m) => m - 1);
  }

  function nextMonth() {
    if (calMonth === 12) { setCalYear((y) => y + 1); setCalMonth(1); }
    else setCalMonth((m) => m + 1);
  }

  function goToToday() {
    const now = new Date();
    setCalYear(now.getFullYear());
    setCalMonth(now.getMonth() + 1);
  }

  function selectDay(day) {
    setDraft((prev) => ({ ...prev, year: calYear, month: calMonth, day }));
  }

  React.useEffect(() => {
    if (!isOpen) return undefined;
    const onPointerDown = (event) => {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(event.target)) handleCancel();
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
  const calDays = isOpen ? buildCalendarDays(calYear, calMonth) : [];
  const todayD = new Date();
  const todayYear = todayD.getFullYear();
  const todayMonth = todayD.getMonth() + 1;
  const todayDay = todayD.getDate();

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
          <div className="uu-row" style={{ alignItems: "center", justifyContent: "space-between", marginBottom: "6px" }}>
            <button type="button" className="uu-btn-ghost" onClick={prevMonth} style={{ padding: "2px 10px" }}>‹</button>
            <span style={{ fontWeight: 600 }}>{MONTH_NAMES[calMonth - 1]} {calYear}</span>
            <button type="button" className="uu-btn-ghost" onClick={nextMonth} style={{ padding: "2px 10px" }}>›</button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "2px", textAlign: "center" }}>
            {DAY_HEADERS.map((h) => (
              <span key={h} style={{ fontSize: "11px", opacity: 0.5, padding: "2px 0", fontWeight: 600 }}>{h}</span>
            ))}
            {calDays.map((day, idx) => {
              if (!day) return <span key={`e-${idx}`} />;
              const isSelected = draft.year === calYear && draft.month === calMonth && draft.day === day;
              const isToday = todayYear === calYear && todayMonth === calMonth && todayDay === day;
              return (
                <button
                  key={`d-${day}`}
                  type="button"
                  onClick={() => selectDay(day)}
                  style={{
                    padding: "4px 2px",
                    borderRadius: "4px",
                    border: isToday && !isSelected ? "1px solid var(--uu-accent, #3b82f6)" : "1px solid transparent",
                    background: isSelected ? "var(--uu-accent, #3b82f6)" : "transparent",
                    color: isSelected ? "#fff" : "inherit",
                    cursor: "pointer",
                    fontSize: "13px",
                  }}
                >
                  {day}
                </button>
              );
            })}
          </div>

          <div className="uu-row" style={{ alignItems: "center", flexWrap: "nowrap", marginTop: "8px", gap: "8px" }}>
            <select
              className="uu-input"
              style={{ width: 88, flex: "0 0 88px" }}
              value={draft.hour}
              onChange={(e) => setDraft((prev) => ({ ...prev, hour: e.target.value }))}
            >
              {HOURS.map((hour) => <option key={`dt-hour-${hour}`} value={hour}>{hour}</option>)}
            </select>
            <span style={{ fontWeight: 700, lineHeight: "36px", flex: "0 0 auto" }}>:</span>
            <select
              className="uu-input"
              style={{ width: 88, flex: "0 0 88px" }}
              value={draft.minute}
              onChange={(e) => setDraft((prev) => ({ ...prev, minute: e.target.value }))}
            >
              {MINUTES.map((minute) => <option key={`dt-minute-${minute}`} value={minute}>{minute}</option>)}
            </select>
            <button
              type="button"
              className="uu-btn-ghost"
              style={{ marginLeft: "auto", fontSize: "12px" }}
              onClick={goToToday}
            >
              Aujourd'hui
            </button>
          </div>

          <div className="uu-row" style={{ justifyContent: "flex-end", marginTop: "8px", gap: "8px" }}>
            {allowClear && localValue ? (
              <button className="uu-btn-ghost" type="button" onClick={handleClear}>{clearLabel}</button>
            ) : null}
            <button className="uu-btn-ghost" type="button" onClick={handleCancel}>{cancelLabel}</button>
            <button
              className="uu-btn uu-btn-primary"
              type="button"
              onClick={handleApply}
              disabled={!draft.year || !draft.month || !draft.day}
            >
              {applyLabel}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
