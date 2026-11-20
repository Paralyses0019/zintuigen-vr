# Aanvulling ronde 6

| Lokale bestanden | Gebruik en maker | Bron en licentie |
| --- | --- | --- |
| `assets/rough_linen/{color,normal,roughness}.jpg` | Canvastent. Foto door colormass, bewerking door Rico Cilliers. Diffuse map lokaal crème getint. | [Rough Linen, Poly Haven](https://polyhaven.com/a/rough_linen) · CC0-1.0 |
| `assets/fabric_pattern_05/{color,normal,roughness}.jpg` | Geruite plaid, Rob Tuytel. Kleurvariant col_01. | [Fabric Pattern 05, Poly Haven](https://polyhaven.com/a/fabric_pattern_05) · CC0-1.0 |

De zes 1K-kaarten worden uitsluitend lokaal geladen. De afzonderlijke download-URL's staan in `assets/sources.json`. Tent, lantaarn, mok, liftschacht, schimmen, zwermbeweging, regenschaduwen en aanvullende gesynthetiseerde geluiden zijn eigen procedureel werk (CC0-1.0). De bestaande opnames voor onder meer dakregen, vuur en voetstappen staan hieronder.

# Bronnen ? ronde 4

Alle media staan lokaal in `assets/`. Geen externe verzoeken tijdens een beleving. De download-URL?s hieronder dienen alleen als bronvermelding; `assets/sources.json` bevat het machineleesbare overzicht. Geraadpleegd op 19 november 2026.

## Beeld en modellen

Poly Haven: [CC0-voorwaarden](https://polyhaven.com/license). Foto-PBR: kleur, OpenGL-normal en roughness op 1K. De tonemapped panorama?s zijn naar 2048?1024 JPG verkleind; de 1K HDR-bestanden leveren PMREM-omgevingslicht. `approaching_storm` is voor de nachtopstelling donker gekleurd.

Hand- en controllermodellen: `@webxr-input-profiles/assets`, npm-resolutie 1.0.20, MIT (dus bibliotheek-/inputmodellen, geen CC0-omgevingsmedia). Copyright Amazon; volledige tekst in `vendor/profiles/LICENSE.md`. Generic hand, generic trigger en Oculus/Quest-profielen zijn lokaal meegeleverd.

## Opnames

Elke gebruikte Freesound-pagina is gecontroleerd op de CC0-1.0-licentielink. Het betreft echte opnames, geen als AI of synthesizer beschreven geluiden. Lokale OGG/Vorbis-versies: 32 kHz; mono voor positiebronnen, stereo uitsluitend voor bestanden met `-bed`. Fragmenten van maximaal 30 seconden uit de openbare HQ-preview, bij de lange tentdoekopname de eerste 24 seconden. De licentie geldt ook voor de bewerkte fragmenten.

- Rain_01.wav ? Q.K.; Wind howling, Wind whispering, Wind whistles through my door ? Borgory.
- Fire Crackling 01.wav ? kingsrow; Night crickets ? Vrymaa.
- Drops rain close-up on yurt ? bruno.auzet: gebruikt als regen op het dak.
- Metal Door Impacted, Swings open ? DeqstersLab; combineert CC0-bronnen van pagancow (15315) en adcbicycle (13895). Ook gebruikt als verre metalen landingsklank.
- ConcreteFootsteps.wav ? JamGrif; Water drop (splash) ? bolkmar; Distant Thunder 3 ? Fission9.

De lifttoon, warme toon en herkenbare piektonen blijven bewust synthetisch. De luchtstoot en ontsteekklank zijn gefilterde fragmenten van wind/vuur. De galm gebruikt een lokaal gegenereerde impulsrespons.

## Bestanden en exacte bron-URL?s

| Lokaal bestand / naam | Bronpagina | Download | Licentie |
|---|---|---|---|
| `assets/approaching_storm/environment.hdr` | [bron](https://polyhaven.com/a/approaching_storm) | [bestand](https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/approaching_storm_1k.hdr) | CC0-1.0 |
| `assets/approaching_storm/sky.jpg` | [bron](https://polyhaven.com/a/approaching_storm) | [bestand](https://dl.polyhaven.org/file/ph-assets/HDRIs/extra/Tonemapped%20JPG/approaching_storm.jpg) | CC0-1.0 |
| `assets/audio/crickets-bed.ogg` | [bron](https://freesound.org/people/Vrymaa/sounds/734642/) | [bestand](https://cdn.freesound.org/previews/734/734642_13973196-hq.mp3) | CC0-1.0 |
| `assets/audio/crickets.ogg` | [bron](https://freesound.org/people/Vrymaa/sounds/734642/) | [bestand](https://cdn.freesound.org/previews/734/734642_13973196-hq.mp3) | CC0-1.0 |
| `assets/audio/door.ogg` | [bron](https://freesound.org/people/DeqstersLab/sounds/767041/) | [bestand](https://cdn.freesound.org/previews/767/767041_189858-hq.mp3) | CC0-1.0 |
| `assets/audio/drop.ogg` | [bron](https://freesound.org/people/bolkmar/sounds/451126/) | [bestand](https://cdn.freesound.org/previews/451/451126_2927958-hq.mp3) | CC0-1.0 |
| `assets/audio/fire.ogg` | [bron](https://freesound.org/people/kingsrow/sounds/181563/) | [bestand](https://cdn.freesound.org/previews/181/181563_1857065-hq.mp3) | CC0-1.0 |
| `assets/audio/rain-bed.ogg` | [bron](https://freesound.org/people/Q.K./sounds/56306/) | [bestand](https://cdn.freesound.org/previews/56/56306_91374-hq.mp3) | CC0-1.0 |
| `assets/audio/rain.ogg` | [bron](https://freesound.org/people/Q.K./sounds/56306/) | [bestand](https://cdn.freesound.org/previews/56/56306_91374-hq.mp3) | CC0-1.0 |
| `assets/audio/roof.ogg` | [bron](https://freesound.org/people/bruno.auzet/sounds/736845/) | [bestand](https://cdn.freesound.org/previews/736/736845_11519060-hq.mp3) | CC0-1.0 |
| `assets/audio/steps.ogg` | [bron](https://freesound.org/people/JamGrif/sounds/554380/) | [bestand](https://cdn.freesound.org/previews/554/554380_12197305-hq.mp3) | CC0-1.0 |
| `assets/audio/thunder.ogg` | [bron](https://freesound.org/people/Fission9/sounds/581124/) | [bestand](https://cdn.freesound.org/previews/581/581124_9395330-hq.mp3) | CC0-1.0 |
| `assets/audio/wind-bed.ogg` | [bron](https://freesound.org/people/Borgory/sounds/728737/) | [bestand](https://cdn.freesound.org/previews/728/728737_801011-hq.mp3) | CC0-1.0 |
| `assets/audio/wind.ogg` | [bron](https://freesound.org/people/Borgory/sounds/728737/) | [bestand](https://cdn.freesound.org/previews/728/728737_801011-hq.mp3) | CC0-1.0 |
| `assets/brown_mud/color.jpg` | [bron](https://polyhaven.com/a/brown_mud) | [bestand](https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/brown_mud/brown_mud_diff_1k.jpg) | CC0-1.0 |
| `assets/brown_mud/normal.jpg` | [bron](https://polyhaven.com/a/brown_mud) | [bestand](https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/brown_mud/brown_mud_nor_gl_1k.jpg) | CC0-1.0 |
| `assets/brown_mud/roughness.jpg` | [bron](https://polyhaven.com/a/brown_mud) | [bestand](https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/brown_mud/brown_mud_rough_1k.jpg) | CC0-1.0 |
| `assets/metal_plate/color.jpg` | [bron](https://polyhaven.com/a/metal_plate) | [bestand](https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/metal_plate/metal_plate_diff_1k.jpg) | CC0-1.0 |
| `assets/metal_plate/normal.jpg` | [bron](https://polyhaven.com/a/metal_plate) | [bestand](https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/metal_plate/metal_plate_nor_gl_1k.jpg) | CC0-1.0 |
| `assets/metal_plate/roughness.jpg` | [bron](https://polyhaven.com/a/metal_plate) | [bestand](https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/metal_plate/metal_plate_rough_1k.jpg) | CC0-1.0 |
| `assets/rogland_moonlit_night/environment.hdr` | [bron](https://polyhaven.com/a/rogland_moonlit_night) | [bestand](https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/rogland_moonlit_night_1k.hdr) | CC0-1.0 |
| `assets/rogland_moonlit_night/sky.jpg` | [bron](https://polyhaven.com/a/rogland_moonlit_night) | [bestand](https://dl.polyhaven.org/file/ph-assets/HDRIs/extra/Tonemapped%20JPG/rogland_moonlit_night.jpg) | CC0-1.0 |
| `assets/rough_wood/color.jpg` | [bron](https://polyhaven.com/a/rough_wood) | [bestand](https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/rough_wood/rough_wood_diff_1k.jpg) | CC0-1.0 |
| `assets/rough_wood/normal.jpg` | [bron](https://polyhaven.com/a/rough_wood) | [bestand](https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/rough_wood/rough_wood_nor_gl_1k.jpg) | CC0-1.0 |
| `assets/rough_wood/roughness.jpg` | [bron](https://polyhaven.com/a/rough_wood) | [bestand](https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/rough_wood/rough_wood_rough_1k.jpg) | CC0-1.0 |
| `vendor/libs/MOTION-CONTROLLERS-LICENSE.md` | [bron](https://raw.githubusercontent.com/immersive-web/webxr-input-profiles/main/packages/motion-controllers/LICENSE.md) | [bestand](https://raw.githubusercontent.com/immersive-web/webxr-input-profiles/main/packages/motion-controllers/LICENSE.md) | MIT |
| `vendor/libs/motion-controllers.module.js` | [bron](https://raw.githubusercontent.com/mrdoob/three.js/r180/examples/jsm/libs/motion-controllers.module.js) | [bestand](https://raw.githubusercontent.com/mrdoob/three.js/r180/examples/jsm/libs/motion-controllers.module.js) | MIT |
| `vendor/loaders/GLTFLoader.js` | [bron](https://raw.githubusercontent.com/mrdoob/three.js/r180/examples/jsm/loaders/GLTFLoader.js) | [bestand](https://raw.githubusercontent.com/mrdoob/three.js/r180/examples/jsm/loaders/GLTFLoader.js) | MIT |
| `vendor/loaders/HDRLoader.js` | [bron](https://raw.githubusercontent.com/mrdoob/three.js/r180/examples/jsm/loaders/HDRLoader.js) | [bestand](https://raw.githubusercontent.com/mrdoob/three.js/r180/examples/jsm/loaders/HDRLoader.js) | MIT |
| `vendor/loaders/RGBELoader.js` | [bron](https://raw.githubusercontent.com/mrdoob/three.js/r180/examples/jsm/loaders/RGBELoader.js) | [bestand](https://raw.githubusercontent.com/mrdoob/three.js/r180/examples/jsm/loaders/RGBELoader.js) | MIT |
| `vendor/profiles/LICENSE.md` | [bron](https://github.com/immersive-web/webxr-input-profiles/tree/main/packages/assets) | [bestand](https://raw.githubusercontent.com/immersive-web/webxr-input-profiles/main/packages/assets/LICENSE.md) | MIT |
| `vendor/profiles/generic-hand/left.glb` | [bron](https://cdn.jsdelivr.net/npm/@webxr-input-profiles/assets@1.0/dist/profiles/generic-hand/left.glb) | [bestand](https://cdn.jsdelivr.net/npm/@webxr-input-profiles/assets@1.0/dist/profiles/generic-hand/left.glb) | MIT |
| `vendor/profiles/generic-hand/right.glb` | [bron](https://cdn.jsdelivr.net/npm/@webxr-input-profiles/assets@1.0/dist/profiles/generic-hand/right.glb) | [bestand](https://cdn.jsdelivr.net/npm/@webxr-input-profiles/assets@1.0/dist/profiles/generic-hand/right.glb) | MIT |
| `vendor/profiles/generic-trigger/left.glb` | [bron](https://cdn.jsdelivr.net/npm/@webxr-input-profiles/assets@1.0/dist/profiles/generic-trigger/left.glb) | [bestand](https://cdn.jsdelivr.net/npm/@webxr-input-profiles/assets@1.0/dist/profiles/generic-trigger/left.glb) | MIT |
| `vendor/profiles/generic-trigger/none.glb` | [bron](https://cdn.jsdelivr.net/npm/@webxr-input-profiles/assets@1.0/dist/profiles/generic-trigger/none.glb) | [bestand](https://cdn.jsdelivr.net/npm/@webxr-input-profiles/assets@1.0/dist/profiles/generic-trigger/none.glb) | MIT |
| `vendor/profiles/generic-trigger/profile.json` | [bron](https://cdn.jsdelivr.net/npm/@webxr-input-profiles/assets@1.0/dist/profiles/generic-trigger/profile.json) | [bestand](https://cdn.jsdelivr.net/npm/@webxr-input-profiles/assets@1.0/dist/profiles/generic-trigger/profile.json) | MIT |
| `vendor/profiles/generic-trigger/right.glb` | [bron](https://cdn.jsdelivr.net/npm/@webxr-input-profiles/assets@1.0/dist/profiles/generic-trigger/right.glb) | [bestand](https://cdn.jsdelivr.net/npm/@webxr-input-profiles/assets@1.0/dist/profiles/generic-trigger/right.glb) | MIT |
| `vendor/profiles/meta-quest-touch-plus/left.glb` | [bron](https://cdn.jsdelivr.net/npm/@webxr-input-profiles/assets@1.0/dist/profiles/meta-quest-touch-plus/left.glb) | [bestand](https://cdn.jsdelivr.net/npm/@webxr-input-profiles/assets@1.0/dist/profiles/meta-quest-touch-plus/left.glb) | MIT |
| `vendor/profiles/meta-quest-touch-plus/profile.json` | [bron](https://cdn.jsdelivr.net/npm/@webxr-input-profiles/assets@1.0/dist/profiles/meta-quest-touch-plus/profile.json) | [bestand](https://cdn.jsdelivr.net/npm/@webxr-input-profiles/assets@1.0/dist/profiles/meta-quest-touch-plus/profile.json) | MIT |
| `vendor/profiles/meta-quest-touch-plus/right.glb` | [bron](https://cdn.jsdelivr.net/npm/@webxr-input-profiles/assets@1.0/dist/profiles/meta-quest-touch-plus/right.glb) | [bestand](https://cdn.jsdelivr.net/npm/@webxr-input-profiles/assets@1.0/dist/profiles/meta-quest-touch-plus/right.glb) | MIT |
| `vendor/profiles/oculus-touch-v2/left.glb` | [bron](https://cdn.jsdelivr.net/npm/@webxr-input-profiles/assets@1.0/dist/profiles/oculus-touch-v2/left.glb) | [bestand](https://cdn.jsdelivr.net/npm/@webxr-input-profiles/assets@1.0/dist/profiles/oculus-touch-v2/left.glb) | MIT |
| `vendor/profiles/oculus-touch-v2/profile.json` | [bron](https://cdn.jsdelivr.net/npm/@webxr-input-profiles/assets@1.0/dist/profiles/oculus-touch-v2/profile.json) | [bestand](https://cdn.jsdelivr.net/npm/@webxr-input-profiles/assets@1.0/dist/profiles/oculus-touch-v2/profile.json) | MIT |
| `vendor/profiles/oculus-touch-v2/right.glb` | [bron](https://cdn.jsdelivr.net/npm/@webxr-input-profiles/assets@1.0/dist/profiles/oculus-touch-v2/right.glb) | [bestand](https://cdn.jsdelivr.net/npm/@webxr-input-profiles/assets@1.0/dist/profiles/oculus-touch-v2/right.glb) | MIT |
| `vendor/profiles/oculus-touch-v3/left.glb` | [bron](https://cdn.jsdelivr.net/npm/@webxr-input-profiles/assets@1.0/dist/profiles/oculus-touch-v3/left.glb) | [bestand](https://cdn.jsdelivr.net/npm/@webxr-input-profiles/assets@1.0/dist/profiles/oculus-touch-v3/left.glb) | MIT |
| `vendor/profiles/oculus-touch-v3/profile.json` | [bron](https://cdn.jsdelivr.net/npm/@webxr-input-profiles/assets@1.0/dist/profiles/oculus-touch-v3/profile.json) | [bestand](https://cdn.jsdelivr.net/npm/@webxr-input-profiles/assets@1.0/dist/profiles/oculus-touch-v3/profile.json) | MIT |
| `vendor/profiles/oculus-touch-v3/right.glb` | [bron](https://cdn.jsdelivr.net/npm/@webxr-input-profiles/assets@1.0/dist/profiles/oculus-touch-v3/right.glb) | [bestand](https://cdn.jsdelivr.net/npm/@webxr-input-profiles/assets@1.0/dist/profiles/oculus-touch-v3/right.glb) | MIT |
| `vendor/profiles/oculus-touch/left.glb` | [bron](https://cdn.jsdelivr.net/npm/@webxr-input-profiles/assets@1.0/dist/profiles/oculus-touch/left.glb) | [bestand](https://cdn.jsdelivr.net/npm/@webxr-input-profiles/assets@1.0/dist/profiles/oculus-touch/left.glb) | MIT |
| `vendor/profiles/oculus-touch/profile.json` | [bron](https://cdn.jsdelivr.net/npm/@webxr-input-profiles/assets@1.0/dist/profiles/oculus-touch/profile.json) | [bestand](https://cdn.jsdelivr.net/npm/@webxr-input-profiles/assets@1.0/dist/profiles/oculus-touch/profile.json) | MIT |
| `vendor/profiles/oculus-touch/right.glb` | [bron](https://cdn.jsdelivr.net/npm/@webxr-input-profiles/assets@1.0/dist/profiles/oculus-touch/right.glb) | [bestand](https://cdn.jsdelivr.net/npm/@webxr-input-profiles/assets@1.0/dist/profiles/oculus-touch/right.glb) | MIT |
| `vendor/profiles/profilesList.json` | [bron](https://cdn.jsdelivr.net/npm/@webxr-input-profiles/assets@1.0/dist/profiles/profilesList.json) | [bestand](https://cdn.jsdelivr.net/npm/@webxr-input-profiles/assets@1.0/dist/profiles/profilesList.json) | MIT |
| `vendor/utils/BufferGeometryUtils.js` | [bron](https://raw.githubusercontent.com/mrdoob/three.js/r180/examples/jsm/utils/BufferGeometryUtils.js) | [bestand](https://raw.githubusercontent.com/mrdoob/three.js/r180/examples/jsm/utils/BufferGeometryUtils.js) | MIT |
| `vendor/webxr/XRControllerModelFactory.js` | [bron](https://raw.githubusercontent.com/mrdoob/three.js/r180/examples/jsm/webxr/XRControllerModelFactory.js) | [bestand](https://raw.githubusercontent.com/mrdoob/three.js/r180/examples/jsm/webxr/XRControllerModelFactory.js) | MIT |
| `vendor/webxr/XRHandMeshModel.js` | [bron](https://raw.githubusercontent.com/mrdoob/three.js/r180/examples/jsm/webxr/XRHandMeshModel.js) | [bestand](https://raw.githubusercontent.com/mrdoob/three.js/r180/examples/jsm/webxr/XRHandMeshModel.js) | MIT |
| `vendor/webxr/XRHandModelFactory.js` | [bron](https://raw.githubusercontent.com/mrdoob/three.js/r180/examples/jsm/webxr/XRHandModelFactory.js) | [bestand](https://raw.githubusercontent.com/mrdoob/three.js/r180/examples/jsm/webxr/XRHandModelFactory.js) | MIT |
| `vendor/webxr/XRHandPrimitiveModel.js` | [bron](https://raw.githubusercontent.com/mrdoob/three.js/r180/examples/jsm/webxr/XRHandPrimitiveModel.js) | [bestand](https://raw.githubusercontent.com/mrdoob/three.js/r180/examples/jsm/webxr/XRHandPrimitiveModel.js) | MIT |

## Code en oorspronkelijke vormgeving

- three.js **r180**, ongewijzigde `vendor/three.module.js` en `vendor/three.core.js`, plus oorspronkelijke VRButton en ARButton: [three.js](https://github.com/mrdoob/three.js/tree/r180), MIT; `vendor/THREE-LICENSE.txt`.
- Toegevoegde addons en hun imports komen exact uit de r180-tag. Motion controllers: MIT, licentietekst in `vendor/libs/MOTION-CONTROLLERS-LICENSE.md`.
- Eigen radiale sprites, regenlijnen, wolkensluiers, stadspunten en insectenbanen uit de eerdere rondes blijven in gebruik. Geen externe demoshaders overgenomen. De eerder als CC0 aangeboden procedurele vormgeving blijft CC0-1.0.
- `tools/fetch_assets.py` is uitsluitend een bouwscript met internettoegang; de website voert het niet uit.


## Ronde 5 ? De plank

- `gedeeld/plank-stad.js`: oorspronkelijke procedurele stadsgeometrie, raamshader, verkeersbanen en gesynthetiseerde stadsruis/sirene; voor dit project gemaakt en aangeboden onder CC0-1.0. Geen externe stadsbeelden, shaders, modellen of geluidsopnames overgenomen; geen nieuwe mediabestanden. De synthese gebruikt de bestaande deterministische ruisbuffer en WebAudio-oscillator.
- `belevingen/plank.js`: uitsluitend bij De plank is het zichtbare Rogland-panorama vervangen door de procedurele nachtlucht met zwakke oranje gloed. De hierboven vermelde CC0-HDR blijft omgevingslicht leveren; hout, metaal en wind behouden hun bestaande bron/licentie. De deur-opname blijft de piekcue op 01:00; deze wordt hier niet meer als landing gebruikt.
- Wolken gebruiken de bestaande eigen CC0-ruissluier in `gedeeld/licht.js`, nu in twee lagen. Alle nieuwe procedurele onderdelen werken lokaal, zonder externe netwerkverzoeken.
