export class EntityMap {
    constructor() {
        this.id = null;
        this.attributes = [];
        this.sortedUids = [];
        this.defaultTick = null;
    }
}

export class EntityMapAttribute {
    constructor() {
        this.nameHash = null;
        this.type = null;
    }
}

export class Rpc {
    constructor() {
        this.index = null;
        this.internalId = null;
        this.unknownBool1 = null;
        this.parameters = [];
    }
}

export class RpcParameter {
    constructor() {
        this.id = null;
        this.type = null;
        this.internalId = null;
    }
}

export class NetworkEntity {
    constructor() {
        this.uid = null;
        this.modelHash = null;
        this.tick = null;
    }
}

export const PacketId = {
    EntityUpdate: 0,
    PlayerCounterUpdate: 1,
    SetWorldDimensions: 2,
    Input: 3,
    EnterWorld: 4,
    Ping: 7,
    Rpc: 9,
    UdpConnect: 10,
    UdpTick: 11,
    UdpAckTick: 12,
    UdpPong: 13,
    UdpPingWithCompressedUids: 14,
    UdpFragment: 15,
    UdpConnect1300: 16,
    UdpConnect500: 17,
    UdpRpc: -1
};

export const ParameterType = {
    Uint32: 0,
    Int32: 1,
    Float: 2,
    String: 3,
    Uint64: 4,
    Int64: 5,
    Uint16: 6,
    Int16: 7,
    Uint8: 8,
    Int8: 9,
    VectorUint8: 10,
    CompressedString: 11
};

export const AttributeType = {
    Uninitialized: 0,
    Uint32: 1,
    Int32: 2,
    Float: 3,
    String: 4,
    Vector2: 5,
    EntityType: 6,
    ArrayVector2: 7,
    ArrayUint32: 8,
    Uint16: 9,
    Uint8: 10,
    Int16: 11,
    Int8: 12,
    Uint64: 13,
    Int64: 14,
    Double: 15,
    ArrayInt32: 16,
    ArrayUint8: 17
}

export const ParameterSize = {
    [ParameterType.Uint32]: 32,
    [ParameterType.Int32]: 32,
    [ParameterType.Float]: 32,
    [ParameterType.String]: -1,
    [ParameterType.Uint64]: 64,
    [ParameterType.Int64]: 64,
    [ParameterType.Uint16]: 16,
    [ParameterType.Int16]: 16,
    [ParameterType.Uint8]: 8,
    [ParameterType.Int8]: 8,
    [ParameterType.VectorUint8]: -1,
    [ParameterType.CompressedString]: -1
};

export class EnterWorldResponse {
    constructor() {
        this.version = null;
        this.allowed = null;
        this.uid = null;
        this.startingTick = null;
        this.tickRate = null;
        this.effectiveTickRate = null;
        this.players = null;
        this.maxPlayers = null;
        this.chatChannel = null;
        this.effectiveDisplayName = null;
        this.x1 = null;
        this.y1 = null;
        this.x2 = null;
        this.y2 = null;
        this.entities = [];
        this.rpcs = [];
        this.mode = null;
        this.map = null;
        this.udpCookie = null;
        this.udpPort = null;
    }
}

export class ReceiveChatMessageRpc {
    constructor() {
        this.displayName = null;
        this.channel = null;
        this.message = null;
        this.uid = null;
    }
}

export class GameStatusRpc {
    constructor() {
        this.status = null;
        this.countDownEndsTick = null;
    }
}

export class EntityUpdate {
    constructor() {
        this.tick = null;
        this.createdEntities = [];
        this.deletedEntities = [];
    }
}

export class Vector2 {
    constructor(x = 0, y = 0) {
        this.x = x;
        this.y = y;
    }
}

export const ModelHash = {
    BaseHash: 0xBE14DFE0,
    BuildingHash: 0xDF853D95,
    GasHash: 0xF15CDBB8,
    ItemHash: 0xA7ECD754,
    NpcHash: 0xF4DE4BE0,
    PlaneHash: 0x8FE5D35B,
    PlayerBuildingHash: 0xF63A37D6,
    PlayerHash: 0x4254AE62,
    PortalHash: 0x2293598D,
    ProjectileHash: 0xB6CEBBAA,
    PropHash: 0xECAA7004,
    SprayHash: 0x1E1837CC,
    ZombieHash: 0x0ED7FD27
};

