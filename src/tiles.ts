import {Subject, Value} from "tfw/core/react"
import {Scale} from "tfw/core/ui"
import {GLC, Texture, TextureConfig, makeTexture} from "tfw/scene2/gl"
import {loadImage} from "tfw/core/assets"

/** A mapping from texture id to source image path. */
export type TexSrcs = {[key :string] :string}

/** Loads an id-keyed map of texture image sources into an id-keyed map of textures. */
export function loadTextures<T extends TexSrcs> (
  glc :GLC, srcs :T, scale :number, cfg :TextureConfig = Texture.DefaultConfig
) :Subject<{[key in keyof T] :Texture}> {
  const cfgV = Value.constant({...cfg, scale: new Scale(scale)})
  const keys :string[] = []
  const texs :Subject<Texture>[] = []
  for (let key in srcs) {
    keys.push(key)
    const imgV = loadImage(srcs[key])
    texs.push(makeTexture(glc, imgV, cfgV))
  }
  return Subject.join(...texs).map(texs => {
    const res = {}
    for (let ii = 0; ii < keys.length; ii += 1) res[keys[ii]] = texs[ii]
    return res as {[key in keyof T] :Texture}
  })
}
