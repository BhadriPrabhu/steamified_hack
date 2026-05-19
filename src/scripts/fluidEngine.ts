export interface DuctPoint {
    positionX: number;     // X coordinate along the physical pipe
    radius: number;        // Radius of the pipe at this point (meters)
    area: number;          // Cross-sectional area (m^2)
    velocity: number;      // Calculated velocity (m/s)
    pressureHead: number;  // Calculated water height column (meters)
}

export class FluidEngine {
    // Input parameters driven by user valve interactions
    public flowRateQ: number = 0.05; // Default flow rate (m^3/s)
    public totalHeadH: number = 2.0;  // Constant head supplied by the tank (meters)
    
    // Constant for acceleration due to gravity
    private readonly g: number = 9.81;
    
    // Array holding our 11 measurement sections
    public ductPoints: DuctPoint[] = [];

    constructor() {
        this.initializeDuctGeometry();
    }

    /**
     * Sets up a convergent-divergent duct profile across 11 points
     */
    private initializeDuctGeometry(): void {
        const totalPoints = 11;
        const startRadius = 0.3;  // Wide inlet/outlet radius
        const throatRadius = 0.1; // Narrow bottleneck radius

        for (let i = 0; i < totalPoints; i++) {
            // Calculate a smooth profile tapering down to point 5, then widening back out
            let currentRadius = startRadius;
            if (i <= 5) {
                // Convergence zone
                currentRadius = startRadius - (i / 5) * (startRadius - throatRadius);
            } else {
                // Divergence zone
                currentRadius = throatRadius + ((i - 5) / 5) * (startRadius - throatRadius);
            }

            const area = Math.PI * Math.pow(currentRadius, 2);

            this.ductPoints.push({
                positionX: (i - 5) * 2, // Spacing out points along the X axis
                radius: currentRadius,
                area: area,
                velocity: 0,
                pressureHead: 0
            });
        }
    }

    /**
     * Recalculates velocities and pressure heads based on current flow rate Q
     * This function runs inside the Babylon.js frame loop
     */
    public updatePhysics(): void {
        // Safe check: if valves are closed, fluid is static
        if (this.flowRateQ <= 0) {
            this.ductPoints.forEach(point => {
                point.velocity = 0;
                point.pressureHead = this.totalHeadH; // Water rises to supply tank level
            });
            return;
        }

        this.ductPoints.forEach(point => {
            // 1. Continuity Equation: v = Q / A
            point.velocity = this.flowRateQ / point.area;

            // 2. Velocity Head: (v^2) / 2g
            const velocityHead = Math.pow(point.velocity, 2) / (2 * this.g);

            // 3. Bernoulli's Equation: Pressure Head = Total Head - Velocity Head
            // We clamp it to 0 so pressure doesn't visually drop below the pipe level
            point.pressureHead = Math.max(0, this.totalHeadH - velocityHead);
        });
    }
}