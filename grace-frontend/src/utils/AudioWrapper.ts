export class AudioWrapper {
	private normalizedData: number[] = [];
	private audioBuffer: AudioBuffer | null = null;
	private audioUrl: string;

	constructor(audioUrl: string) {
		this.audioUrl = audioUrl;
	}

	async process() {
		const audioContext = new AudioContext();
		let fetchProxyURL = 'http://localhost:3333/' + this.audioUrl;
		await fetch(fetchProxyURL)
			.then((response) => response.arrayBuffer())
			.then((arrayBuffer) => audioContext.decodeAudioData(arrayBuffer))
			.then((audioBuffer) => {
				this.audioBuffer = audioBuffer;
				this.visualize(audioBuffer);
			});
	}

	visualize(audioBuffer: AudioBuffer) {
		const filterData = (audioBuffer: { getChannelData: (arg0: number) => any }) => {
			const rawData = audioBuffer.getChannelData(0); // We only need to work with one channel of data
			const samples = 200; // Number of samples we want to have in our final data set
			const blockSize = Math.floor(rawData.length / samples); // the number of samples in each subdivision
			const filteredData = [];
			for (let i = 0; i < samples; i++) {
				let blockStart = blockSize * i; // the location of the first sample in the block
				let sum = 0;
				for (let j = 0; j < blockSize; j++) {
					sum = sum + Math.abs(rawData[blockStart + j]); // find the sum of all the samples in the block
				}
				filteredData.push(sum / blockSize); // divide the sum by the block size to get the average
			}
			return filteredData;
		};

		const normalizeData = (filteredData: any[]) => {
			const multiplier = Math.pow(Math.max(...filteredData), -1);
			return filteredData.map((n) => n * multiplier);
		};

		this.normalizedData = normalizeData(filterData(audioBuffer));
	}

	play(callback: (isFirst: boolean, isLast: boolean, dataPoint: number) => void) {
		if (this.audioBuffer === null) {
			console.error('AudioBuffer is undefined');
			return;
		}

		const audioContext = new AudioContext();
		const source = audioContext.createBufferSource(); // creates a sound source
		source.buffer = this.audioBuffer; // tell the source which sound to play
		source.connect(audioContext.destination); // Connect the source to the speakers

		console.log('Playing audio');
		source.start(0); // play the source now

		// loop through the data array over the course of the audioBuffer playing
		for (let i = 0; i < this.normalizedData.length; i++) {
			// set a timeout for each data point
			setTimeout(() => {
				// callback function to return the data point at the current index
				let isFirst = i === 0;
				let isLast = i === this.normalizedData.length - 1;
				callback(isFirst, isLast, this.normalizedData[i]);
			}, (this.audioBuffer.duration / this.normalizedData.length) * i * 1000);
		}
	}
}
