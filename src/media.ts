import {Texture} from "tfw/scene2/gl"

export type TexturesOf<T extends {[key :string] :string}> = {[key in keyof T] :Texture}

export const PlantImages = {
  bonkchoy: "plants/bonk-choy.png",
  chomper: "plants/chomper.png",
  five: "plants/pea-five.png",
  gatling: "plants/pea-gatling.png",
  icequeen: "plants/pea-ice-queen.png",
  pea: "plants/pea-bullet.png",
  shooter: "plants/pea-plain.png",
  snapdragon: "plants/snapdragon.png",
  sunflower: "plants/sunflower.png",
  threepeater: "plants/pea-three.png",
  viking: "plants/pea-viking.png",
}

export const ZombImages = {
  adventurer: "zombs/adventurer.png",
  advskull: "zombs/adventure-skull.png",
  cowboy: "zombs/cowboy.png",
  flag: "zombs/flag.png",
  glitter: "zombs/glitter.png",
  jestercake: "zombs/jester-cake.png",
  jetpack: "zombs/jetpack.png",
  onbird: "zombs/onbird.png",
  parka: "zombs/parka.png",
  pirate: "zombs/pirate.png",
  suit: "zombs/suit.png",
  twilight: "zombs/twilight.png",
}

export const GroundImages = {
  ground: "ground.png"
}

export type Textures = {
  plants :TexturesOf<typeof PlantImages>
  zombs  :TexturesOf<typeof ZombImages>
  ground :TexturesOf<typeof GroundImages>
}
