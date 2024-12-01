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

		// Function to position dropdown
		const positionDropdown = () => {
			const buttonRect = saveDropdownButton.getBoundingClientRect();
			const dropdownRect = saveDropdownMenu.getBoundingClientRect();
			const windowHeight = window.innerHeight;

			// Check if there's enough space below
			const spaceBelow = windowHeight - buttonRect.bottom;
			const spaceNeeded = dropdownRect.height + 8; // 8px buffer

			if (spaceBelow < spaceNeeded) {
				// Position above
				saveDropdownMenu.style.bottom = '100%';
				saveDropdownMenu.style.top = 'auto';
				saveDropdownMenu.classList.remove('mt-2');
				saveDropdownMenu.classList.add('mb-2');
			} else {
				// Position below
				saveDropdownMenu.style.top = '100%';
				saveDropdownMenu.style.bottom = 'auto';
				saveDropdownMenu.classList.remove('mb-2');
				saveDropdownMenu.classList.add('mt-2');
			}
		};

		saveDropdownButton.addEventListener('click', () => {
			saveDropdownMenu.classList.toggle('hidden');
			if (!saveDropdownMenu.classList.contains('hidden')) {
				positionDropdown();
			}
		});

		// Reposition dropdown on window resize
		window.addEventListener('resize', () => {
			if (!saveDropdownMenu.classList.contains('hidden')) {
				positionDropdown();
			}
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

		this.setupResetButton();

		// Add upload another button handler
		document.getElementById('uploadAnotherButton').addEventListener('click', () => {
			this.hideOutputModal();
			this.resetProcessor();
		});
	}

	setupSpeedControls() {
		// Add speed control handlers
		document
			.getElementById('slowSpeedBtn')
			.addEventListener('click', () => this.updateGifSpeed(200));
		document
			.getElementById('normalSpeedBtn')
			.addEventListener('click', () => this.updateGifSpeed(150));
		document
			.getElementById('fastSpeedBtn')
			.addEventListener('click', () => this.updateGifSpeed(100));
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

		dropZone.addEventListener('click', () => {
			fileInput.click();
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
		content.offsetHeight;
		content.classList.remove('opacity-0');

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
			}, 100);
		}, 100);
	}

	hideImageContent() {
		const content = document.getElementById('imageContent');
		const originalPreview = document.getElementById('originalPreviewCard');
		const framesPreview = document.getElementById('framesPreviewCard');
		const settings = document.getElementById('settingsCard');

		if (!content || !originalPreview || !framesPreview) return;

		// Add opacity transitions first
		content.classList.add('opacity-0');
		originalPreview.classList.add('translate-y-8', 'opacity-0');
		framesPreview.classList.add('translate-y-8', 'opacity-0');
		settings?.classList.add('translate-y-8', 'opacity-0');

		// Hide immediately after starting the fade
		requestAnimationFrame(() => {
			content.classList.add('hidden');
		});
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
			this.originalFrames = result.frames.map((frame) => [...frame]);
			this.displayFrames();

			document.getElementById('processButton').disabled = false;

			// Hide save buttons when new image is loaded
			document.querySelector('.output-section').classList.add('hidden');

			// Store original image dimensions
			this.originalWidth = result.metadata.originalWidth;
			this.originalHeight = result.metadata.originalHeight;

			// Store original image buffer
			this.originalFrames = [buffer]; // Store full original image

			// Show reset button with animation
			const resetButton = document.getElementById('resetButton');
			resetButton.classList.remove('hidden');
			// Force reflow
			resetButton.offsetHeight;
			resetButton.classList.remove('opacity-0');
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
			const delay = 150;
			const firstFrame = document.querySelector('#frameImages img');

			if (!firstFrame) {
				throw new Error('No frames available. Please process an image first.');
			}

			const width = firstFrame.naturalWidth;
			const height = firstFrame.naturalHeight;

			if (!this.frames || !this.frames.length) {
				throw new Error('No frame data available');
			}

			console.log('Creating GIF:', {
				frames: this.frames.length,
				dimensions: `${width}x${height}`,
				delay,
			});

			// Add timeout promise
			const gifPromise = window.electronAPI.createGif(this.frames, {
				delay: delay,
				width: width,
				height: height,
				quality: 10,
				preserveColors: true,
				transparent: null,
			});

			// Add 30 second timeout
			const timeoutPromise = new Promise((_, reject) => {
				setTimeout(() => reject(new Error('GIF creation timed out')), 30000);
			});

			// Race between GIF creation and timeout
			const gifBuffer = await Promise.race([gifPromise, timeoutPromise]);

			if (!gifBuffer || !gifBuffer.length) {
				throw new Error('Invalid GIF buffer received');
			}

			// Store and display the GIF
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

			// Update active state of speed buttons
			const speedButtons = ['slowSpeedBtn', 'normalSpeedBtn', 'fastSpeedBtn'];
			speedButtons.forEach((btnId) => {
				const btn = document.getElementById(btnId);
				if (
					(btnId === 'slowSpeedBtn' && delay === 200) ||
					(btnId === 'normalSpeedBtn' && delay === 150) ||
					(btnId === 'fastSpeedBtn' && delay === 100)
				) {
					btn.classList.add(
						'border-gray-300',
						'dark:border-gray-300',
						'text-gray-300',
						'dark:text-gray-300'
					);
					btn.classList.remove(
						'border-gray-200',
						'dark:border-gray-700',
						'text-gray-500',
						'dark:text-gray-400'
					);
				} else {
					btn.classList.remove(
						'border-gray-300',
						'dark:border-gray-300',
						'text-gray-300',
						'dark:text-gray-300'
					);
					btn.classList.add(
						'border-gray-200',
						'dark:border-gray-700',
						'text-gray-500',
						'dark:text-gray-400'
					);
				}
			});
		} catch (error) {
			console.error('Error creating GIF:', error);
			alert(`Error creating GIF: ${error.message}`);
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
		// Wait for DOM to be ready
		if (!document.getElementById('frameEditor')) {
			console.warn('Frame editor elements not found, waiting for DOM...');
			setTimeout(() => this.setupFrameEditor(), 100);
			return;
		}

		const editor = document.getElementById('frameEditor');
		const applyButton = document.getElementById('applyEdits');
		const resetButton = document.getElementById('resetCrop');
		const resetToOriginalButton = document.getElementById('resetToOriginal');
		const cancelButton = document.getElementById('cancelEdits');
		this.currentEditingFrame = -1;
		this.hasBeenCropped = false;

		// Make sure editor is visible but transparent initially
		editor.classList.add('hidden', 'opacity-0');

		// Initially hide reset to original and disable reset crop
		resetToOriginalButton.classList.add('hidden');
		resetButton.disabled = true;
		resetButton.classList.add('opacity-50', 'cursor-not-allowed');

		applyButton.addEventListener('click', () => {
			if (this.cropper) {
				this.applyFrameEdits();
				this.hasBeenCropped = true;
			}
		});

		resetButton.addEventListener('click', () => {
			if (this.cropper) {
				this.cropper.reset();
				resetButton.disabled = true;
				resetButton.classList.add('opacity-50', 'cursor-not-allowed');
			}
		});

		resetToOriginalButton.addEventListener('click', () => {
			if (
				this.currentEditingFrame >= 0 &&
				this.originalFrames[this.currentEditingFrame]
			) {
				// Reset the current frame to its original state
				const originalFrame = this.originalFrames[this.currentEditingFrame];

				// Cleanup existing cropper
				if (this.cropper) {
					this.cropper.destroy();
					this.cropper = null;
				}

				// Create new image with original frame data
				const img = document.createElement('img');
				const chunks = this.chunkArray(originalFrame, 32768);
				let binary = '';
				chunks.forEach((chunk) => {
					binary += String.fromCharCode.apply(null, chunk);
				});
				const base64 = btoa(binary);
				img.src = `data:image/png;base64,${base64}`;

				// Replace image and reinitialize cropper
				const cropContainer = editor.querySelector('.crop-container');
				cropContainer.innerHTML = '';
				cropContainer.appendChild(img);

				// Wait for image to load before initializing new cropper
				img.onload = () => {
					this.initializeCropper(img, this.currentEditingFrame);
				};

				// Reset states
				this.hasBeenCropped = false;
				resetToOriginalButton.classList.add('hidden');
				resetButton.disabled = true;
				resetButton.classList.add('opacity-50', 'cursor-not-allowed');
			}
		});

		cancelButton.addEventListener('click', () => {
			this.hideFrameEditor();
		});
	}

	// Modify the initializeCropper method to handle initial crop area and frame boundaries
	initializeCropper(img, frameIndex) {
		// Calculate initial crop area based on the frame position
		const frameWidth = Math.floor(this.originalWidth / 3);
		const margin = 2;
		const initialCrop = {
			x: frameIndex * frameWidth + margin,
			y: 0,
			width: frameWidth - margin * 2,
			height: this.originalHeight,
		};

		const cropperOptions = {
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
			background: true,
			modal: true,
			minContainerWidth: 500,
			minContainerHeight: 500,
			data: initialCrop, // Set initial crop area
			ready: (event) => {
				console.log('Cropper is ready');
				// Initialize dimensions display
				const dimensions = document.getElementById('cropDimensions');
				if (dimensions) {
					const { width, height } = this.cropper.getData();
					dimensions.textContent = `${Math.round(width)}px x ${Math.round(
						height
					)}px`;
				}
			},
			crop: (event) => {
				// Validate crop data
				const { width, height, x, y } = event.detail;
				if (
					width <= 0 ||
					height <= 0 ||
					x < 0 ||
					y < 0 ||
					x + width > this.originalWidth ||
					y + height > this.originalHeight
				) {
					this.cropper.setData(initialCrop);
					return;
				}

				// Enable reset button when crop box is modified
				const resetButton = document.getElementById('resetCrop');
				resetButton.disabled = false;
				resetButton.classList.remove('opacity-50', 'cursor-not-allowed');

				// Update dimensions immediately when crop box changes
				this.updateDimensions();
			},
			cropstart: () => {
				this.updateDimensions();
			},
			cropmove: () => {
				this.updateDimensions();
			},
			cropend: () => {
				this.updateDimensions();
			},
		};

		this.cropper = window.Cropper.new(img, cropperOptions);
		console.log('Cropper initialized:', this.cropper);
	}

	async showFrameEditor(frameIndex) {
		console.log('Opening editor for frame:', frameIndex);
		const editor = document.getElementById('frameEditor');
		const cropContainer = editor.querySelector('.crop-container');

		if (!editor || !cropContainer) {
			console.error('Editor elements not found');
			return;
		}

		this.currentEditingFrame = frameIndex;

		try {
			// Use original image buffer instead of frame buffer
			const originalBuffer = this.originalFrames[0]; // Original full image

			// Create image element for cropper
			const img = document.createElement('img');
			img.className = 'max-w-full max-h-[80vh] object-contain';

			// Convert original image to base64
			const chunks = this.chunkArray(originalBuffer, 32768);
			let binary = '';
			chunks.forEach((chunk) => {
				binary += String.fromCharCode.apply(null, chunk);
			});
			const base64 = btoa(binary);
			img.src = `data:image/png;base64,${base64}`;

			// Make editor visible
			editor.classList.remove('hidden');
			editor.offsetHeight;
			editor.classList.remove('opacity-0');

			// Clear existing content and add new image
			cropContainer.innerHTML = '';
			cropContainer.appendChild(img);

			// Wait for image to load before proceeding
			await new Promise((resolve, reject) => {
				img.onload = resolve;
				img.onerror = reject;
			});

			// Cleanup existing cropper
			if (this.cropper) {
				this.cropper.destroy();
				this.cropper = null;
			}

			// Initialize Cropper with the frame boundaries
			this.initializeCropper(img, frameIndex);
		} catch (error) {
			console.error('Error showing frame editor:', error);
			console.error('Error stack:', error.stack);
			alert('Error opening editor: ' + error.message);
			this.hideFrameEditor();
		}
	}

	hideFrameEditor() {
		const editor = document.getElementById('frameEditor');
		if (!editor) return;

		// Fade out
		editor.classList.add('opacity-0');

		// Wait for transition to complete
		setTimeout(() => {
			editor.classList.add('hidden');
			// Cleanup cropper
			if (this.cropper) {
				this.cropper.destroy();
				this.cropper = null;
			}
			this.currentEditingFrame = -1;
		}, 300); // Match your transition duration
	}

	// Modify the applyFrameEdits method to handle the crop correctly
	async applyFrameEdits() {
		if (this.currentEditingFrame < 0 || !this.cropper) return;

		try {
			const cropData = this.cropper.getData(true); // true for rounded values

			// Validate crop data
			if (
				cropData.width <= 0 ||
				cropData.height <= 0 ||
				cropData.x < 0 ||
				cropData.y < 0 ||
				cropData.x + cropData.width > this.originalWidth ||
				cropData.y + cropData.height > this.originalHeight
			) {
				throw new Error('Invalid crop dimensions');
			}

			const cropParams = {
				left: Math.round(cropData.x),
				top: Math.round(cropData.y),
				width: Math.round(cropData.width),
				height: Math.round(cropData.height),
			};

			console.log('Crop data:', cropData);
			console.log('Applying crop with params:', cropParams);

			// Start fade out before processing
			const editor = document.getElementById('frameEditor');
			editor.classList.add('opacity-0');

			// Wait for fade out
			await new Promise((resolve) => setTimeout(resolve, 300));

			// Use the original image buffer for cropping
			const editedBuffer = await window.electronAPI.editFrame(
				this.originalFrames[0], // Use original image
				cropParams
			);

			// Update the frame and display
			this.frames[this.currentEditingFrame] = editedBuffer;

			// Hide editor before updating frames to prevent flicker
			editor.classList.add('hidden');
			this.cropper.destroy();
			this.cropper = null;
			this.currentEditingFrame = -1;

			await this.displayFrames();
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
			// Setup speed controls after modal is shown
			this.setupSpeedControls();
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

	// Add this new method to handle speed updates
	async updateGifSpeed(delay) {
		try {
			if (!this.frames || !this.frames.length) {
				console.error('No frames available');
				return;
			}

			// Get dimensions from the first frame
			const firstFrame = document.querySelector('#frameImages img');
			const width = firstFrame.naturalWidth;
			const height = firstFrame.naturalHeight;

			// Create new GIF with updated delay
			const gifBuffer = await window.electronAPI.createGif(this.frames, {
				delay: delay,
				width: width,
				height: height,
				quality: 10,
				preserveColors: true,
				transparent: null,
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

			// Update the GIF preview
			const outputElement = document.getElementById('outputGif');
			outputElement.src = `data:image/gif;base64,${base64}`;

			// Update active state of speed buttons
			const speedButtons = ['slowSpeedBtn', 'normalSpeedBtn', 'fastSpeedBtn'];
			speedButtons.forEach((btnId) => {
				const btn = document.getElementById(btnId);
				if (
					(btnId === 'slowSpeedBtn' && delay === 200) ||
					(btnId === 'normalSpeedBtn' && delay === 150) ||
					(btnId === 'fastSpeedBtn' && delay === 100)
				) {
					btn.classList.add(
						'border-gray-300',
						'dark:border-gray-300',
						'text-gray-300',
						'dark:text-gray-300'
					);
					btn.classList.remove(
						'border-gray-200',
						'dark:border-gray-700',
						'text-gray-500',
						'dark:text-gray-400'
					);
				} else {
					btn.classList.remove(
						'border-gray-300',
						'dark:border-gray-300',
						'text-gray-300',
						'dark:text-gray-300'
					);
					btn.classList.add(
						'border-gray-200',
						'dark:border-gray-700',
						'text-gray-500',
						'dark:text-gray-400'
					);
				}
			});
		} catch (error) {
			console.error('Error updating GIF speed:', error);
			alert(`Error updating GIF speed: ${error.message}`);
		}
	}

	updateDimensions() {
		const dimensions = document.getElementById('cropDimensions');
		if (dimensions && this.cropper) {
			const data = this.cropper.getData(true); // true for rounded values
			dimensions.textContent = `${Math.round(data.width)}px x ${Math.round(
				data.height
			)}px`;
		}
	}

	setupResetButton() {
		const resetButton = document.getElementById('resetButton');

		resetButton.addEventListener('click', () => {
			// Show confirmation dialog
			if (
				confirm(
					'Are you sure you want to reset? This will clear all current progress.'
				)
			) {
				this.resetProcessor();
			}
		});
	}

	resetProcessor() {
		// Reset all state
		this.frames = [];
		this.originalFrames = [];
		this.currentGifBuffer = null;
		this.originalFilePath = null;
		this.originalWidth = null;
		this.originalHeight = null;

		// Clear UI and start fade animations simultaneously
		document.getElementById('originalImage').src = '';
		document.getElementById('frameImages').innerHTML = '';
		document.getElementById('processButton').disabled = true;

		// Reset file input value
		const fileInput = document.getElementById('fileInput');
		fileInput.value = '';

		// Start all fade-outs simultaneously
		this.hideImageContent();
		this.hideOutputModal();

		// Show upload zone with fade
		requestAnimationFrame(() => {
			this.showUploadZone();
		});

		// Hide reset button with animation
		const resetButton = document.getElementById('resetButton');

		resetButton.classList.add('opacity-0');
		requestAnimationFrame(() => {
			resetButton.classList.add('hidden');
		});
	}
}

// Wait for DOMContentLoaded to ensure APIs are available
let processor = null;

window.addEventListener('DOMContentLoaded', async () => {
	// Wait a tick to ensure all DOM elements are available
	await new Promise((resolve) => setTimeout(resolve, 0));
	processor = new Reto3DProcessor();
});
