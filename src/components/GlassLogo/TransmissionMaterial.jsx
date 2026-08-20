import _extends from '@babel/runtime/helpers/esm/extends'
import * as THREE from 'three'
import * as React from 'react'
import { extend, useFrame } from '@react-three/fiber'
import { useFBO } from '@react-three/drei'
import { DiscardMaterial } from '@react-three/drei/materials/DiscardMaterial.js'

// Fork of @react-three/drei's MeshTransmissionMaterial with exactly one
// change: the backdrop-capture render targets are made square.
//
// Root cause of the "vertical cuts" artifact on the About Us glass panel
// (and a latent, currently-masked version of the same bug on the hero
// logo): drei's own useFBO(width, height) treats a *single* numeric
// argument as width only — if height is omitted it falls back to the full
// real canvas height in device pixels. The upstream component calls
// `useFBO(resolution)` with just one argument, so the backdrop capture
// this material renders every frame ends up `resolution` px wide by
// ~canvas-height-in-device-pixels tall (e.g. 256 x ~1800 for the panel at
// resolution=256) instead of the square resolution x resolution buffer the
// `resolution` prop is meant to describe. That buffer is a full render of
// the visible scene, so the whole screen's horizontal detail — including
// the photo's hard edges — gets crushed into a couple hundred columns,
// which quantizes onto a sparse, coarse set of texels and shows up as
// visible vertical seams that hop between columns as the photo moves.
// Passing both arguments here keeps the capture actually square, which is
// what `resolution` was always meant to mean.
class MeshTransmissionMaterialImpl extends THREE.MeshPhysicalMaterial {
  constructor(samples = 6, transmissionSampler = false) {
    super()
    this.uniforms = {
      chromaticAberration: { value: 0.05 },
      transmission: { value: 0 },
      _transmission: { value: 1 },
      transmissionMap: { value: null },
      roughness: { value: 0 },
      thickness: { value: 0 },
      thicknessMap: { value: null },
      attenuationDistance: { value: Infinity },
      attenuationColor: { value: new THREE.Color('white') },
      anisotropicBlur: { value: 0.1 },
      time: { value: 0 },
      distortion: { value: 0.0 },
      distortionScale: { value: 0.5 },
      temporalDistortion: { value: 0.0 },
      buffer: { value: null },
    }
    this.onBeforeCompile = (shader) => {
      shader.uniforms = {
        ...shader.uniforms,
        ...this.uniforms,
      }

      if (this.anisotropy > 0) shader.defines.USE_ANISOTROPY = ''

      if (transmissionSampler) shader.defines.USE_SAMPLER = ''
      else shader.defines.USE_TRANSMISSION = ''

      shader.fragmentShader = /*glsl*/ `
      uniform float chromaticAberration;
      uniform float anisotropicBlur;
      uniform float time;
      uniform float distortion;
      uniform float distortionScale;
      uniform float temporalDistortion;
      uniform sampler2D buffer;

      vec3 random3(vec3 c) {
        float j = 4096.0*sin(dot(c,vec3(17.0, 59.4, 15.0)));
        vec3 r;
        r.z = fract(512.0*j);
        j *= .125;
        r.x = fract(512.0*j);
        j *= .125;
        r.y = fract(512.0*j);
        return r-0.5;
      }

      uint hash( uint x ) {
        x += ( x << 10u );
        x ^= ( x >>  6u );
        x += ( x <<  3u );
        x ^= ( x >> 11u );
        x += ( x << 15u );
        return x;
      }

      uint hash( uvec2 v ) { return hash( v.x ^ hash(v.y)                         ); }
      uint hash( uvec3 v ) { return hash( v.x ^ hash(v.y) ^ hash(v.z)             ); }
      uint hash( uvec4 v ) { return hash( v.x ^ hash(v.y) ^ hash(v.z) ^ hash(v.w) ); }

      float floatConstruct( uint m ) {
        const uint ieeeMantissa = 0x007FFFFFu;
        const uint ieeeOne      = 0x3F800000u;
        m &= ieeeMantissa;
        m |= ieeeOne;
        float  f = uintBitsToFloat( m );
        return f - 1.0;
      }

      float randomBase( float x ) { return floatConstruct(hash(floatBitsToUint(x))); }
      float randomBase( vec2  v ) { return floatConstruct(hash(floatBitsToUint(v))); }
      float randomBase( vec3  v ) { return floatConstruct(hash(floatBitsToUint(v))); }
      float randomBase( vec4  v ) { return floatConstruct(hash(floatBitsToUint(v))); }
      float rand(float seed) {
        float result = randomBase(vec3(gl_FragCoord.xy, seed));
        return result;
      }

      const float F3 =  0.3333333;
      const float G3 =  0.1666667;

      float snoise(vec3 p) {
        vec3 s = floor(p + dot(p, vec3(F3)));
        vec3 x = p - s + dot(s, vec3(G3));
        vec3 e = step(vec3(0.0), x - x.yzx);
        vec3 i1 = e*(1.0 - e.zxy);
        vec3 i2 = 1.0 - e.zxy*(1.0 - e);
        vec3 x1 = x - i1 + G3;
        vec3 x2 = x - i2 + 2.0*G3;
        vec3 x3 = x - 1.0 + 3.0*G3;
        vec4 w, d;
        w.x = dot(x, x);
        w.y = dot(x1, x1);
        w.z = dot(x2, x2);
        w.w = dot(x3, x3);
        w = max(0.6 - w, 0.0);
        d.x = dot(random3(s), x);
        d.y = dot(random3(s + i1), x1);
        d.z = dot(random3(s + i2), x2);
        d.w = dot(random3(s + 1.0), x3);
        w *= w;
        w *= w;
        d *= w;
        return dot(d, vec4(52.0));
      }

      float snoiseFractal(vec3 m) {
        return 0.5333333* snoise(m)
              +0.2666667* snoise(2.0*m)
              +0.1333333* snoise(4.0*m)
              +0.0666667* snoise(8.0*m);
      }\n` + shader.fragmentShader

      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <transmission_pars_fragment>',
        /*glsl*/ `
        #ifdef USE_TRANSMISSION
          uniform float _transmission;
          uniform float thickness;
          uniform float attenuationDistance;
          uniform vec3 attenuationColor;
          #ifdef USE_TRANSMISSIONMAP
            uniform sampler2D transmissionMap;
          #endif
          #ifdef USE_THICKNESSMAP
            uniform sampler2D thicknessMap;
          #endif
          uniform vec2 transmissionSamplerSize;
          uniform sampler2D transmissionSamplerMap;
          uniform mat4 modelMatrix;
          uniform mat4 projectionMatrix;
          varying vec3 vWorldPosition;
          vec3 getVolumeTransmissionRay( const in vec3 n, const in vec3 v, const in float thickness, const in float ior, const in mat4 modelMatrix ) {
            vec3 refractionVector = refract( - v, normalize( n ), 1.0 / ior );
            vec3 modelScale;
            modelScale.x = length( vec3( modelMatrix[ 0 ].xyz ) );
            modelScale.y = length( vec3( modelMatrix[ 1 ].xyz ) );
            modelScale.z = length( vec3( modelMatrix[ 2 ].xyz ) );
            return normalize( refractionVector ) * thickness * modelScale;
          }
          float applyIorToRoughness( const in float roughness, const in float ior ) {
            return roughness * clamp( ior * 2.0 - 2.0, 0.0, 1.0 );
          }
          vec4 getTransmissionSample( const in vec2 fragCoord, const in float roughness, const in float ior ) {
            float framebufferLod = log2( transmissionSamplerSize.x ) * applyIorToRoughness( roughness, ior );
            #ifdef USE_SAMPLER
              #ifdef texture2DLodEXT
                return texture2DLodEXT(transmissionSamplerMap, fragCoord.xy, framebufferLod);
              #else
                return texture2D(transmissionSamplerMap, fragCoord.xy, framebufferLod);
              #endif
            #else
              return texture2D(buffer, fragCoord.xy);
            #endif
          }
          vec3 applyVolumeAttenuation( const in vec3 radiance, const in float transmissionDistance, const in vec3 attenuationColor, const in float attenuationDistance ) {
            if ( isinf( attenuationDistance ) ) {
              return radiance;
            } else {
              vec3 attenuationCoefficient = -log( attenuationColor ) / attenuationDistance;
              vec3 transmittance = exp( - attenuationCoefficient * transmissionDistance );
              return transmittance * radiance;
            }
          }
          vec4 getIBLVolumeRefraction( const in vec3 n, const in vec3 v, const in float roughness, const in vec3 diffuseColor,
            const in vec3 specularColor, const in float specularF90, const in vec3 position, const in mat4 modelMatrix,
            const in mat4 viewMatrix, const in mat4 projMatrix, const in float ior, const in float thickness,
            const in vec3 attenuationColor, const in float attenuationDistance ) {
            vec3 transmissionRay = getVolumeTransmissionRay( n, v, thickness, ior, modelMatrix );
            vec3 refractedRayExit = position + transmissionRay;
            vec4 ndcPos = projMatrix * viewMatrix * vec4( refractedRayExit, 1.0 );
            vec2 refractionCoords = ndcPos.xy / ndcPos.w;
            refractionCoords += 1.0;
            refractionCoords /= 2.0;
            vec4 transmittedLight = getTransmissionSample( refractionCoords, roughness, ior );
            vec3 attenuatedColor = applyVolumeAttenuation( transmittedLight.rgb, length( transmissionRay ), attenuationColor, attenuationDistance );
            vec3 F = EnvironmentBRDF( n, v, specularColor, specularF90, roughness );
            return vec4( ( 1.0 - F ) * attenuatedColor * diffuseColor, transmittedLight.a );
          }
        #endif\n`
      )

      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <transmission_fragment>',
        /*glsl*/ `
        material.transmission = _transmission;
        material.transmissionAlpha = 1.0;
        material.thickness = thickness;
        material.attenuationDistance = attenuationDistance;
        material.attenuationColor = attenuationColor;
        #ifdef USE_TRANSMISSIONMAP
          material.transmission *= texture2D( transmissionMap, vUv ).r;
        #endif
        #ifdef USE_THICKNESSMAP
          material.thickness *= texture2D( thicknessMap, vUv ).g;
        #endif

        vec3 pos = vWorldPosition;
        float runningSeed = 0.0;
        vec3 v = normalize( cameraPosition - pos );
        vec3 n = inverseTransformDirection( normal, viewMatrix );
        vec3 transmission = vec3(0.0);
        float transmissionR, transmissionB, transmissionG;
        float randomCoords = rand(runningSeed++);
        float thickness_smear = thickness * max(pow(roughnessFactor, 0.33), anisotropicBlur);
        vec3 distortionNormal = vec3(0.0);
        vec3 temporalOffset = vec3(time, -time, -time) * temporalDistortion;
        if (distortion > 0.0) {
          distortionNormal = distortion * vec3(snoiseFractal(vec3((pos * distortionScale + temporalOffset))), snoiseFractal(vec3(pos.zxy * distortionScale - temporalOffset)), snoiseFractal(vec3(pos.yxz * distortionScale + temporalOffset)));
        }
        for (float i = 0.0; i < ${samples}.0; i ++) {
          vec3 sampleNorm = normalize(n + roughnessFactor * roughnessFactor * 2.0 * normalize(vec3(rand(runningSeed++) - 0.5, rand(runningSeed++) - 0.5, rand(runningSeed++) - 0.5)) * pow(rand(runningSeed++), 0.33) + distortionNormal);
          transmissionR = getIBLVolumeRefraction(
            sampleNorm, v, material.roughness, material.diffuseColor, material.specularColor, material.specularF90,
            pos, modelMatrix, viewMatrix, projectionMatrix, material.ior, material.thickness  + thickness_smear * (i + randomCoords) / float(${samples}),
            material.attenuationColor, material.attenuationDistance
          ).r;
          transmissionG = getIBLVolumeRefraction(
            sampleNorm, v, material.roughness, material.diffuseColor, material.specularColor, material.specularF90,
            pos, modelMatrix, viewMatrix, projectionMatrix, material.ior  * (1.0 + chromaticAberration * (i + randomCoords) / float(${samples})) , material.thickness + thickness_smear * (i + randomCoords) / float(${samples}),
            material.attenuationColor, material.attenuationDistance
          ).g;
          transmissionB = getIBLVolumeRefraction(
            sampleNorm, v, material.roughness, material.diffuseColor, material.specularColor, material.specularF90,
            pos, modelMatrix, viewMatrix, projectionMatrix, material.ior * (1.0 + 2.0 * chromaticAberration * (i + randomCoords) / float(${samples})), material.thickness + thickness_smear * (i + randomCoords) / float(${samples}),
            material.attenuationColor, material.attenuationDistance
          ).b;
          transmission.r += transmissionR;
          transmission.g += transmissionG;
          transmission.b += transmissionB;
        }
        transmission /= ${samples}.0;
        totalDiffuse = mix( totalDiffuse, transmission.rgb, material.transmission );\n`
      )
    }
    Object.keys(this.uniforms).forEach((name) =>
      Object.defineProperty(this, name, {
        get: () => this.uniforms[name].value,
        set: (v) => (this.uniforms[name].value = v),
      })
    )
  }
}

