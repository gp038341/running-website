import React from "react";

// List of paces to display, in order and with user-friendly labels
const PACE_LABELS = [
  { key: "easy", label: "Easy" },
  { key: "longRun", label: "Long Run" },
  { key: "steadyState", label: "Steady State" },
  { key: "marathon", label: "Marathon Pace" },
  { key: "threshold", label: "Threshold" },
  { key: "cruiseInterval", label: "Cruise Interval" },
  { key: "interval", label: "Interval" },
  { key: "repetition", label: "Repetition" },
  { key: "goalPace", label: "Goal Race Pace" }
];

export default function PaceTable({ paces }) {
  if (!paces) return null;

  return (
    <div className="pace-table-card">
      <h3 style={{ marginBottom: 12 }}>📊 Your Training Paces</h3>
      <div className="pace-table-grid">
        {PACE_LABELS.map(({ key, label }) =>
          paces[key] && paces[key] !== "N/A" ? (
            <div className="pace-table-row" key={key}>
              <span className="pace-table-label">{label}</span>
              <span className="pace-table-value">{paces[key]}</span>
            </div>
          ) : null
        )}
      </div>
      {paces.vdot && (
        <div className="pace-table-vdot">
          <strong>VDOT:</strong> {paces.vdot}
        </div>
      )}
      {paces.notes && (
        <div className="pace-table-notes">
          {paces.notes}
        </div>
      )}
    </div>
  );
}