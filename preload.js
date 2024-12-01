const { contextBridge, ipcRenderer } = require('electron');
const CropperClass = require('cropperjs');

// Make sure this runs before exposing to window
const electronAPI = {
	processImage: (imageBuffer) => ipcRenderer.invoke('process-image', imageBuffer),
	processCustomFrame: (buffer) => ipcRenderer.invoke('process-custom-frame', buffer),
	createGif: async (frames, options) => {
		try {
			return await ipcRenderer.invoke('create-gif', frames, options);
		} catch (error) {
			console.error('Error in createGif bridge:', error);
			throw error;
		}
	},
	saveGif: async (buffer, defaultFilename, saveAs, originalPath) => {
		return await ipcRenderer.invoke(
			'save-gif',
			buffer,
			defaultFilename,
			saveAs,
			originalPath
		);
	},
	saveFrames: (frames) => ipcRenderer.invoke('save-frames', frames),
	editFrame: (frameBuffer, edits) =>
		ipcRenderer.invoke('edit-frame', frameBuffer, edits),
};

// Create a proper constructor wrapper for Cropper that includes all necessary methods
contextBridge.exposeInMainWorld('Cropper', {
	new: (element, options) => {
		try {
			console.log('Creating new Cropper instance with element:', element);
			console.log('Cropper options:', options);
			const cropper = new CropperClass(element, options);
			console.log('Cropper instance created:', cropper);
			// Return a proxy object that includes all the methods we need
			return {
				destroy: () => cropper.destroy(),
				getData: (rounded) => cropper.getData(rounded),
				reset: () => cropper.reset(),
				getCroppedCanvas: () => cropper.getCroppedCanvas(),
				setData: (data) => cropper.setData(data),

				clear: () => cropper.clear(),
				on: (event, callback) => cropper.on(event, callback),
				getContainerData: () => cropper.getContainerData(),
				getCanvasData: () => cropper.getCanvasData(),
				addEventListener: (event, callback) =>
					cropper.addEventListener(event, callback),
				removeEventListener: (event, callback) =>
					cropper.removeEventListener(event, callback),
				cropMove: (callback) => cropper.on('cropmove', callback),
			};
		} catch (error) {
			console.error('Error creating Cropper instance:', error);
			throw error;
		}
	},
});

contextBridge.exposeInMainWorld('electronAPI', electronAPI);

console.log('Preload script loaded');
