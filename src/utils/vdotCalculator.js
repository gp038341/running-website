/**
 * Enhanced pace calculator supporting 100m to Marathon
 * Uses Jack Daniels' VDOT formulas for accurate training paces.
 */

import { get } from "express/lib/response";

// Estimate 5k time from 1500m PR (conservative, matches VDOT calculator logic)
function estimate5kFrom1500m(prSeconds) {
  // 1500m to 5k: multiply by 3.5 (empirical, matches VDOT calculator)
  return prSeconds * 3.5;
}

// Estimate 5k time from Mile PR
function estimate5kFromMile(prSeconds) {
  // Mile to 5k: multiply by 3.1 (empirical)
  return prSeconds * 3.1;
}

// Calculate threshold pace in seconds per mile
function getThresholdPace(event, prSeconds) {
  let thresholdPaceSec;

  if (event === '1500m') {
    const est5kSec = estimate5kFrom1500m(prSeconds);
    const pace5k = est5kSec / 3.107; // seconds per mile
    thresholdPaceSec = pace5k / 0.90; // threshold ≈ 97% of 5k pace
  } else if (event === 'Mile') {
    const est5kSec = estimate5kFromMile(prSeconds);
    const pace5k = est5kSec / 3.107;
    thresholdPaceSec = pace5k / 0.90;
  } else if (event === '800m') {
    // 800m to 5k: multiply by 6.8
    const est5kSec = prSeconds * 6.8;
    const pace5k = est5kSec / 3.107;
    thresholdPaceSec = pace5k / 0.90;
  } else if (event === '3k' || event === '5k' || event === '10k') {
    // For 3k/5k/10k, threshold ≈ 97% of race pace
    const pace = prSeconds / getEventDistance(event); // seconds per mile
    thresholdPaceSec = pace / 0.90;
  } else {
    // For longer events, threshold ≈ 95% of race pace
    const pace = prSeconds / getEventDistance(event);
    thresholdPaceSec = pace / 0.90;
  }
  return thresholdPaceSec / 60; // convert to minutes per mile
}


// Calculate interval pace in seconds per mile
function getIntervalPace(event, prSeconds) {
  let intervalPaceSec;

  if (event === '1500m') {
    const est5kSec = estimate5kFrom1500m(prSeconds);
    const pace5k = est5kSec / 3.107; // seconds per mile
    intervalPaceSec = pace5k; // interval ≈ 97% of 5k pace
  } else if (event === 'Mile') {
    const est5kSec = estimate5kFromMile(prSeconds);
    const pace5k = est5kSec / 3.107;
    intervalPaceSec = pace5k;
  } else if (event === '800m') {
    // 800m to 5k: multiply by 6.8
    const est5kSec = prSeconds * 6.8;
    const pace5k = est5kSec / 3.107;
    intervalPaceSec = pace5k;
  } else if (event === '3k' || event === '5k' || event === '10k') {
    // For 3k/5k/10k, interval ≈ 97% of race pace
    const pace = prSeconds / getEventDistance(event); // seconds per mile
    intervalPaceSec = pace;
  } else {
    // For longer events, interval ≈ 95% of race pace
    const pace = prSeconds / getEventDistance(event);
    intervalPaceSec = pace;
  }
  return intervalPaceSec / 60; // convert to minutes per mile
}

// Calculate repeat pace in seconds per mile
function getRepeatPace(event, prSeconds) {
  let repeatPaceSec;

  if (event === '1500m') {
    const est5kSec = estimate5kFrom1500m(prSeconds);
    const pace5k = est5kSec / 3.107; // seconds per mile
    repeatPaceSec = pace5k * 41.1; // interval ≈ 97% of 5k pace
  } else if (event === 'Mile') {
    const est5kSec = estimate5kFromMile(prSeconds);
    const pace5k = est5kSec / 3.107;
    repeatPaceSec = pace5k * 1.1;
  } else if (event === '800m') {
    // 800m to 5k: multiply by 6.8
    const est5kSec = prSeconds * 6.8;
    const pace5k = est5kSec / 3.107;
    repeatPaceSec = pace5k * 1.1;
  } else if (event === '3k' || event === '5k' || event === '10k') {
    // For 3k/5k/10k, interval ≈ 97% of race pace
    const pace = prSeconds / getEventDistance(event); // seconds per mile
    repeatPaceSec = pace * 1.1;
  } else {
    // For longer events, interval ≈ 95% of race pace
    const pace = prSeconds / getEventDistance(event);
    repeatPaceSec = pace * 1.1;
  }
  return repeatPaceSec / 60; // convert to minutes per mile
}

