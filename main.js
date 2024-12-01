const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const ffmpeg = require('fluent-ffmpeg');
const { file: tmpFile } = require('tmp-promise');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const ffmpegPath = require('ffmpeg-static');
const os = require('os');
const tmp = require('tmp-promise');

// Handle FFmpeg path for both dev and production
const getFfmpegPath = () => {
	if (app.isPackaged) {
		// In production, use path relative to app resources
		return path.join(
			process.resourcesPath,
			'app.asar.unpacked',
			'node_modules',
			'ffmpeg-static',
			ffmpegPath.replace(/^.*[/\\]node_modules[/\\]ffmpeg-static[/\\]/, '')
		);
	}
	return ffmpegPath;
};

// Set FFmpeg path
ffmpeg.setFfmpegPath(getFfmpegPath());

function createWindow() {
	const mainWindow = new BrowserWindow({
		width: 1200,
		height: 800,
		webPreferences: {
			nodeIntegration: false,
			contextIsolation: true,
			preload: path.join(__dirname, 'preload.js'),
			sandbox: false,
		},
	});

	mainWindow.loadFile('index.html');
}

app.whenReady().then(() => {
	createWindow();

	// Handle image processing
	ipcMain.handle('process-image', async (event, bufferArray) => {
		try {
			const buffer = Buffer.from(bufferArray);
			const metadata = await sharp(buffer).metadata();

			// Calculate frame width with a small margin to avoid overlap
			const frameWidth = Math.floor(metadata.width / 3);
			const margin = 2; // Add a small margin to avoid bleeding into adjacent frames

			console.log('Image dimensions:', metadata.width, 'x', metadata.height);
			console.log('Frame width:', frameWidth);

			// Extract frames with consistent processing and margins
			const frames = await Promise.all([
				sharp(buffer)
					.extract({
						left: margin,
						top: 0,
						width: frameWidth - margin * 2,
						height: metadata.height,
					})
					.toBuffer(),
				sharp(buffer)
					.extract({
						left: frameWidth + margin,
						top: 0,
						width: frameWidth - margin * 2,
						height: metadata.height,
					})
					.toBuffer(),
				sharp(buffer)
					.extract({
						left: frameWidth * 2 + margin,
						top: 0,
						width: frameWidth - margin * 2,
						height: metadata.height,
					})
					.toBuffer(),
			]);

			console.log('Extracted frames:', frames.length);
			frames.forEach((frame, i) => {
				console.log(`Frame ${i + 1} size:`, frame.length);
			});

			return {
				originalBuffer: Array.from(buffer),
				frames: frames.map((frame) => Array.from(frame)),
				metadata: {
					width: frameWidth - margin * 2, // Adjust width to account for margins
					height: metadata.height,
					originalWidth: metadata.width,
					originalHeight: metadata.height,
				},
			};
		} catch (error) {
			console.error('Error processing image:', error);
			throw error;
		}
	});

	ipcMain.handle(
		'save-gif',
		async (event, buffer, defaultFilename, saveAs, originalPath) => {
			try {
				let savePath;

				if (saveAs) {
					const result = await dialog.showSaveDialog({
						defaultPath: defaultFilename,
						filters: [{ name: 'GIF files', extensions: ['gif'] }],
					});

					if (result.canceled) return;
					savePath = result.filePath;
				} else {
					// Create animated folder in the same directory as the original file
					const baseDir = originalPath
						? path.dirname(originalPath)
						: app.getPath('downloads');
					const animatedDir = path.join(baseDir, 'animated');

					// Create the animated directory if it doesn't exist
					await fs.promises.mkdir(animatedDir, { recursive: true });

					savePath = path.join(animatedDir, defaultFilename);
				}

				await fs.promises.writeFile(savePath, Buffer.from(buffer));
				return savePath;
			} catch (error) {
				console.error('Error saving GIF:', error);
				throw error;
			}
		}
	);

	// Handle GIF creation
	ipcMain.handle('create-gif', async (event, frames, options) => {
		try {
			console.log('FFmpeg path:', getFfmpegPath());
			console.log('Starting GIF creation with options:', options);
			console.log('Number of frames:', frames.length);

			// Validate input
			if (!frames || !Array.isArray(frames) || frames.length === 0) {
				throw new Error('Invalid frames data');
			}

			if (!options || typeof options !== 'object') {
				throw new Error('Invalid options');
			}

			// Create temporary directory for frames
			const { path: tmpDirPath } = await tmp.dir({ unsafeCleanup: true });
			const frameFiles = [];

			// Create ping-pong sequence: 1,2,3,2,1
			const pingPongSequence = [
				...frames, // Forward: 1,2,3
				...frames.slice(1, -1).reverse(), // Back: 2
			];

			// Save frames as temporary files with sequential naming
			await Promise.all(
				pingPongSequence.map(async (frameBuffer, index) => {
					const framePath = path.join(
						tmpDirPath,
						`frame_${index.toString().padStart(3, '0')}.png`
					);
					frameFiles.push(framePath);

					const image = await sharp(Buffer.from(frameBuffer))
						.resize(options.width, options.height, {
							fit: 'fill',
							background: { r: 255, g: 255, b: 255, alpha: 1 },
						})
						.png()
						.toBuffer();

					await fs.promises.writeFile(framePath, image);
					console.log(`Saved temp frame ${index} to:`, framePath);
				})
			);

			// Create temporary file for output GIF
			const outputFile = await tmpFile({ postfix: '.gif' });

			// Create GIF using FFmpeg
			await new Promise((resolve, reject) => {
				const command = ffmpeg();

				command
					.input(path.join(tmpDirPath, 'frame_%03d.png'))
					.inputOptions(['-framerate', `${1000 / options.delay}`])
					.outputOptions([
						'-vf',
						'split[s0][s1];[s0]palettegen=stats_mode=full[p];[s1][p]paletteuse=dither=floyd_steinberg',
						'-loop',
						'0',
					])
					.output(outputFile.path);

				console.log('FFmpeg command:', command._getArguments().join(' '));
				console.log('FFmpeg working directory:', process.cwd());
				console.log('Temp directory exists:', fs.existsSync(tmpDirPath));
				console.log('Output file path:', outputFile.path);

				command.on('start', (commandLine) => {
					console.log('FFmpeg process started:', commandLine);
				});

				command.on('end', () => {
					console.log('FFmpeg process completed');
					resolve();
				});

				command.on('error', (err) => {
					console.error('FFmpeg error:', err);
					console.error('FFmpeg error stack:', err.stack);
					reject(err);
				});

				command.on('stderr', (line) => console.log('FFmpeg:', line));

				command.run();
			});

			// Read the output GIF
			const gifBuffer = await fs.promises.readFile(outputFile.path);
			console.log('Generated GIF size:', gifBuffer.length);

			// Clean up temporary files
			await fs.promises.rm(tmpDirPath, { recursive: true, force: true });
			await outputFile.cleanup();

			if (gifBuffer.length === 0) {
				throw new Error('Generated GIF is empty');
			}

			return Array.from(gifBuffer);
		} catch (error) {
			console.error('Error in create-gif handler:', error);
			console.error('Error stack:', error.stack);
			throw error;
		}
	});

	ipcMain.handle('save-frames', async (event, frames) => {
		try {
			// Change to showSaveDialog and let user select directory
			const { filePath: dirPath, canceled } = await dialog.showSaveDialog({
				title: 'Save Frames',
				defaultPath: 'frames', // This will be the suggested folder name
				properties: ['createDirectory', 'showOverwriteConfirmation'],
				buttonLabel: 'Save Frames Here',
			});

			if (canceled || !dirPath) {
				throw new Error('Save cancelled');
			}

			// Create directory if it doesn't exist
			const saveDir = path.dirname(dirPath);
			await fs.promises.mkdir(saveDir, { recursive: true });

			console.log('Saving frames to:', saveDir);
			console.log('Number of frames:', frames.length);

			await Promise.all(
				frames.map(async (frameBuffer, index) => {
					try {
						const buffer = Buffer.from(frameBuffer);
						const processedBuffer = await sharp(buffer).png().toBuffer();
						const outputPath = path.join(saveDir, `frame_${index + 1}.png`);
						await fs.promises.writeFile(outputPath, processedBuffer);
						console.log(`Saved frame ${index + 1} to:`, outputPath);
					} catch (frameError) {
						console.error(`Error saving frame ${index + 1}:`, frameError);
						throw frameError;
					}
				})
			);

			console.log('All frames saved successfully');
			return true;
		} catch (error) {
			console.error('Error saving frames:', error);
			throw error;
		}
	});

	app.on('activate', function () {
		if (BrowserWindow.getAllWindows().length === 0) createWindow();
	});
});

