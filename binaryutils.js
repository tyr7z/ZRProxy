import { gzipSync, gunzipSync } from "zlib";

export class BinaryReader {
    constructor(uint8array, offset) {
        this.view = new DataView(uint8array.buffer);
        this.offset = offset || 0;
        this.decoder = new TextDecoder();
    }

    canRead(n = 1) {
        return this.offset + n <= this.view.byteLength;
    }

    readUint8() {
        const value = this.view.getUint8(this.offset);
        this.offset++;
        return value;
    }

    readInt32() {
        const value = this.view.getInt32(this.offset, true);
        this.offset += 4;
        return value;
    }

    readInt64() {
        const value = this.view.getBigInt64(this.offset, true);
        this.offset += 8;
        return value;
    }

    readFloat() {
        const value = this.view.getInt32(this.offset, true);
        this.offset += 4;
        return value;
    }

    readUint32() {
        const value = this.view.getUint32(this.offset, true);
        this.offset += 4;
        return value;
    }

    readUint64() {
        const value = this.view.getBigUint64(this.offset, true);
        this.offset += 8;
        return value;
    }

    readString() {
        const length = this.readUint8();
        let value = "";
        for (let i = 0; i < length; i++) {
            const charCode = this.view.getUint8(this.offset + i);
            value += String.fromCharCode(charCode);
        }
        this.offset += length;
        return value;
    }

    readCompressedString() {
        const length = this.readUint32();
        const data = this.view.buffer.slice(this.offset, this.offset + length);
        this.offset += length;
        return gunzipSync(data).toString();
    }

    readUint8Vector2() {
        const x = this.readUint8();
        const y = this.readUint8();
        return { x, y };
    }

    readVector2() {
        const x = this.readInt32();
        const y = this.readInt32();
        return { x, y };
    }

    readArrayVector2() {
        const length = this.readInt32();
        const result = [];
        for (let i = 0; i < length; i++) {
            result.push(this.readVector2());
        }
        return result;
    }

    readArrayUint32() {
        const length = this.readInt32();
        const result = new Array(length);
        for (let i = 0; i < length; i++) {
            result[i] = this.readUint32();
        }
        return result;
    }

    readUint16() {
        const value = this.view.getUint16(this.offset);
        this.offset += 2;
        return value;
    }

    readInt16() {
        const value = this.view.getInt16(this.offset);
        this.offset += 2;
        return value;
    }

    readInt8() {
        const value = this.view.getInt8(this.offset);
        this.offset += 1;
        return value;
    }

    readArrayInt32() {
        const length = this.readInt32();
        const result = new Array(length);
        for (let i = 0; i < length; i++) {
            result[i] = this.readInt32();
        }
        return result;
    }

    readArrayUint8() {
        const length = this.readUint8();
        const result = new Array(length);
        for (let i = 0; i < length; i++) {
            result[i] = this.readUint8();
        }
        return result;
    }
}

export class BinaryWriter {
    constructor(bufferLength) {
        this.view = new DataView(new ArrayBuffer(bufferLength));
        this.offset = 0;
    }

    checkBufferSize(requiredSize) {
        const newLength = this.offset + requiredSize;
        if (newLength > this.view.byteLength) {
            const newBuffer = new ArrayBuffer(newLength);
            const newView = new Uint8Array(newBuffer);
            newView.set(new Uint8Array(this.view.buffer));
            this.view = new DataView(newBuffer);
        }
    }

    writeUint8(value) {
        this.checkBufferSize(1);
        this.view.setUint8(this.offset, value);
        this.offset += 1;
    }

    writeInt32(value) {
        this.checkBufferSize(4);
        this.view.setInt32(this.offset, value, true);
        this.offset += 4;
    }

    writeInt64(value) {
        this.checkBufferSize(8);
        this.view.setBigInt64(this.offset, value, true);
        this.offset += 8;
    }

    writeUint32(value) {
        this.checkBufferSize(4);
        this.view.setUint32(this.offset, value, true);
        this.offset += 4;
    }

    writeUint64(value) {
        this.checkBufferSize(8);
        this.view.setBigUint64(this.offset, value, true);
        this.offset += 8;
    }

    writeFloat(value) {
        this.checkBufferSize(4);
        this.view.setInt32(this.offset, value, true);
        this.offset += 4;
    }

    writeString(value) {
        const length = value.length;
        this.writeUint8(length);
        this.checkBufferSize(length);
        for (let i = 0; i < length; i++) {
            this.view.setUint8(this.offset + i, value.charCodeAt(i));
        }
        this.offset += length;
    }

    writeCompressedString(value) {
        const compressed = gzipSync(Buffer.from(value));
        const length = compressed.length;
        this.writeUint32(length);
        this.checkBufferSize(length);
        new Uint8Array(this.view.buffer, this.offset, length).set(compressed);
        this.offset += length;
    }

    writeUint8Vector2(vector) {
        this.writeUint8(vector.x);
        this.writeUint8(vector.y);
    }

    writeVector2(vector) {
        this.writeInt32(vector.x);
        this.writeInt32(vector.y);
    }

    writeArrayVector2(array) {
        this.writeInt32(array.length);
        for (const vector of array) {
            this.writeVector2(vector);
        }
    }

    writeArrayUint32(array) {
        this.writeInt32(array.length);
        for (const value of array) {
            this.writeUint32(value);
        }
    }

    writeUint16(value) {
        this.checkBufferSize(2);
        this.view.setUint16(this.offset, value, true);
        this.offset += 2;
    }

    writeInt16(value) {
        this.checkBufferSize(2);
        this.view.setInt16(this.offset, value, true);
        this.offset += 2;
    }

    writeInt8(value) {
        this.checkBufferSize(1);
        this.view.setInt8(this.offset, value);
        this.offset += 1;
    }

    writeArrayInt32(array) {
        this.writeInt32(array.length);
        for (const value of array) {
            this.writeInt32(value);
        }
    }

    writeArrayUint8(array) {
        this.writeUint8(array.length);
        for (const value of array) {
            this.writeUint8(value);
        }
    }

    writeUint8Array(uint8array) {
        for (const value of uint8array) {
            this.writeUint8(value);
        }
    }

    toArray() {
        return new Uint8Array(this.view.buffer, 0, this.offset);
    }
}