export const TransmissionMaterial = /* @__PURE__ */ React.forwardRef(
  (
    {
      buffer,
      transmissionSampler = false,
      backside = false,
      side = THREE.FrontSide,
      transmission = 1,
      thickness = 0,
      backsideThickness = 0,
      backsideEnvMapIntensity = 1,
      samples = 10,
      resolution,
      backsideResolution,
      background,
      anisotropy,
      anisotropicBlur,
      // Gates only the *ongoing* per-frame backdrop capture below (two
      // extra full-scene renders to the FBO targets every frame it's on) —
      // the element itself stays mounted regardless, so its FBO
      // allocation and first shader compile happen once, whenever the
      // caller first mounts it, not repeatedly every time `active` flips
      // true. A caller that toggles this on/off a lot (the About Us
      // badge, mounted once at scene-ready but only meant to pay its real
      // per-frame cost while actually visible/open — see
      // GoogleCloudGlassBadge's own comment) gets to skip that ongoing
      // cost while inactive without paying a fresh mount cost each time
      // it re-activates, unlike the hero's own logo which never toggles
      // this at all (default true).
      active = true,
      ...props
    },
    fref
  ) => {
    extend({ TransmissionMaterialImpl: MeshTransmissionMaterialImpl })
    const ref = React.useRef(null)
    const [discardMaterial] = React.useState(() => new DiscardMaterial())
    // The one deliberate change from drei's upstream component: pass an
    // explicit height so the capture is resolution x resolution instead of
    // resolution x (full canvas height in device pixels). See the module
    // comment above.
    const fboBack = useFBO(backsideResolution || resolution, backsideResolution || resolution)
    const fboMain = useFBO(resolution, resolution)
    let oldBg
    let oldEnvMapIntensity
    let oldTone
    let parent
    useFrame((state) => {
      ref.current.time = state.clock.elapsedTime
      if (active && ref.current.buffer === fboMain.texture && !transmissionSampler) {
        parent = ref.current.__r3f?.parent?.object
        if (parent) {
          oldTone = state.gl.toneMapping
          oldBg = state.scene.background
          oldEnvMapIntensity = ref.current.envMapIntensity

          state.gl.toneMapping = THREE.NoToneMapping
          if (background) state.scene.background = background
          parent.material = discardMaterial
          if (backside) {
            state.gl.setRenderTarget(fboBack)
            state.gl.render(state.scene, state.camera)
            parent.material = ref.current
            parent.material.buffer = fboBack.texture
            parent.material.thickness = backsideThickness
            parent.material.side = THREE.BackSide
            parent.material.envMapIntensity = backsideEnvMapIntensity
          }

          state.gl.setRenderTarget(fboMain)
          state.gl.render(state.scene, state.camera)
          parent.material = ref.current
          parent.material.thickness = thickness
          parent.material.side = side
          parent.material.buffer = fboMain.texture
          parent.material.envMapIntensity = oldEnvMapIntensity

          state.scene.background = oldBg
          state.gl.setRenderTarget(null)
          state.gl.toneMapping = oldTone
        }
      }
    })

    React.useImperativeHandle(fref, () => ref.current, [])
    return /*#__PURE__*/ React.createElement(
      'transmissionMaterialImpl',
      _extends(
        {
          args: [samples, transmissionSampler],
          ref: ref,
        },
        props,
        {
          buffer: buffer || fboMain.texture,
          _transmission: transmission,
          anisotropicBlur: anisotropicBlur ?? anisotropy,
          transmission: transmissionSampler ? transmission : 0,
          thickness: thickness,
          side: side,
        }
      )
    )
  }
)

export default TransmissionMaterial
