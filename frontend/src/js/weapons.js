import { App } from "./conf";
import { UB32Weapon } from "./ub32";

export class Weapon {
    constructor(name, velocity, gravityScale, minElevation, unit, logo, marker, logoCannonPos, type, angleType, elevationPrecision, minDistance, moa, maxDamage, startRadius, endRadius, falloff) {
        this.name = name;
        if (name === "UB-32") {
            this.ub32 = new UB32Weapon();
            this.velocity = velocity;
        } else {
            this.velocity = velocity;
        }
        this.gravityScale = gravityScale;
        this.minElevation = minElevation;
        this.unit = unit;
        this.logo = logo;
        this.marker = marker;
        this.logoCannonPos = logoCannonPos;
        this.type = type;
        this.angleType = angleType;
        this.elevationPrecision = elevationPrecision;
        this.minDistance = minDistance;
        this.moa = moa;
        this.maxDistance = this.getMaxDistance();
        this.hundredDamageRadius = this.calculateDistanceForDamage(maxDamage, startRadius, endRadius, falloff, 100);
        this.twentyFiveDamageRadius = this.calculateDistanceForDamage(maxDamage, startRadius, endRadius, falloff, 25);
    }

    /**
     * Return the weapon velocity
     * @param {number} } [distance] - distance between mortar and target from getDist()
     * @returns {number} - Velocity of the weapon for said distance
     */
    getVelocity(distance) {
        if (this.name === "UB-32") {
            return this.ub32.getVelocity(distance);
        }
        return this.velocity; // For other weapons
    }

    /**
     * Return the angle factor from 45°
     * @returns {1/-1} -1 = 0-45° / 1 = 45-90°
     */
    getAngleType() {
        if (this.angleType === "high") { return -1; }
        return 1;
    }

    /**
     * Return maximum distance for 45°
     * https://en.wikipedia.org/wiki/Projectile_motion#Maximum_distance_of_projectile
     * @returns {number} [distance]
     */
    getMaxDistance() {
        if (this.velocity.constructor != Array) {
            return (this.velocity ** 2) / App.gravity / this.gravityScale;
        }

        // When using UB32, return last value from UB32_table
        return this.velocity.slice(-1)[0][0];
    }

    calculateDistanceForDamage(maxDamage, startRadius, endRadius, falloff, targetDamage) {
        return endRadius - (Math.pow(targetDamage / maxDamage, 1 / falloff) * (endRadius - startRadius));
    }

}
