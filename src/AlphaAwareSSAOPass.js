import { Color, MeshNormalMaterial, NoBlending } from 'three';
import { SSAOPass } from 'three/addons/postprocessing/SSAOPass.js';

// SSAOPass's single override material fills the transparent parts of leaf
// cards. Render matching cutouts and wind into its normal/depth buffer instead.
export class AlphaAwareSSAOPass extends SSAOPass {
  constructor(...args) {
    super(...args);
    this.cutoutMaterials = new Map();
  }

  normalFor(source) {
    if (!source.alphaTest) return this.normalMaterial;
    if (this.cutoutMaterials.has(source)) return this.cutoutMaterials.get(source);
    const material = new MeshNormalMaterial({ side: source.side });
    material.blending = NoBlending;
    material.map = source.map;
    material.alphaMap = source.alphaMap;
    material.alphaTest = source.alphaTest;
    material.opacity = source.opacity;
    material.onBeforeCompile = (shader, renderer) => {
      // The leaf material's wind displacement must match the visible pass.
      source.onBeforeCompile(shader, renderer);
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <normal_pars_fragment>', `#include <normal_pars_fragment>
          #include <map_pars_fragment>
          #include <alphamap_pars_fragment>
          #include <alphatest_pars_fragment>`)
        .replace('#include <clipping_planes_fragment>', `#include <clipping_planes_fragment>
          #include <map_fragment>
          #include <alphamap_fragment>
          #include <alphatest_fragment>`);
    };
    material.customProgramCacheKey = () => `alpha-aware:${source.customProgramCacheKey()}`;
    this.cutoutMaterials.set(source, material);
    return material;
  }

  _renderOverride(renderer, overrideMaterial, target, clearColor, clearAlpha) {
    if (overrideMaterial !== this.normalMaterial) {
      return super._renderOverride(renderer, overrideMaterial, target, clearColor, clearAlpha);
    }
    const originals = [], color = renderer.getClearColor(new Color());
    const alpha = renderer.getClearAlpha(), autoClear = renderer.autoClear;
    const sceneOverride = this.scene.overrideMaterial;
    try {
      this.scene.traverse(object => {
        if (!object.isMesh) return;
        originals.push([object, object.material]);
        object.material = Array.isArray(object.material)
          ? object.material.map(material => this.normalFor(material))
          : this.normalFor(object.material);
      });
      this.scene.overrideMaterial = null;
      renderer.setRenderTarget(target);
      renderer.autoClear = false;
      renderer.setClearColor(clearColor, clearAlpha);
      renderer.clear();
      renderer.render(this.scene, this.camera);
    } finally {
      for (const [object, material] of originals) object.material = material;
      this.scene.overrideMaterial = sceneOverride;
      renderer.autoClear = autoClear;
      renderer.setClearColor(color, alpha);
    }
  }

  dispose() {
    for (const material of this.cutoutMaterials.values()) material.dispose();
    this.cutoutMaterials.clear();
    super.dispose();
  }
}
