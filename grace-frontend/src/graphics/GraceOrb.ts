import * as THREE from 'three';
import { LineGeometry } from 'three/examples/jsm/lines/LineGeometry.js';
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { Line2 } from 'three/examples/jsm/lines/Line2.js';
import { GraceShaders } from './shaders';

// create an enum mode for the orb for thinking, talking and idle
export enum OrbMode {
	THINKING,
	TALKING,
	IDLE
}

export class GraceOrb extends THREE.Object3D {
	//declare properties in constructor
	private scene: THREE.Scene;
	private camera: THREE.PerspectiveCamera;
	private renderer: THREE.WebGLRenderer;

	private globalUniforms: {
		time: { value: number };
		bloom: { value: number };
	};
	private bloomComposer: EffectComposer | undefined;
	private finalComposer: EffectComposer | undefined;

	private synapseLinks: THREE.LineSegments | undefined;
	private mode: OrbMode;
	private sphereWireframe: THREE.Mesh | undefined;

	private targetScale: THREE.Vector3;
	private targetSynapseLinksColor: THREE.Color;

	constructor(scene: THREE.Scene, camera: THREE.PerspectiveCamera, renderer: THREE.WebGLRenderer) {
		super();
		this.scene = scene;
		this.camera = camera;
		this.renderer = renderer;
		this.mode = OrbMode.IDLE;

		this.globalUniforms = {
			time: { value: 0 },
			bloom: { value: 0 }
		};
		this.bloomComposer = undefined;
		this.finalComposer = undefined;

		this.targetScale = new THREE.Vector3(1, 1, 1);
		this.targetSynapseLinksColor = new THREE.Color(0x000000);
	}

	public setTargetScale(scalar: number) {
		this.targetScale.setScalar(scalar);
	}

	public getTargetScale() {
		return this.targetScale;
	}

