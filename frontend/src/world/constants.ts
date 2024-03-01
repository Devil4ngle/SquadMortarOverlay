export const MAPSCALE = 0.01

export const MAX_DISTANCE = 123200 // cm
export const GRAVITY = 980 // cm/s^2 // ue4 value
export const US_MIL = 1018.59
export const MORTAR_VELOCITY = 10989 // cm/s
export const MORTAR_MOA = 50
export const MORTAR_DEVIATION = MORTAR_MOA / 60 * Math.PI / 180 / 2 // cone angle from center ~ "radius angle"
export const MORTAR_MIN_RANGE = 5000 // cm
export const MORTAR_MAX_RANGE = 123096.963 // cm
export const MORTAR_100_DAMAGE_RANGE = 600 // cm
export const MORTAR_25_DAMAGE_RANGE = 1200 // cm
export const MORTAR_10_DAMAGE_RANGE = 1500 // cm

export const HELL_CANNON_VELOCITY = 9500 // cm/s
export const HELL_CANNON_MOA = 100
export const HELL_CANNON_DEVIATION = HELL_CANNON_MOA / 60 * Math.PI / 180 / 2
export const HELL_CANNON_MAX_RANGE = 92400 // cm, approx
export const HELL_CANNON_100_DAMAGE_RANGE = 1000 // cm
export const HELL_CANNON_25_DAMAGE_RANGE = 4000 // cm

export const UB32_MOA = 300
export const UB32_DEVIATION = UB32_MOA / 60 * Math.PI / 180 / 2
export const UB32_VELOCITY = 30000 // cm/s
export const S5_GRAVITY = 2 * GRAVITY // cm/s
export const S5_ACCELERATION = -5000 // cm/s^2
export const S5_ACCELERATION_TIME = 2 // s

// "explosive" should actually be "HEAT"
export const S5_HIT_DAMAGE = 250
export const S5_HIT_PENETRATION = 130 // or 250 ?
export const S5_EXPLOSIVE_BASE_DAMAGE = 115
export const S5_EXPLOSIVE_INNER_RADIUS = 500 // cm
export const S5_EXPLOSIVE_OUTER_RADIUS = 1800 // cm
export const S5_EXPLOSIVE_FALLOFF = 1

export const BM21_MOA = 200
export const BM21_DEVIATION = BM21_MOA / 60 * Math.PI / 180 / 2
export const BM21_VELOCITY = 20000 // cm/s
export const BM21_GRAVITY = 2 * GRAVITY // cm/s
// export const BM21_ACCELERATION = -2250;  // cm/s^2
// export const BM21_ACCELERATION_TIME = 2;  // s
export const BM21_MIN_FLIGHT_TIME = 0.5
export const BM21_HIT_DAMAGE = 800
// "explosive" should actually be "fragmentation"
export const BM21_EXPLOSIVE_BASE_DAMAGE = 140
export const BM21_EXPLOSIVE_INNER_RADIUS = 100 // cm
export const BM21_EXPLOSIVE_OUTER_RADIUS = 3500 // cm
export const BM21_EXPLOSIVE_FALLOFF = 1
export const BM21_REARM_TIME_PER_ROCKET = 3.8
