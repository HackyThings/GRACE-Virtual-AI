<script lang="ts">
	import { onMount } from 'svelte';
	import * as Three from 'three';
	import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
	import { GraceOrb } from '../graphics/GraceOrb';

	// Grace Orb
	let graceOrb: GraceOrb;

	const scene = new Three.Scene();
	let camera: Three.PerspectiveCamera;
	let renderer: Three.WebGLRenderer;

	let el: HTMLCanvasElement;

	export const getGraceOrb = () => {
		return graceOrb;
	};

	// create animate function
	function animate(time: number) {
		requestAnimationFrame(animate);

		const timeSec = time / 1000;

		if (graceOrb) {
			graceOrb.animate(timeSec);
		}
	}

	function resize() {
		camera.aspect = window.innerWidth / window.innerHeight;
		camera.updateProjectionMatrix();
		renderer.setSize(window.innerWidth, window.innerHeight);
	}

	onMount(() => {
		renderer = new Three.WebGLRenderer({ antialias: true, canvas: el });

		camera = new Three.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
		camera.position.z = 5;

		// create THreeJS orbit controls
		const controls = new OrbitControls(camera, renderer.domElement);
		controls.enableDamping = true;
		controls.dampingFactor = 0.05;
		controls.screenSpacePanning = false;
		controls.minDistance = 5;
		controls.maxDistance = 500;
		controls.maxPolarAngle = Math.PI / 2;

		resize();

		graceOrb = new GraceOrb(scene, camera, renderer);
		graceOrb.createOrb();

		scene.add(graceOrb);
		scene.add(graceOrb.makeBackground());

		animate(0);
	});
</script>

<canvas bind:this={el} />