	public createOrb() {
		let v3 = new THREE.Vector3();

		window.addEventListener('resize', () => {
			bloomPass.resolution.set(innerWidth, innerHeight);
		});

		// <CURVE>
		const curvePointsNum = 150;
		let curvePts = new Array(curvePointsNum).fill(undefined).map((p) => {
			return new THREE.Vector3().randomDirection();
		});
		let curve = new THREE.CatmullRomCurve3(curvePts, true);

		let pts = curve.getSpacedPoints(curvePointsNum);
		pts.shift();
		curve = new THREE.CatmullRomCurve3(pts, true);
		pts = curve.getSpacedPoints(1000);
		pts.forEach((p: any) => {
			p.setLength(4);
		});

		let fPts: any[] = [];
		pts.forEach((p: any) => {
			if (p) {
				fPts.push(p.x, p.y, p.z);
			}
		});

		let g = new LineGeometry();
		g.setPositions(fPts);

		let m = new LineMaterial({
			color: 'magenta',
			worldUnits: true,
			linewidth: 0.025,
			alphaToCoverage: true,
			onBeforeCompile: (shader: {
				uniforms: { time: { value: number }; bloom: { value: number } };
				vertexShader: string;
				fragmentShader: string;
			}) => {
				shader.uniforms.time = this.globalUniforms.time;
				shader.uniforms.bloom = this.globalUniforms.bloom;
				shader.vertexShader = GraceShaders.CURVE_VERTEX_SHADER;
				shader.fragmentShader = GraceShaders.CURVE_FRAGMENT_SHADER;
			}
		} as any);
		// m.resolution.set(innerWidth, innerHeight);
		let outerLines = new Line2(g, m);
		outerLines.computeLineDistances();

		// </CURVE>

		// <SPHERE>
		let sphereGeometry = new THREE.IcosahedronGeometry(3.9, 20);
		let sphereAttributes = sphereGeometry.attributes as any;
		for (let i = 0; i < sphereAttributes.position.count; i++) {
			v3.fromBufferAttribute(sphereAttributes.position, i);
			sphereAttributes.position.setXYZ(i, v3.x, v3.y, v3.z);
		}

		let sphereMaterial = new THREE.MeshBasicMaterial({
			color: 'cyan',
			wireframe: true,
			transparent: true,
			onBeforeCompile: (shader: {
				uniforms: { bloom: { value: number }; time: { value: number } };
				vertexShader: string;
				fragmentShader: string;
			}) => {
				shader.uniforms.bloom = this.globalUniforms.bloom;
				shader.uniforms.time = this.globalUniforms.time;
				shader.vertexShader = `
      varying vec3 vN;
      ${shader.vertexShader}
    `.replace(
					`#include <begin_vertex>`,
					`#include <begin_vertex>
          vN = normal;`
				);
				//console.log(shader.vertexShader);
				shader.fragmentShader = `
      uniform float bloom;
      uniform float time;
      varying vec3 vN;
      ${GraceShaders.NOISE_V3_SHADER}
      ${shader.fragmentShader}
    `.replace(
					`#include <dithering_fragment>`,
					`#include <dithering_fragment>
        float ns = snoise(vec4(vN * 1.5, time * 1.25));
        ns = abs(ns);
        
        vec3 col = mix(diffuse, vec3(0, 1, 1) * 2.5, ns);
        
        gl_FragColor.rgb = mix(col, vec3(0), bloom);
        gl_FragColor.a = ns;
        gl_FragColor.rgb = mix(gl_FragColor.rgb, col, pow(ns, 16.));`
				);
			}
		} as any);
		this.sphereWireframe = new THREE.Mesh(sphereGeometry, sphereMaterial);

		// </SPHERE>

		// <LINKS>
		let LINK_COUNT = 100;
		let linkPts = [];
		for (let i = 0; i < LINK_COUNT; i++) {
			let pS = new THREE.Vector3().randomDirection();
			let pE = new THREE.Vector3().randomDirection();
			pS.multiplyScalar(4);
			pE.multiplyScalar(4);
			let division = 100;
			for (let j = 0; j < division; j++) {
				let v1 = new THREE.Vector3().lerpVectors(pS, pE, j / division);
				let v2 = new THREE.Vector3().lerpVectors(pS, pE, (j + 1) / division);
				// deform(v1, true);
				// deform(v2, true);
				linkPts.push(v1, v2);
			}
		}
		let linkG = new THREE.BufferGeometry().setFromPoints(linkPts);
		let linkM = new THREE.LineDashedMaterial({
			color: 'yellow',
			onBeforeCompile: (shader: {
				uniforms: { time: { value: number }; bloom: { value: number } };
				fragmentShader: string;
			}) => {
				shader.uniforms.time = this.globalUniforms.time;
				shader.uniforms.bloom = this.globalUniforms.bloom;
				shader.fragmentShader = `
      uniform float bloom;
      uniform float time;
      ${shader.fragmentShader}
    `
					.replace(
						`if ( mod( vLineDistance, totalSize ) > dashSize ) {
	            discard;
	          }`,
						``
					)
					.replace(
						`#include <premultiplied_alpha_fragment>`,
						`#include <premultiplied_alpha_fragment>
            vec3 col = diffuse;
            gl_FragColor.rgb = mix(col * 0.5, vec3(0), bloom);
        
            float sig = sin((vLineDistance * 2. + time * 5.) * 0.5) * 0.5 + 0.5;
            sig = pow(sig, 16.);
            gl_FragColor.rgb = mix(gl_FragColor.rgb, col * 0.75, sig);`
					);
			}
		} as any);
		this.synapseLinks = new THREE.LineSegments(linkG, linkM);
		this.synapseLinks.computeLineDistances();

		// </LINKS>

		// <BLOOM>
		const params = {
			exposure: 1,
			bloomStrength: 7,
			bloomThreshold: 0,
			bloomRadius: 0
		};
		const renderScene = new RenderPass(this.scene, this.camera);

		const bloomPass = new UnrealBloomPass(
			new THREE.Vector2(window.innerWidth, window.innerHeight),
			1.5,
			0.4,
			0.85
		);
		bloomPass.threshold = params.bloomThreshold;
		bloomPass.strength = params.bloomStrength;
		bloomPass.radius = params.bloomRadius;

		this.bloomComposer = new EffectComposer(this.renderer);
		this.bloomComposer.renderToScreen = false;
		this.bloomComposer.addPass(renderScene);
		this.bloomComposer.addPass(bloomPass);

		const finalPass = new ShaderPass(
			new THREE.ShaderMaterial({
				uniforms: {
					baseTexture: { value: null },
					bloomTexture: { value: this.bloomComposer.renderTarget2.texture }
				},
				vertexShader: GraceShaders.FINAL_PASS_VERTEX_SHADER,
				fragmentShader: GraceShaders.FINAL_PASS_FRAGMENT_SHADER,
				// fragmentShader: document.getElementById("fragmentshader").textContent,
				defines: {}
			}),
			'baseTexture'
		);
		finalPass.needsSwap = true;

		this.finalComposer = new EffectComposer(this.renderer);
		this.finalComposer.addPass(renderScene);
		this.finalComposer.addPass(finalPass);
		// </BLOOM>

		this.scale.setScalar(0.5);

		this.add(this.synapseLinks);
		this.add(outerLines);
		this.add(this.sphereWireframe);

		this.setMode(OrbMode.IDLE);
	}

