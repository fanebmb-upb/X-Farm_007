export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

type Table<Row, Insert, Update = Partial<Insert>> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

type Timestamped = { created_at: string; updated_at: string };

export type Database = {
  public: {
    Tables: {
      profiles: Table<
        { id: string; display_name: string; created_at: string; updated_at: string },
        { id: string; display_name?: string; created_at?: string; updated_at?: string }
      >;
      farms: Table<
        { id: string; owner_id: string; name: string } & Timestamped,
        { id?: string; owner_id: string; name: string; created_at?: string; updated_at?: string }
      >;
      growing_zones: Table<
        { id: string; farm_id: string; name: string; environment_type: string } & Timestamped,
        { id?: string; farm_id: string; name: string; environment_type?: string; created_at?: string; updated_at?: string }
      >;
      plants: Table<
        { id: string; zone_id: string; local_id: string; name: string; species: string; variety: string; scientific_name: string; planted_on: string | null; growth_stage: string; growth_progress: number; irrigation_interval_hours: number; last_watered_at: string; preferred_conditions: Json } & Timestamped,
        { id?: string; zone_id: string; local_id: string; name: string; species: string; variety?: string; scientific_name?: string; planted_on?: string | null; growth_stage?: string; growth_progress?: number; irrigation_interval_hours?: number; last_watered_at?: string; preferred_conditions?: Json; created_at?: string; updated_at?: string }
      >;
      sensors: Table<
        { id: string; zone_id: string; sensor_key: string; metric: string; display_name: string; unit: string; source: string; active: boolean; created_at: string },
        { id?: string; zone_id: string; sensor_key: string; metric: string; display_name: string; unit: string; source?: string; active?: boolean; created_at?: string }
      >;
      sensor_readings: Table<
        { id: number; zone_id: string; reading_key: string; sensor_id: string; plant_id: string | null; value: number; recorded_at: string; created_at: string },
        { id?: number; zone_id: string; reading_key: string; sensor_id: string; plant_id?: string | null; value: number; recorded_at: string; created_at?: string }
      >;
      simulation_scenarios: Table<
        { id: string; zone_id: string; name: string; configuration: Json; active: boolean } & Timestamped,
        { id?: string; zone_id: string; name: string; configuration?: Json; active?: boolean; created_at?: string; updated_at?: string }
      >;
      automation_rules: Table<
        { id: string; zone_id: string; rule_type: string; enabled: boolean; threshold: number; unit: string; action_configuration: Json } & Timestamped,
        { id?: string; zone_id: string; rule_type: string; enabled?: boolean; threshold: number; unit: string; action_configuration?: Json; created_at?: string; updated_at?: string }
      >;
      automation_events: Table<
        { id: string; zone_id: string; rule_id: string | null; action: string; source: string; outcome: Json; occurred_at: string; created_at: string },
        { id?: string; zone_id: string; rule_id?: string | null; action: string; source: string; outcome?: Json; occurred_at?: string; created_at?: string }
      >;
      alerts: Table<
        { id: string; zone_id: string; plant_id: string | null; title: string; detail: string; severity: string; status: string; raised_at: string; resolved_at: string | null; created_at: string },
        { id?: string; zone_id: string; plant_id?: string | null; title: string; detail?: string; severity?: string; status?: string; raised_at?: string; resolved_at?: string | null; created_at?: string }
      >;
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
