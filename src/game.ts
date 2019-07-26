import {BitSet} from "tfw/core/util"
import {vec2, dim2, vec2zero, mat2d} from "tfw/core/math"
import {Color} from "tfw/core/color"
import {Clock} from "tfw/core/clock"
import {Tile} from "tfw/scene2/gl"
import {QuadBatch} from "tfw/scene2/batch"
import {Surface} from "tfw/scene2/surface"
import {
  EntityConfig, Domain, ID, Matcher, System, Component,
  ArrayComponent, DenseValueComponent, Float32Component, IDComponent, Vec2Component
} from "tfw/entity/entity"
import {DynamicsSystem, RenderSystem, TransformComponent, makeTransform} from "tfw/scene2/entity"

import {App, SurfaceMode} from "./app"
import {Textures} from "./media"

const gridMinX = 380*2
const gridMinY = 200*2
const gridCellW = 100*2
const gridCellH = 130*2

const gridW = 9
const gridH = 5

const red = Color.fromRGB(1, 0, 0)
const white = Color.fromRGB(1, 1, 1)
const dot = dim2.fromValues(2, 2)

function makeUnitTrans (tile :Tile, ox :number, oy :number, gx :number, gy :number) {
  const cx = gridMinX+gridCellW*gx, cy = gridMinY+gridCellH*gy
  return makeTransform(ox, oy, cx, cy, 1, 1, 0)
}

type UnitConfig = {
  tile :string,
  health :number,
  speed? :number,
}

const plants = {
  shooter: {
    tile: "shooter",
    health: 100,
  },
  threepeater: {
    tile: "threepeater",
    health: 100,
  }
}

const zombs = {
  normal: {
    tile: "suit",
    health: 100,
    speed: -20,
  },
  glitter: {
    tile: "glitter",
    health: 50,
    speed: -30,
  },
}

function makeUnit (cfg :UnitConfig, tile :Tile, gx :number, gy :number) {
  const twid = tile.size[0], thei = tile.size[1]
  const ox = twid/2, oy = thei // TODO: provide this in tile info?
  return {
    components: {
      trans: {initial: makeUnitTrans(tile, ox, oy, gx, gy)},
      tile: {initial: tile},
      xextent: {initial: vec2.fromValues(-ox, twid-ox)},
      vel: {},
      basevel: {initial: vec2.fromValues(cfg.speed || 0, 0)},
      lane: {initial: gy},
      collid: {},
    }
  }
}
function makePlant (cfg :UnitConfig, texs :Textures, gx :number, gy :number) {
  return makeUnit(cfg, texs.plants[cfg.tile], gx, gy)
}
function makeZomb (cfg :UnitConfig, texs :Textures, gx :number, gy :number) {
  return makeUnit(cfg, texs.zombs[cfg.tile], gx, gy)
}

export class ShambleSystem extends System {

  constructor (domain :Domain, vel :Vec2Component) {
    super(domain, Matcher.hasAllC(vel.id))
  }

  update (clock :Clock) {
    this.onEntities(id => {
      // TODO: move fast for a bit (lurch forward), then rapid decay, then no movement at all for a
      // bit...
    })
  }
}

const Lanes = 5
const tmpvel = vec2.create()
const tmpext = vec2.create()

type LaneCollideComps = {
  trans :TransformComponent,
  vel :Vec2Component,
  xextent :Vec2Component,
  basevel :Vec2Component,
  lane :Float32Component,
  collid :IDComponent
}


function checkCollide (ml :number, mr :number, sl :number, sr :number) {
  return (sl < ml && ml < sr) || (sl < mr && mr < sr)
}

export class LaneCollideSystem extends System {
  protected laneIds :ID[][] = []

  constructor (domain :Domain, readonly comps: LaneCollideComps) {
    super(domain, Matcher.hasAllC(comps.trans.id, comps.vel.id, comps.xextent.id,
                                  comps.basevel.id, comps.lane.id, comps.collid.id))
    for (let ll = 0; ll < Lanes; ll += 1) this.laneIds[ll] = [] // sigh javascript
  }

