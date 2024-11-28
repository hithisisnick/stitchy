const { contextBridge, ipcRenderer } = require('electron');
const CropperClass = require('cropperjs');

// Make sure this runs before exposing to window
const electronAPI = {
	processImage: (imageBuffer) => ipcRenderer.invoke('process-image', imageBuffer),
	processCustomFrame: (buffer) => ipcRenderer.invoke('process-custom-frame', buffer),
	createGif: (frames, options) => ipcRenderer.invoke('create-gif', frames, options),
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
		const cropper = new CropperClass(element, options);
		// Return a proxy object that includes all the methods we need
		return {
			destroy: () => cropper.destroy(),
			getData: (rounded) => cropper.getData(rounded),
			reset: () => cropper.reset(),
			// Add any other methods you need here
		};
	},
});

contextBridge.exposeInMainWorld('electronAPI', electronAPI);

console.log('Preload script loaded');
