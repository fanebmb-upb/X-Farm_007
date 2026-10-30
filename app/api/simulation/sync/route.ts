import { NextResponse, type NextRequest } from "next/server";
import { defaultAutomationState, sensorDefinitions, speciesProfiles, ZONE_ID, type AutomationState, type FarmAlert, type FarmEvent, type Plant, type PlantTargets, type SensorReading, type SimulationState } from "@/lib/mock-data";
import { getAlerts, isPersistableAutomationState, parseSimulationState, validateAutomationRules, validatePlantDraft } from "@/lib/simulation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/supabase/database.types";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isPersistableAlert(value: unknown): value is FarmAlert {
  return isRecord(value)
    && typeof value.id === "string" && value.id.length > 0 && value.id.length <= 120
    && (value.plantId === null || (typeof value.plantId === "string" && value.plantId.length <= 100))
    && typeof value.title === "string" && value.title.length > 0 && value.title.length <= 160
    && typeof value.detail === "string" && value.detail.length <= 500
    && (value.tone === "info" || value.tone === "warning");
}

function automationRulesFromRows(rows: Array<{ rule_type: string; enabled: boolean; threshold: number }>) {
  const rules = structuredClone(defaultAutomationState.rules);
  for (const row of rows) {
    if (row.rule_type === "irrigation") rules.irrigation = { enabled: row.enabled, thresholdPercent: Number(row.threshold) };
    if (row.rule_type === "ventilation") rules.ventilation = { enabled: row.enabled, maximumTemperatureC: Number(row.threshold) };
    if (row.rule_type === "lighting") rules.lighting = { enabled: row.enabled, targetPpfd: Number(row.threshold) };
  }
  try {
    validateAutomationRules(rules);
    return rules;
  } catch {
    return structuredClone(defaultAutomationState.rules);
  }
}

function eventFromRow(row: { client_event_id: string | null; action: string; outcome: unknown; occurred_at: string }): FarmEvent | null {
  if (!row.client_event_id || !isRecord(row.outcome)) return null;
  if (typeof row.outcome.detail !== "string" || !["water", "light", "air", "growth"].includes(String(row.outcome.kind))) return null;
  return { id: row.client_event_id, time: row.occurred_at, event: row.action, detail: row.outcome.detail, kind: row.outcome.kind as FarmEvent["kind"] };
}

function eventSource(event: FarmEvent) {
  return /manual|rules updated|returned to automatic/i.test(`${event.event} ${event.detail}`) ? "manual" as const : "automatic" as const;
}

function ruleTypeForEvent(event: FarmEvent, source: "manual" | "automatic") {
  if (source === "manual") return null;
  if (event.kind === "water") return "irrigation";
  if (event.kind === "air") return "ventilation";
  if (event.kind === "light") return "lighting";
  return null;
}

