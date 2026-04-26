/**
 * Normalizes AI-generated plan to match our component structure
 * Handles schema variations and missing fields
 */
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
        days: (week.days || []).map(day => ({
          dayOfWeek: day.dayOfWeek || day.day_of_week || day.day || 'Monday',
          type: day.type || 'Recovery',
          description: day.description || 'Easy run'
        }))
      })),
      event: aiPlan.event || '3k',
      goalTime: aiPlan.goalTime || aiPlan.goal_time || ''
    };
  };