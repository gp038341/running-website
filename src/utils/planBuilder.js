// src/utils/planBuilder.js

function getWarmupCooldown(profile, weeklyMileage) {
  const daily = Math.max(1, Math.round(weeklyMileage / (parseInt(profile.daysPerWeek) * 10)));
  return `${daily} miles warm-up, ${daily} miles cool-down`;
}

function getStrengthRoutine(profile) {
  if (profile.injuryHistory && profile.injuryHistory.trim().length > 0) {
    return `15 min strength/mobility (focus: ${profile.injuryHistory})`;
  }
  return "15 min general runner's strength (core, hips, glutes, mobility)";
}

export const generateFallbackPlan = (profile, paces) => {
  const baseMileage = parseInt(profile.weeklyMileage);
  const daysPerWeek = parseInt(profile.daysPerWeek);
  const event = profile.event;
  const planLength = Number(profile.planLength) || (['Marathon', 'Half-Marathon'].includes(event) ? 16 : 12);
  const phases = getPhasesForEvent(event, planLength);

  const weeks = phases.map((phase, i) => {
    const mileageMultiplier = getMileageMultiplier(phase, event);
    const weeklyMileage = Math.round(baseMileage * mileageMultiplier);

    return {
      weekNumber: i + 1,
      phase: phase,
      totalMileage: weeklyMileage,
      weightNotes: profile.weightRoutine || "No specific routine provided",
      days: generateDaysForPhase(
        phase,
        event,
        paces,
        weeklyMileage,
        daysPerWeek,
        profile.workoutDays,
        profile.longRunDay,
        profile.weightRoutine,
        profile
      )
    };
  });

  return { weeks, event, goalTime: profile.goalTime };
};

const getPhasesForEvent = (event, length) => {
  // Decide taper length (2 for most, 3 for marathon)
  const taperLength = (event === 'Marathon' || event === 'Half-Marathon') ? 3 : 2;
  // Always assign taper to the last N weeks
  const nonTaperWeeks = length - taperLength;

  // Decide base/build/maintenance split for non-taper weeks
  let base = Math.round(nonTaperWeeks * 0.2);
  let build = Math.round(nonTaperWeeks * 0.3);
  let maintenance = nonTaperWeeks - base - build;

  // Adjust if rounding causes overflow/underflow
  if (maintenance < 0) {
    build += maintenance; // reduce build if maintenance negative
    maintenance = 0;
    if (build < 0) {
      base += build;
      build = 0;
      if (base < 0) base = 0;
    }
  }

  // Build the phase array: all non-taper phases first, then taper at the end
  return [
    ...Array(base).fill("Base"),
    ...Array(build).fill("Build"),
    ...Array(maintenance).fill("Maintenance"),
    ...Array(taperLength).fill("Taper"),
  ];
};

const getMileageMultiplier = (phase, event) => {
  if (['100m', '200m', '400m'].includes(event)) {
    return phase === "Competition Peak" ? 0.6 : 0.8;
  }
  if (phase === "Base" || phase === "Base Building") return 1.0;
  if (phase === "Build" || phase === "Endurance Build") return 1.15;
  if (phase === "Maintenance") return 1.15;
  if (phase === "Peak") return 1.2;
  if (phase === "Taper") return 0.7;
  return 1.0;
};

