
/**
 * Training pace calculator supporting 100m to Marathon.
 * Uses simplified race-performance estimates for training paces.
 */

// Estimate 5k time from 1500m PR
function estimate5kFrom1500m(prSeconds) {
  return prSeconds * 3.73;
}

// Estimate 5k time from Mile PR
function estimate5kFromMile(prSeconds) {
  return prSeconds * 3.47;
}

// Estimate 5k time from 800m PR
function estimate5kFrom800m(prSeconds) {
  return prSeconds * 7.72;
}

// Estimate 5k time from 3k PR
function estimate5kFrom3k(prSeconds) {
  return prSeconds * 1.74;
}

// Calculate threshold pace in minutes per mile
function getThresholdPace(event, prSeconds) {
  let thresholdPaceSec;

  if (event === '1500m') {
    const est5kSec = estimate5kFrom1500m(prSeconds);
    const pace5k = est5kSec / 3.107;
    thresholdPaceSec = pace5k * 1.09;

  } else if (event === 'Mile') {
    const est5kSec = estimate5kFromMile(prSeconds);
    const pace5k = est5kSec / 3.107;
    thresholdPaceSec = pace5k * 1.09;

  } else if (event === '800m') {
    const est5kSec = estimate5kFrom800m(prSeconds);
    const pace5k = est5kSec / 3.107;
    thresholdPaceSec = pace5k * 1.09;

  } else if (event === '3k') {
    const est5kSec = estimate5kFrom3k(prSeconds);
    const pace5k = est5kSec / 3.107;
    thresholdPaceSec = pace5k * 1.09;

  } else {
    const pace = prSeconds / getEventDistance(event);
    thresholdPaceSec = pace / 0.90;
  }

  return thresholdPaceSec / 60;
}

// Calculate interval pace in minutes per mile
function getIntervalPace(event, prSeconds) {
  let intervalPaceSec;

  if (event === '1500m') {
    const est5kSec = estimate5kFrom1500m(prSeconds);
    const pace5k = est5kSec / 3.107;
    intervalPaceSec = pace5k;

  } else if (event === 'Mile') {
    const est5kSec = estimate5kFromMile(prSeconds);
    const pace5k = est5kSec / 3.107;
    intervalPaceSec = pace5k;

  } else if (event === '800m') {
    const est5kSec = estimate5kFrom800m(prSeconds);
    const pace5k = est5kSec / 3.107;
    intervalPaceSec = pace5k;

  } else if (event === '3k') {
    const est5kSec = estimate5kFrom3k(prSeconds);
    const pace5k = est5kSec / 3.107;
    intervalPaceSec = pace5k;

  } else {
    const pace = prSeconds / getEventDistance(event);
    intervalPaceSec = pace;
  }

  return intervalPaceSec / 60;
}

// Calculate repetition pace in minutes per mile
function getRepeatPace(event, prSeconds) {
  let repeatPaceSec;

  if (event === '1500m') {
    const est5kSec = estimate5kFrom1500m(prSeconds);
    const pace5k = est5kSec / 3.107;
    repeatPaceSec = pace5k * 0.92;

  } else if (event === 'Mile') {
    const est5kSec = estimate5kFromMile(prSeconds);
    const pace5k = est5kSec / 3.107;
    repeatPaceSec = pace5k * 0.92;

  } else if (event === '800m') {
    const est5kSec = prSeconds * 6.8;
    const pace5k = est5kSec / 3.107;
    repeatPaceSec = pace5k * 0.92;

  } else if (event === '3k') {
    const est5kSec = estimate5kFrom3k(prSeconds);
    const pace5k = est5kSec / 3.107;
    repeatPaceSec = pace5k * 0.92;

  } else {
    const pace = prSeconds / getEventDistance(event);
    repeatPaceSec = pace * 0.95;
  }

  return repeatPaceSec / 60;
}

