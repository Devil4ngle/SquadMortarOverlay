
// Constants for UB-32
const GRAVITY = 9.8 * 2; // m/s^2
const VELOCITY0 = 300; // initial velocity in m/s
const ACCELERATION = -50; // acceleration in m/s^2
const ACCELERATION_TIME = 2; // time of acceleration in seconds
const TIME_DELTA = 0.05; // time

export class UB32Weapon {
    constructor() {
        this.trajectoryTable = this.generateTrajectoryTable();
    }

    calculateTrajectoryPoint(time) {
        let vx, vy, x, y;

        if (time <= ACCELERATION_TIME) {
            vx = VELOCITY0 + ACCELERATION * time;
            vy = 0; // Assuming horizontal launch
            x = VELOCITY0 * time + 0.5 * ACCELERATION * time * time;
            y = 0; // Assuming horizontal launch
        } else {
            const v1 = VELOCITY0 + ACCELERATION * ACCELERATION_TIME;
            vx = v1;
            vy = -GRAVITY * (time - ACCELERATION_TIME);
            x = (VELOCITY0 + v1) / 2 * ACCELERATION_TIME + v1 * (time - ACCELERATION_TIME);
            y = -0.5 * GRAVITY * (time - ACCELERATION_TIME) * (time - ACCELERATION_TIME);
        }

        const velocity = Math.sqrt(vx * vx + vy * vy);
        const distance = Math.sqrt(x * x + y * y);
        const angle = Math.atan2(-vy, vx); // Angle from horizontal

        return { velocity, distance, x, y, angle, time };
    }

    generateTrajectoryTable() {
        const table = [];
        let time = 0;
        let prevDistance = 0;

        while (time <= 30) { // Adjust max time as needed
            const point = this.calculateTrajectoryPoint(time);
            
            if (Math.floor(point.distance) > Math.floor(prevDistance)) {
                table.push(point);
            }

            if (point.y < -1000) { // Stop if projectile falls below 1000m
                break;
            }

            prevDistance = point.distance;
            time += TIME_DELTA;
        }

        return table;
    }

    getVelocity(distance) {
        for (let i = 1; i < this.trajectoryTable.length; i++) {
            if (distance < this.trajectoryTable[i].distance) {
                const p0 = this.trajectoryTable[i - 1];
                const p1 = this.trajectoryTable[i];
                const t = (distance - p0.distance) / (p1.distance - p0.distance);
                return p0.velocity + t * (p1.velocity - p0.velocity);
            }
        }
        return this.trajectoryTable[this.trajectoryTable.length - 1].velocity;
    }



    getMaxDistance() {
        return this.trajectoryTable[this.trajectoryTable.length - 1].distance;
    }
}
