/**
 * Normalizes AI-generated plan to match our component structure
 * Handles schema variations and missing fields
 */
export function enforceRaceAndTaperRules(plan, goalDateISO) {
  if (!plan || !plan.weeks || !goalDateISO) return plan;

  const goalDate = new Date(goalDateISO);
  const goalDateStr = goalDate.toISOString().slice(0, 10);

  // 1. Remove any "Race" day that is not on the goal date
  plan.weeks.forEach((week, wi) => {
    const daysArr = Array.isArray(week.days) ? week.days : [];
    daysArr.forEach((day, di) => {
      const dayDate = day.date ? day.date.slice(0, 10) : null;
      if (day.type === "Race" && dayDate !== goalDateStr) {
        daysArr[di] = {
          ...day,
          type: "Recovery",
          description: "Easy recovery day (auto-corrected from misplaced Race day)"
        };
      }
    });
    // Write back in case week.days was not an array
    week.days = daysArr;
  });

  // 2. Ensure the last day of the last week is "Race" on the goal date
  const lastWeek = plan.weeks[plan.weeks.length - 1];
  const lastDaysArr = Array.isArray(lastWeek.days) ? lastWeek.days : [];
  let raceSet = false;
  lastDaysArr.forEach((day, di) => {
    const dayDate = day.date ? day.date.slice(0, 10) : null;
    if (dayDate === goalDateStr) {
      lastDaysArr[di] = {
        ...day,
        type: "Race",
        description: "🏆 RACE DAY — Good luck!"
      };
      raceSet = true;
    }
  });
  if (!raceSet && lastDaysArr.length > 0) {
    lastDaysArr[lastDaysArr.length - 1] = {
      ...lastDaysArr[lastDaysArr.length - 1],
      type: "Race",
      description: "🏆 RACE DAY — Good luck!",
      date: goalDate.toISOString()
    };
  }
  lastWeek.days = lastDaysArr;

  // 3. Only the last 1-2 weeks are "Taper"
  const taperWeeks = 2;
  plan.weeks.forEach((week, wi) => {
    if (wi < plan.weeks.length - taperWeeks) {
      if (week.phase && week.phase.toLowerCase().includes("taper")) {
        week.phase = "Build"; // or "Peak" if you prefer
      }
    } else {
      week.phase = "Taper";
    }
  });

  // 4. Warn about empty or generic weeks
  plan.weeks.forEach((week, wi) => {
    const daysArr = Array.isArray(week.days) ? week.days : [];
    if (
      daysArr.length === 0 ||
      daysArr.every(day => !day.description || day.description.trim() === "")
    ) {
      console.warn(`Week ${wi + 1} is empty or generic. Consider regenerating.`);
    }
  });

  return plan;
}

export const normalizePlan = (aiPlan) => {
  if (!aiPlan || !aiPlan.weeks) {
    throw new Error('Invalid plan structure: missing weeks array');
  }

  return {
    weeks: aiPlan.weeks.map(week => ({
      weekNumber: week.weekNumber || week.week_number || week.week || 0,
      phase: week.phase || 'Base',
      totalMileage: week.totalMileage || week.total_mileage || week.mileage || 0,
      weeklyFocus: week.weeklyFocus || week.weekly_focus || week.focus || '',
      weightNotes: week.weightNotes || week.weight_notes || '',
      days: (Array.isArray(week.days) ? week.days : []).map(day => ({
        dayOfWeek: day.dayOfWeek || day.day_of_week || day.day || 'Monday',
        type: day.type || 'Recovery',
        description: day.description || 'Easy run'
      }))
    })),
    event: aiPlan.event || '3k',
    goalTime: aiPlan.goalTime || aiPlan.goal_time || ''
  };
};