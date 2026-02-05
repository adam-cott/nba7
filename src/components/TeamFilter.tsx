/**
 * TeamFilter Component
 *
 * Dropdown to filter news by NBA team.
 * Includes all 30 NBA teams organized by conference.
 */

'use client';

import { NBA_TEAMS } from '@/lib/constants';

interface TeamFilterProps {
  selectedTeam: string;
  onTeamChange: (team: string) => void;
}

export default function TeamFilter({
  selectedTeam,
  onTeamChange,
}: TeamFilterProps) {
  // Group teams by conference
  const easternTeams = NBA_TEAMS.filter((t) => t.conference === 'Eastern');
  const westernTeams = NBA_TEAMS.filter((t) => t.conference === 'Western');

  return (
    <div className="relative">
      <label
        htmlFor="team-filter"
        className="block text-sm font-medium text-gray-700 mb-1"
      >
        Filter by Team
      </label>
      <select
        id="team-filter"
        value={selectedTeam}
        onChange={(e) => onTeamChange(e.target.value)}
        className="
          w-full md:w-64 px-4 py-2.5
          bg-white border border-gray-300 rounded-lg
          text-gray-900 text-sm
          shadow-sm
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
          cursor-pointer
          appearance-none
        "
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3E%3Cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3E%3C/svg%3E")`,
          backgroundPosition: 'right 0.5rem center',
          backgroundRepeat: 'no-repeat',
          backgroundSize: '1.5em 1.5em',
          paddingRight: '2.5rem',
        }}
      >
        <option value="ALL">All Teams</option>

        <optgroup label="Eastern Conference">
          {easternTeams.map((team) => (
            <option key={team.abbreviation} value={team.abbreviation}>
              {team.city} {team.name}
            </option>
          ))}
        </optgroup>

        <optgroup label="Western Conference">
          {westernTeams.map((team) => (
            <option key={team.abbreviation} value={team.abbreviation}>
              {team.city} {team.name}
            </option>
          ))}
        </optgroup>
      </select>
    </div>
  );
}
