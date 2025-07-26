-- Add unique constraints to CRM tables

-- Track names should be unique per user
ALTER TABLE crm_tracks
ADD CONSTRAINT crm_tracks_name_user_id_key UNIQUE (name, user_id);

-- Stage names should be unique within a track
ALTER TABLE crm_stages
ADD CONSTRAINT crm_stages_name_track_id_key UNIQUE (name, track_id);

-- A person can only be in a track once
ALTER TABLE crm_person_tracks
ADD CONSTRAINT crm_person_tracks_person_id_track_id_key UNIQUE (person_id, track_id); 