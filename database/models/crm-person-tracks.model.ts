export const CrmPersonTracks = {
  name: 'crm_person_tracks',
  description: 'Links people to their relationship tracks and tracks their current stage',
  columns: {
    id: {
      type: 'uuid',
      primaryKey: true,
      defaultValue: 'uuid_generate_v4()',
    },
    person_id: {
      type: 'uuid',
      references: 'crm_people(id)',
      onDelete: 'CASCADE',
      notNull: true,
    },
    track_id: {
      type: 'uuid',
      references: 'crm_tracks(id)',
      onDelete: 'CASCADE',
      notNull: true,
    },
    current_stage_id: {
      type: 'uuid',
      references: 'crm_stages(id)',
      onDelete: 'SET NULL',
    },
    started_at: {
      type: 'timestamptz',
      defaultValue: 'NOW()',
    },
    last_progress_at: {
      type: 'timestamptz',
      defaultValue: 'NOW()',
    },
  },
  indexes: [
    {
      name: 'crm_person_tracks_person_id_idx',
      columns: ['person_id'],
    },
    {
      name: 'crm_person_tracks_person_id_track_id_key',
      columns: ['person_id', 'track_id'],
      unique: true,
    },
  ],
  policies: [
    {
      name: 'Users can manage their own person tracks',
      using: 'person_id IN (SELECT id FROM crm_people WHERE user_id = auth.uid())',
      check: 'person_id IN (SELECT id FROM crm_people WHERE user_id = auth.uid())',
      operation: 'ALL',
    },
  ],
}; 