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

		// Initially hide the save buttons
		document.querySelector('.output-section').classList.add('hidden');

		const saveDropdownButton = document.getElementById('saveDropdownButton');
		const saveDropdownMenu = document.getElementById('saveDropdownMenu');

		saveDropdownButton.addEventListener('click', () => {
			saveDropdownMenu.classList.toggle('hidden');
		});

		// Close dropdown when clicking outside
		document.addEventListener('click', (event) => {
			if (
				!saveDropdownButton.contains(event.target) &&
				!saveDropdownMenu.contains(event.target)
			) {
				saveDropdownMenu.classList.add('hidden');
			}
		});

		// Save button listeners
		document.getElementById('saveButton').addEventListener('click', () => {
			this.saveGif(false);
		});

		document.getElementById('saveAsButton').addEventListener('click', () => {
			saveDropdownMenu.classList.add('hidden');
			this.saveGif(true);
		});

		// Add save button listeners
		// document.getElementById('saveFramesButton').addEventListener('click', () => {
		// 	this.saveFrames();
		// });

		// Add custom frames upload handler
		// const uploadFramesButton = document.getElementById('uploadFramesButton');
		// const frameUploadInput = document.getElementById('frameUploadInput');

		// uploadFramesButton.addEventListener('click', () => {
		// 	frameUploadInput.click();
		// });

		// frameUploadInput.addEventListener('change', async (e) => {
		// 	if (e.target.files.length > 0) {
		// 		await this.handleCustomFrames(Array.from(e.target.files));
		// 	}
		// });

		// Add modal close handler
		document.getElementById('closeModal').addEventListener('click', () => {
			this.hideOutputModal();
		});

		// Close modal when clicking outside
		document.getElementById('outputModal').addEventListener('click', (e) => {
			if (e.target.id === 'outputModal') {
				this.hideOutputModal();
			}
		});

		// Add escape key handler for modal
		document.addEventListener('keydown', (e) => {
			if (
				e.key === 'Escape' &&
				!document.getElementById('outputModal').classList.contains('hidden')
			) {
				this.hideOutputModal();
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
		const content = document.getElementById('imageContent');
		const originalPreview = document.getElementById('originalPreviewCard');
		const framesPreview = document.getElementById('framesPreviewCard');
		const settings = document.getElementById('settingsCard');

		// First show the container without opacity
		content.classList.remove('hidden');

		// Trigger the animations in sequence
		setTimeout(() => {
			// Slide up original preview
			originalPreview.classList.remove('translate-y-8', 'opacity-0');

			// Slide up frames preview after a delay
			setTimeout(() => {
				framesPreview.classList.remove('translate-y-8', 'opacity-0');

				// Slide up settings after another delay
				setTimeout(() => {
					settings.classList.remove('translate-y-8', 'opacity-0');
				}, 200);
			}, 200);
		}, 100);
	}

	hideImageContent() {
		const content = document.getElementById('imageContent');
		const originalPreview = document.getElementById('originalPreviewCard');
		const framesPreview = document.getElementById('framesPreviewCard');
		const settings = document.getElementById('settingsCard');

		// Reset the animations
		originalPreview.classList.add('translate-y-8', 'opacity-0');
		framesPreview.classList.add('translate-y-8', 'opacity-0');
		settings.classList.add('translate-y-8', 'opacity-0');

		// Hide the container after animations
		setTimeout(() => {
			content.classList.add('hidden');
		}, 500);
	}

	showSpinner() {
		const spinner = document.getElementById('uploadSpinner');
		spinner.classList.remove('hidden');
		// Use setTimeout to ensure the transition happens after display is set
		setTimeout(() => {
			spinner.classList.remove('opacity-0');
		}, 10);
	}

	hideSpinner() {
		const spinner = document.getElementById('uploadSpinner');
		spinner.classList.add('opacity-0');
		// Wait for transition to complete before hiding
		setTimeout(() => {
			spinner.classList.add('hidden');
		}, 300); // Match this with the duration-300 class (300ms)
	}

	hideUploadZone() {
		document.getElementById('dropZone').classList.add('hidden');
	}

	showUploadZone() {
		document.getElementById('dropZone').classList.remove('hidden');
	}

	async handleImageFile(file) {
		try {
			this.hideOutputModal(); // Hide modal when loading new file
			// Hide upload zone and show spinner
			this.hideUploadZone();
			this.showSpinner();

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

			// Hide save buttons when new image is loaded
			document.querySelector('.output-section').classList.add('hidden');
		} catch (error) {
			console.error('Error processing image:', error);
			alert(`Error processing image: ${error.message}`);
			this.hideImageContent();
			// Show upload zone again on error
			this.showUploadZone();
		} finally {
			// Always hide spinner
			this.hideSpinner();
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
			frameContainer.className =
				'max-w-full rounded-lg border border-gray-200 bg-white shadow dark:border-gray-700 dark:bg-neutral-800';

			// Create and setup the image
			const img = document.createElement('img');
			const chunks = this.chunkArray(frameBuffer, 32768);
			let binary = '';
			chunks.forEach((chunk) => {
				binary += String.fromCharCode.apply(null, chunk);
			});
			const base64 = btoa(binary);
			img.src = `data:image/png;base64,${base64}`;
			img.className = 'h-auto max-w-full rounded-t-lg';
			img.alt = `Frame ${i + 1}`;

			// Create the content container
			const content = document.createElement('div');
			content.className = 'p-5';

			// Add frame title
			const title = document.createElement('h5');
			title.className =
				'mb-3 text-2xl font-bold tracking-tight text-gray-900 dark:text-white';
			title.textContent = `Frame ${i + 1}`;

			// Add dimensions text
			const dimensions = document.createElement('p');
			dimensions.className = 'mb-5 font-normal text-gray-700 dark:text-gray-400';
			// We'll set the dimensions once the image loads
			img.onload = () => {
				dimensions.textContent = `Dimension: ${img.naturalWidth}x${img.naturalHeight}`;
			};

			// Create crop button
			const button = document.createElement('button');
			button.type = 'button';
			button.className =
				'me-2 inline-flex w-full items-center justify-center rounded-lg border-2 border-solid border-neutral-800 bg-neutral-200 p-2.5 text-center font-medium text-neutral-800 hover:bg-neutral-800 focus:outline-none focus:ring-4 focus:ring-neutral-300 dark:bg-neutral-200 dark:hover:bg-neutral-400 dark:focus:ring-neutral-800';
			button.onclick = () => this.showFrameEditor(i);

			const buttonText = document.createElement('p');
			buttonText.className = 'pr-2';
			buttonText.textContent = 'Crop';

			const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
			svg.setAttribute('class', 'h-6 w-6 fill-neutral-800');
			svg.setAttribute('width', '32');
			svg.setAttribute('height', '32');
			svg.setAttribute('viewBox', '0 0 256 256');

			const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
			path.setAttribute(
				'd',
				'M240,192a8,8,0,0,1-8,8H200v32a8,8,0,0,1-16,0V200H64a8,8,0,0,1-8-8V72H24a8,8,0,0,1,0-16H56V24a8,8,0,0,1,16,0V184H232A8,8,0,0,1,240,192ZM96,72h88v88a8,8,0,0,0,16,0V64a8,8,0,0,0-8-8H96a8,8,0,0,0,0,16Z'
			);

			const srOnly = document.createElement('span');
			srOnly.className = 'sr-only';
			srOnly.textContent = 'Icon description';

			// Assemble all elements
			svg.appendChild(path);
			button.appendChild(buttonText);
			button.appendChild(svg);
			button.appendChild(srOnly);

			content.appendChild(title);
			content.appendChild(dimensions);
			content.appendChild(button);

			frameContainer.appendChild(img);
			frameContainer.appendChild(content);
			container.appendChild(frameContainer);
		}
	}

	async createGif() {
		try {
			// Get selected radio button value for delay
			const selectedDelay = document.querySelector('input[name="delay"]:checked');
			if (!selectedDelay) {
				throw new Error('Please select a frame delay speed');
			}
			const delay = parseInt(selectedDelay.value);

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
			console.log('Selected delay:', delay);

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

			// Show the modal instead of just showing the output section
			document.querySelector('.output-section').classList.remove('hidden');
			this.showOutputModal();
		} catch (error) {
			console.error('Error creating GIF:', error);
			alert(`Error creating GIF: ${error.message}`);
			// Hide output if there's an error
			document.querySelector('.output-section').classList.add('hidden');
			this.hideOutputModal();
		}
	}

	// Add this method to show notifications
	showNotification(message, duration = 5000) {
		const notification = document.getElementById('saveNotification');
		notification.querySelector('p').textContent = message;
		notification.classList.remove('hidden');

		// Trigger fade in
		setTimeout(() => {
			notification.classList.remove('opacity-0');
		}, 10);

		// Hide after duration
		setTimeout(() => {
			notification.classList.add('opacity-0');
			setTimeout(() => {
				notification.classList.add('hidden');
			}, 300);
		}, duration);
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

			const savedPath = await window.electronAPI.saveGif(
				this.currentGifBuffer,
				defaultFilename,
				saveAs,
				this.originalFilePath
			);

			// Show notification with the save location
			if (savedPath) {
				const message = saveAs
					? `Image has been saved to ${savedPath}`
					: `Image has been saved to ${savedPath}`;
				this.showNotification(message);
			}
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
		const editor = document.getElementById('frameEditor');
		const applyButton = document.getElementById('applyEdits');
		const resetButton = document.getElementById('resetCrop');
		const cancelButton = document.getElementById('cancelEdits');
		this.currentEditingFrame = -1;

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
			this.hideOutputModal(); // Hide modal when loading new frames
			// Hide upload zone and show spinner
			this.hideUploadZone();
			this.showSpinner();

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

			// Hide save buttons when new frames are loaded
			document.querySelector('.output-section').classList.add('hidden');
		} catch (error) {
			console.error('Error processing custom frames:', error);
			alert(`Error processing custom frames: ${error.message}`);
			this.hideImageContent();
			// Show upload zone again on error
			this.showUploadZone();
		} finally {
			// Always hide spinner
			this.hideSpinner();
		}
	}

	// Add these methods to control modal visibility
	showOutputModal() {
		const modal = document.getElementById('outputModal');
		const modalContent = modal.querySelector('.output-section');
		modal.classList.remove('hidden');

		// Trigger fade and scale in
		setTimeout(() => {
			modal.classList.remove('opacity-0');
			modalContent.classList.remove('scale-95');
		}, 10);

		// Add class to prevent body scroll
		document.body.classList.add('overflow-hidden');
	}

	hideOutputModal() {
		const modal = document.getElementById('outputModal');
		const modalContent = modal.querySelector('.output-section');

		// Trigger fade and scale out
		modal.classList.add('opacity-0');
		modalContent.classList.add('scale-95');

		// Wait for animation to complete before hiding
		setTimeout(() => {
			modal.classList.add('hidden');
			// Remove class to allow body scroll
			document.body.classList.remove('overflow-hidden');
		}, 300);
	}
}

// Wait for DOMContentLoaded to ensure APIs are available
window.addEventListener('DOMContentLoaded', () => {
	new Reto3DProcessor();
});
