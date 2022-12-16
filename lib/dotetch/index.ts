import { Pack, pack } from "tar-stream";

/**
 * Main Processing function
 *
 * Beware that, as we're outputing to a tar stream, order of operation is important.
 * So operations can't be made async.
 *
 * Order of files in an `.etch` tar stream is :
 * 1. base os image - can be zipped; name of the file should match the one specified in the manifest
 * 2. /inject/_partitions_/_foldersOrFilesToInject_ - injectables assets
 */

const prepareEtchStream = (outputStream: NodeJS.WritableStream): Pack => {
	const packStream = pack();
	packStream.pipe(outputStream);
	console.log("==> dotEtch Stream Ready @prepareEtchStream");
	return packStream;
};

const closeEtchStream = async (packStream: Pack) => {
	// close tarball
	await packStream.finalize();
	console.log("==> dotEtch Stream Closed @closeEtchStream");
};

const streamBaseImage = async (
	packStream: Pack,
	baseImageStream: NodeJS.ReadableStream,
	baseImageSize: number,
	baseImageName: string
): Promise<void> =>
	new Promise(async (resolve, reject) => {
		// Beware that knowing the file size in advance is mandatory
		const baseImageStreamEntry = packStream.entry({
			name: baseImageName,
			mode: 644,
			size: baseImageSize,
		});

		console.log("== Start streaming base image @streamBaseImage ==");

		baseImageStream.pipe(baseImageStreamEntry);

		baseImageStream.on("end", function () {
			// we're good we can continue the process
			console.log("== End of base image streaming @streamBaseImage ==");
			resolve();
		});

		baseImageStream.on("error", function (error) {
			// something went wrong
			reject(error);
		});
	});

export { prepareEtchStream, streamBaseImage, closeEtchStream };