function badRequest(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

function isPlantTargets(value: Json): value is PlantTargets {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  return (["soil-moisture", "air-temperature", "humidity", "light"] as const).every((metric) => {
    const range = value[metric];
    return typeof range === "object" && range !== null && !Array.isArray(range) && typeof range.min === "number" && Number.isFinite(range.min) && typeof range.max === "number" && Number.isFinite(range.max) && range.min < range.max;
  });
}

async function authenticatedUserId(supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>) {
  const { data, error } = await supabase.auth.getClaims();
  return !error && typeof data?.claims.sub === "string" ? data.claims.sub : null;
}

async function findOrCreateFarmAndZone(supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>, userId: string) {
  const { data: farms, error: farmError } = await supabase.from("farms").select("id").eq("owner_id", userId).order("created_at").limit(1);
  if (farmError) throw farmError;
  let farmId = farms[0]?.id;
  if (!farmId) {
    const { data, error } = await supabase.from("farms").insert({ owner_id: userId, name: "My Farm" }).select("id").single();
    if (error) throw error;
    farmId = data.id;
  }
  const { data: zones, error: zoneError } = await supabase.from("growing_zones").select("id").eq("farm_id", farmId).eq("name", "Greenhouse A").limit(1);
  if (zoneError) throw zoneError;
  let zoneId = zones[0]?.id;
  if (!zoneId) {
    const { data, error } = await supabase.from("growing_zones").insert({ farm_id: farmId, name: "Greenhouse A", environment_type: "greenhouse" }).select("id").single();
    if (error) throw error;
    zoneId = data.id;
  }
  return { farmId, zoneId };
}

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const userId = await authenticatedUserId(supabase);
  if (!userId) return badRequest("Authentication required.", 401);

  try {
    const { data: farms, error: farmError } = await supabase.from("farms").select("id").eq("owner_id", userId).order("created_at").limit(1);
    if (farmError) throw farmError;
    const farmId = farms[0]?.id;
    if (!farmId) return badRequest("No saved farm snapshot was found.", 404);
    const { data: zones, error: zoneError } = await supabase.from("growing_zones").select("id").eq("farm_id", farmId).eq("name", "Greenhouse A").limit(1);
    if (zoneError) throw zoneError;
    const zoneId = zones[0]?.id;
    if (!zoneId) return badRequest("No saved farm snapshot was found.", 404);

    const [plantResult, sensorResult, ruleResult, scenarioResult, eventResult, alertResult] = await Promise.all([
      supabase.from("plants").select("id,local_id,name,species,variety,scientific_name,planted_on,growth_stage,growth_progress,irrigation_interval_hours,last_watered_at,preferred_conditions").eq("zone_id", zoneId),
      supabase.from("sensors").select("id,sensor_key,metric,display_name,unit").eq("zone_id", zoneId),
      supabase.from("automation_rules").select("rule_type,enabled,threshold").eq("zone_id", zoneId),
      supabase.from("simulation_scenarios").select("configuration").eq("zone_id", zoneId).eq("snapshot_key", "active-automation").maybeSingle(),
      supabase.from("automation_events").select("client_event_id,action,outcome,occurred_at").eq("zone_id", zoneId).not("client_event_id", "is", null).order("occurred_at", { ascending: false }).limit(100),
      supabase.from("alerts").select("alert_key").eq("zone_id", zoneId).eq("status", "open").not("alert_key", "is", null),
    ]);
    if (plantResult.error) throw plantResult.error;
    if (sensorResult.error) throw sensorResult.error;
    if (ruleResult.error) throw ruleResult.error;
    if (scenarioResult.error) throw scenarioResult.error;
    if (eventResult.error) throw eventResult.error;
    if (alertResult.error) throw alertResult.error;
    const plantIds = new Map(plantResult.data.map((plant) => [plant.id, plant.local_id]));
    const localPlants: Plant[] = plantResult.data.map((row) => {
      const speciesId = row.species in speciesProfiles ? row.species as Plant["speciesId"] : "custom";
      const targetConditions = isPlantTargets(row.preferred_conditions) ? row.preferred_conditions : structuredClone(speciesProfiles[speciesId].targets);
      const stage = ["Seedling", "Vegetative", "Flowering", "Fruiting", "Harvest"].find((item) => item.toLowerCase() === row.growth_stage) ?? "Seedling";
      return { id: row.local_id, name: row.name, speciesId, scientificName: row.scientific_name || speciesProfiles[speciesId].scientificName, variety: row.variety, plantingDate: row.planted_on ?? new Date().toISOString().slice(0, 10), stage: stage as Plant["stage"], growthProgress: Number(row.growth_progress), irrigationIntervalHours: row.irrigation_interval_hours, targetConditions, lastWateredAt: row.last_watered_at };
    });
    const validMetrics = new Set<string>([...sensorDefinitions.map((sensor) => sensor.metric), "growth-progress"]);
    const histories = await Promise.all(sensorResult.data.map(async (sensor) => {
      const { data, error } = await supabase.from("sensor_readings").select("sensor_id,plant_id,value,recorded_at").eq("zone_id", zoneId).eq("sensor_id", sensor.id).order("recorded_at", { ascending: false }).range(0, 720);
      if (error) throw error;
      return (data ?? []).reverse().map((row) => ({ sensor, row }));
    }));
    const history: Record<string, SensorReading[]> = {};
    for (const record of histories.flat()) {
      const metric = record.sensor.metric;
      if (!validMetrics.has(metric) || !Number.isFinite(record.row.value)) continue;
      const range = metric === "growth-progress" ? { min: 0, max: 100 } : sensorDefinitions.find((item) => item.metric === metric)?.targetRange ?? { min: 0, max: 100 };
      const reading: SensorReading = {
        sensorId: record.sensor.sensor_key,
        metric: metric as SensorReading["metric"],
        name: record.sensor.display_name,
        value: Number(record.row.value),
        unit: record.sensor.unit,
        targetRange: range,
        timestamp: record.row.recorded_at,
        zoneId: ZONE_ID,
        plantId: record.row.plant_id ? plantIds.get(record.row.plant_id) ?? null : null,
        status: record.row.value < range.min || record.row.value > range.max ? "watch" : "normal",
      };
      (history[reading.sensorId] ??= []).push(reading);
    }
    const readings = Object.values(history).map((series) => series[series.length - 1]);
    const currentTime = readings.reduce((latest, reading) => Date.parse(reading.timestamp) > Date.parse(latest) ? reading.timestamp : latest, readings[0]?.timestamp ?? new Date().toISOString());
    const plants = localPlants.map((plant) => {
      const growth = readings.find((reading) => reading.sensorId === `virtual-growth-${plant.id}`);
      return growth ? { ...plant, growthProgress: growth.value } : plant;
    });
    const configuration = scenarioResult.data?.configuration;
    const savedAutomation = isRecord(configuration) ? configuration.automation : undefined;
    const savedRules = automationRulesFromRows(ruleResult.data);
    const automation: AutomationState = isPersistableAutomationState(savedAutomation)
      ? { ...savedAutomation, rules: savedRules }
      : { ...structuredClone(defaultAutomationState), rules: savedRules };
    const events = eventResult.data.map(eventFromRow).filter((event): event is FarmEvent => event !== null);
    const simulation: SimulationState = { version: 2, zoneId: ZONE_ID, currentTime, plants, readings, history, events, automation };
    return NextResponse.json({ simulation, activeAlerts: alertResult.data.length, automationRules: ruleResult.data.length });
  } catch {
    return badRequest("The saved farm snapshot could not be loaded.", 500);
  }
}