  update () {
    const {trans, basevel, vel, xextent, collid} = this.comps
    for (let lane = 0; lane < Lanes; lane += 1) {
      const ids = this.laneIds[lane]
      for (const id of ids) {
        const text = xextent.read(id, tmpext)
        const tx = trans.readTx(id)
        const tl = tx+text[0], tr = tx+text[1]

        const curcid = collid.read(id)
        if (curcid !== 0) {
          const ctx = trans.readTx(curcid)
          const ctext = xextent.read(curcid, tmpext)
          const ctl = ctx+ctext[0], ctr = ctx+ctext[1]
          // if we're still colliding with someone, then NOOP
          if (checkCollide(tl, tr, ctl, ctr)) continue
          // otherwise stop colliding wiht that guy (TODO: emit event?)
          collid.update(id, 0)
        }

        const tvx = vel.read(id, tmpvel)[0]

        let collided = false
        // x squared ftw! x is less than ten so whatever
        for (const cid of ids) {
          if (id === cid) continue
          const ctx = trans.readTx(cid)
          const ctext = xextent.read(cid, tmpext)
          const ctl = ctx+ctext[0], ctr = ctx+ctext[1]
          if (checkCollide(tl, tr, ctl, ctr)) {
            collid.update(id, cid)
          }
        }
      }
    }
  }

  protected added (id :ID, config :EntityConfig) {
    super.added(id, config)
    this.laneIds[this.comps.lane.read(id)].push(id)
  }

  protected deleted (id :ID) {
    super.deleted(id)
    const laneIds = this.laneIds[this.comps.lane.read(id)]
    const idx = laneIds.indexOf(id)
    if (idx >= 0) laneIds.splice(idx, 1)
  }
}

export class StopCollidersSystem extends System {

  constructor (domain :Domain, readonly collid :IDComponent,
               readonly vel :Vec2Component, readonly basevel :Vec2Component) {
    super(domain, Matcher.hasAllC(collid.id, vel.id, basevel.id))
  }

  update () {
    this.onEntities(id => {
      const cid = this.collid.read(id)
      if (cid !== 0) this.vel.update(id, vec2zero)
      else this.vel.update(id, this.basevel.read(id, tmpvel))
    })
  }
}

export class GameMode extends SurfaceMode {
  readonly domain :Domain
  readonly updaters :Array<(c:Clock) => void> = []
  readonly rendersys :RenderSystem

  constructor (app :App, readonly texs :Textures) {
    super(app)

    const batchBits = 10 // 1024 entities per batch
    const comps = {
      trans: new TransformComponent("trans", batchBits),
      tile: new DenseValueComponent<Tile>("tile", texs.plants.pea),
      vel: new Vec2Component("vel", vec2zero, batchBits),
      xextent: new Vec2Component("xextent", vec2zero, batchBits),
      basevel: new Vec2Component("basevel", vec2zero, batchBits),
      lane: new Float32Component("lane", 0, batchBits),
      collid: new IDComponent("collid", 0, batchBits),
      health: new Float32Component("health", 0, batchBits),
    }
    const domain = this.domain = new Domain({}, comps)

    const lanecolsys = new LaneCollideSystem(domain, comps)
    this.updaters.push(c => lanecolsys.update())
    const stopcolsys = new StopCollidersSystem(domain, comps.collid, comps.vel, comps.basevel)
    this.updaters.push(c => stopcolsys.update())
    const dynamsys = new DynamicsSystem(domain, comps.trans, comps.vel)
    this.updaters.push(c => dynamsys.update(c))
    // TODO: should we have the render system handle HiDPI scale?
    const rendersys = this.rendersys = new RenderSystem(domain, comps.trans, comps.tile)
    this.updaters.push(c => rendersys.update())

    // add the background entities
    const bg = texs.misc.ground.tile(2, 2, 446, 192)
    const grass = texs.misc.ground.tile(248, 242, 246, 169)
    domain.add({components: {
      trans: {initial: makeTransform(0, 0, 0, 0, 8, 8, 0)},
      tile: {initial: bg},
    }})
    domain.add({components: {
      trans: {initial: makeTransform(0, 0, 75*8, 17*8, 8, 8, 0)},
      tile: {initial: grass},
    }})

    // add some plants and zombies
    let gx = 4, gy = 0
    domain.add(makePlant(plants.shooter, texs, gx, gy++))
    domain.add(makePlant(plants.threepeater, texs, gx, gy++))
    domain.add(makePlant(plants.shooter, texs, gx, gy++))
    domain.add(makePlant(plants.shooter, texs, gx, gy++))
    domain.add(makePlant(plants.threepeater, texs, gx, gy++))

    gy = 0; gx = 6;
    domain.add(makeZomb(zombs.normal, texs, gx, gy++))
    domain.add(makeZomb(zombs.normal, texs, gx, gy++))
    domain.add(makeZomb(zombs.glitter, texs, gx, gy++))
    domain.add(makeZomb(zombs.normal, texs, gx, gy++))
    domain.add(makeZomb(zombs.glitter, texs, gx, gy++))
  }

  renderTo (clock :Clock, surf :Surface) {
    for (const uf of this.updaters) uf(clock)
    this.rendersys.render(this.batch)
  }
}
