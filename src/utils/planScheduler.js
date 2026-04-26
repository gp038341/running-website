// src/utils/planScheduler.js

/**
 * Utilities to:
 * - Compute dynamic plan length from goal date
 * - Anchor the plan so the final day aligns with the race date
 * - Assign real calendar dates to each plan day
 * - Guarantee a Race day exactly on the goal date
 */

export function calculatePlanLengthFromGoal(goalDateISO, minWeeks = 4, maxWeeks = 20) {
  const today = startOfDay(new Date());
  const race = startOfDay(new Date(goalDateISO));
  const diffDays = Math.max(0, Math.ceil((race - today) / (1000 * 60 * 60 * 24)));
  const weeks = Math.ceil(diffDays / 7);
  return Math.min(Math.max(weeks, minWeeks), maxWeeks);
}

export function getStartDateAnchoredToRace(goalDateISO, planLengthWeeks) {
  // Always anchor so the last day is the race date, regardless of weekday
  const start = addDays(new Date(goalDateISO), -((planLengthWeeks * 7) - 1));
  return startOfDay(start);
}

export function assignDatesToPlan(plan, startDateISO, goalDateISO, longRunDay = 'Saturday', eventLabel = '') {
  const start = startOfDay(new Date(startDateISO));
  const goal = startOfDay(new Date(goalDateISO));

  // Flatten to assign dates linearly (week i, day j => offset i*7 + j)
  const flattened = [];
  plan.weeks.forEach((w, wi) => {
    const days = (w.days || []).slice(0, 7);
    while (days.length < 7) {
      days.push({
        dayOfWeek: 'Rest',
        type: 'Rest',
        description: 'Rest day'
      });
    }
    days.forEach((d, di) => {
      const offset = wi * 7 + di;
      const date = addDays(start, offset);
      flattened.push({ weekIndex: wi, dayIndex: di, date, day: d });
    });
  });

  // Overwrite the entry for the goal date to always be Race day
  flattened.forEach(f => {
    if (isSameDay(f.date, goal)) {
      f.day = {
        dayOfWeek: dayOfWeekName(goal),
        type: 'Race',
        description: `🏆 RACE DAY — ${eventLabel || plan.event || ''}`.trim()
      };
    }
  });

  // Ensure the day before race is a shakeout
  const dayBeforeRace = addDays(goal, -1);
  flattened.forEach(f => {
    if (isSameDay(f.date, dayBeforeRace)) {
      f.day = {
        dayOfWeek: dayOfWeekName(dayBeforeRace),
        type: 'Recovery',
        description: '3-4 mile shakeout run, light strides, and drills. Hydrate and rest!'
      };
    }
  });

  // Rebuild weeks with dates (respect existing phase assignments)
  const weeksOut = plan.weeks.map((w, wi) => {
    const startIdx = wi * 7;
    const slice = flattened.slice(startIdx, startIdx + 7);

    const weekItems = slice.map(f => ({
      ...f.day,
      date: toISO(f.date),
      dayOfWeek: f.day.dayOfWeek || dayOfWeekName(f.date)
    }));

    let phase = w.phase || 'Base';
    let totalMileage = Number(w.totalMileage || 0);
    let weightNotes = w.weightNotes;

    // Only apply taper modifications if the phase is already "Taper"
    if (phase === 'Taper') {
      weightNotes = 'Keep lifting light; prioritize sleep and recovery';
      for (let i = 0; i < weekItems.length; i++) {
        const d = weekItems[i];
        // Do not alter Race day
        if (d.type === 'Workout' && !isSameDay(new Date(d.date), goal)) {
          weekItems[i] = { ...d, description: simplifyForTaper(d.description) };
        }
      }
    }

    return {
      ...w,
      phase: phase,
      totalMileage: totalMileage,
      weightNotes: weightNotes,
      days: weekItems
    };
  });

  return { ...plan, weeks: weeksOut };
}

// ---------- Helpers ----------

const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function dayOfWeekName(date) {
  return dayNames[date.getDay()];
}

function toISO(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function isSameDay(a, b) {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
}

function simplifyForTaper(desc = '') {
  let out = desc || '';
  out = out.replace(/(\d+)\s*x\s*(\d+)/i, (m, a, b) => {
    const half = Math.max(1, Math.floor(Number(a) / 2));
    return `${half} x ${b}`;
  });
  out = out.replace(/(\d+)\s*mile(s)?/i, (m, n) => {
    const reduced = Math.max(1, Math.round(Number(n) * 0.6));
    return `${reduced} mile${reduced === 1 ? '' : 's'}`;
  });
  return out + ' (keep it snappy, full recovery)';
}