function generateDaysForPhase(
  phase,
  event,
  paces,
  weeklyMileage,
  daysPerWeek,
  workoutDays,
  longRunDay,
  weightRoutine,
  profile
) {
  const longRunMiles = Math.round(weeklyMileage * (event === 'Marathon' ? 0.35 : 0.25));
  const preferredWorkoutDays = workoutDays
    ? workoutDays.split(',').map(d => d.trim())
    : ['Tuesday', 'Thursday'];

  // Sprint-specific programming
  if (['100m', '200m', '400m'].includes(event)) {
    return [
      {
        dayOfWeek: "Monday",
        type: "Workout",
        description: `${getWarmupCooldown(profile, weeklyMileage)}, Speed Development: 6-8 x 60m flying sprints @ max velocity + ${getStrengthRoutine(profile)}`
      },
      {
        dayOfWeek: "Tuesday",
        type: "Recovery",
        description: `20-30min easy jog @ ${paces.easy}`
      },
      {
        dayOfWeek: "Wednesday",
        type: "Workout",
        description: `${getWarmupCooldown(profile, weeklyMileage)}, Acceleration: 8 x 30m block starts, full recovery`
      },
      {
        dayOfWeek: "Thursday",
        type: "Recovery",
        description: "Complete rest or pool work"
      },
      {
        dayOfWeek: "Friday",
        type: "Workout",
        description: `${getWarmupCooldown(profile, weeklyMileage)}, Special Endurance: 3-4 x 150m @ 95% with 8min rest + Core`
      },
      {
        dayOfWeek: "Saturday",
        type: "Recovery",
        description: "30min easy + dynamic stretching"
      },
      {
        dayOfWeek: "Sunday",
        type: "Rest",
        description: "Complete rest"
      }
    ].slice(0, daysPerWeek);
  }

  // Marathon-specific programming
  if (event === 'Marathon' || event === 'Half-Marathon') {
    if (phase === "Base" || phase === "Base Building") {
      return [
        {
          dayOfWeek: "Monday",
          type: "Recovery",
          description: `6-8 miles easy @ ${paces.easy} + ${getStrengthRoutine(profile)}`
        },
        {
          dayOfWeek: preferredWorkoutDays[0],
          type: "Workout",
          description: `${getWarmupCooldown(profile, weeklyMileage)}, Tempo: 4-6 miles @ ${paces.threshold}`
        },
        {
          dayOfWeek: "Wednesday",
          type: "Recovery",
          description: `5-6 miles easy @ ${paces.easy}`
        },
        {
          dayOfWeek: preferredWorkoutDays[1],
          type: "Workout",
          description: `${getWarmupCooldown(profile, weeklyMileage)}, Long intervals: 5 x 1 mile @ ${paces.interval} with 2min rest`
        },
        {
          dayOfWeek: "Friday",
          type: "Recovery",
          description: `4-5 miles easy @ ${paces.easy}`
        },
        {
          dayOfWeek: longRunDay,
          type: "LongRun",
          description: `${longRunMiles} miles @ ${paces.easy} (build to ${paces.marathon} final 3-4mi)`
        },
        {
          dayOfWeek: "Sunday",
          type: "Recovery",
          description: "Easy 4-6 miles or cross-training"
        }
      ].slice(0, daysPerWeek);
    }

    if (phase === "Build" || phase === "Endurance Build") {
      return [
        {
          dayOfWeek: "Monday",
          type: "Recovery",
          description: `6-8 miles easy @ ${paces.easy}`
        },
        {
          dayOfWeek: preferredWorkoutDays[0],
          type: "Workout",
          description: `${getWarmupCooldown(profile, weeklyMileage)}, Marathon Pace: 8-12 miles @ ${paces.marathon} + ${getStrengthRoutine(profile)}`
        },
        {
          dayOfWeek: "Wednesday",
          type: "Recovery",
          description: `6 miles easy @ ${paces.easy}`
        },
        {
          dayOfWeek: preferredWorkoutDays[1],
          type: "Workout",
          description: `${getWarmupCooldown(profile, weeklyMileage)}, Threshold: 2 x 3 miles @ ${paces.threshold} with 4min rest`
        },
        {
          dayOfWeek: "Friday",
          type: "Recovery",
          description: `5 miles easy @ ${paces.easy}`
        },
        {
          dayOfWeek: longRunDay,
          type: "LongRun",
          description: `${longRunMiles} miles progressive (start ${paces.easy}, finish ${paces.marathon})`
        },
        {
          dayOfWeek: "Sunday",
          type: "Recovery",
          description: "6-8 miles easy"
        }
      ].slice(0, daysPerWeek);
    }

    if (phase === "Maintenance") {
      return [
        {
          dayOfWeek: "Monday",
          type: "Recovery",
          description: `6-8 miles easy @ ${paces.easy} + ${getStrengthRoutine(profile)}`
        },
        {
          dayOfWeek: preferredWorkoutDays[0],
          type: "Workout",
          description: `${getWarmupCooldown(profile, weeklyMileage)}, Marathon Pace: 6-8 miles @ ${paces.marathon}`
        },
        {
          dayOfWeek: "Wednesday",
          type: "Recovery",
          description: `6 miles easy @ ${paces.easy}`
        },
        {
          dayOfWeek: preferredWorkoutDays[1],
          type: "Workout",
          description: `${getWarmupCooldown(profile, weeklyMileage)}, Tempo: 5 miles @ ${paces.threshold}`
        },
        {
          dayOfWeek: "Friday",
          type: "Recovery",
          description: `5 miles easy @ ${paces.easy}`
        },
        {
          dayOfWeek: longRunDay,
          type: "LongRun",
          description: `${longRunMiles} miles @ ${paces.easy}`
        },
        {
          dayOfWeek: "Sunday",
          type: "Recovery",
          description: "5-6 miles easy"
        }
      ].slice(0, daysPerWeek);
    }
  }

  // Standard middle-distance programming (800m-10k)
  if (phase === "Base") {
    return [
      {
        dayOfWeek: "Monday",
        type: "Recovery",
        description: `6 miles easy @ ${paces.easy} + ${getStrengthRoutine(profile)}`
      },
      {
        dayOfWeek: preferredWorkoutDays[0],
        type: "Workout",
        description: `${getWarmupCooldown(profile, weeklyMileage)}, Threshold: 4-5 x 1000m @ ${paces.threshold} with 90sec rest`
      },
      {
        dayOfWeek: "Wednesday",
        type: "Recovery",
        description: `5 miles easy @ ${paces.easy} + 6 x 100m strides`
      },
      {
        dayOfWeek: preferredWorkoutDays[1],
        type: "Workout",
        description: `${getWarmupCooldown(profile, weeklyMileage)}, Aerobic Intervals: 6 x 800m @ 10k pace with 2min rest`
      },
      {
        dayOfWeek: "Friday",
        type: "Recovery",
        description: `4 miles easy @ ${paces.easy}`
      },
      {
        dayOfWeek: longRunDay,
        type: "LongRun",
        description: `${longRunMiles} miles @ ${paces.easy}`
      },
      {
        dayOfWeek: "Sunday",
        type: "Rest",
        description: "Complete rest or cross-training"
      }
    ].slice(0, daysPerWeek);
  }

  if (phase === "Build") {
    return [
      {
        dayOfWeek: "Monday",
        type: "Recovery",
        description: `6 miles easy @ ${paces.easy}`
      },
      {
        dayOfWeek: preferredWorkoutDays[0],
        type: "Workout",
        description: `${getWarmupCooldown(profile, weeklyMileage)}, VO2max: 6-8 x 800m @ ${paces.interval} with 90sec rest + ${getStrengthRoutine(profile)}`
      },
      {
        dayOfWeek: "Wednesday",
        type: "Recovery",
        description: `5 miles easy @ ${paces.easy} + strides`
      },
      {
        dayOfWeek: preferredWorkoutDays[1],
        type: "Workout",
        description: `${getWarmupCooldown(profile, weeklyMileage)}, Threshold: 2 x 2 miles @ ${paces.threshold} with 4min rest`
      },
      {
        dayOfWeek: "Friday",
        type: "Recovery",
        description: `4 miles easy @ ${paces.easy}`
      },
      {
        dayOfWeek: longRunDay,
        type: "LongRun",
        description: `${longRunMiles} miles @ ${paces.easy}`
      },
      {
        dayOfWeek: "Sunday",
        type: "Rest",
        description: "Complete rest"
      }
    ].slice(0, daysPerWeek);
  }

  if (phase === "Maintenance") {
    return [
      {
        dayOfWeek: "Monday",
        type: "Recovery",
        description: `6 miles easy @ ${paces.easy} + ${getStrengthRoutine(profile)}`
      },
      {
        dayOfWeek: preferredWorkoutDays[0],
        type: "Workout",
        description: `${getWarmupCooldown(profile, weeklyMileage)}, VO2max: 5 x 1000m @ ${paces.interval} with 2min rest`
      },
      {
        dayOfWeek: "Wednesday",
        type: "Recovery",
        description: `5 miles easy @ ${paces.easy} + strides`
      },
      {
        dayOfWeek: preferredWorkoutDays[1],
        type: "Workout",
        description: `${getWarmupCooldown(profile, weeklyMileage)}, Tempo: 4 miles @ ${paces.threshold}`
      },
      {
        dayOfWeek: "Friday",
        type: "Recovery",
        description: `4 miles easy @ ${paces.easy}`
      },
      {
        dayOfWeek: longRunDay,
        type: "LongRun",
        description: `${longRunMiles} miles @ ${paces.easy}`
      },
      {
        dayOfWeek: "Sunday",
        type: "Rest",
        description: "Complete rest"
      }
    ].slice(0, daysPerWeek);
  }

  if (phase === "Peak") {
    return [
      {
        dayOfWeek: "Monday",
        type: "Recovery",
        description: `5 miles easy @ ${paces.easy} + ${getStrengthRoutine(profile)}`
      },
      {
        dayOfWeek: preferredWorkoutDays[0],
        type: "Workout",
        description: `${getWarmupCooldown(profile, weeklyMileage)}, Race-Specific: 10-12 x 400m @ ${paces.goalPace} with 60sec rest`
      },
      {
        dayOfWeek: "Wednesday",
        type: "Recovery",
        description: `4 miles easy @ ${paces.easy} + strides`
      },
      {
        dayOfWeek: preferredWorkoutDays[1],
        type: "Workout",
        description: `${getWarmupCooldown(profile, weeklyMileage)}, Speed Endurance: 5-6 x 600m @ ${paces.goalPace} with 90sec rest`
      },
      {
        dayOfWeek: "Friday",
        type: "Recovery",
        description: `3 miles easy @ ${paces.easy}`
      },
      {
        dayOfWeek: longRunDay,
        type: "LongRun",
        description: `${longRunMiles} miles @ ${paces.easy}`
      },
      {
        dayOfWeek: "Sunday",
        type: "Rest",
        description: "Complete rest"
      }
    ].slice(0, daysPerWeek);
  }

  // Taper
  return [
    {
      dayOfWeek: "Monday",
      type: "Recovery",
      description: `4 miles easy @ ${paces.easy} + ${getStrengthRoutine(profile)}`
    },
    {
      dayOfWeek: preferredWorkoutDays[0],
      type: "Workout",
      description: `${getWarmupCooldown(profile, weeklyMileage)}, Sharpening: 6 x 300m @ ${paces.goalPace} with full recovery`
    },
    {
      dayOfWeek: "Wednesday",
      type: "Recovery",
      description: `3 miles easy @ ${paces.easy}`
    },
    {
      dayOfWeek: preferredWorkoutDays[1],
      type: "Workout",
      description: `${getWarmupCooldown(profile, weeklyMileage)}, Final Tune-Up: 4 x 200m @ mile pace`
    },
    {
      dayOfWeek: "Friday",
      type: "Rest",
      description: "Complete rest"
    },
    {
      dayOfWeek: "Saturday",
      type: "Recovery",
      description: "2 miles easy shakeout"
    },
    {
      dayOfWeek: "Sunday",
      type: "Race",
      description: `🏆 RACE DAY - ${event}`
    }
  ].slice(0, daysPerWeek);
}