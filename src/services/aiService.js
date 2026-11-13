// src/services/aiService.js
import { enforceRaceAndTaperRules } from '../utils/planNormalizer';
import { getStartDateAnchoredToRace, calculatePlanLengthFromGoal, assignDatesToPlan } from '../utils/planScheduler';




const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

/**
 * Generates a personalized training plan using OpenAI GPT-4
 * Supports events from 100m to Marathon with custom periodization
 * @param {Object} runnerProfile - User's complete profile from the form
 * @param {Object} paces - Calculated training paces from vdotCalculator
 * @returns {Object} - Raw JSON training plan from the AI
 */
export const generateAIRunningPlan = async (runnerProfile, currentPaces, targetPaces, planLength) => {
  // Access the key from your .env file (Vite uses VITE_ prefix)
  const apiKey = import.meta.env.VITE_OPENAI_KEY;
  const goalDateISO = runnerProfile.goalDate;

  const startDate = getStartDateAnchoredToRace(goalDateISO, planLength); // or however you compute it
  const raceDate = new Date(goalDateISO);
  raceDate.setHours(0,0,0,0);
  const totalDays = Math.round((raceDate - startDate) / (1000 * 60 * 60 * 24)) + 1;


  if (!apiKey) {
    throw new Error("OpenAI API Key is missing. Check your .env file and restart the dev server.");
  }

  // Determine plan length based on event

  const systemPrompt = `You are an elite NCAA Division I track and field coach with expertise spanning sprints (100m-400m), middle distance (800m-Mile), distance running (3k-10k), and marathon training.

CRITICAL COACHING RULES:

1. AVOID THE GREY ZONE:
   - Recovery runs must be truly easy (conversational pace, aerobic only)
   - Quality sessions must have clear physiological targets (Threshold, VO2max, Speed)
   - No "moderate" runs that provide neither recovery nor stimulus

2. EVENT-SPECIFIC PERIODIZATION:
   - Sprints (100m-400m): Power Development → Max Velocity → Speed Endurance → Competition Peak (${planLength} weeks)
   - Middle Distance (800m-Mile): Base → Build → Peak → Taper (${planLength} weeks)
   - Distance (3k-Marathon): Base → Build → Peak → Taper (${planLength} weeks, extended for marathon)

3. TRAINING FREQUENCY:
   - Respect the athlete's specified days per week: ${runnerProfile.daysPerWeek} days
   - Distribute rest days strategically based on workout intensity
   - Never exceed the specified training frequency

4. WEEKLY STRUCTURE:
   - 2 quality sessions per week on preferred days: ${runnerProfile.workoutDays || 'Tuesday, Thursday'}
   - 1 long run on: ${runnerProfile.longRunDay || 'Saturday'}
   - Long run = 20-25% of weekly volume (up to 35% for marathon)
   - Include strides 2-3x per week on easy days
   - At least 1 complete rest or very light day per week

5. WEIGHT TRAINING INTEGRATION:
   - Athlete's routine: "${runnerProfile.weightRoutine || 'No specific routine provided'}"
   - Schedule lifting on specified days or after quality sessions
   - Note lifting days in the plan to avoid overtraining

6. INJURY CONSIDERATIONS:
   - Account for: "${runnerProfile.injuryHistory || 'No reported injuries'}"
   - Modify workouts to avoid aggravating previous issues
   - Include preventive exercises or notes if relevant

7. WEIGHTS:
   - For each week, include at least one day with a specific strength or mobility routine
   - If the athlete has an injury history or limitation, focus the routine on those weaknesses (e.g., "15 min strength/mobility: focus on shins and ankles")
   - Otherwise, use a general runner's strength plan (core, hips, glutes, mobility).

8. RACE DATE:
   - Anchor the schedule to the supplied Goal Race Date
   - include an explicit 'Race' day on that exact date

9. TAPER:
   - Always include a Taper in the final 1 - 2 weeks
   - 30 - 40% volume reduction, maintain intensity with shorter reps

10. MILEAGE PROGRESSION:
   - Weekly mileage increases ≤10% week-over-week except during taper
   - Base mileage: ${runnerProfile.weeklyMileage} miles/week
   - Taper: Reduce volume 30-40% in final 1-2 weeks, maintain intensity

11. OUTPUT FORMAT:
   Respond ONLY with valid JSON. No conversational text before or after.
   Return 7 entries per week and ensure chronological continuity.
   Return exactly ${totalDays} entries, one for each day, in chronological order, starting on ${startDate.toISOString().slice(0,10)} and ending on ${goalDateISO}.


12. WARM UP AND COOL DOWN:
   - For every workout day, specify explicit warm-up and cool-down mileage (e.g., "2 miles warm-up, 2 miles cool-down") in the day's description
   - Ensure these are included in the total weekly mileage.


JSON SCHEMA (strictly follow this structure):
{
  "weeks": [
    {
      "weekNumber": number (1-${planLength}),
      "phase": string ("Base" | "Build" | "Peak" | "Taper" | "Power Development" | "Max Velocity" | "Speed Endurance" | "Competition Peak" | "Base Building" | "Endurance Build"),
      "totalMileage": number,
      "weeklyFocus": string (brief description of the week's emphasis),
      "weightNotes": string (how to integrate lifting this week),
      "days": [
        {
          "dayOfWeek": string ("Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday" | "Saturday" | "Sunday"),
          "type": string ("Workout" | "Recovery" | "LongRun" | "Rest" | "Race"),
          "description": string (detailed workout with paces, reps, recovery)
        }
      ]
    }
  ],
  "event": string,
  "goalTime": string
}`;

const userPrompt = `
Generate a training plan that starts on ${startDate.toISOString().slice(0,10)} and ends on ${goalDateISO}.
The plan must have exactly ${totalDays} days, with a unique, meaningful entry for every day (no missing days, no extra days).
Each day should include: dayOfWeek, type, and description.
DO NOT combine days or skip days. DO NOT include any extra or missing days.

ATHLETE PROFILE:
- Target Event: ${runnerProfile.event}
- Current PR: ${runnerProfile.currentPR}
- Goal Time: ${runnerProfile.goalTime || 'Train for current fitness level'}
- Goal Race Date: ${runnerProfile.goalDate}
- Current Weekly Mileage: ${runnerProfile.weeklyMileage} miles
- Days Running Per Week: ${runnerProfile.daysPerWeek}
- Preferred Workout Days: ${runnerProfile.workoutDays || 'Tuesday, Thursday'}
- Long Run Day: ${runnerProfile.longRunDay || 'Saturday'}
- Recovery Pace: ${runnerProfile.recoveryPace || 'Use calculated easy pace'}
- Weight/Strength Routine: ${runnerProfile.weightRoutine || 'None specified'}
- Injury History: ${runnerProfile.injuryHistory || 'None reported'}
- Goal Race Date (must be the Race day in the final plan): ${runnerProfile.goalDate}
- Ensure the final plan includes a 'Race' day exactly on ${runnerProfile.goalDate}.

CURRENT TRAINING PACES (use for Base and early Build phases):
- Easy Pace: ${currentPaces.easy}
- Threshold Pace: ${currentPaces.threshold || 'N/A'}
- Current Race Pace: ${currentPaces.goalPace}
${currentPaces.interval ? `- Interval/VO2max Pace: ${currentPaces.interval}` : ''}

TARGET TRAINING PACES (progress toward these in Peak phase):
- Easy Pace: ${targetPaces.easy}
- Threshold Pace: ${targetPaces.threshold || 'N/A'}
- Goal Race Pace: ${targetPaces.goalPace}
${targetPaces.interval ? `- Target Interval Pace: ${targetPaces.interval}` : ''}
${targetPaces.vdot ? `- Target VDOT: ${targetPaces.vdot}` : ''}

PACING PROGRESSION STRATEGY:
- Base Phase (first 10% of the entire length of the training plan): Use CURRENT paces exclusively
- Build Phase (next 40% of the training plan): Gradually transition from CURRENT to TARGET paces
- Peak Phase (next 40% of the training plan): Use TARGET paces for race-specific work
- Taper Phase (final 10-20% of the training plan): Maintain TARGET paces but reduce volume
- DO NOT TAPER UNTIL THE LAST 2 WEEKS.

SPECIFIC REQUIREMENTS:
- Progress weekly mileage gradually (max 10% increase per week)
- Quality sessions on ${runnerProfile.workoutDays || 'Tuesday and Thursday'}
- Long run on ${runnerProfile.longRunDay || 'Saturday'}
- Include specific workout details (reps, distance, pace, recovery intervals)
- Provide coaching notes for key workouts
- Ensure proper taper in final ${planLength === 16 ? '2' : '1-2'} weeks
- Integrate weight training: ${runnerProfile.weightRoutine || 'No lifting specified'}
- DO NOT HAVE ANY RACE DATE BEFORE THE USER'S SELECTED DATE.
- DO NOT LET MILEAGE EXCEED 70 MILES PER WEEK.
- Do not include any 'Race' or 'Taper' weeks before the final two weeks.
- If you include a 'Race' day before the end, that is an error.
- Only the last day should be labeled as “Race.”
- Scan all plan days: If any day before the last day is labeled as “Race,” change it to a “Workout,” “Rest,” or “Recovery” day with an appropriate description.
- Explicitly set the day before the race (the day before the last day) to a “Shakeout” or “Easy Run (3-4 miles)” day, regardless of what the AI initially generates for that day."
- Force the last plan day’s date to match the user’s inputted race date.
- Generate something for each day up to the race date (rest days count as something). Do not leave any gaps in the schedule.
- If you do not return exactly ${totalDays} days, your output will be rejected and you will be asked again.
- The plan should only have days running on the specified days per week, with complete rest days otherwise.
- The total number of days that have mileage should not exceed ${runnerProfile.daysPerWeek} days per week.
- Long run days should always be on ${runnerProfile.longRunDay}




Return the complete ${planLength}-week plan in the JSON format specified in your system instructions. Include all ${planLength} weeks with 7 days each (or ${runnerProfile.daysPerWeek} training days + rest days).`;

  try {
    const response = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        response_format: { type: "json_object" }, // Forces JSON output
        temperature: 0.7,
        max_tokens: 16000,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`OpenAI API Error: ${errorData.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    const planData = JSON.parse(data.choices[0].message.content);

    // Basic validation
    if (!planData.weeks || !Array.isArray(planData.weeks)) {
      throw new Error('Invalid plan structure returned from AI');
    }

    // Post-process to enforce race/taper rules
    const cleanedPlan = enforceRaceAndTaperRules(
      planData,
      runnerProfile.goalDate // or whatever variable holds the user's goal race date
    );

    return cleanedPlan;

  } catch (error) {
    console.error("AI Service Error:", error);
    throw error; // Re-throw so Dashboard can handle with fallback
  }
};