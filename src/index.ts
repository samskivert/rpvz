import {Scale} from "tfw/core/ui"
import {Clock, Loop} from "tfw/core/clock"
import {loadImage} from "tfw/core/assets"
import {Value} from "tfw/core/react"
import {Renderer, Texture, Tile, makeTexture, windowSize} from "tfw/scene2/gl"
import {Surface} from "tfw/scene2/surface"
import {QuadBatch, UniformQuadBatch} from "tfw/scene2/batch"
import {dim2, vec2} from "tfw/core/math"

export type GLC = WebGLRenderingContext
export const GLC = WebGLRenderingContext

const root = document.getElementById("root")
if (!root) throw new Error(`No root?`)

const renderer = new Renderer({
  // kind of a hack: when the window size changes, we emit an update with our div size;
  // browsers don't emit resize events for arbitrary divs (there's apparently a proposal, yay)
  size: windowSize(window).map(size => dim2.set(size, root.clientWidth, root.clientHeight)),
  scaleFactor: window.devicePixelRatio,
  gl: {alpha: false}
})
root.appendChild(renderer.canvas)

const batch = new UniformQuadBatch(renderer.glc)
const surf = new Surface(renderer.target, batch)

const renderfn = squares

const loop = new Loop()
loop.clock.onEmit(clock => {
  renderfn(clock, batch, surf)
})
loop.start()

// const texS = Value.constant(Texture.DefaultConfig)
const pixCfg = {...Texture.DefaultConfig, minFilter: GLC.NEAREST, magFilter: GLC.NEAREST}
const pixS = Value.constant(pixCfg)
const hiDpiCfg = {...Texture.DefaultConfig, scale: new Scale(2)}
const hiDpiS = Value.constant(hiDpiCfg)

const images :{[key :string] :Tile} = {}

makeTexture(renderer.glc, loadImage("ground.png"), pixS).onValue(ground => {
  images.ground = ground
  images.bg = ground.tile(2, 2, 446, 192)
  images.grass = ground.tile(248, 242, 246, 169)
})

makeTexture(renderer.glc, loadImage("peashooter.png"), hiDpiS).onValue(pea => {
  images.pea = pea
})

const pscale = vec2.fromValues(4, 4)
const pos = vec2.create()
const gpos = vec2.fromValues(75, 17)
const ppos = vec2.fromValues(75, 17)

function squares (clock :Clock, _ :QuadBatch, surf :Surface) {
  surf.begin()
  surf.saveTx()
  surf.scale(pscale)
  if (images.bg) {
    surf.draw(images.bg, pos, images.bg.size)
    surf.draw(images.grass, gpos, images.grass.size)
  }
  if (images.pea) {
    surf.draw(images.pea, ppos, images.pea.size)
  }
  surf.restoreTx()
  surf.end()
}