// Calculate marathon pace in seconds per mile
function getMarathonPace(event, prSeconds) {
  let marathonPaceSec;

  if (event === '1500m') {
    const est5kSec = estimate5kFrom1500m(prSeconds);
    const pace5k = est5kSec / 3.107; // seconds per mile
    marathonPaceSec = pace5k / 0.8; // marathon pace ≈ 80% of 5k pace
  } else if (event === 'Mile') {
    const est5kSec = estimate5kFromMile(prSeconds);
    const pace5k = est5kSec / 3.107;
    marathonPaceSec = pace5k / 0.8; // marathon pace ≈ 80% of 5k pace
  } else if (event === '800m') {
    // 800m to 5k: multiply by 6.8
    const est5kSec = prSeconds * 6.8;
    const pace5k = est5kSec / 3.107;
    marathonPaceSec = pace5k / 0.8; // marathon pace ≈ 80% of 5k pace
  } else if (event === '3k' || event === '5k' || event === '10k') {
    // For 3k/5k/10k, interval ≈ 97% of race pace
    const pace = prSeconds / getEventDistance(event); // seconds per mile
    marathonPaceSec = pace / 0.8; // marathon
  } else {
    // For longer events, interval ≈ 95% of race pace
    const pace = prSeconds / getEventDistance(event);
    marathonPaceSec = pace / 0.8; // marathon pace
  }
  return marathonPaceSec / 60; // convert to minutes per mile
}

export const calculateTrainingPaces = (event, prTime, goalTime, customRecovery) => {
  const prSeconds = timeToSeconds(prTime);
  const goalSeconds = goalTime ? timeToSeconds(goalTime) : prSeconds;

  // Distance in meters for VDOT calculation
  const eventMeters = getEventMeters(event);

  // Calculate VDOT using Jack Daniels' formula (meters/min)
  const velocity = eventMeters / (prSeconds / 60); // meters per minute
  const vdot = (0.182258 * velocity) + (0.000104 * velocity * velocity) + 3.5;

  // Calculate paces in min/mile using VDOT formulas
  const easy = 1609.34 / (vdot * 0.7);        // min/mile
  const marathon = getMarathonPace(event, prSeconds);
  const threshold = getThresholdPace(event, prSeconds);
  const interval = getIntervalPace(event, prSeconds);
  const repetition = getRepeatPace(event, prSeconds);
  const goalPace = (goalSeconds / getEventDistance(event)) / 60; // min/mile

  return {
    easy: customRecovery || formatPace(easy),
    marathon: formatPace(marathon),
    threshold: formatPace(threshold),
    interval: formatPace(interval),
    goalPace: formatPace(goalPace),
    repetition: formatPace(repetition),
    vdot: Math.round(vdot),
    notes: `VDOT: ${Math.round(vdot)}. Paces calculated using Jack Daniels' formulas.`,
    workoutTypes: event === 'Marathon' || event === 'Half-Marathon'
      ? ["Long tempo runs", "Marathon pace runs", "Progressive long runs"]
      : ["VO2max intervals", "Threshold runs", "Cruise intervals"]
  };
};

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

function timeToSeconds(timeStr) {
  if (!timeStr) return 0;
  const parts = timeStr.split(':').map(Number);
  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }
  return parts[0] * 60 + parts[1];
}

function formatPace(minutesPerMile) {
  if (isNaN(minutesPerMile)) return "N/A";
  const mins = Math.floor(minutesPerMile);
  const secs = Math.round((minutesPerMile - mins) * 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}