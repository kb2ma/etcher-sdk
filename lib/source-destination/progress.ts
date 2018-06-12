import { Chunk } from 'blockmap';
import { EventEmitter } from 'events';
import { Transform, Writable } from 'stream';

import speedometer = require('speedometer');

import { PROGRESS_EMISSION_INTERVAL } from '../constants';

export type Constructor<T> = new(...args: any[]) => T;

export interface ProgressEvent {
	position: number;    // Position in file
	bytes: number;       // Number of bytes read
	speed: number;       // Speed in bytes per second (based on bytes, not position)
}

export function makeClassEmitProgressEvents<T extends Constructor<EventEmitter>>(Cls: T, attribute: string, positionAttribute: string, interval: number) {
	// This returns a class that extends Cls, tracks for `attribute` updates and emits `progress` events every `interval` based on it.
	//  * the type of `attribute` must be a number;
	//  * the position attribute of emitted events will be copied from the `positionAttribute` of the instances.
	return class extends Cls {
		_attributeValue = 0;
		_attributeDelta = 0;

		constructor (...args: any[]) {
			super(...args);

			const meter = speedometer();
			const state: ProgressEvent = { position: 0, bytes: 0, speed: 0 };

			const update = () => {
				state.bytes += this._attributeDelta;
				// Ignore because I don't know how to express that positionAttribute is a key of T instances
				// @ts-ignore
				state.position = this[positionAttribute];
				state.speed = meter(this._attributeDelta);
				this._attributeDelta = 0;
				this.emit('progress', state);
			};

			const timer = setInterval(update, interval);

			const clear = () => {
				clearInterval(timer);
			};

			this.once('error', clear);
			this.once('finish', clear);
			this.once('finish', update);
		}

		get [attribute]() {
			return this._attributeValue;
		}

		set [attribute](value: number) {
			this._attributeDelta += value - this._attributeValue;
			this._attributeValue = value;
		}
	};
}

export class CountingWritable extends Writable {
	bytesWritten = 0;
	position: number | undefined;

	_write(chunk: Buffer | Chunk, enc: string, callback: (err?: Error | undefined) => void): void {
		if (Buffer.isBuffer(chunk)) {
			this.bytesWritten = this.position = this.bytesWritten + chunk.length;
		} else {
			this.bytesWritten += chunk.buffer.length;
			this.position = chunk.position + chunk.buffer.length;
		}
		callback();
	}
}

export const ProgressWritable = makeClassEmitProgressEvents(CountingWritable, 'bytesWritten', 'position', PROGRESS_EMISSION_INTERVAL);