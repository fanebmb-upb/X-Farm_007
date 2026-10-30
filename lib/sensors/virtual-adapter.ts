import type { SimulationState } from "@/lib/mock-data";
import type { SensorAdapter, SensorObservation } from "@/lib/sensors/adapter";

/** Bridges the existing simulator into the same contract future hardware adapters will implement. */
export class VirtualSensorAdapter implements SensorAdapter {
  readonly kind = "virtual" as const;
  private readonly getSimulation: () => SimulationState;

  constructor(getSimulation: () => SimulationState) {
    this.getSimulation = getSimulation;
  }

  async readCurrent(zoneId: string): Promise<SensorObservation[]> {
    const simulation = this.getSimulation();
    if (simulation.zoneId !== zoneId) return [];
    return simulation.readings.map(({ sensorId, metric, timestamp, value, unit, zoneId: readingZoneId, plantId }) => ({
      sensorId,
      metric,
      timestamp,
      value,
      unit,
      zoneId: readingZoneId,
      plantId,
    }));
  }
}
