/**
 * Mock Data Generator for Realistic Gas Emission Data
 * Generates realistic emission readings that simulate real-world vehicle behavior
 */

interface EmissionBaseline {
  co2: number;
  co: number;
  nox: number;
  pmLevel: number;
}

interface VehicleProfile {
  vehicleId: number;
  baseline: EmissionBaseline;
  lastReading?: EmissionBaseline;
  trend: 'stable' | 'increasing' | 'decreasing' | 'volatile';
  volatility: number; // 0-1, how much the values fluctuate
}

// Realistic emission baselines based on vehicle types
const EMISSION_BASELINES: Record<string, EmissionBaseline> = {
  petrol: { co2: 450, co: 8, nox: 35, pmLevel: 25 },
  diesel: { co2: 550, co: 12, nox: 45, pmLevel: 40 },
  hybrid: { co2: 300, co: 5, nox: 20, pmLevel: 15 },
  electric: { co2: 0, co: 0, nox: 0, pmLevel: 5 },
  cng: { co2: 400, co: 6, nox: 25, pmLevel: 20 },
};

// Store vehicle profiles to maintain consistency
const vehicleProfiles = new Map<number, VehicleProfile>();

/**
 * Initialize or get vehicle profile
 */
function getVehicleProfile(vehicleId: number, fuelType: string): VehicleProfile {
  if (!vehicleProfiles.has(vehicleId)) {
    const baseline = EMISSION_BASELINES[fuelType.toLowerCase()] || EMISSION_BASELINES.petrol;
    const trends: VehicleProfile['trend'][] = ['stable', 'increasing', 'decreasing', 'volatile'];
    const trend = trends[Math.floor(Math.random() * trends.length)];
    const volatility = 0.1 + Math.random() * 0.2; // 10-30% volatility

    vehicleProfiles.set(vehicleId, {
      vehicleId,
      baseline,
      lastReading: { ...baseline },
      trend,
      volatility,
    });
  }
  return vehicleProfiles.get(vehicleId)!;
}

/**
 * Generate realistic emission reading with natural variations
 */
export function generateMockEmissionReading(
  vehicleId: number,
  fuelType: string
): EmissionBaseline {
  const profile = getVehicleProfile(vehicleId, fuelType);
  const { baseline, lastReading, trend, volatility } = profile;

  // Calculate trend multiplier
  let trendMultiplier = 1;
  switch (trend) {
    case 'increasing':
      trendMultiplier = 1 + (Math.random() * 0.05); // Slight increase
      break;
    case 'decreasing':
      trendMultiplier = 1 - (Math.random() * 0.05); // Slight decrease
      break;
    case 'volatile':
      trendMultiplier = 0.85 + (Math.random() * 0.3); // Large swings
      break;
    case 'stable':
    default:
      trendMultiplier = 0.95 + (Math.random() * 0.1); // Small variations
  }

  // Generate values with realistic variations
  const generateValue = (
    baseValue: number,
    lastValue?: number,
    minVariation = -0.15,
    maxVariation = 0.15
  ): number => {
    // Use last reading as reference if available, otherwise use baseline
    const reference = lastValue ?? baseValue;
    
    // Add random variation within volatility range
    const variation = minVariation + Math.random() * (maxVariation - minVariation);
    const variationAmount = reference * volatility * variation;
    
    // Apply trend
    let newValue = reference + variationAmount;
    newValue *= trendMultiplier;
    
    // Ensure values don't go negative (except for electric vehicles)
    if (baseValue === 0) {
      // Electric vehicle - keep at 0 or very low
      newValue = Math.max(0, Math.min(newValue, 10));
    } else {
      // Ensure minimum is 20% of baseline, maximum is 200% of baseline
      newValue = Math.max(baseValue * 0.2, Math.min(newValue, baseValue * 2));
    }
    
    return Math.round(newValue * 10) / 10; // Round to 1 decimal
  };

  // Generate readings with correlated variations (if one is high, others tend to be high too)
  const correlationFactor = 0.7 + Math.random() * 0.3; // 0.7-1.0 correlation
  
  const co2 = generateValue(
    baseline.co2,
    lastReading?.co2,
    -0.2 * correlationFactor,
    0.2 * correlationFactor
  );
  
  const co = generateValue(
    baseline.co,
    lastReading?.co,
    -0.25 * correlationFactor,
    0.25 * correlationFactor
  );
  
  const nox = generateValue(
    baseline.nox,
    lastReading?.nox,
    -0.2 * correlationFactor,
    0.2 * correlationFactor
  );
  
  const pmLevel = generateValue(
    baseline.pmLevel,
    lastReading?.pmLevel,
    -0.3 * correlationFactor,
    0.3 * correlationFactor
  );

  // Update last reading
  profile.lastReading = { co2, co, nox, pmLevel };

  return { co2, co, nox, pmLevel };
}

/**
 * Generate historical data points for a vehicle
 */
export function generateHistoricalData(
  vehicleId: number,
  fuelType: string,
  hoursBack: number,
  intervalMinutes: number = 5
): EmissionBaseline[] {
  const data: EmissionBaseline[] = [];
  const points = Math.floor((hoursBack * 60) / intervalMinutes);
  
  // Reset profile to start fresh
  resetVehicleProfile(vehicleId);
  const profile = getVehicleProfile(vehicleId, fuelType);

  for (let i = 0; i <= points; i++) {
    const reading = generateMockEmissionReading(vehicleId, fuelType);
    data.push(reading);
  }

  return data;
}

/**
 * Reset vehicle profile (useful for testing)
 */
export function resetVehicleProfile(vehicleId: number): void {
  vehicleProfiles.delete(vehicleId);
}

