import {BitSet} from "tfw/core/util"
import {vec2, dim2, vec2zero, mat2d} from "tfw/core/math"
import {Color} from "tfw/core/color"
import {Clock} from "tfw/core/clock"
import {Tile} from "tfw/scene2/gl"
import {QuadBatch} from "tfw/scene2/batch"
import {Surface} from "tfw/scene2/surface"
import {
  EntityConfig, Domain, ID, Matcher, System, Component,
  ArrayComponent, DenseValueComponent, Float32Component, Vec2Component
} from "tfw/entity/entity"
import {DynamicsSystem, RenderSystem, TransformComponent, makeTransform} from "tfw/scene2/entity"

import {App, SurfaceMode} from "./app"
import {Textures} from "./media"

const pscale = vec2.fromValues(4, 4)
const pos = vec2.create()
const gpos = vec2.fromValues(75, 17)
const ppos = vec2.fromValues(530, 187)

const gridMinX = 380*2
const gridMinY = 200*2
const gridCellW = 100*2
const gridCellH = 130*2

const gridW = 9
const gridH = 5

const red = Color.fromRGB(1, 0, 0)
const white = Color.fromRGB(1, 1, 1)
const dot = dim2.fromValues(2, 2)

function makeUnitTrans (tile :Tile, gx :number, gy :number) {
  const cx = gridMinX+gridCellW*gx, cy = gridMinY+gridCellH*gy
  return makeTransform(tile.size[0]/2, tile.size[1], cx, cy, 1, 1, 0)
}

function makeUnit (tile :Tile, vx :number, gx :number, gy :number) {
  return {
    components: {
      trans: {initial: makeUnitTrans(tile, gx, gy)},
      tile: {initial: tile},
      vel: {initial: vec2.fromValues(vx, 0)},
      lane: {initial: gy},
    }
  }
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
const tvel = vec2.create()

export class LaneCollideSystem extends System {
  protected laneIds :ID[][] = []

  constructor (domain :Domain,
               readonly trans :TransformComponent,
               readonly vel :Vec2Component,
               readonly lane :Float32Component) {
    super(domain, Matcher.hasAllC(trans.id, vel.id, lane.id))
    for (let ll = 0; ll < Lanes; ll += 1) this.laneIds[ll] = [] // sigh javascript
  }

  update () {
    for (let lane = 0; lane < Lanes; lane += 1) {
      const ids = this.laneIds[lane]
      // x squared ftw! x is less than ten so whatever
      for (const id of ids) {
        // if this entity is not moving, skip it
        const tv = this.vel.read(id, tvel)
        if (tv[0] === 0) continue

        const tx = this.trans.readTx(id)
        const twid = 150 // temp
        const tl = tx-twid/2, tr = tx+twid/2

        for (const cid of ids) {
          if (id === cid) continue
          const ctx = this.trans.readTx(cid)
          const ctwid = 150 // temp
          const ctl = ctx-ctwid/2, ctr = ctx+ctwid/2
          if (ctl < tl && tl < ctr) {
            console.log(`E${id} collided with E${cid}`)
            this.vel.update(id, vec2.set(tv, 0, tv[1]))
          }
        }
      }
    }
  }

  protected added (id :ID, config :EntityConfig) {
    super.added(id, config)
    this.laneIds[this.lane.read(id)].push(id)
  }

  protected deleted (id :ID) {
    super.deleted(id)
    const laneIds = this.laneIds[this.lane.read(id)]
    const idx = laneIds.indexOf(id)
    if (idx >= 0) laneIds.splice(idx, 1)
  }
}

export class GameMode extends SurfaceMode {
  readonly bg :Tile
  readonly grass :Tile
  readonly domain :Domain
  readonly rendersys :RenderSystem
  readonly dynamsys :DynamicsSystem
  readonly lanecolsys :LaneCollideSystem

  constructor (app :App, readonly texs :Textures) {
    super(app)
    this.bg = texs.ground.ground.tile(2, 2, 446, 192)
    this.grass = texs.ground.ground.tile(248, 242, 246, 169)

    const batchBits = 12 // 4096 entities per batch
    const trans = new TransformComponent("trans", batchBits)
    const tile = new DenseValueComponent<Tile>("tile", texs.plants.pea)
    const vel = new Vec2Component("vel", vec2zero, batchBits)
    const lane = new Float32Component("vel", 0, batchBits)

    const domain = this.domain = new Domain({}, {trans, tile, vel, lane})
    this.lanecolsys = new LaneCollideSystem(domain, trans, vel, lane)
    this.dynamsys = new DynamicsSystem(domain, trans, vel)
    // TODO: should we have the render system handle HiDPI scale?
    this.rendersys = new RenderSystem(domain, trans, tile)

    let gx = 0, gy = 0
    domain.add(makeUnit(this.texs.plants.bonkchoy, 0, gx, gy++))
    domain.add(makeUnit(this.texs.plants.shooter, 0, gx, gy++))
    domain.add(makeUnit(this.texs.plants.chomper, 0, gx, gy++))
    domain.add(makeUnit(this.texs.plants.five, 0, gx, gy++))
    domain.add(makeUnit(this.texs.plants.gatling, 0, gx, gy++))
    gy = 0; gx += 1;
    domain.add(makeUnit(this.texs.plants.icequeen, 0, gx, gy++))
    domain.add(makeUnit(this.texs.plants.snapdragon, 0, gx, gy++))
    domain.add(makeUnit(this.texs.plants.threepeater, 0, gx, gy++))
    domain.add(makeUnit(this.texs.plants.sunflower, 0, gx, gy++))

    const zombv = -30
    gy = 0; gx = 8;
    domain.add(makeUnit(this.texs.zombs.adventurer, zombv, gx, gy++))
    domain.add(makeUnit(this.texs.zombs.advskull, zombv, gx, gy++))
    domain.add(makeUnit(this.texs.zombs.cowboy, zombv, gx, gy++))
    domain.add(makeUnit(this.texs.zombs.flag, zombv, gx, gy++))
    domain.add(makeUnit(this.texs.zombs.glitter, zombv, gx, gy++))
    gy = 0; gx -= 1;
    domain.add(makeUnit(this.texs.zombs.pirate, zombv, gx, gy++))
    domain.add(makeUnit(this.texs.zombs.jestercake, zombv, gx, gy++))
    domain.add(makeUnit(this.texs.zombs.jetpack, zombv, gx, gy++))
    domain.add(makeUnit(this.texs.zombs.onbird, zombv, gx, gy++))
    domain.add(makeUnit(this.texs.zombs.parka, zombv, gx, gy++))
    gy = 0; gx -= 1;
    domain.add(makeUnit(this.texs.zombs.suit, zombv, gx, gy++))
    domain.add(makeUnit(this.texs.zombs.twilight, zombv, gx, gy++))
  }

  renderTo (clock :Clock, surf :Surface) {
    // rotsys.update(clock)
    this.lanecolsys.update()
    this.dynamsys.update(clock)
    // bouncesys.update()
    this.rendersys.update()

    surf.saveTx()
    surf.scale(pscale)
    const {bg, grass} = this
    surf.draw(bg, pos, bg.size)
    surf.draw(grass, gpos, grass.size)
    surf.restoreTx()

    this.rendersys.render(this.batch)

    // for (let gy = 0; gy < gridH; gy += 1) {
    //   for (let gx = 0; gx < gridW; gx += 1) {
    //     drawUnit(surf, gx, gy, this.texs.plants.shooter)
    //   }
    // }
  }
}
