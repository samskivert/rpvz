import {Clock, Loop} from "tfw/core/clock"
import {Color} from "tfw/core/color"
import {Renderer, windowSize} from "tfw/scene2/gl"
import {Surface} from "tfw/scene2/surface"
import {QuadBatch, UniformQuadBatch} from "tfw/scene2/batch"
import {dim2, vec2} from "tfw/core/math"

const root = document.getElementById("root")
if (!root) throw new Error(`No root?`)

const renderer = new Renderer({
  // kind of a hack: when the window size changes, we emit an update with our div size;
  // browsers don't emit resize events for arbitrary divs (there's apparently a proposal, yay)
  size: windowSize(window).map(size => dim2.set(size, root.clientWidth, root.clientHeight)),
  scaleFactor: window.devicePixelRatio,
  gl: {alpha: true}
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

// little demo renderer functions

const pos = vec2.create(), size = dim2.create()
const color = Color.fromRGB(1, 1, 1)

function squares (clock :Clock, _ :QuadBatch, surf :Surface) {
  surf.begin()
  const secs = clock.elapsed, sin = (Math.sin(secs)+1)/2, cos = (Math.cos(secs)+1)/2
  const vsize = renderer.size.current
  const sqSize = 16, hCount = Math.ceil(vsize[0]/sqSize), vCount = Math.ceil(vsize[1]/sqSize)
  dim2.set(size, sqSize, sqSize)
  for (let yy = 0; yy < vCount; yy += 1) {
    for (let xx = 0; xx < hCount; xx += 1) {
      const h = sin * xx * 360 / hCount, s = cos * yy/vCount
      surf.setFillColor(Color.setHSV(color, h, s, 1))
      surf.fillRect(vec2.set(pos, xx*size[0], yy*size[1]), size)
    }
  }
  surf.end()
}
