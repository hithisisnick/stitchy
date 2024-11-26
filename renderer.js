class Reto3DProcessor {
	constructor() {
		// Add API check
		if (!window.electronAPI) {
			console.error('electronAPI not available');
			throw new Error('electronAPI not available');
		}
		if (!window.Cropper) {
			console.error('Cropper not available');
			throw new Error('Cropper not available');
		}

		this.setupEventListeners();
		this.frames = [];
		this.currentGifBuffer = null;
		this.originalFilePath = null;
		this.setupFrameEditor();
		this.cropper = null;

		// Initially hide the content
		this.hideImageContent();

		// Add save button listeners
		document.getElementById('saveButton').addEventListener('click', () => {
			this.saveGif(false);
		});
		document.getElementById('saveAsButton').addEventListener('click', () => {
			this.saveGif(true);
		});
		document.getElementById('saveFramesButton').addEventListener('click', () => {
			this.saveFrames();
		});

		// Add custom frames upload handler
		const uploadFramesButton = document.getElementById('uploadFramesButton');
		const frameUploadInput = document.getElementById('frameUploadInput');

		uploadFramesButton.addEventListener('click', () => {
			frameUploadInput.click();
		});

		frameUploadInput.addEventListener('change', async (e) => {
			if (e.target.files.length > 0) {
				await this.handleCustomFrames(Array.from(e.target.files));
			}
		});
	}

	// Add this helper method to your class
	chunkArray(arr, chunkSize) {
		const chunks = [];
		for (let i = 0; i < arr.length; i += chunkSize) {
			chunks.push(arr.slice(i, i + chunkSize));
		}
		return chunks;
	}

	setupEventListeners() {
		const dropZone = document.getElementById('dropZone');
		const fileInput = document.getElementById('fileInput');
		const selectButton = document.getElementById('selectButton');
		const processButton = document.getElementById('processButton');

		// Prevent default drag behaviors
		['dragenter', 'dragover', 'dragleave', 'drop'].forEach((eventName) => {
			dropZone.addEventListener(eventName, preventDefaults, false);
			document.body.addEventListener(eventName, preventDefaults, false);
		});

		// Highlight drop zone when item is dragged over it
		['dragenter', 'dragover'].forEach((eventName) => {
			dropZone.addEventListener(eventName, highlight, false);
		});

		['dragleave', 'drop'].forEach((eventName) => {
			dropZone.addEventListener(eventName, unhighlight, false);
		});

		// Handle dropped files
		dropZone.addEventListener(
			'drop',
			(e) => {
				const dt = e.dataTransfer;
				const file = dt.files[0];

				if (file && file.type.startsWith('image/')) {
					this.handleImageFile(file);
				} else {
					alert('Please drop an image file');
				}
			},
			false
		);

		// Handle file input selection
		fileInput.addEventListener('change', (e) => {
			const file = e.target.files[0];
			if (file && file.type.startsWith('image/')) {
				this.handleImageFile(file);
			} else {
				alert('Please select an image file');
			}
		});

		selectButton.addEventListener('click', () => {
			fileInput.click();
		});

		processButton.addEventListener('click', () => {
			this.createGif();
		});

		// Helper functions
		function preventDefaults(e) {
			e.preventDefault();
			e.stopPropagation();
		}

		function highlight(e) {
			dropZone.classList.add('drag-over');
		}

		function unhighlight(e) {
			dropZone.classList.remove('drag-over');
		}
	}

	// Add these methods to control visibility
	showImageContent() {
		document.getElementById('imageContent').classList.remove('hidden');
	}

	hideImageContent() {
		document.getElementById('imageContent').classList.add('hidden');
	}

	async handleImageFile(file) {
		try {
			console.log('Processing file:', file.name);
			this.originalFilename = file.name;
			this.originalFilePath = file.path;

			const arrayBuffer = await file.arrayBuffer();
			const buffer = Array.from(new Uint8Array(arrayBuffer));

			// Process image through main process
			const result = await window.electronAPI.processImage(buffer);

			// Show the content section
			this.showImageContent();

			// Display original image
			this.displayDataUrl('originalImage', result.originalBuffer);

			// Store and display frames
			this.frames = result.frames;
			this.displayFrames();

			document.getElementById('processButton').disabled = false;
		} catch (error) {
			console.error('Error processing image:', error);
			alert(`Error processing image: ${error.message}`);
			this.hideImageContent();
		}
	}

	displayDataUrl(elementId, buffer) {
		// Convert array to base64 in chunks to avoid call stack size exceeded
		const chunks = this.chunkArray(buffer, 32768); // 32KB chunks
		let binary = '';
		chunks.forEach((chunk) => {
			binary += String.fromCharCode.apply(null, chunk);
		});
		const base64 = btoa(binary);
		document.getElementById(elementId).src = `data:image/jpeg;base64,${base64}`;
	}

	async displayFrames() {
		const container = document.getElementById('frameImages');
		container.innerHTML = '';

		for (let i = 0; i < this.frames.length; i++) {
			const frameBuffer = this.frames[i];
			const frameContainer = document.createElement('div');
			frameContainer.className = 'frame-container';

			const img = document.createElement('img');
			const chunks = this.chunkArray(frameBuffer, 32768);
			let binary = '';
			chunks.forEach((chunk) => {
				binary += String.fromCharCode.apply(null, chunk);
			});
			const base64 = btoa(binary);
			img.src = `data:image/png;base64,${base64}`;

			const editButton = document.createElement('button');
			editButton.textContent = 'Edit';
			editButton.onclick = () => this.showFrameEditor(i);

			frameContainer.appendChild(img);
			frameContainer.appendChild(editButton);
			container.appendChild(frameContainer);
		}
	}

	async createGif() {
		try {
			const delay = parseInt(document.getElementById('frameDelay').value);
			// Get the dimensions from the first frame
			const firstFrame = document.querySelector('#frameImages img');

			// Check if we have valid frames
			if (!firstFrame) {
				throw new Error('No frames available. Please process an image first.');
			}

			const width = firstFrame.naturalWidth;
			const height = firstFrame.naturalHeight;

			// Verify we have valid frames data
			if (!this.frames || !this.frames.length) {
				throw new Error('No frame data available');
			}

			console.log('Creating GIF with frames:', this.frames.length);
			console.log('Dimensions:', width, 'x', height);

			console.log(
				'Frames data:',
				this.frames.map((f) => ({ length: f.length }))
			);

			// Create GIF with quality parameters
			const gifBuffer = await window.electronAPI.createGif(this.frames, {
				delay: delay,
				width: width,
				height: height,
				quality: 10, // Lower number means better quality (1-20)
				preserveColors: true, // Ensures better color preservation
				transparent: null, // Disable transparency
			});

			// Store the buffer for later saving
			this.currentGifBuffer = gifBuffer;

			// Convert array to base64 for preview
			const chunks = this.chunkArray(gifBuffer, 32768);
			let binary = '';
			chunks.forEach((chunk) => {
				binary += String.fromCharCode.apply(null, chunk);
			});
			const base64 = btoa(binary);

			// Display the GIF preview
			const outputElement = document.getElementById('outputGif');
			outputElement.src = `data:image/gif;base64,${base64}`;
		} catch (error) {
			console.error('Error creating GIF:', error);
			alert(`Error creating GIF: ${error.message}`);
		}
	}

	async saveGif(saveAs = false) {
		if (!this.currentGifBuffer) {
			console.error('No GIF to save');
			alert('Please create a GIF first');
			return;
		}

		try {
			const defaultFilename = this.originalFilename
				? this.originalFilename.replace(/\.[^/.]+$/, '.gif')
				: 'animation.gif';

			await window.electronAPI.saveGif(
				this.currentGifBuffer,
				defaultFilename,
				saveAs,
				this.originalFilePath
			);
		} catch (error) {
			console.error('Error saving GIF:', error);
			alert(`Error saving GIF: ${error.message}`);
		}
	}

	async saveFrames() {
		if (!this.frames || !this.frames.length) {
			console.error('No frames to save');
			alert('Please process an image first');
			return;
		}

		try {
			const result = await window.electronAPI.saveFrames(this.frames);
			if (result) {
				console.log('Frames saved successfully');
			}
		} catch (error) {
			console.error('Error saving frames:', error);
			alert(`Error saving frames: ${error.message}`);
		}
	}

	setupFrameEditor() {
		const editButton = document.getElementById('editFramesButton');
		const editor = document.getElementById('frameEditor');
		const applyButton = document.getElementById('applyEdits');
		const resetButton = document.getElementById('resetCrop');
		const cancelButton = document.getElementById('cancelEdits');
		this.currentEditingFrame = -1;

		editButton.addEventListener('click', () => {
			if (!this.frames || !this.frames.length) {
				alert('No frames to edit');
				return;
			}
			this.showFrameEditor(0);
		});

		applyButton.addEventListener('click', () => {
			if (this.cropper) {
				this.applyFrameEdits();
			}
		});

		resetButton.addEventListener('click', () => {
			if (this.cropper) {
				this.cropper.reset();
			}
		});

		cancelButton.addEventListener('click', () => {
			if (this.cropper) {
				this.cropper.destroy();
				this.cropper = null;
			}
			editor.style.display = 'none';
			this.currentEditingFrame = -1;
		});
	}

	async showFrameEditor(frameIndex) {
		console.log('Opening editor for frame:', frameIndex);
		const editor = document.getElementById('frameEditor');
		const cropContainer = document.querySelector('.crop-container');
		this.currentEditingFrame = frameIndex;

		try {
			const frameBuffer = this.frames[frameIndex];

			// Create image element for cropper
			const img = document.createElement('img');
			const chunks = this.chunkArray(frameBuffer, 32768);
			let binary = '';
			chunks.forEach((chunk) => {
				binary += String.fromCharCode.apply(null, chunk);
			});
			const base64 = btoa(binary);
			img.src = `data:image/png;base64,${base64}`;

			// Replace canvas with image
			cropContainer.innerHTML = '';
			cropContainer.appendChild(img);

			// Initialize cropper
			if (this.cropper) {
				this.cropper.destroy();
			}

			// Initialize Cropper directly instead of using create method
			this.cropper = window.Cropper.new(img, {
				viewMode: 2,
				dragMode: 'crop',
				aspectRatio: NaN,
				autoCropArea: 1,
				restore: false,
				guides: true,
				center: true,
				highlight: true,
				cropBoxMovable: true,
				cropBoxResizable: true,
				toggleDragModeOnDblclick: true,
				ready: () => {
					console.log('Cropper is ready');
				},
			});

			// Show editor
			editor.style.display = 'flex';
		} catch (error) {
			console.error('Error showing frame editor:', error);
			alert('Error opening editor: ' + error.message);
		}
	}

	async applyFrameEdits() {
		if (this.currentEditingFrame < 0 || !this.cropper) return;

		try {
			const frameBuffer = this.frames[this.currentEditingFrame];
			const cropData = this.cropper.getData(true); // true for rounded values

			const cropParams = {
				left: cropData.x,
				top: cropData.y,
				width: cropData.width,
				height: cropData.height,
			};

			console.log('Crop data:', cropData);
			console.log('Applying crop with params:', cropParams);

			const editedBuffer = await window.electronAPI.editFrame(
				frameBuffer,
				cropParams
			);

			// Update the frame and display
			this.frames[this.currentEditingFrame] = editedBuffer;
			await this.displayFrames();

			// Close editor and cleanup
			document.getElementById('frameEditor').style.display = 'none';
			this.cropper.destroy();
			this.cropper = null;
			this.currentEditingFrame = -1;
		} catch (error) {
			console.error('Error applying frame edits:', error);
			alert('Error applying edits: ' + error.message);
		}
	}

	async handleCustomFrames(files) {
		try {
			// Reset existing frames
			this.frames = [];

			// Process each file
			for (const file of files) {
				const arrayBuffer = await file.arrayBuffer();
				const buffer = Array.from(new Uint8Array(arrayBuffer));

				// Convert to proper format using sharp
				const processedBuffer = await window.electronAPI.processCustomFrame(
					buffer
				);
				this.frames.push(processedBuffer);
			}

			// Show the content section
			this.showImageContent();

			// Display the frames
			await this.displayFrames();
			document.getElementById('processButton').disabled = false;
		} catch (error) {
			console.error('Error processing custom frames:', error);
			alert(`Error processing custom frames: ${error.message}`);
			this.hideImageContent();
		}
	}
}

// Wait for DOMContentLoaded to ensure APIs are available
window.addEventListener('DOMContentLoaded', () => {
	new Reto3DProcessor();
});