// Calculate marathon pace in minutes per mile
function getMarathonPace(event, prSeconds) {
  let marathonPaceSec;

  if (event === '1500m') {
    const est5kSec = estimate5kFrom1500m(prSeconds);
    const pace5k = est5kSec / 3.107;
    marathonPaceSec = pace5k * 1.14;

  } else if (event === 'Mile') {
    const est5kSec = estimate5kFromMile(prSeconds);
    const pace5k = est5kSec / 3.107;
    marathonPaceSec = pace5k * 1.14;

  } else if (event === '800m') {
    const est5kSec = prSeconds * 6.8;
    const pace5k = est5kSec / 3.107;
    marathonPaceSec = pace5k * 1.14;

  } else if (event === '3k') {
    const est5kSec = estimate5kFrom3k(prSeconds);
    const pace5k = est5kSec / 3.107;
    marathonPaceSec = pace5k * 1.14;

  } else {
    const pace = prSeconds / getEventDistance(event);
    marathonPaceSec = pace * 1.14;
  }

  return marathonPaceSec / 60;
}

// Main training pace calculator
export const calculateTrainingPaces = (
  event,
  prTime,
  goalTime,
  customRecovery
) => {
  const prSeconds = timeToSeconds(prTime);
  const goalSeconds = goalTime
    ? timeToSeconds(goalTime)
    : prSeconds;

  const eventMeters = getEventMeters(event);

  // Simplified performance indicator from race velocity.
  // This is not a complete Daniels VDOT calculation.
  const velocity = eventMeters / (prSeconds / 60);

  const vdot =
    (0.182258 * velocity)
    + (0.000104 * velocity * velocity)
    + 3.5;

  // UPDATED: Calculate easy pace from race pace instead of
  // incorrectly treating VDOT as running velocity.
  //
  // This is a simple estimate, not an official VDOT pace.
  // A 1.35 multiplier means 35% more time per mile than race pace.
  // It is most suitable as a rough distance-running estimate.
  const racePace = prSeconds / getEventDistance(event);
  const easy = (racePace * 1.35) / 60;

  // Existing pace calculations
  const marathon = getMarathonPace(event, prSeconds);
  const threshold = getThresholdPace(event, prSeconds);
  const interval = getIntervalPace(event, prSeconds);
  const repetition = getRepeatPace(event, prSeconds);

  const goalPace =
    (goalSeconds / getEventDistance(event)) / 60;

  return {
    easy: customRecovery || formatPace(easy),
    marathon: formatPace(marathon),
    threshold: formatPace(threshold),
    interval: formatPace(interval),
    goalPace: formatPace(goalPace),
    repetition: formatPace(repetition),
    vdot: Math.round(vdot),

    // UPDATED: Clarify what the number represents.
    notes: `Approximate performance indicator: ${Math.round(vdot)}. Training paces are simplified estimates, not official VDOT prescriptions.`,

    workoutTypes:
      event === 'Marathon' || event === 'Half-Marathon'
        ? [
            "Long tempo runs",
            "Marathon pace runs",
            "Progressive long runs"
          ]
        : [
            "VO2max intervals",
            "Threshold runs",
            "Cruise intervals"
          ]
  };
};

// Get race distance in miles
function getEventDistance(event) {
  const distances = {
    '100m': 0.0621,
    '200m': 0.1243,
    '400m': 0.2485,
    '800m': 0.497,
    '1500m': 0.932,
    'Mile': 1.0,
    '3k': 1.864,
    '5k': 3.107,
    '10k': 6.214,
    'Half-Marathon': 13.109,
    'Marathon': 26.219
  };

  return distances[event] || 1.0;
}

// Get race distance in meters
function getEventMeters(event) {
  const meters = {
    '100m': 100,
    '200m': 200,
    '400m': 400,
    '800m': 800,
    '1500m': 1500,
    'Mile': 1609.34,
    '3k': 3000,
    '5k': 5000,
    '10k': 10000,
    'Half-Marathon': 21097.5,
    'Marathon': 42195
  };

  return meters[event] || 1609.34;
}

// Convert race time to seconds
function timeToSeconds(timeStr) {
  if (!timeStr) return 0;

  const parts = timeStr.split(':').map(Number);

  if (parts.length === 3) {
    return parts[0] * 3600
      + parts[1] * 60
      + parts[2];
  }

  return parts[0] * 60 + parts[1];
}

// UPDATED: Fix rounding so seconds never display as 60.
function formatPace(minutesPerMile) {
  if (!Number.isFinite(minutesPerMile) || minutesPerMile <= 0) {
    return "N/A";
  }

  const totalSeconds = Math.round(minutesPerMile * 60);
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;

  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
