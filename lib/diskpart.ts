import { delay, using } from 'bluebird';
import { exec } from 'child_process';
import * as _debug from 'debug';
import { platform } from 'os';

import { writeFile } from './fs';
import { tmpFileDisposer, TmpFileResult } from './tmp';

const debug = _debug('etcher-sdk:diskpart');

const DISKPART_DELAY = 2000;
const DISKPART_RETRIES = 5;
const PATTERN = /PHYSICALDRIVE(\d+)/i;

interface ExecResult {
	stdout: string;
	stderr: string;
}

const execAsync = async (command: string): Promise<ExecResult> => {
	return await new Promise((resolve: (res: ExecResult) => void, reject: (err: Error) => void) => {
		exec(command, (error: Error, stdout: string, stderr: string) => {
			if (error) {
				reject(error);
				return;
			}
			resolve({ stdout, stderr });
		});
	});
};

/**
 * @summary Run a diskpart script
 * @param {Array<String>} commands - list of commands to run
 */
const runDiskpart = async (commands: string[]): Promise<void> => {
	if (platform() !== 'win32') {
		return;
	}
	await using(tmpFileDisposer(false), async (file: TmpFileResult) => {
		await writeFile(file.path, commands.join('\r\n'));
		const { stdout, stderr } = await execAsync(`diskpart /s ${file.path}`);
		debug('stdout:', stdout);
		debug('stderr:', stderr);
	});
};

/**
 * @summary Clean a device's partition tables
 * @param {String} device - device path
 * @example
 * diskpart.clean('\\\\.\\PhysicalDrive2')
 *   .then(...)
 *   .catch(...)
 */
export const clean = async (device: string): Promise<void> => {
	if (platform() !== 'win32') {
		return;
	}
	const match = device.match(PATTERN);
	if (match === null) {
		throw new Error(`Invalid device: "${device}"`);
	}
	debug('clean', device);
	const deviceId = match.pop();
	let errorCount = 0;
	while (errorCount <= DISKPART_RETRIES) {
		try {
			await runDiskpart([ `select disk ${deviceId}`, 'clean', 'rescan' ]);
			return;
		} catch (error) {
			errorCount += 1;
			if (errorCount <= DISKPART_RETRIES) {
				await delay(DISKPART_DELAY);
			} else {
				throw new Error(`Couldn't clean the drive, ${error.failure.message} (code ${error.failure.code})`);
			}
		}
	}
};