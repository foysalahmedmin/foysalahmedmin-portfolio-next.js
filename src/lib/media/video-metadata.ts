/**
 * Dependency-free reader for the few facts the CMS needs from an uploaded
 * MP4: the display size (after rotation) and the duration. Everything is
 * bounds-checked because the input is an untrusted upload; any malformed
 * structure simply yields no metadata instead of throwing.
 */
export type TVideoFileMetadata = Readonly<{
  width?: number;
  height?: number;
  duration_seconds?: number;
}>;

type TBox = Readonly<{
  type: string;
  start: number;
  end: number;
  header: number;
}>;

const MAX_BOX_DEPTH_WALK = 4_096;

const readBoxes = (buffer: Buffer, start: number, end: number): TBox[] => {
  const boxes: TBox[] = [];
  let offset = start;
  while (offset + 8 <= end && boxes.length < MAX_BOX_DEPTH_WALK) {
    let size = buffer.readUInt32BE(offset);
    const type = buffer.toString("latin1", offset + 4, offset + 8);
    let header = 8;
    if (size === 1) {
      if (offset + 16 > end) break;
      const extended = buffer.readBigUInt64BE(offset + 8);
      if (extended > BigInt(Number.MAX_SAFE_INTEGER)) break;
      size = Number(extended);
      header = 16;
    } else if (size === 0) {
      size = end - offset;
    }
    if (size < header || offset + size > end) break;
    boxes.push({ type, start: offset, end: offset + size, header });
    offset += size;
  }
  return boxes;
};

const child = (buffer: Buffer, parent: TBox, type: string): TBox | undefined =>
  readBoxes(buffer, parent.start + parent.header, parent.end).find(
    (box) => box.type === type
  );

const readFixed16 = (buffer: Buffer, offset: number): number | undefined =>
  offset + 4 <= buffer.length
    ? Math.round(buffer.readUInt32BE(offset) / 65_536)
    : undefined;

const readTrackSize = (
  buffer: Buffer,
  tkhd: TBox
): { width: number; height: number } | undefined => {
  const payload = tkhd.start + tkhd.header;
  if (payload + 4 > buffer.length) return undefined;
  const version = buffer.readUInt8(payload);
  const matrix = payload + (version === 1 ? 52 : 40);
  const sizeOffset = payload + (version === 1 ? 88 : 76);
  if (sizeOffset + 8 > tkhd.end) return undefined;
  const width = readFixed16(buffer, sizeOffset);
  const height = readFixed16(buffer, sizeOffset + 4);
  if (!width || !height) return undefined;
  // A quarter-turn matrix (a = 0, b != 0) means the track is stored sideways
  // and displayed rotated, which is how phones record portrait video.
  const a = buffer.readInt32BE(matrix);
  const b = buffer.readInt32BE(matrix + 4);
  return a === 0 && b !== 0
    ? { width: height, height: width }
    : { width, height };
};

const readDuration = (buffer: Buffer, mvhd: TBox): number | undefined => {
  const payload = mvhd.start + mvhd.header;
  if (payload + 4 > buffer.length) return undefined;
  const version = buffer.readUInt8(payload);
  const timescaleOffset = payload + (version === 1 ? 20 : 12);
  const durationOffset = timescaleOffset + 4;
  const needed = durationOffset + (version === 1 ? 8 : 4);
  if (needed > mvhd.end) return undefined;
  const timescale = buffer.readUInt32BE(timescaleOffset);
  const duration =
    version === 1
      ? Number(buffer.readBigUInt64BE(durationOffset))
      : buffer.readUInt32BE(durationOffset);
  if (!timescale || !Number.isFinite(duration) || duration <= 0) {
    return undefined;
  }
  const seconds = duration / timescale;
  return Number.isFinite(seconds) && seconds > 0 && seconds < 86_400
    ? Math.round(seconds * 1000) / 1000
    : undefined;
};

export const readMp4Metadata = (buffer: Buffer): TVideoFileMetadata => {
  try {
    const moov = readBoxes(buffer, 0, buffer.length).find(
      (box) => box.type === "moov"
    );
    if (!moov) return {};
    const mvhd = child(buffer, moov, "mvhd");
    const duration = mvhd ? readDuration(buffer, mvhd) : undefined;
    let size: { width: number; height: number } | undefined;
    for (const track of readBoxes(
      buffer,
      moov.start + moov.header,
      moov.end
    ).filter((box) => box.type === "trak")) {
      const tkhd = child(buffer, track, "tkhd");
      size = tkhd ? readTrackSize(buffer, tkhd) : undefined;
      if (size) break;
    }
    return {
      ...(size ?? {}),
      ...(duration === undefined ? {} : { duration_seconds: duration }),
    };
  } catch {
    return {};
  }
};
