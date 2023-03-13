import * as THREE from 'https://cdn.skypack.dev/three@0.150.0'
import { OrbitControls } from 'https://unpkg.com/three@0.150.0/examples/jsm/controls/OrbitControls.js'
import { GLTFLoader } from 'https://unpkg.com/three@0.150.0/examples/jsm/loaders/GLTFLoader.js'
import { GUI } from 'https://unpkg.com/three@0.150.0/examples/jsm/libs/lil-gui.module.min.js'
import { RGBELoader } from 'https://unpkg.com/three@0.150.0/examples/jsm/loaders/RGBELoader.js'
import { TWEEN } from 'https://unpkg.com/three@0.150.0/examples/jsm/libs/tween.module.min.js'

import {
    BloomEffect,
    EffectComposer,
    EffectPass,
    RenderPass,
    VignetteEffect,
    HueSaturationEffect,
    SMAAEffect,
} from 'https://unpkg.com/postprocessing@6.30.1/build/postprocessing.esm.js'
import { MeshTranslucentMaterial } from './TranslucentMaterial.js'
import { DRACOLoader } from 'https://unpkg.com/three@0.150.0/examples/jsm/loaders/DRACOLoader.js'
// import { Stats } from "./stats.js";

// Load compressed models
const dracoLoader = new DRACOLoader()
const loader = new GLTFLoader()
dracoLoader.setDecoderPath('https://www.gstatic.com/draco/v1/decoders/')
dracoLoader.setDecoderConfig({ type: 'js' })
loader.setDRACOLoader(dracoLoader)

