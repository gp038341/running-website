import React, { useState } from 'react';
import { calculateTrainingPaces } from '../utils/vdotCalculator';
import { generateFallbackPlan } from '../utils/planBuilder';
import '../styles/Dashboard.css';
import { normalizePlan } from '../utils/planNormalizer';
import { calculatePlanLengthFromGoal, getStartDateAnchoredToRace, assignDatesToPlan } from '../utils/planScheduler';
import { generateAIRunningPlan } from '../services/aiService';
import PaceTable from '../assets/components/PaceTable';


function downloadPlanAsCSV(plan) {
  if (!plan || !plan.weeks) return;
  let csv = 'Week,Day,Date,Type,Description\n';
  plan.weeks.forEach((week, wi) => {
    week.days.forEach(day => {
      csv += `${week.weekNumber || wi + 1},${day.dayOfWeek},${day.date},${day.type},"${(day.description || '').replace(/"/g, '""')}"\n`;
    });
  });
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', 'training_plan.csv');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

const Dashboard = () => {
  const [plan, setPlan] = useState(null);
  const [paces, setPaces] = useState(null);
  const [loading, setLoading] = useState(false);
  const [currentWeek, setCurrentWeek] = useState(0);
  const [formData, setFormData] = useState({
    name: '',
    event: '5k',
    currentPR: '',
    goalTime: '',
    weeklyMileage: '',
    daysPerWeek: '6',
    workoutDays: '',
    longRunDay: 'Saturday',
    weightRoutine: '',
    recoveryPace: '',
    injuryHistory: '',
    goalDate: '',
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const planLength = calculatePlanLengthFromGoal(formData.goalDate, 4, 20);

      const currentPaces = calculateTrainingPaces(
        formData.event,
        formData.currentPR,
        '',
        formData.recoveryPace
      );

      const targetPaces = formData.goalTime
        ? calculateTrainingPaces(formData.event, formData.currentPR, formData.goalTime, formData.recoveryPace)
        : currentPaces;

      const raw = await generateAIRunningPlan(formData, currentPaces, targetPaces, planLength);
      const basePlan = typeof normalizePlan === 'function' ? normalizePlan(raw) : raw;

      const startDate = getStartDateAnchoredToRace(formData.goalDate, basePlan.weeks.length);

      const datedPlan = assignDatesToPlan(
        { ...basePlan, event: formData.event, goalTime: formData.goalTime },
        startDate.toISOString ? startDate.toISOString() : startDate,
        formData.goalDate,
        formData.longRunDay,
        formData.event
      );

      setPlan(datedPlan);
      setPaces(targetPaces);
    } catch (err) {
      console.error('AI failed, using fallback:', err);

      const planLength = calculatePlanLengthFromGoal(formData.goalDate, 4, 20);
      const currentPaces = calculateTrainingPaces(formData.event, formData.currentPR, '', formData.recoveryPace);
      const targetPaces = formData.goalTime
        ? calculateTrainingPaces(formData.event, formData.currentPR, formData.goalTime, formData.recoveryPace)
        : currentPaces;

      const fallback = generateFallbackPlan({ ...formData, planLength }, currentPaces);
      const startDate = getStartDateAnchoredToRace(formData.goalDate, fallback.weeks.length);
      const datedPlan = assignDatesToPlan(
        { ...fallback, event: formData.event, goalTime: formData.goalTime },
        startDate.toISOString ? startDate.toISOString() : startDate,
        formData.goalDate,
        formData.longRunDay,
        formData.event
      );

      setPlan(datedPlan);
      setPaces(targetPaces);
      alert('AI generation failed. Using a tapered, date-anchored fallback plan.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="dashboard">
        <div className="loader">
          <div className="running-emoji">🏃‍♂️</div>
          <h2>Generating your JBU Training Plan...</h2>
          <p>Analyzing your profile and building a periodized schedule...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <h1>🏃‍♂️ StrideWise - AI Running Coach</h1>
      </header>

      {!plan ? (
        <div className="form-container">
          <div className="form-banner">
            <span role="img" aria-label="eagle" className="eagle-emoji">🦅</span>
            <h2>JBU Golden Eagles Training Plan Builder</h2>
          </div>
          <form onSubmit={handleSubmit} className="runner-form">
            <h2>Build Your Personalized Training Plan</h2>

            <h3 className="form-section">Athlete Info</h3>
            <div className="input-group">
              <label>Runner Name</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="John Doe"
                required
              />
            </div>

            <div className="input-row">
              <div className="input-group">
                <label>Target Event</label>
                <select name="event" value={formData.event} onChange={handleInputChange}>
                  <option value="100m">100m Sprint</option>
                  <option value="200m">200m Sprint</option>
                  <option value="400m">400m</option>
                  <option value="800m">800m</option>
                  <option value="1500m">1500m</option>
                  <option value="Mile">Mile</option>
                  <option value="3k">3000m</option>
                  <option value="5k">5000m</option>
                  <option value="10k">10k</option>
                  <option value="Half-Marathon">Half-Marathon</option>
                  <option value="Marathon">Marathon</option>
                </select>
              </div>

              <div className="input-group">
                <label>Goal Race Date</label>
                <input
                  type="date"
                  name="goalDate"
                  value={formData.goalDate}
                  onChange={handleInputChange}
                  required
                />
              </div>
            </div>

            <div className="input-row">
              <div className="input-group">
                <label>Current PR (mm:ss or hh:mm:ss)</label>
                <input
                  type="text"
                  name="currentPR"
                  value={formData.currentPR}
                  onChange={handleInputChange}
                  placeholder="9:19"
                  required
                />
              </div>

              <div className="input-group">
                <label>Goal Time (mm:ss or hh:mm:ss)</label>
                <input
                  type="text"
                  name="goalTime"
                  value={formData.goalTime}
                  onChange={handleInputChange}
                  placeholder="9:00"
                />
                <small>Leave blank to train for current fitness</small>
              </div>
            </div>

            <h3 className="form-section">Training Preferences</h3>
            <div className="input-row">
              <div className="input-group">
                <label>Current Weekly Mileage</label>
                <input
                  type="number"
                  name="weeklyMileage"
                  value={formData.weeklyMileage}
                  onChange={handleInputChange}
                  placeholder="60"
                  min="10"
                  max="140"
                  required
                />
              </div>

              <div className="input-group">
                <label>Days Running Per Week</label>
                <select name="daysPerWeek" value={formData.daysPerWeek} onChange={handleInputChange}>
                  <option value="3">3 Days</option>
                  <option value="4">4 Days</option>
                  <option value="5">5 Days</option>
                  <option value="6">6 Days</option>
                  <option value="7">7 Days</option>
                </select>
              </div>
            </div>

            <div className="input-row">
              <div className="input-group">
                <label>Workout Days (e.g., Tuesday, Thursday)</label>
                <input
                  type="text"
                  name="workoutDays"
                  value={formData.workoutDays}
                  onChange={handleInputChange}
                  placeholder="Tuesday, Thursday"
                />
              </div>

              <div className="input-group">
                <label>Long Run Day</label>
                <select name="longRunDay" value={formData.longRunDay} onChange={handleInputChange}>
                  <option value="Saturday">Saturday</option>
                  <option value="Sunday">Sunday</option>
                  <option value="Friday">Friday</option>
                </select>
              </div>
            </div>

            <div className="input-group">
              <label>Typical Recovery Pace (min/mile)</label>
              <input
                type="text"
                name="recoveryPace"
                value={formData.recoveryPace}
                onChange={handleInputChange}
                placeholder="7:30"
              />
              <small>Your comfortable, conversational pace</small>
            </div>

            <h3 className="form-section">Other Details</h3>
            <div className="input-group">
              <label>Weight/Strength Routine</label>
              <textarea
                name="weightRoutine"
                value={formData.weightRoutine}
                onChange={handleInputChange}
                placeholder="e.g., Heavy lifting Mon/Thu after workouts, core 3x/week"
                rows="3"
              />
              <small>Describe your current lifting schedule and preferences</small>
            </div>

            <div className="input-group">
              <label>Injury History / Limitations (Optional)</label>
              <textarea
                name="injuryHistory"
                value={formData.injuryHistory}
                onChange={handleInputChange}
                placeholder="e.g., Previous shin splints, avoid back-to-back hard days"
                rows="3"
              />
            </div>

            <button type="submit" className="btn-generate">
              🚀 Generate Custom {formData.event} Plan
            </button>
          </form>
        </div>
      ) : (
        <div className="plan-view">
          <div className="plan-header">
            <h2>{formData.name}'s {formData.event} Training Plan</h2>
            <button onClick={() => setPlan(null)} className="btn-reset">
              ← Start Over
            </button>
          </div>
          <button className="btn-download" onClick={() => downloadPlanAsCSV(plan)}>
            Download Plan as CSV
          </button>

          {paces && <PaceTable paces={paces} />}

          <div className="week-navigator">
            <button 
              onClick={() => setCurrentWeek(Math.max(0, currentWeek - 1))}
              disabled={currentWeek === 0}
            >
              ← Previous Week
            </button>
            <span className="week-display">
              Week {currentWeek + 1} of {plan.weeks.length} - {plan.weeks[currentWeek].phase} Phase
            </span>
            <button 
              onClick={() => setCurrentWeek(Math.min(plan.weeks.length - 1, currentWeek + 1))}
              disabled={currentWeek === plan.weeks.length - 1}
            >
              Next Week →
            </button>
          </div>

          <div className="week-details">
            <h3>Week {plan.weeks[currentWeek].weekNumber}</h3>
            <p className="phase-badge">{plan.weeks[currentWeek].phase}</p>
            <p className="mileage-target">
              Target Mileage: {plan.weeks[currentWeek].totalMileage} miles
            </p>
            {plan.weeks[currentWeek].weightNotes && (
              <p className="weight-notes">
                💪 Strength: {plan.weeks[currentWeek].weightNotes}
              </p>
            )}

            <div className="days-grid">
              {plan.weeks[currentWeek].days.map((day, idx) => (
                <div key={idx} className={`day-card ${day.type.toLowerCase()}`}>
                  <div className="day-header">
                    <span className="day-name">{day.dayOfWeek} • {new Date(day.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                    <span className="day-type">{day.type}</span>
                  </div>
                  <p className="day-description">{day.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;