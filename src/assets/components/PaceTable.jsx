import React from "react";

// List of paces to display, in order and with user-friendly labels and icons
const PACE_LABELS = [
  { key: "easy", label: "Easy", icon: "🟢" },
  { key: "longRun", label: "Long Run", icon: "🏃‍♂️" },
  { key: "marathon", label: "Marathon Pace", icon: "🏅" },
  { key: "threshold", label: "Threshold", icon: "⚡" },
  { key: "interval", label: "Interval", icon: "⏱️" },
  { key: "repetition", label: "Repetition", icon: "🔁" },
  { key: "goalPace", label: "Goal Race Pace", icon: "🎯" }
];

export default function PaceTable({ paces }) {
  if (!paces) return null;

  return (
    <div className="pace-table-card">
      <h3 style={{ marginBottom: 12 }}>📊 Your Training Paces</h3>
      <div className="pace-card-grid">
        {PACE_LABELS.map(({ key, label, icon }) =>
          paces[key] && paces[key] !== "N/A" ? (
            <div className={`pace-card ${key}`} key={key}>
              <div className="pace-card-icon">{icon}</div>
              <div className="pace-card-label">{label}</div>
              <div className="pace-card-value">{paces[key]}</div>
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