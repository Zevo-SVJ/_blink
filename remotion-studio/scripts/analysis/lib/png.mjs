import zlib from 'node:zlib';

/**
 * Encodeur PNG minimal (RGB 8 bits, sans transparence).
 *
 * Pourquoi ne pas passer par FFmpeg ? Parce que les planches contact sont
 * assemblées en mémoire à partir de buffers RGB bruts, et que le filtre `tile`
 * n'est pas disponible dans tous les builds de FFmpeg — notamment celui que
 * Remotion embarque. Écrire le PNG ici rend l'outil indépendant du build
 * installé, sans ajouter la moindre dépendance.
 */

const CRC_TABLE = (() => {
	const table = new Int32Array(256);
	for (let n = 0; n < 256; n += 1) {
		let c = n;
		for (let k = 0; k < 8; k += 1) {
			c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
		}
		table[n] = c;
	}
	return table;
})();

const crc32 = (buffer) => {
	let c = 0xffffffff;
	for (let i = 0; i < buffer.length; i += 1) {
		c = CRC_TABLE[(c ^ buffer[i]) & 0xff] ^ (c >>> 8);
	}
	return (c ^ 0xffffffff) >>> 0;
};

const chunk = (type, data) => {
	const length = Buffer.alloc(4);
	length.writeUInt32BE(data.length, 0);
	const typeAndData = Buffer.concat([Buffer.from(type, 'latin1'), data]);
	const crc = Buffer.alloc(4);
	crc.writeUInt32BE(crc32(typeAndData), 0);
	return Buffer.concat([length, typeAndData, crc]);
};

/**
 * @param {number} width
 * @param {number} height
 * @param {Buffer} rgb  width * height * 3 octets
 * @returns {Buffer} fichier PNG complet
 */
export const encodePng = (width, height, rgb) => {
	const expected = width * height * 3;
	if (rgb.length !== expected) {
		throw new Error(
			`Buffer RGB de taille ${rgb.length}, attendu ${expected} (${width}×${height})`,
		);
	}

	const stride = width * 3;
	// Chaque scanline est précédée d'un octet de filtre ; 0 = aucun filtre.
	const raw = Buffer.alloc((stride + 1) * height);
	for (let y = 0; y < height; y += 1) {
		raw[y * (stride + 1)] = 0;
		rgb.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
	}

	const ihdr = Buffer.alloc(13);
	ihdr.writeUInt32BE(width, 0);
	ihdr.writeUInt32BE(height, 4);
	ihdr[8] = 8; // profondeur
	ihdr[9] = 2; // type couleur : truecolor RGB
	ihdr[10] = 0; // compression
	ihdr[11] = 0; // filtre
	ihdr[12] = 0; // entrelacement

	return Buffer.concat([
		Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
		chunk('IHDR', ihdr),
		chunk('IDAT', zlib.deflateSync(raw, {level: 9})),
		chunk('IEND', Buffer.alloc(0)),
	]);
};

/** Fabrique un canevas RGB rempli d'une couleur unie. */
export const createCanvas = (width, height, [r, g, b] = [10, 10, 14]) => {
	const buffer = Buffer.alloc(width * height * 3);
	for (let i = 0; i < buffer.length; i += 3) {
		buffer[i] = r;
		buffer[i + 1] = g;
		buffer[i + 2] = b;
	}
	return {width, height, data: buffer};
};

/** Colle un buffer RGB dans un canevas, en clippant sur les bords. */
export const blit = (canvas, source, sourceWidth, sourceHeight, x, y) => {
	for (let row = 0; row < sourceHeight; row += 1) {
		const targetY = y + row;
		if (targetY < 0 || targetY >= canvas.height) continue;

		const copyWidth = Math.min(sourceWidth, canvas.width - x);
		if (copyWidth <= 0) continue;

		source.copy(
			canvas.data,
			(targetY * canvas.width + x) * 3,
			row * sourceWidth * 3,
			(row * sourceWidth + copyWidth) * 3,
		);
	}
};

// Police bitmap 3×5 : juste de quoi incruster un index et un timestamp sur
// chaque vignette, pour ne jamais confondre une image et sa position.
const GLYPHS = {
	'0': ['111', '101', '101', '101', '111'],
	'1': ['010', '110', '010', '010', '111'],
	'2': ['111', '001', '111', '100', '111'],
	'3': ['111', '001', '111', '001', '111'],
	'4': ['101', '101', '111', '001', '001'],
	'5': ['111', '100', '111', '001', '111'],
	'6': ['111', '100', '111', '101', '111'],
	'7': ['111', '001', '010', '010', '010'],
	'8': ['111', '101', '111', '101', '111'],
	'9': ['111', '101', '111', '001', '111'],
	'.': ['000', '000', '000', '000', '010'],
	':': ['000', '010', '000', '010', '000'],
	'-': ['000', '000', '111', '000', '000'],
	s: ['111', '100', '111', '001', '111'],
	f: ['111', '100', '110', '100', '100'],
	'#': ['101', '111', '101', '111', '101'],
	' ': ['000', '000', '000', '000', '000'],
};

/** Écrit un court texte dans le canevas. Les caractères inconnus sont ignorés. */
export const drawText = (canvas, text, x, y, scale = 2, color = [255, 255, 255]) => {
	let cursorX = x;
	for (const char of text.toLowerCase()) {
		const glyph = GLYPHS[char];
		if (!glyph) {
			cursorX += 4 * scale;
			continue;
		}
		for (let row = 0; row < glyph.length; row += 1) {
			for (let col = 0; col < 3; col += 1) {
				if (glyph[row][col] !== '1') continue;
				for (let dy = 0; dy < scale; dy += 1) {
					for (let dx = 0; dx < scale; dx += 1) {
						const px = cursorX + col * scale + dx;
						const py = y + row * scale + dy;
						if (px < 0 || px >= canvas.width || py < 0 || py >= canvas.height) {
							continue;
						}
						const offset = (py * canvas.width + px) * 3;
						canvas.data[offset] = color[0];
						canvas.data[offset + 1] = color[1];
						canvas.data[offset + 2] = color[2];
					}
				}
			}
		}
		cursorX += 4 * scale;
	}
};

/** Bandeau semi-opaque, pour garder le texte lisible sur une image claire. */
export const darkenRect = (canvas, x, y, width, height, factor = 0.35) => {
	for (let row = y; row < y + height; row += 1) {
		if (row < 0 || row >= canvas.height) continue;
		for (let col = x; col < x + width; col += 1) {
			if (col < 0 || col >= canvas.width) continue;
			const offset = (row * canvas.width + col) * 3;
			canvas.data[offset] = Math.round(canvas.data[offset] * factor);
			canvas.data[offset + 1] = Math.round(canvas.data[offset + 1] * factor);
			canvas.data[offset + 2] = Math.round(canvas.data[offset + 2] * factor);
		}
	}
};
