import {Subject} from "tfw/core/react"
import {GLC, Texture} from "tfw/scene2/gl"

import {App} from "./app"
import {loadTextures} from "./tiles"
import {PlantImages, ZombImages, MiscImages} from "./media"
import {GameMode} from "./game"

const root = document.getElementById("root")
if (!root) throw new Error(`No root?`)

const app = new App(root)
app.start()

// load our media, then get going
const PixCfg = {...Texture.DefaultConfig, minFilter: GLC.NEAREST, magFilter: GLC.NEAREST}
Subject.join3(
  loadTextures(app.renderer.glc, PlantImages, 2),
  loadTextures(app.renderer.glc, ZombImages, 2),
  loadTextures(app.renderer.glc, MiscImages, 1, PixCfg)
).onValue(([plants, zombs, misc]) => {
  app.setMode(new GameMode(app, {plants, zombs, misc}))
})