	public makeBackground() {
		// <BACKGROUND>
		let bg = new THREE.SphereGeometry(1000, 64, 32);
		let bm = new THREE.ShaderMaterial({
			side: THREE.BackSide,
			uniforms: {
				bloom: this.globalUniforms.bloom,
				time: this.globalUniforms.time
			},
			vertexShader: `
    varying vec3 vNormal;
    void main() {
      vNormal = normal;
      gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
    }`,
			fragmentShader: `
    uniform float bloom;
    uniform float time;
    varying vec3 vNormal;
    ${GraceShaders.NOISE_V3_SHADER}
    void main() {
      vec3 col = vec3(0.012, 0, 0.1);
      float ns = snoise(vec4(vNormal, time * 0.1));
      col = mix(col * 5., col, pow(abs(ns), 0.125));
      col = mix(col, vec3(0), bloom);
      gl_FragColor = vec4( col, 1.0 );
    }`
		});
		let bo = new THREE.Mesh(bg, bm);
		// </BACKGROUND>
		return bo;
	}

	public animate(time: number) {
		if (this.mode === OrbMode.THINKING) {
			time = time * 10;
		} else if (this.mode === OrbMode.IDLE) {
			// animate container on a sine wave with a minimum scale of 0.5
			this.targetScale.setScalar(0.5 + Math.sin(time * 2) * 0.1);
		}

		this.globalUniforms.time.value = time * 1;
		this.globalUniforms.bloom.value = 1;
		if (this.bloomComposer && this.finalComposer) {
			this.bloomComposer.render();
			this.globalUniforms.bloom.value = 0;
			this.finalComposer.render();
		}

		// interpolate the scale to the target scale over time
		this.scale.lerp(this.targetScale, 0.05);

		if (this.synapseLinks === undefined || this.sphereWireframe === undefined) {
			console.log('something is undefined');
			return;
		}

		// interpolate the color to the target color over time
		(this.synapseLinks.material as any).color.lerp(this.targetSynapseLinksColor, 0.025);

		// make container rotate slowly
		this.rotation.y = time * 0.1;
	}

	public setMode(mode: OrbMode) {
		if (this.synapseLinks === undefined || this.sphereWireframe === undefined) {
			console.log('something is undefined');
			return;
		}

		this.mode = mode;

		switch (mode) {
			case OrbMode.THINKING:
				// (this.synapseLinks.material as any).color = new THREE.Color('red');
				this.targetSynapseLinksColor = new THREE.Color('red');
				this.setTargetScale(0.25);
				break;
			case OrbMode.TALKING:
				// (this.synapseLinks.material as any).color = new THREE.Color('cyan');
				this.targetSynapseLinksColor = new THREE.Color('cyan');

				break;
			case OrbMode.IDLE:
				// (this.synapseLinks.material as any).color = new THREE.Color('yellow');
				this.targetSynapseLinksColor = new THREE.Color('yellow');
				break;
		}
	}
}