export async function POST(request: NextRequest) {
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > 1_000_000) return badRequest("The simulation snapshot is too large.", 413);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return badRequest("Send a valid JSON simulation snapshot.");
  }
  if (!isRecord(body) || typeof body.currentTime !== "string" || !Number.isFinite(Date.parse(body.currentTime))) return badRequest("The simulation timestamp is invalid.");
  if (!Array.isArray(body.plants) || body.plants.length > 100) return badRequest("The plant profiles are invalid.");
  if (!Array.isArray(body.readings) || body.readings.length > 120) return badRequest("The sensor readings are invalid.");
  const events = body.events ?? [];
  const automation = body.automation ?? structuredClone(defaultAutomationState);
  const simulation = parseSimulationState(JSON.stringify({ version: 2, zoneId: ZONE_ID, currentTime: body.currentTime, plants: body.plants, readings: body.readings, history: {}, events, automation }));
  if (!simulation) return badRequest("The plants, readings, automation settings, or event history are invalid.");
  const plants = simulation.plants;
  const readings = simulation.readings;
  if (new Set(simulation.events.map((event) => event.id)).size !== simulation.events.length) return badRequest("Automation event identifiers must be unique.");
  const alertValues: unknown = body.alerts === undefined ? getAlerts(simulation) : body.alerts;
  if (!Array.isArray(alertValues) || alertValues.length > 250 || !alertValues.every(isPersistableAlert)) return badRequest("The active alerts are invalid.");
  const alerts = alertValues;
  if (new Set(alerts.map((alert) => alert.id)).size !== alerts.length || alerts.some((alert) => alert.plantId !== null && !plants.some((plant) => plant.id === alert.plantId))) return badRequest("Alert identifiers and plant references must be valid.");
  const acceptedMetrics = new Set<string>([...sensorDefinitions.map((sensor) => sensor.metric), "growth-progress"]);
  if (new Set(plants.map((plant) => plant.id)).size !== plants.length) return badRequest("Plant identifiers must be unique.");
  if (new Set(readings.map((reading) => reading.sensorId)).size !== readings.length || readings.some((reading) => !acceptedMetrics.has(reading.metric) || (reading.metric === "growth-progress" && reading.plantId === null) || reading.timestamp !== body.currentTime || (reading.plantId !== null && !plants.some((plant) => plant.id === reading.plantId)))) return badRequest("Sensor readings must match this snapshot, metric list, and its plants.");
  try {
    for (const plant of plants) validatePlantDraft(plant, body.currentTime);
    validateAutomationRules(simulation.automation.rules);
  } catch (reason) {
    return badRequest(reason instanceof Error ? reason.message : "A plant profile is invalid.");
  }

  const supabase = await createSupabaseServerClient();
  const { data, error: claimError } = await supabase.auth.getClaims();
  const userId = !claimError && typeof data?.claims.sub === "string" ? data.claims.sub : null;
  if (!userId) return badRequest("Authentication required.", 401);

  try {
    const { error: profileError } = await supabase.from("profiles").upsert({ id: userId });
    if (profileError) throw profileError;

    const { zoneId } = await findOrCreateFarmAndZone(supabase, userId);

    const plantRows = plants.map((plant) => ({
      zone_id: zoneId,
      local_id: plant.id,
      name: plant.name,
      species: plant.speciesId,
      variety: plant.variety,
      scientific_name: plant.scientificName,
      planted_on: plant.plantingDate,
      growth_stage: plant.stage.toLowerCase(),
      growth_progress: plant.growthProgress,
      irrigation_interval_hours: plant.irrigationIntervalHours,
      last_watered_at: plant.lastWateredAt,
      preferred_conditions: plant.targetConditions as unknown as Json,
      updated_at: new Date().toISOString(),
    }));
    const savedPlants = plantRows.length ? await supabase.from("plants").upsert(plantRows, { onConflict: "zone_id,local_id" }).select("id,local_id") : { data: [], error: null };
    if (savedPlants.error) throw savedPlants.error;
    const plantIds = new Map(savedPlants.data.map((plant) => [plant.local_id, plant.id]));

    const sensorRows = readings.map((reading) => ({ zone_id: zoneId, sensor_key: reading.sensorId, metric: reading.metric, display_name: reading.name, unit: reading.unit, source: "virtual", active: true }));
    const savedSensors = sensorRows.length ? await supabase.from("sensors").upsert(sensorRows, { onConflict: "zone_id,sensor_key" }).select("id,sensor_key") : { data: [], error: null };
    if (savedSensors.error) throw savedSensors.error;
    const sensorIds = new Map(savedSensors.data.map((sensor) => [sensor.sensor_key, sensor.id]));
    if (readings.some((reading) => !sensorIds.has(reading.sensorId) || (reading.plantId !== null && !plantIds.has(reading.plantId)))) {
      return badRequest("Could not associate every reading with its virtual sensor and plant.");
    }

    const readingRows = readings.map((reading) => ({
      zone_id: zoneId,
      reading_key: `${reading.sensorId}@${reading.timestamp}@${reading.plantId ?? "zone"}`,
      sensor_id: sensorIds.get(reading.sensorId) as string,
      plant_id: reading.plantId ? plantIds.get(reading.plantId) ?? null : null,
      value: reading.value,
      recorded_at: reading.timestamp,
    }));
    if (readingRows.length) {
      const savedReadings = await supabase.from("sensor_readings").upsert(readingRows, { onConflict: "zone_id,reading_key", ignoreDuplicates: true });
      if (savedReadings.error) throw savedReadings.error;
    }

    const rules = simulation.automation.rules;
    const ruleRows = [
      { zone_id: zoneId, rule_type: "irrigation", enabled: rules.irrigation.enabled, threshold: rules.irrigation.thresholdPercent, unit: "%", action_configuration: {} },
      { zone_id: zoneId, rule_type: "ventilation", enabled: rules.ventilation.enabled, threshold: rules.ventilation.maximumTemperatureC, unit: "°C", action_configuration: {} },
      { zone_id: zoneId, rule_type: "lighting", enabled: rules.lighting.enabled, threshold: rules.lighting.targetPpfd, unit: "µmol/m²/s", action_configuration: {} },
    ];
    const savedRules = await supabase.from("automation_rules").upsert(ruleRows, { onConflict: "zone_id,rule_type" }).select("id,rule_type");
    if (savedRules.error) throw savedRules.error;
    const ruleIds = new Map(savedRules.data.map((rule) => [rule.rule_type, rule.id]));

    const savedScenario = await supabase.from("simulation_scenarios").upsert({
      zone_id: zoneId,
      snapshot_key: "active-automation",
      name: "X_Farm active automation",
      configuration: { automation: simulation.automation } as unknown as Json,
      active: true,
      updated_at: new Date().toISOString(),
    }, { onConflict: "zone_id,snapshot_key" });
    if (savedScenario.error) throw savedScenario.error;

    const eventRows = simulation.events.map((event) => {
      const source = eventSource(event);
      const ruleType = ruleTypeForEvent(event, source);
      return {
        zone_id: zoneId,
        client_event_id: event.id,
        rule_id: ruleType ? ruleIds.get(ruleType) ?? null : null,
        action: event.event,
        source,
        outcome: { detail: event.detail, kind: event.kind } as unknown as Json,
        occurred_at: event.time,
      };
    });
    if (eventRows.length) {
      const savedEvents = await supabase.from("automation_events").upsert(eventRows, { onConflict: "zone_id,client_event_id", ignoreDuplicates: true });
      if (savedEvents.error) throw savedEvents.error;
    }

    const alertResult = await supabase.from("alerts").select("id,alert_key").eq("zone_id", zoneId).eq("status", "open").not("alert_key", "is", null);
    if (alertResult.error) throw alertResult.error;
    const currentAlertKeys = new Set(alerts.map((alert) => alert.id));
    const resolvedAlertIds = alertResult.data.filter((alert) => alert.alert_key !== null && !currentAlertKeys.has(alert.alert_key)).map((alert) => alert.id);
    if (resolvedAlertIds.length) {
      const resolved = await supabase.from("alerts").update({ status: "resolved", resolved_at: simulation.currentTime }).eq("zone_id", zoneId).in("id", resolvedAlertIds);
      if (resolved.error) throw resolved.error;
    }
    const alertRows = alerts.map((alert) => ({
      zone_id: zoneId,
      alert_key: alert.id,
      plant_id: alert.plantId ? plantIds.get(alert.plantId) ?? null : null,
      title: alert.title,
      detail: alert.detail,
      severity: alert.tone,
      status: "open",
      raised_at: simulation.currentTime,
      resolved_at: null,
    }));
    if (alertRows.length) {
      const savedAlerts = await supabase.from("alerts").upsert(alertRows, { onConflict: "zone_id,alert_key" });
      if (savedAlerts.error) throw savedAlerts.error;
    }

    return NextResponse.json({
      savedPlants: plantRows.length,
      savedReadings: readingRows.length,
      savedRules: ruleRows.length,
      savedEvents: eventRows.length,
      savedAlerts: alertRows.length,
      syncedAt: new Date().toISOString(),
    });
  } catch {
    return badRequest("The simulation could not be saved. Check the database migration and account permissions.", 500);
  }
}
