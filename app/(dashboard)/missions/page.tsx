'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

import { AssistantChat } from '../../../components/AssistantChat';
import { useDashboardContext } from '../../../components/DashboardContext';
import { MissionForm } from '../../../components/MissionForm';
import { api, Mission } from '../../../lib/api';

function missionStatusLabel(status?: string) {
  switch ((status || '').toLowerCase()) {
    case 'paused':
      return 'Paused';
    case 'completed':
      return 'Completed';
    default:
      return 'Active';
  }
}

function formatLastMatch(value?: string) {
  if (!value) return 'No matches yet';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'No matches yet';
  if (date.getUTCFullYear() < 2005) return 'No matches yet';
  return `Last match ${date.toLocaleString()}`;
}

export default function MissionsPage() {
  const router = useRouter();
  const {
    missions,
    refreshMissions,
    setActiveMission,
    activeMissionId,
    refreshShortlist,
    searches,
  } = useDashboardContext();
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [showAssistant, setShowAssistant] = useState(false);
  const [editingMission, setEditingMission] = useState<Mission | null>(null);
  const [updatingID, setUpdatingID] = useState<number | null>(null);

  async function updateMissionStatus(
    mission: Mission,
    nextStatus: 'active' | 'paused' | 'completed',
  ) {
    if (!mission.ID) return;
    setError('');
    setUpdatingID(mission.ID);
    try {
      await api.missions.updateStatus(mission.ID, nextStatus);
      await refreshMissions();
      if (nextStatus === 'active') setActiveMission(mission.ID);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update mission status');
    } finally {
      setUpdatingID(null);
    }
  }

  async function deleteMission(mission: Mission) {
    if (!mission.ID) return;
    const confirmed = window.confirm(
      `Delete mission "${mission.Name}"? This removes its searches, matches, and saved items.`,
    );
    if (!confirmed) return;
    setError('');
    setUpdatingID(mission.ID);
    try {
      await api.missions.delete(mission.ID);
      if (activeMissionId === mission.ID) setActiveMission(0);
      await refreshMissions();
      await refreshShortlist();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete mission');
    } finally {
      setUpdatingID(null);
    }
  }

  async function quickEditMission(mission: Mission) {
    setEditingMission(mission);
    setShowAssistant(false);
    setShowForm(true);
  }

  return (
    <div className="page-stack">
      <section className="hero-panel compact">
        <div>
          <p className="section-kicker">Buy missions</p>
          <h2>Define one mission, keep all actions in context</h2>
          <p className="hero-copy">
            Missions connect your intent, monitors, matches, saved items, and seller outreach into
            one loop.
          </p>
        </div>
        <div className="hero-actions">
          <button
            type="button"
            className="btn-secondary"
            onClick={() => {
              setEditingMission(null);
              setShowAssistant(false);
              setShowForm((value) => !value);
            }}
          >
            {showForm && !editingMission ? 'Hide form' : 'Structured form'}
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={() => {
              setEditingMission(null);
              setShowForm(false);
              setShowAssistant((value) => !value);
            }}
          >
            {showAssistant ? 'Hide assistant' : 'Describe what you want'}
          </button>
        </div>
      </section>

      {error && <div className="error-msg">{error}</div>}

      {showForm && (
        <MissionForm
          initialMission={editingMission}
          onSaved={async (mission) => {
            await refreshMissions();
            if (mission.ID) setActiveMission(mission.ID);
            setShowForm(false);
            setEditingMission(null);
            if (!editingMission?.ID) {
              router.push('/matches');
            }
          }}
          onCancel={() => {
            setShowForm(false);
            setEditingMission(null);
          }}
        />
      )}

      {showAssistant && (
        <AssistantChat
          embedded
          onMissionCreated={async (mission) => {
            await refreshMissions();
            if (mission.ID) setActiveMission(mission.ID);
            router.push('/matches');
          }}
        />
      )}

      {missions.length === 0 ? (
        <div className="surface-panel empty-state">
          <h3>Start your first buy mission</h3>
          <p>
            Use the structured form or describe your goal in plain language. Creating a mission
            starts monitoring immediately.
          </p>
        </div>
      ) : (
        <div className="search-card-list">
          {missions.map((mission) => {
            const status = (mission.Status || 'active') as 'active' | 'paused' | 'completed';
            const isUpdating = updatingID === mission.ID;
            const variantQueries = Array.from(
              new Set(
                (searches ?? [])
                  .filter((s) => s.ProfileID === mission.ID && s.Enabled)
                  .map((s) => s.Query.trim())
                  .filter((q) => q.length > 0),
              ),
            );
            return (
              <article key={mission.ID} className="search-card saved">
                <div className="search-card-header">
                  <div>
                    <h3>{mission.Name}</h3>
                    <p>{mission.TargetQuery || 'No query set'}</p>
                  </div>
                  <span className={`status-pill${status === 'active' ? ' on' : ''}`}>
                    {missionStatusLabel(status)}
                  </span>
                </div>
                {variantQueries.length > 0 && (
                  <div
                    className="mission-variants-chips"
                    data-testid="mission-variants-chips"
                    aria-label="Search variants for this mission"
                  >
                    <span className="variants-label">Searching:</span>
                    {variantQueries.map((q) => (
                      <span key={q} className="variant-chip">
                        {q}
                      </span>
                    ))}
                  </div>
                )}
                <p className="search-card-copy">
                  {mission.MatchCount ?? 0} matches · {formatLastMatch(mission.LastMatchAt)}
                </p>
                <div className="search-card-actions">
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={() => {
                      if (mission.ID) {
                        setActiveMission(mission.ID);
                        router.push('/matches');
                      }
                    }}
                    disabled={isUpdating}
                  >
                    View matches
                  </button>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() =>
                      void updateMissionStatus(mission, status === 'active' ? 'paused' : 'active')
                    }
                    disabled={isUpdating || !mission.ID}
                  >
                    {status === 'active' ? 'Pause' : 'Resume'}
                  </button>
                  <button
                    type="button"
                    className="btn-ghost"
                    onClick={() => void quickEditMission(mission)}
                    disabled={isUpdating || !mission.ID}
                  >
                    Edit
                  </button>
                  {status !== 'completed' && (
                    <button
                      type="button"
                      className="btn-ghost"
                      onClick={() => void updateMissionStatus(mission, 'completed')}
                      disabled={isUpdating || !mission.ID}
                    >
                      Complete
                    </button>
                  )}
                  <button
                    type="button"
                    className="btn-secondary danger"
                    onClick={() => void deleteMission(mission)}
                    disabled={isUpdating || !mission.ID}
                  >
                    Delete
                  </button>
                  {activeMissionId === mission.ID && (
                    <span className="success-badge">Active context</span>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
