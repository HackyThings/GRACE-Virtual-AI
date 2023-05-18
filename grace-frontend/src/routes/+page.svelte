<script lang="ts">
	import { onMount } from 'svelte';
	import { APIWrapper } from '../utils/APIWrapper';
	import Scene from './Scene.svelte';
	import { AudioWrapper } from '../utils/AudioWrapper';
	import { OrbMode, type GraceOrb } from '../graphics/GraceOrb';

	let graceOrb: GraceOrb;
	let getGraceOrb: any;

	// Handle On Mount and call the scene's getGraceOrb
	onMount(() => {
		console.log('Main Page Mounted!');
		graceOrb = getGraceOrb();
	});

	// Handle the input prompt
	async function handleInputPrompt(
		event: Event & { readonly submitter: HTMLElement | null } & {
			currentTarget: EventTarget & HTMLFormElement;
		}
	) {
		event.preventDefault();

		let prompt = event.currentTarget['grace-input-prompt-box'].value.trim();
		event.currentTarget['grace-input-prompt-box'].value = '';

		if (prompt.length === 0) {
			console.warn("You didn't enter anything!");
			return;
		}

		graceOrb.setMode(OrbMode.THINKING);
		// Get ChatGPT Response
		console.log('Getting response from ChatGPT');
		let chatGPTResponse = await APIWrapper.getWithQuery(
			'http://localhost:3000/chatgpt/getresponse',
			{
				text: prompt
			}
		);
		console.log('Response from ChatGPT: ' + chatGPTResponse.response);

		console.log('Generating Text for Prompt: ' + chatGPTResponse.response);
		let fakeYouResponse = await APIWrapper.getWithQuery('http://localhost:3000/fakeyou/generate', {
			text: chatGPTResponse.response
		});
		console.log('Audio generated at URL: ' + fakeYouResponse.url);

		graceOrb.setMode(OrbMode.IDLE);
		let audioWrapper = new AudioWrapper(fakeYouResponse.url);
		await audioWrapper.process();
		audioWrapper.play((isFirst: boolean, isLast: boolean, dataPoint: number) => {
			if (isFirst) {
				graceOrb.setMode(OrbMode.TALKING);
			} else if (isLast) {
				graceOrb.setMode(OrbMode.IDLE);
			}
			graceOrb.setTargetScale(dataPoint + 0.1);
		});
	}
</script>

<div class="grace-container">
	<div class="grace-visual-container">
		<Scene bind:getGraceOrb />
	</div>
	<form class="grace-input-prompt" on:submit={handleInputPrompt}>
		<input name="grace-input-prompt-box" type="text" placeholder="Input your prompt here!" />
		<button>Enter</button>
	</form>
</div>

<style>
	.grace-container {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		height: 100vh;
		width: 100%;
		overflow: hidden;
	}

	.grace-visual-container {
		display: flex;
		align-items: center;
		justify-content: center;
		height: 90%;
		width: 100%;
		background-color: #ce7373;
		overflow: hidden;
	}

	.grace-input-prompt {
		display: flex;
		align-items: center;
		justify-content: center;
		height: 10%;
		width: 100%;
		background-color: #7373ce;
		overflow: hidden;
	}

	.grace-input-prompt input {
		width: 100%;
		height: 100%;
		border: none;
		background-color: #7373ce;
		color: white;
		font-size: 1.5rem;
		text-align: center;
	}

	.grace-input-prompt button {
		width: 10%;
		height: 90%;
		padding: 5px;
		margin: 10px;
		font-size: 24px;
	}
</style>
