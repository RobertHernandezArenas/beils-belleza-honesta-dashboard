export interface UploadFileInput {
	fileData: Buffer
	category?: string
	type?: string
	subdirectory?: string
}

export interface UploadFileResult {
	url: string
	filename: string
	size: number
}

export interface FileStorageService {
	savePdf(dir: string, baseFilename: string, data: Buffer): Promise<{ filename: string; size: number }>
	saveImage(dir: string, baseFilename: string, data: Buffer): Promise<{ filename: string; size: number }>
}