async function main() {

    // Setup basic renderer
    const clientWidth = window.innerWidth
    const clientHeight = window.innerHeight
    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(35, clientWidth / clientHeight, 0.1, 1000)
    camera.position.set(10.9, 2.7, -9.44)

    const renderer = new THREE.WebGLRenderer({
        powerPreference: 'high-performance',
        antialias: false,
        stencil: false,
        depth: false,
    })

    renderer.setSize(clientWidth, clientHeight)
    renderer.setPixelRatio(window.devicePixelRatio)
    renderer.outputEncoding = THREE.sRGBEncoding
    renderer.toneMapping = THREE.LinearToneMapping
    document.body.appendChild(renderer.domElement)
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap

    // Handle the resize
    window.addEventListener('resize', () => {
        const clientWidth = window.innerWidth
        const clientHeight = window.innerHeight
        renderer.setSize(clientWidth, clientHeight)
        camera.aspect = clientWidth / clientHeight
        camera.updateProjectionMatrix()
    })

    //Controls
    const controls = new OrbitControls(camera, renderer.domElement)
    controls.target.set(2.33, 1.23, 1.72)
    controls.enableDamping = true
    controls.enableRotate = false
    controls.enablePan = false
    controls.minDistance = 8
    controls.maxDistance = 17
    controls.maxPolarAngle = Math.PI / 2.2

    // Setup Environment
    let environment
    new RGBELoader().load('https://cdn.glitch.global/df35b9e1-0fa8-49d1-b430-bed29251dfb5/gem_2.hdr?v=1675257556766', function (texture) {
        texture.mapping = THREE.EquirectangularReflectionMapping
        scene.environment = texture
        environment = texture
    })

    //Setup scene
    scene.background = new THREE.Color('#936045')
    const rSize = renderer.getDrawingBufferSize(new THREE.Vector2())
    rSize.x = Math.floor(rSize.x / 2)
    rSize.y = Math.floor(rSize.y / 2)

    // Lighting
    const texture = new THREE.TextureLoader().load('/fakeShadow.jpg')
    texture.minFilter = THREE.LinearFilter
    texture.magFilter = THREE.LinearFilter
    texture.encoding = THREE.sRGBEncoding

    const spotLight = new THREE.SpotLight(0xffffff, 0.95)
    spotLight.position.set(10, 15, -10)
    spotLight.castShadow = true
    spotLight.shadow.bias = -0.0009
    spotLight.shadow.blurSamples = 2
    spotLight.angle = Math.PI / 5
    spotLight.shadow.mapSize.width = 256
    spotLight.shadow.mapSize.height = 256
    spotLight.shadow.camera.near = 1
    spotLight.shadow.camera.far = 40
    spotLight.shadow.focus = 1
    spotLight.penumbra = 0.7
    spotLight.decay = 1
    spotLight.distance = 100
    spotLight.map = texture
    scene.add(spotLight)

    const targetObject = new THREE.Object3D()
    targetObject.position.set(0, 2, 6)
    spotLight.target = targetObject
    scene.add(targetObject)

    const pointLight = new THREE.PointLight('orange', 2.25)

    pointLight.position.set(0.79, 1.53, -0.05)
    pointLight.distance = 2.5
    scene.add(pointLight)

    const pointLight2 = new THREE.PointLight('orange', 3.25)

    pointLight2.position.set(-1.06, 1.03, -0.72)
    pointLight2.distance = 3.5
    scene.add(pointLight2)

    const pointLight3 = new THREE.PointLight('orange', 3.25)

    pointLight3.position.set(0.08, 2.33, 1.21)
    pointLight3.distance = 3
    scene.add(pointLight3)

    // Define variables for the flicker effect
    var baseIntensity = 2
    var frequency = 9
    var amplitude = 0.5

    // Define variables for random variations
    var intensityRange = 0.1
    var positionRange = 0.01

    function updateLightIntensity(time) {
        // Update intensity based on sine function
        var intensity = baseIntensity + amplitude * Math.sin(frequency * time * 0.002)
        var intensity2 = baseIntensity + amplitude * Math.sin(frequency * time * 0.002)

        // Add random variation to intensity
        intensity += Math.random() * intensityRange - intensityRange / 2
        intensity2 += Math.random() * intensityRange - intensityRange / 2
        pointLight.intensity = intensity
        pointLight2.intensity = intensity
        pointLight3.intensity = intensity2

        // Add random variation to light position
        var positionOffset = new THREE.Vector3(Math.random() * positionRange - positionRange / 2, 0, Math.random() * positionRange - positionRange / 2)
        var positionOffset2 = new THREE.Vector3(Math.random() * positionRange - positionRange / 2, 0, Math.random() * positionRange - positionRange / 2)
        pointLight.position.add(positionOffset)
        pointLight2.position.add(positionOffset)
        pointLight3.position.add(positionOffset2)
    }


    /////////////////////////////////////////////////////////////////////////
    ///// LOADING GLB/GLTF MODEL FROM BLENDER
    let translucentMesh
    let flame
    loader.load('candles.glb', function (gltf) {
        gltf.scene.traverse((obj) => {
            if (obj.isMesh) {
                if (obj.name === 'flame') {
                    flame = obj

                    obj.material.uniforms = {
                        time: { value: 0 },
                        amplitude: { value: 0.2 },
                        frequency: { value: 0.2 },
                    }

                    obj.material.onBeforeCompile = (shader) => {
                        shader.uniforms.time = { value: 0 }

                        shader.vertexShader = `
            uniform float time;
            varying vec4 vMvPosition;
            //    Classic Perlin 2D Noise 
            //    by Stefan Gustavson
            //
            vec4 permute(vec4 x){return mod(((x*34.0)+1.0)*x, 289.0);}
            vec2 fade(vec2 t) {return t*t*t*(t*(t*6.0-15.0)+10.0);}
            
            float getClassicNoise2d(vec2 P)
            {
                    vec4 Pi = floor(P.xyxy) + vec4(0.0, 0.0, 1.0, 1.0);
                vec4 Pf = fract(P.xyxy) - vec4(0.0, 0.0, 1.0, 1.0);
                Pi = mod(Pi, 289.0); // To avoid truncation effects in permutation
                vec4 ix = Pi.xzxz;
                vec4 iy = Pi.yyww;
                vec4 fx = Pf.xzxz;
                vec4 fy = Pf.yyww;
                vec4 i = permute(permute(ix) + iy);
                vec4 gx = 2.0 * fract(i * 0.0243902439) - 1.0; // 1/41 = 0.024...
                vec4 gy = abs(gx) - 0.5;
                vec4 tx = floor(gx + 0.5);
                gx = gx - tx;
                vec2 g00 = vec2(gx.x,gy.x);
                vec2 g10 = vec2(gx.y,gy.y);
                vec2 g01 = vec2(gx.z,gy.z);
                vec2 g11 = vec2(gx.w,gy.w);
                vec4 norm = 1.79284291400159 - 0.85373472095314 * 
                vec4(dot(g00, g00), dot(g01, g01), dot(g10, g10), dot(g11, g11));
                g00 *= norm.x;
                g01 *= norm.y;
                g10 *= norm.z;
                g11 *= norm.w;
                float n00 = dot(g00, vec2(fx.x, fy.x));
                float n10 = dot(g10, vec2(fx.y, fy.y));
                float n01 = dot(g01, vec2(fx.z, fy.z));
                float n11 = dot(g11, vec2(fx.w, fy.w));
                vec2 fade_xy = fade(Pf.xy);
                vec2 n_x = mix(vec2(n00, n01), vec2(n10, n11), fade_xy.x);
                float n_xy = mix(n_x.x, n_x.y, fade_xy.y);
                return 2.3 * n_xy;
            }                

            ${shader.vertexShader}`.replace(
                            `#include <project_vertex>`,
                            `
            vec4 mvPosition = vec4( transformed, 1.0 );

            #ifdef USE_INSTANCING

                mvPosition = instanceMatrix * mvPosition;

            #endif
        
            mvPosition = modelMatrix * mvPosition;
        
            // Wind
            float windNoise = getClassicNoise2d(mvPosition.xz * 0.9 + vec2(time * 0.5, time * 0.9));
            float windStrength = (1.0 - uv.y) * windNoise;
            mvPosition.z += max(0.0, (.5 + uv.y) - 0.8) * windStrength * 0.95;
        
            mvPosition = viewMatrix * mvPosition;
        
            gl_Position = projectionMatrix * mvPosition;

            vMvPosition = mvPosition;
        
            #include <logdepthbuf_vertex>
            #include <clipping_planes_vertex>
            #include <fog_vertex>

            `
                        )

                        obj.material.userData.shader = shader
                    }
                }

                if (obj.name === 'Wax') {
                    obj.material = new MeshTranslucentMaterial({
                        side: THREE.DoubleSide,
                        envMap: environment,
                        transmission: 0.6,
                        roughness: 1,
                        internalRoughness: 0.72,
                        ior: 2.9,
                        attenuationColor: new THREE.Color('#fff5db'),
                        attenuationDistance: 0.03,
                        dithering: true,
                        thickness: 2.0,
                        scattering: 0.63,
                        roughnessBlurScale: 30,
                        scatteringAbsorption: 1.0,
                    })
                    obj.castShadow = true
                    obj.receiveShadow = true
                }

                if (obj.name === 'Wax001') {
                    obj.material = new MeshTranslucentMaterial({
                        side: THREE.DoubleSide,
                        envMap: environment,
                        transmission: 0.6,
                        roughness: 1,
                        internalRoughness: 0.72,
                        ior: 2.9,
                        attenuationColor: new THREE.Color('#fff5db'),
                        attenuationDistance: 0.03,
                        dithering: true,
                        thickness: 2.0,
                        scattering: 0.63,
                        roughnessBlurScale: 30,
                        scatteringAbsorption: 1.0,
                    })
                    translucentMesh = obj
                    obj.castShadow = true
                    obj.receiveShadow = true
                }

                if (obj.name === 'Cube') {
                    obj.material = new MeshTranslucentMaterial({
                        side: THREE.DoubleSide,
                        envMap: environment,
                        transmission: 0.6,
                        roughness: 1,
                        internalRoughness: 0.72,
                        ior: 2.9,
                        attenuationColor: new THREE.Color('#fff5db'),
                        attenuationDistance: 0.03,
                        dithering: true,
                        thickness: 2.0,
                        scattering: 0.63,
                        roughnessBlurScale: 30,
                        scatteringAbsorption: 1.0,
                    })
                    obj.castShadow = true
                    obj.receiveShadow = true
                }

                if (obj.name === 'Circle') {
                    obj.castShadow = true
                    obj.material.envMapIntensity = 0.4
                    obj.receiveShadow = true
                }

                if (obj.name === 'Leaves_Mat1_0001') {
                    obj.castShadow = true
                }

                if (obj.name === 'Circle001') {
                    obj.receiveShadow = true
                    obj.material.envMapIntensity = 0.2
                    obj.material.color = new THREE.Color('#936045').convertSRGBToLinear()
                }

                if (obj.name === 'Tall_Vase_with_dry_branch_decoration') {
                    obj.material.envMap = environment
                    obj.castShadow = true
                }
            }
        })

        scene.add(gltf.scene)

        setTimeout(() =>{
            container.classList.remove('hidden')
    
        }, 2000)
    })

    const clock = new THREE.Clock()
    //   const gui = new GUI()
    //   const effectController = {
    //     roughness: 0.5,
    //     internalRoughness: 0.5,
    //     scatteringAbsorption: 1.0,
    //     scattering: 1.0,
    //     roughnessBlurScale: 16.0,
    //     resolutionScale: 0.5,
    //     attenuationDistance: 0.33,
    //     attenuationColor: [0.9, 0.6, 0.3],
    //     moveLights: false,
    //   }
    //   gui.add(effectController, 'roughness', 0.0, 1.0, 0.01).onChange((value) => {
    //     translucentMesh.material.roughness = value
    //   })
    //   gui.add(effectController, 'internalRoughness', 0.0, 1.0, 0.01).onChange((value) => {
    //     translucentMesh.material.internalRoughness = value
    //   })
    //   gui.add(effectController, 'scatteringAbsorption', 0.0, 1.0, 0.01).onChange((value) => {
    //     translucentMesh.material.scatteringAbsorption = value
    //   })
    //   gui.add(effectController, 'scattering', 0.0, 1.0, 0.01).onChange((value) => {
    //     translucentMesh.material.scattering = value
    //   })
    //   gui.add(effectController, 'roughnessBlurScale', 0.0, 32.0, 0.01).onChange((value) => {
    //     translucentMesh.material.roughnessBlurScale = value
    //   })
    //   gui.add(effectController, 'resolutionScale', 0.25, 1.0, 0.01).onChange((value) => {
    //     translucentMesh.material.resolutionScale = value
    //   })
    //   gui.add(effectController, 'attenuationDistance', 0.0, 10.0, 0.01).onChange((value) => {
    //     translucentMesh.material.attenuationDistance = value
    //   })
    //   gui.addColor(effectController, 'attenuationColor').onChange((value) => {
    //     translucentMesh.material.attenuationColor = new THREE.Color(value[0], value[1], value[2])
    //   })
    //   gui.add(effectController, 'moveLights')

    /////////////////////////////////////////////////////////////////////////
    //// POST PROCESSING
    const smaa = new SMAAEffect()
    const composer = new EffectComposer(renderer)
    const bloom = new BloomEffect({ mipmapBlur: true, intensity: 2 })
    const vignette = new VignetteEffect({ offset: 0.3, darkness: 0.7 })
    const sat = new HueSaturationEffect({ saturation: 0.3 })
    composer.addPass(new RenderPass(scene, camera))
    composer.addPass(new EffectPass(camera, smaa, bloom, vignette, sat))

    function animate() {
        const delta = clock.getElapsedTime()

        if (flame) {
            updateLightIntensity(delta) // flame.material.userData.uniforms.time.value = delta
            scene.traverse(function (child) {
                if (child.isMesh) {
                    const shader = child.material.userData.shader

                    if (shader) {
                        shader.uniforms.time.value = performance.now() / 1000
                    }
                }
            })
        }

        composer.render()

        // renderer.render(scene, camera)
        controls.update()
        TWEEN.update()

        requestAnimationFrame(animate)
        
    }
    requestAnimationFrame(animate)




    // Interface stuff
    const exploreButton = document.querySelector('.explore')
    const container = document.querySelector('.container')
    const exitButton = document.querySelector('.exit')


    exploreButton.addEventListener('click', () => {
        animateCamera(10, 2.5, -8.44, 0, 0, 0)
        container.classList.add('hidden')
        exitButton.classList.add('visible')
        controls.enableRotate = true
        controls.enabled = true
    })

    exitButton.addEventListener('click', () => {
        animateCamera(10, 2.5, -9.44, 2.33, 1.23, 1.72)
        container.classList.remove('hidden')
        exitButton.classList.remove('visible')
        controls.enableRotate = false
        controls.maxPolarAngle = Math.PI
        controls.enabled = false
    })



    // Animate the Scene
    function animateCamera(x, y, z, xt, yt, zt) {

        new TWEEN.Tween(camera.position).to({
            x: x,
            y: y,
            z: z
        }, 2500)
            .delay(100)
            .easing(TWEEN.Easing.Quartic.InOut).start()
            .onComplete(function () {
                controls.enabled = true
            })

        new TWEEN.Tween(controls.target).to({
            x: xt,
            y: yt,
            z: zt
        }, 2500)
            .delay(100)
            .easing(TWEEN.Easing.Quartic.InOut).start()
    }

}
main()