export class Tick {
    constructor() {
        this.Uid = null;
        this.Name = null;
        this.Position = null;
        this.Scale = null;
        this.EntityClass = null;
        this.ModelHash = null;
        this.Yaw = null;
        this.InterpolatedYaw = null;
        this.AimingYaw = null;
        this.Health = null;
        this.MaxHealth = null;
        this.Energy = null;
        this.MaxEnergy = null;
        this.ReconnectSecret = null;
        this.Score = null;
        this.Armor = null;
        this.SpeedAttribute = null;
        this.Damage = null;
        this.AvailableSkillPoints = null;
        this.CollisionRadius = null;
        this.Width = null;
        this.Height = null;
        this.Level = null;
        this.Kills = null;
        this.Dead = null;
        this.TimeAlive = null;
        this.EntityMap = null;
        this.NextPooledTick = null;
        this.lastFieldRequested = null;
        this.deathTick = null;
        this.firingTick = null;
        this.firingSequence = null;
        this.lastDamagedTick = null;
        this.equippedCategoryId = null;
        this.equippedDataIndex = null;
        this.equippedTier = null;
        this.equippedInventorySlot = null;
        this.equippedSkinId = null;
        this.shield = null;
        this.maxShield = null;
        this.healthDamageTaken = null;
        this.shieldDamageTaken = null;
        this.effect = null;
        this.knockDowns = null;
        this.currentAmmo = null;
        this.maxAmmo = null;
        this.smallAmmo = null;
        this.mediumAmmo = null;
        this.largeAmmo = null;
        this.shotgunAmmo = null;
        this.wood = null;
        this.startChargingTick = null;
        this.startChargeUpTick = null;
        this.reloadStartedTick = null;
        this.reloadEndsTick = null;
        this.actionStartedTick = null;
        this.actionEndsTick = null;
        this.cockingMsRemaining = null;
        this.canParachute = null;
        this.parachuteStartedTick = null;
        this.parachuteMsRemaining = null;
        this.isFreefalling = null;
        this.emoteIndex = null;
        this.emoteIndex2 = null;
        this.emoteTick = null;
        this.parachuteId = null;
        this.bodyId = null;
        this.backpackId = null;
        this.fistSkinId = null;
        this.spectatingUid = null;
        this.spectateCount = null;
        this.partyId = null;
        this.partyColor = null;
        this.reviveStartedTick = null;
        this.reviveEndsTick = null;
        this.isKnockedDown = null;
        this.knockedDownHealth = null;
        this.knockedDownMaxHealth = null;
        this.isOnFire = null;
        this.isPoisoned = null;
        this.isSlowed = null;
        this.isHealing = null;
        this.isInWater = null;
        this.isInBuildingMode = null;
        this.zombieKills = null;
        this.movementSpeedAffinityRocks = null;
        this.defenseAffinityRocks = null;
        this.bulletDamageAffinityRocks = null;
        this.bulletSpeedAffinityRocks = null;
        this.portalEnterTick = null;
        this.isGrappling = null;
        this.isVip = null;
        this.isBoosted = null;
        this.lastBulletDataIndex = null;
        this.lastBulletLifetimePercent = null;
        this.grapplingHookPosition = null;
        this.vehicleUid = null;
        this.vehicleSlot = null;
        this.equippedModifierIndex = null;
        this.obtainableUids = [];
        this.interactableUids = [];
        this.visibleBuildingUids = [];
        this.dataIndex = null;
        this.collisionUid = null;
        this.ownerUid = null;
        this.trailId = null;
        this.trailColorId = null;
        this.creationTick = null;
        this.stuckAtTick = null;
        this.effectiveLifetimeMs = null;
        this.categoryId = null;
        this.tier = null;
        this.quantity = null;
        this.skinId = null;
        this.modifierIndex = null;
        this.weaponKills = null;
        this.currentCircleRadius = null;
        this.nextCircleRadius = null;
        this.lastCircleRadius = null;
        this.currentCirclePosition = null;
        this.nextCirclePosition = null;
        this.lastCirclePosition = null;
        this.currentCircleTick = null;
        this.openDoorIds = [];
        this.openDoorDirections = [];
        this.brokenWindowIds = [];
        this.sprayIndex = null;
        this.airDropLandTick = null;
        this.isVehicle = null;
        this.vehicleOccupants = [];
    }
}

export class SetSkinRpc {
    constructor(slot = 0, subSlot = 0, skinId = 0) {
        this.slot = slot;
        this.subSlot = subSlot;
        this.skinId = skinId;
    }
}

export class InputRpc {
    constructor() {
        this.tick = 0;
        this.inputUid = 0;
        this.acknowledgedTickNumber = 0;
        this.isPing = 0;
        this.hasWorld = 0;
        this.left = 0;
        this.right = 0;
        this.down = 0;
        this.up = 0;
        this.space = 0;
        this.moveDirection = -1;
        this.use = 0;
        this.worldX = 0;
        this.worldY = 0;
        this.distance = 0;
        this.yaw = 0;
        this.mouseDown = -1;
        this.mouseMovedWhileDown = -1;
        this.mouseMoved = -1;
        this.mouseUp = 1;
        this.moveSpeed = 1;
        this.rightMouseDown = 0;
        this.unknown_0 = 1;
        this.unknown_1 = 5;
    }
}

export class DataRpc {
    constructor() {
        this.dataName = null;
        this.json = null;
    }
}

export class SchemaProp {
    constructor() {
        this.name = null;
        this.friendlyName = null;
        this.propClass = null;
        this.material = null;
        this.health = null;;
        this.collisionRadius = null;;
        this.width = null;;
        this.height = null;;
        this.lootCategories = [];
        this.projectiles = [];
    }
}