app.on('window-all-closed', function () {
	if (process.platform !== 'darwin') app.quit();
});

process.on('uncaughtException', (error) => {
	console.error('Uncaught Exception:', error);
});

// Add this handler with your other IPC handlers
ipcMain.handle('edit-frame', async (event, frameBuffer, crop) => {
	try {
		const buffer = Buffer.from(frameBuffer);

		// Ensure crop parameters are valid
		const image = sharp(buffer);
		const metadata = await image.metadata();

		const validCrop = {
			left: Math.max(0, Math.min(crop.left, metadata.width - 1)),
			top: Math.max(0, Math.min(crop.top, metadata.height - 1)),
			width: Math.min(crop.width, metadata.width - crop.left),
			height: Math.min(crop.height, metadata.height - crop.top),
		};

		console.log('Applying crop:', validCrop);

		const editedBuffer = await image.extract(validCrop).toBuffer();

		return Array.from(editedBuffer);
	} catch (error) {
		console.error('Error editing frame:', error);
		throw error;
	}
});

// Add this handler for processing custom frames
ipcMain.handle('process-custom-frame', async (event, buffer) => {
	try {
		const processedBuffer = await sharp(Buffer.from(buffer)).toBuffer();
		return Array.from(processedBuffer);
	} catch (error) {
		console.error('Error processing custom frame:', error);
		throw error;
	}
});
