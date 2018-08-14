'use strict';
const common = require('../common');
const assert = require('assert');

const Buffer = require('buffer').Buffer;
const SlowBuffer = require('buffer').SlowBuffer;

// counter to ensure unique value is always copied
let cntr = 0;

const b = Buffer(1024); // safe constructor

console.log('b.length == %d', b.length);
assert.strictEqual(1024, b.length);

b[0] = -1;
assert.strictEqual(b[0], 255);

for (let i = 0; i < 1024; i++) {
  b[i] = i % 256;
}

for (let i = 0; i < 1024; i++) {
  assert.strictEqual(i % 256, b[i]);
}

const c = Buffer(512);
console.log('c.length == %d', c.length);
assert.strictEqual(512, c.length);

const d = new Buffer([]);
assert.strictEqual(0, d.length);

const ui32 = new Uint32Array(4).fill(42);
const e = Buffer(ui32);
for (const [key, value] of e.entries()) {
  assert.deepStrictEqual(value, ui32[key]);
}

// First check Buffer#fill() works as expected.

assert.throws(function() {
  Buffer(8).fill('a', -1);
}, /^RangeError: Out of range index$/);

assert.throws(function() {
  Buffer(8).fill('a', 0, 9);
}, /^RangeError: Out of range index$/);

// Make sure this doesn't hang indefinitely.
Buffer(8).fill('');

{
  const buf = new Buffer(64);
  buf.fill(10);
  for (let i = 0; i < buf.length; i++)
    assert.strictEqual(buf[i], 10);

  buf.fill(11, 0, buf.length >> 1);
  for (let i = 0; i < buf.length >> 1; i++)
    assert.strictEqual(buf[i], 11);
  for (let i = (buf.length >> 1) + 1; i < buf.length; i++)
    assert.strictEqual(buf[i], 10);

  buf.fill('h');
  for (let i = 0; i < buf.length; i++)
    assert.strictEqual('h'.charCodeAt(0), buf[i]);

  buf.fill(0);
  for (let i = 0; i < buf.length; i++)
    assert.strictEqual(0, buf[i]);

  buf.fill(null);
  for (let i = 0; i < buf.length; i++)
    assert.strictEqual(0, buf[i]);

  buf.fill(1, 16, 32);
  for (let i = 0; i < 16; i++)
    assert.strictEqual(0, buf[i]);
  for (let i = 16; i < 32; i++)
    assert.strictEqual(1, buf[i]);
  for (let i = 32; i < buf.length; i++)
    assert.strictEqual(0, buf[i]);
}

{
  const buf = new Buffer(10);
  buf.fill('abc');
  assert.strictEqual(buf.toString(), 'abcabcabca');
  buf.fill('է');
  assert.strictEqual(buf.toString(), 'էէէէէ');
}

{
  // copy 512 bytes, from 0 to 512.
  b.fill(++cntr);
  c.fill(++cntr);
  const copied = b.copy(c, 0, 0, 512);
  console.log('copied %d bytes from b into c', copied);
  assert.strictEqual(512, copied);
  for (let i = 0; i < c.length; i++) {
    assert.strictEqual(b[i], c[i]);
  }
}

{
  // copy c into b, without specifying sourceEnd
  b.fill(++cntr);
  c.fill(++cntr);
  const copied = c.copy(b, 0, 0);
  console.log('copied %d bytes from c into b w/o sourceEnd', copied);
  assert.strictEqual(c.length, copied);
  for (let i = 0; i < c.length; i++) {
    assert.strictEqual(c[i], b[i]);
  }
}

{
  // copy c into b, without specifying sourceStart
  b.fill(++cntr);
  c.fill(++cntr);
  const copied = c.copy(b, 0);
  console.log('copied %d bytes from c into b w/o sourceStart', copied);
  assert.strictEqual(c.length, copied);
  for (let i = 0; i < c.length; i++) {
    assert.strictEqual(c[i], b[i]);
  }
}

{
  // copy longer buffer b to shorter c without targetStart
  b.fill(++cntr);
  c.fill(++cntr);
  const copied = b.copy(c);
  console.log('copied %d bytes from b into c w/o targetStart', copied);
  assert.strictEqual(c.length, copied);
  for (let i = 0; i < c.length; i++) {
    assert.strictEqual(b[i], c[i]);
  }
}

{
  // copy starting near end of b to c
  b.fill(++cntr);
  c.fill(++cntr);
  const copied = b.copy(c, 0, b.length - Math.floor(c.length / 2));
  console.log('copied %d bytes from end of b into beginning of c', copied);
  assert.strictEqual(Math.floor(c.length / 2), copied);
  for (let i = 0; i < Math.floor(c.length / 2); i++) {
    assert.strictEqual(b[b.length - Math.floor(c.length / 2) + i], c[i]);
  }
  for (let i = Math.floor(c.length / 2) + 1; i < c.length; i++) {
    assert.strictEqual(c[c.length - 1], c[i]);
  }
}

{
  // try to copy 513 bytes, and check we don't overrun c
  b.fill(++cntr);
  c.fill(++cntr);
  const copied = b.copy(c, 0, 0, 513);
  console.log('copied %d bytes from b trying to overrun c', copied);
  assert.strictEqual(c.length, copied);
  for (let i = 0; i < c.length; i++) {
    assert.strictEqual(b[i], c[i]);
  }
}

{
  // copy 768 bytes from b into b
  b.fill(++cntr);
  b.fill(++cntr, 256);
  const copied = b.copy(b, 0, 256, 1024);
  console.log('copied %d bytes from b into b', copied);
  assert.strictEqual(768, copied);
  for (let i = 0; i < b.length; i++) {
    assert.strictEqual(cntr, b[i]);
  }
}

// copy string longer than buffer length (failure will segfault)
const bb = Buffer(10);
bb.fill('hello crazy world');


// try to copy from before the beginning of b
assert.doesNotThrow(() => { b.copy(c, 0, 100, 10); });

// copy throws at negative sourceStart
assert.throws(function() {
  Buffer(5).copy(Buffer(5), 0, -1);
}, RangeError);

{
  // check sourceEnd resets to targetEnd if former is greater than the latter
  b.fill(++cntr);
  c.fill(++cntr);
  const copied = b.copy(c, 0, 0, 1025);
  console.log('copied %d bytes from b into c', copied);
  for (let i = 0; i < c.length; i++) {
    assert.strictEqual(b[i], c[i]);
  }
}

// throw with negative sourceEnd
console.log('test copy at negative sourceEnd');
assert.throws(function() {
  b.copy(c, 0, 0, -1);
}, RangeError);

// when sourceStart is greater than sourceEnd, zero copied
assert.strictEqual(b.copy(c, 0, 100, 10), 0);

// when targetStart > targetLength, zero copied
assert.strictEqual(b.copy(c, 512, 0, 10), 0);

let caught_error;

// invalid encoding for Buffer.toString
caught_error = null;
try {
  b.toString('invalid');
} catch (err) {
  caught_error = err;
}
assert.strictEqual('Unknown encoding: invalid', caught_error.message);

// invalid encoding for Buffer.write
caught_error = null;
try {
  b.write('test string', 0, 5, 'invalid');
} catch (err) {
  caught_error = err;
}
assert.strictEqual('Unknown encoding: invalid', caught_error.message);

// try to create 0-length buffers
new Buffer('');
new Buffer('', 'ascii');
new Buffer('', 'latin1');
new Buffer('', 'binary');
Buffer(0);

// try to write a 0-length string beyond the end of b
assert.throws(function() {
  b.write('', 2048);
}, RangeError);

// throw when writing to negative offset
assert.throws(function() {
  b.write('a', -1);
}, RangeError);

// throw when writing past bounds from the pool
assert.throws(function() {
  b.write('a', 2048);
}, RangeError);

// throw when writing to negative offset
assert.throws(function() {
  b.write('a', -1);
}, RangeError);

// try to copy 0 bytes worth of data into an empty buffer
b.copy(Buffer(0), 0, 0, 0);

// try to copy 0 bytes past the end of the target buffer
b.copy(Buffer(0), 1, 1, 1);
b.copy(Buffer(1), 1, 1, 1);

// try to copy 0 bytes from past the end of the source buffer
b.copy(Buffer(1), 0, 2048, 2048);

const rangeBuffer = new Buffer('abc');

// if start >= buffer's length, empty string will be returned
assert.strictEqual(rangeBuffer.toString('ascii', 3), '');
assert.strictEqual(rangeBuffer.toString('ascii', +Infinity), '');
assert.strictEqual(rangeBuffer.toString('ascii', 3.14, 3), '');
assert.strictEqual(rangeBuffer.toString('ascii', 'Infinity', 3), '');

// if end <= 0, empty string will be returned
assert.strictEqual(rangeBuffer.toString('ascii', 1, 0), '');
assert.strictEqual(rangeBuffer.toString('ascii', 1, -1.2), '');
assert.strictEqual(rangeBuffer.toString('ascii', 1, -100), '');
assert.strictEqual(rangeBuffer.toString('ascii', 1, -Infinity), '');

// if start < 0, start will be taken as zero
assert.strictEqual(rangeBuffer.toString('ascii', -1, 3), 'abc');
assert.strictEqual(rangeBuffer.toString('ascii', -1.99, 3), 'abc');
assert.strictEqual(rangeBuffer.toString('ascii', -Infinity, 3), 'abc');
assert.strictEqual(rangeBuffer.toString('ascii', '-1', 3), 'abc');
assert.strictEqual(rangeBuffer.toString('ascii', '-1.99', 3), 'abc');
assert.strictEqual(rangeBuffer.toString('ascii', '-Infinity', 3), 'abc');

// if start is an invalid integer, start will be taken as zero
assert.strictEqual(rangeBuffer.toString('ascii', 'node.js', 3), 'abc');
assert.strictEqual(rangeBuffer.toString('ascii', {}, 3), 'abc');
assert.strictEqual(rangeBuffer.toString('ascii', [], 3), 'abc');
assert.strictEqual(rangeBuffer.toString('ascii', NaN, 3), 'abc');
assert.strictEqual(rangeBuffer.toString('ascii', null, 3), 'abc');
assert.strictEqual(rangeBuffer.toString('ascii', undefined, 3), 'abc');
assert.strictEqual(rangeBuffer.toString('ascii', false, 3), 'abc');
assert.strictEqual(rangeBuffer.toString('ascii', '', 3), 'abc');

// but, if start is an integer when coerced, then it will be coerced and used.
assert.strictEqual(rangeBuffer.toString('ascii', '-1', 3), 'abc');
assert.strictEqual(rangeBuffer.toString('ascii', '1', 3), 'bc');
assert.strictEqual(rangeBuffer.toString('ascii', '-Infinity', 3), 'abc');
assert.strictEqual(rangeBuffer.toString('ascii', '3', 3), '');
assert.strictEqual(rangeBuffer.toString('ascii', Number(3), 3), '');
assert.strictEqual(rangeBuffer.toString('ascii', '3.14', 3), '');
assert.strictEqual(rangeBuffer.toString('ascii', '1.99', 3), 'bc');
assert.strictEqual(rangeBuffer.toString('ascii', '-1.99', 3), 'abc');
assert.strictEqual(rangeBuffer.toString('ascii', 1.99, 3), 'bc');
assert.strictEqual(rangeBuffer.toString('ascii', true, 3), 'bc');

// if end > buffer's length, end will be taken as buffer's length
assert.strictEqual(rangeBuffer.toString('ascii', 0, 5), 'abc');
assert.strictEqual(rangeBuffer.toString('ascii', 0, 6.99), 'abc');
assert.strictEqual(rangeBuffer.toString('ascii', 0, Infinity), 'abc');
assert.strictEqual(rangeBuffer.toString('ascii', 0, '5'), 'abc');
assert.strictEqual(rangeBuffer.toString('ascii', 0, '6.99'), 'abc');
assert.strictEqual(rangeBuffer.toString('ascii', 0, 'Infinity'), 'abc');

// if end is an invalid integer, end will be taken as buffer's length
assert.strictEqual(rangeBuffer.toString('ascii', 0, 'node.js'), '');
assert.strictEqual(rangeBuffer.toString('ascii', 0, {}), '');
assert.strictEqual(rangeBuffer.toString('ascii', 0, NaN), '');
assert.strictEqual(rangeBuffer.toString('ascii', 0, undefined), 'abc');
assert.strictEqual(rangeBuffer.toString('ascii', 0), 'abc');
assert.strictEqual(rangeBuffer.toString('ascii', 0, null), '');
assert.strictEqual(rangeBuffer.toString('ascii', 0, []), '');
assert.strictEqual(rangeBuffer.toString('ascii', 0, false), '');
assert.strictEqual(rangeBuffer.toString('ascii', 0, ''), '');

// but, if end is an integer when coerced, then it will be coerced and used.
assert.strictEqual(rangeBuffer.toString('ascii', 0, '-1'), '');
assert.strictEqual(rangeBuffer.toString('ascii', 0, '1'), 'a');
assert.strictEqual(rangeBuffer.toString('ascii', 0, '-Infinity'), '');
assert.strictEqual(rangeBuffer.toString('ascii', 0, '3'), 'abc');
assert.strictEqual(rangeBuffer.toString('ascii', 0, Number(3)), 'abc');
assert.strictEqual(rangeBuffer.toString('ascii', 0, '3.14'), 'abc');
assert.strictEqual(rangeBuffer.toString('ascii', 0, '1.99'), 'a');
assert.strictEqual(rangeBuffer.toString('ascii', 0, '-1.99'), '');
assert.strictEqual(rangeBuffer.toString('ascii', 0, 1.99), 'a');
assert.strictEqual(rangeBuffer.toString('ascii', 0, true), 'a');

// try toString() with a object as a encoding
assert.strictEqual(rangeBuffer.toString({toString: function() {
  return 'ascii';
}}), 'abc');

// testing for smart defaults and ability to pass string values as offset
const writeTest = new Buffer('abcdes');
writeTest.write('n', 'ascii');
writeTest.write('o', '1', 'ascii');
writeTest.write('d', '2', 'ascii');
writeTest.write('e', 3, 'ascii');
writeTest.write('j', 4, 'ascii');
assert.strictEqual(writeTest.toString(), 'nodejs');

// ASCII slice test
{
  const asciiString = 'hello world';

  for (let i = 0; i < asciiString.length; i++) {
    b[i] = asciiString.charCodeAt(i);
  }
  const asciiSlice = b.toString('ascii', 0, asciiString.length);
  assert.strictEqual(asciiString, asciiSlice);
}

{
  const asciiString = 'hello world';
  const offset = 100;

  const written = b.write(asciiString, offset, 'ascii');
  assert.strictEqual(asciiString.length, written);
  const asciiSlice = b.toString('ascii', offset, offset + asciiString.length);
  assert.strictEqual(asciiString, asciiSlice);
}

{
  const asciiString = 'hello world';
  const offset = 100;

  const sliceA = b.slice(offset, offset + asciiString.length);
  const sliceB = b.slice(offset, offset + asciiString.length);
  for (let i = 0; i < asciiString.length; i++) {
    assert.strictEqual(sliceA[i], sliceB[i]);
  }
}

// UTF-8 slice test

const utf8String = '¡hέlló wôrld!';
const offset = 100;

b.write(utf8String, 0, Buffer.byteLength(utf8String), 'utf8');
let utf8Slice = b.toString('utf8', 0, Buffer.byteLength(utf8String));
assert.strictEqual(utf8String, utf8Slice);

let written = b.write(utf8String, offset, 'utf8');
assert.strictEqual(Buffer.byteLength(utf8String), written);
utf8Slice = b.toString('utf8', offset, offset + Buffer.byteLength(utf8String));
assert.strictEqual(utf8String, utf8Slice);

const sliceA = b.slice(offset, offset + Buffer.byteLength(utf8String));
const sliceB = b.slice(offset, offset + Buffer.byteLength(utf8String));
for (let i = 0; i < Buffer.byteLength(utf8String); i++) {
  assert.strictEqual(sliceA[i], sliceB[i]);
}

{
  const slice = b.slice(100, 150);
  assert.strictEqual(50, slice.length);
  for (let i = 0; i < 50; i++) {
    assert.strictEqual(b[100 + i], slice[i]);
  }
}

{
  // make sure only top level parent propagates from allocPool
  const b = new Buffer(5);
  const c = b.slice(0, 4);
  const d = c.slice(0, 2);
  assert.strictEqual(b.parent, c.parent);
  assert.strictEqual(b.parent, d.parent);
}

{
  // also from a non-pooled instance
  const b = new SlowBuffer(5);
  const c = b.slice(0, 4);
  const d = c.slice(0, 2);
  assert.strictEqual(c.parent, d.parent);
}

{
  // Bug regression test
  const testValue = '\u00F6\u65E5\u672C\u8A9E'; // ö日本語
  const buffer = new Buffer(32);
  const size = buffer.write(testValue, 0, 'utf8');
  console.log('bytes written to buffer: ' + size);
  const slice = buffer.toString('utf8', 0, size);
  assert.strictEqual(slice, testValue);
}

{
  // Test triple  slice
  const a = new Buffer(8);
  for (let i = 0; i < 8; i++) a[i] = i;
  const b = a.slice(4, 8);
  assert.strictEqual(4, b[0]);
  assert.strictEqual(5, b[1]);
  assert.strictEqual(6, b[2]);
  assert.strictEqual(7, b[3]);
  const c = b.slice(2, 4);
  assert.strictEqual(6, c[0]);
  assert.strictEqual(7, c[1]);
}

{
  const d = new Buffer([23, 42, 255]);
  assert.strictEqual(d.length, 3);
  assert.strictEqual(d[0], 23);
  assert.strictEqual(d[1], 42);
  assert.strictEqual(d[2], 255);
  assert.deepStrictEqual(d, new Buffer(d));
}

{
  const e = new Buffer('über');
  console.error('uber: \'%s\'', e.toString());
  assert.deepStrictEqual(e, new Buffer([195, 188, 98, 101, 114]));
}

{
  const f = new Buffer('über', 'ascii');
  console.error('f.length: %d     (should be 4)', f.length);
  assert.deepStrictEqual(f, new Buffer([252, 98, 101, 114]));
}

['ucs2', 'ucs-2', 'utf16le', 'utf-16le'].forEach(function(encoding) {
  {
    const f = new Buffer('über', encoding);
    console.error('f.length: %d     (should be 8)', f.length);
    assert.deepStrictEqual(f, new Buffer([252, 0, 98, 0, 101, 0, 114, 0]));
  }

  {
    const f = new Buffer('привет', encoding);
    console.error('f.length: %d     (should be 12)', f.length);
    const expected = new Buffer([63, 4, 64, 4, 56, 4, 50, 4, 53, 4, 66, 4]);
    assert.deepStrictEqual(f, expected);
    assert.strictEqual(f.toString(encoding), 'привет');
  }

  {
    const f = new Buffer([0, 0, 0, 0, 0]);
    assert.strictEqual(f.length, 5);
    const size = f.write('あいうえお', encoding);
    console.error('bytes written to buffer: %d     (should be 4)', size);
    assert.strictEqual(size, 4);
    assert.deepStrictEqual(f, new Buffer([0x42, 0x30, 0x44, 0x30, 0x00]));
  }
});

{
  const f = new Buffer('\uD83D\uDC4D', 'utf-16le'); // THUMBS UP SIGN (U+1F44D)
  assert.strictEqual(f.length, 4);
  assert.deepStrictEqual(f, new Buffer('3DD84DDC', 'hex'));
}


const arrayIsh = {0: 0, 1: 1, 2: 2, 3: 3, length: 4};
let g = new Buffer(arrayIsh);
assert.deepStrictEqual(g, new Buffer([0, 1, 2, 3]));
const strArrayIsh = {0: '0', 1: '1', 2: '2', 3: '3', length: 4};
g = new Buffer(strArrayIsh);
assert.deepStrictEqual(g, new Buffer([0, 1, 2, 3]));


//
// Test toString('base64')
//
assert.strictEqual('TWFu', (new Buffer('Man')).toString('base64'));

{
  // test that regular and URL-safe base64 both work
  const expected = [0xff, 0xff, 0xbe, 0xff, 0xef, 0xbf, 0xfb, 0xef, 0xff];
  assert.deepStrictEqual(Buffer('//++/++/++//', 'base64'), Buffer(expected));
  assert.deepStrictEqual(Buffer('__--_--_--__', 'base64'), Buffer(expected));
}

{
  // big example
  const quote = 'Man is distinguished, not only by his reason, but by this ' +
                'singular passion from other animals, which is a lust ' +
                'of the mind, that by a perseverance of delight in the ' +
                'continued and indefatigable generation of knowledge, ' +
                'exceeds the short vehemence of any carnal pleasure.';
  const expected = 'TWFuIGlzIGRpc3Rpbmd1aXNoZWQsIG5vdCBvbmx5IGJ5IGhpcyByZWFzb' +
                   '24sIGJ1dCBieSB0aGlzIHNpbmd1bGFyIHBhc3Npb24gZnJvbSBvdGhlci' +
                   'BhbmltYWxzLCB3aGljaCBpcyBhIGx1c3Qgb2YgdGhlIG1pbmQsIHRoYXQ' +
                   'gYnkgYSBwZXJzZXZlcmFuY2Ugb2YgZGVsaWdodCBpbiB0aGUgY29udGlu' +
                   'dWVkIGFuZCBpbmRlZmF0aWdhYmxlIGdlbmVyYXRpb24gb2Yga25vd2xlZ' +
                   'GdlLCBleGNlZWRzIHRoZSBzaG9ydCB2ZWhlbWVuY2Ugb2YgYW55IGNhcm' +
                   '5hbCBwbGVhc3VyZS4=';
  assert.strictEqual(expected, (new Buffer(quote)).toString('base64'));

  let b = new Buffer(1024);
  let bytesWritten = b.write(expected, 0, 'base64');
  assert.strictEqual(quote.length, bytesWritten);
  assert.strictEqual(quote, b.toString('ascii', 0, quote.length));

  // check that the base64 decoder ignores whitespace
  const expectedWhite = expected.slice(0, 60) + ' \n' +
                        expected.slice(60, 120) + ' \n' +
                        expected.slice(120, 180) + ' \n' +
                        expected.slice(180, 240) + ' \n' +
                        expected.slice(240, 300) + '\n' +
                        expected.slice(300, 360) + '\n';
  b = new Buffer(1024);
  bytesWritten = b.write(expectedWhite, 0, 'base64');
  assert.strictEqual(quote.length, bytesWritten);
  assert.strictEqual(quote, b.toString('ascii', 0, quote.length));

  // check that the base64 decoder on the constructor works
  // even in the presence of whitespace.
  b = new Buffer(expectedWhite, 'base64');
  assert.strictEqual(quote.length, b.length);
  assert.strictEqual(quote, b.toString('ascii', 0, quote.length));

  // check that the base64 decoder ignores illegal chars
  const expectedIllegal = expected.slice(0, 60) + ' \x80' +
                          expected.slice(60, 120) + ' \xff' +
                          expected.slice(120, 180) + ' \x00' +
                          expected.slice(180, 240) + ' \x98' +
                          expected.slice(240, 300) + '\x03' +
                          expected.slice(300, 360);
  b = new Buffer(expectedIllegal, 'base64');
  assert.strictEqual(quote.length, b.length);
  assert.strictEqual(quote, b.toString('ascii', 0, quote.length));
}

assert.strictEqual(new Buffer('', 'base64').toString(), '');
assert.strictEqual(new Buffer('K', 'base64').toString(), '');

// multiple-of-4 with padding
assert.strictEqual(new Buffer('Kg==', 'base64').toString(), '*');
assert.strictEqual(new Buffer('Kio=', 'base64').toString(), '**');
assert.strictEqual(new Buffer('Kioq', 'base64').toString(), '***');
assert.strictEqual(new Buffer('KioqKg==', 'base64').toString(), '****');
assert.strictEqual(new Buffer('KioqKio=', 'base64').toString(), '*****');
assert.strictEqual(new Buffer('KioqKioq', 'base64').toString(), '******');
assert.strictEqual(new Buffer('KioqKioqKg==', 'base64').toString(), '*******');
assert.strictEqual(new Buffer('KioqKioqKio=', 'base64').toString(), '********');
assert.strictEqual(new Buffer('KioqKioqKioq', 'base64').toString(),
                   '*********');
assert.strictEqual(new Buffer('KioqKioqKioqKg==', 'base64').toString(),
                   '**********');
assert.strictEqual(new Buffer('KioqKioqKioqKio=', 'base64').toString(),
                   '***********');
assert.strictEqual(new Buffer('KioqKioqKioqKioq', 'base64').toString(),
                   '************');
assert.strictEqual(new Buffer('KioqKioqKioqKioqKg==', 'base64').toString(),
                   '*************');
assert.strictEqual(new Buffer('KioqKioqKioqKioqKio=', 'base64').toString(),
                   '**************');
assert.strictEqual(new Buffer('KioqKioqKioqKioqKioq', 'base64').toString(),
                   '***************');
assert.strictEqual(new Buffer('KioqKioqKioqKioqKioqKg==', 'base64').toString(),
                   '****************');
assert.strictEqual(new Buffer('KioqKioqKioqKioqKioqKio=', 'base64').toString(),
                   '*****************');
assert.strictEqual(new Buffer('KioqKioqKioqKioqKioqKioq', 'base64').toString(),
                   '******************');
assert.strictEqual(new Buffer('KioqKioqKioqKioqKioqKioqKg==', 'base64')
  .toString(), '*******************');
assert.strictEqual(new Buffer('KioqKioqKioqKioqKioqKioqKio=', 'base64')
  .toString(), '********************');

// no padding, not a multiple of 4
assert.strictEqual(new Buffer('Kg', 'base64').toString(), '*');
assert.strictEqual(new Buffer('Kio', 'base64').toString(), '**');
assert.strictEqual(new Buffer('KioqKg', 'base64').toString(), '****');
assert.strictEqual(new Buffer('KioqKio', 'base64').toString(), '*****');
assert.strictEqual(new Buffer('KioqKioqKg', 'base64').toString(), '*******');
assert.strictEqual(new Buffer('KioqKioqKio', 'base64').toString(), '********');
assert.strictEqual(new Buffer('KioqKioqKioqKg', 'base64').toString(),
                   '**********');
assert.strictEqual(new Buffer('KioqKioqKioqKio', 'base64').toString(),
                   '***********');
assert.strictEqual(new Buffer('KioqKioqKioqKioqKg', 'base64').toString(),
                   '*************');
assert.strictEqual(new Buffer('KioqKioqKioqKioqKio', 'base64').toString(),
                   '**************');
assert.strictEqual(new Buffer('KioqKioqKioqKioqKioqKg', 'base64').toString(),
                   '****************');
assert.strictEqual(new Buffer('KioqKioqKioqKioqKioqKio', 'base64').toString(),
                   '*****************');
assert.strictEqual(new Buffer('KioqKioqKioqKioqKioqKioqKg', 'base64')
  .toString(), '*******************');
assert.strictEqual(new Buffer('KioqKioqKioqKioqKioqKioqKio', 'base64')
  .toString(), '********************');

// handle padding graciously, multiple-of-4 or not
assert.strictEqual(
  new Buffer('72INjkR5fchcxk9+VgdGPFJDxUBFR5/rMFsghgxADiw==', 'base64').length,
  32
);
assert.strictEqual(
  new Buffer('72INjkR5fchcxk9+VgdGPFJDxUBFR5/rMFsghgxADiw=', 'base64').length,
  32
);
assert.strictEqual(
  new Buffer('72INjkR5fchcxk9+VgdGPFJDxUBFR5/rMFsghgxADiw', 'base64').length,
  32
);
assert.strictEqual(
  new Buffer('w69jACy6BgZmaFvv96HG6MYksWytuZu3T1FvGnulPg==', 'base64').length,
  31
);
assert.strictEqual(
  new Buffer('w69jACy6BgZmaFvv96HG6MYksWytuZu3T1FvGnulPg=', 'base64').length,
  31
);
assert.strictEqual(
  new Buffer('w69jACy6BgZmaFvv96HG6MYksWytuZu3T1FvGnulPg', 'base64').length,
  31
);

// This string encodes single '.' character in UTF-16
const dot = new Buffer('//4uAA==', 'base64');
assert.strictEqual(dot[0], 0xff);
assert.strictEqual(dot[1], 0xfe);
assert.strictEqual(dot[2], 0x2e);
assert.strictEqual(dot[3], 0x00);
assert.strictEqual(dot.toString('base64'), '//4uAA==');

{
  // Writing base64 at a position > 0 should not mangle the result.
  //
  // https://github.com/joyent/node/issues/402
  const segments = ['TWFkbmVzcz8h', 'IFRoaXM=', 'IGlz', 'IG5vZGUuanMh'];
  const b = new Buffer(64);
  let pos = 0;

  for (let i = 0; i < segments.length; ++i) {
    pos += b.write(segments[i], pos, 'base64');
  }
  assert.strictEqual(b.toString('latin1', 0, pos),
                     'Madness?! This is node.js!');
  assert.strictEqual(b.toString('binary', 0, pos),
                     'Madness?! This is node.js!');
}

// Regression test for https://github.com/nodejs/node/issues/3496.
assert.strictEqual(Buffer('=bad'.repeat(1e4), 'base64').length, 0);

{
  // Creating buffers larger than pool size.
  const l = Buffer.poolSize + 5;
  const s = 'h'.repeat(l);

  const b = new Buffer(s);

  for (let i = 0; i < l; i++) {
    assert.strictEqual('h'.charCodeAt(0), b[i]);
  }

  const sb = b.toString();
  assert.strictEqual(sb.length, s.length);
  assert.strictEqual(sb, s);
}

{
  // Single argument slice
  const b = new Buffer('abcde');
  assert.strictEqual('bcde', b.slice(1).toString());
}

// slice(0,0).length === 0
assert.strictEqual(0, Buffer('hello').slice(0, 0).length);

// test hex toString
console.log('Create hex string from buffer');
const hexb = new Buffer(256);
for (let i = 0; i < 256; i++) {
  hexb[i] = i;
}
const hexStr = hexb.toString('hex');
assert.strictEqual(hexStr,
                   '000102030405060708090a0b0c0d0e0f' +
             '101112131415161718191a1b1c1d1e1f' +
             '202122232425262728292a2b2c2d2e2f' +
             '303132333435363738393a3b3c3d3e3f' +
             '404142434445464748494a4b4c4d4e4f' +
             '505152535455565758595a5b5c5d5e5f' +
             '606162636465666768696a6b6c6d6e6f' +
             '707172737475767778797a7b7c7d7e7f' +
             '808182838485868788898a8b8c8d8e8f' +
             '909192939495969798999a9b9c9d9e9f' +
             'a0a1a2a3a4a5a6a7a8a9aaabacadaeaf' +
             'b0b1b2b3b4b5b6b7b8b9babbbcbdbebf' +
             'c0c1c2c3c4c5c6c7c8c9cacbcccdcecf' +
             'd0d1d2d3d4d5d6d7d8d9dadbdcdddedf' +
             'e0e1e2e3e4e5e6e7e8e9eaebecedeeef' +
             'f0f1f2f3f4f5f6f7f8f9fafbfcfdfeff');

console.log('Create buffer from hex string');
const hexb2 = new Buffer(hexStr, 'hex');
for (let i = 0; i < 256; i++) {
  assert.strictEqual(hexb2[i], hexb[i]);
}

// Test single hex character throws TypeError
// - https://github.com/nodejs/node/issues/6770
assert.throws(function() {
  Buffer.from('A', 'hex');
}, TypeError);

// Test single base64 char encodes as 0
assert.strictEqual(Buffer.from('A', 'base64').length, 0);

{
  // test an invalid slice end.
  console.log('Try to slice off the end of the buffer');
  const b = new Buffer([1, 2, 3, 4, 5]);
  const b2 = b.toString('hex', 1, 10000);
  const b3 = b.toString('hex', 1, 5);
  const b4 = b.toString('hex', 1);
  assert.strictEqual(b2, b3);
  assert.strictEqual(b2, b4);
}

function buildBuffer(data) {
  if (Array.isArray(data)) {
    const buffer = Buffer(data.length);
    data.forEach(function(v, k) {
      buffer[k] = v;
    });
    return buffer;
  }
  return null;
}

const x = buildBuffer([0x81, 0xa3, 0x66, 0x6f, 0x6f, 0xa3, 0x62, 0x61, 0x72]);

console.log(x.inspect());
assert.strictEqual('<Buffer 81 a3 66 6f 6f a3 62 61 72>', x.inspect());

{
  const z = x.slice(4);
  console.log(z.inspect());
  console.log(z.length);
  assert.strictEqual(5, z.length);
  assert.strictEqual(0x6f, z[0]);
  assert.strictEqual(0xa3, z[1]);
  assert.strictEqual(0x62, z[2]);
  assert.strictEqual(0x61, z[3]);
  assert.strictEqual(0x72, z[4]);
}

{
  const z = x.slice(0);
  console.log(z.inspect());
  console.log(z.length);
  assert.strictEqual(z.length, x.length);
}

{
  const z = x.slice(0, 4);
  console.log(z.inspect());
  console.log(z.length);
  assert.strictEqual(4, z.length);
  assert.strictEqual(0x81, z[0]);
  assert.strictEqual(0xa3, z[1]);
}

{
  const z = x.slice(0, 9);
  console.log(z.inspect());
  console.log(z.length);
  assert.strictEqual(9, z.length);
}

{
  const z = x.slice(1, 4);
  console.log(z.inspect());
  console.log(z.length);
  assert.strictEqual(3, z.length);
  assert.strictEqual(0xa3, z[0]);
}

{
  const z = x.slice(2, 4);
  console.log(z.inspect());
  console.log(z.length);
  assert.strictEqual(2, z.length);
  assert.strictEqual(0x66, z[0]);
  assert.strictEqual(0x6f, z[1]);
}

assert.strictEqual(0, Buffer('hello').slice(0, 0).length);

['ucs2', 'ucs-2', 'utf16le', 'utf-16le'].forEach(function(encoding) {
  const b = new Buffer(10);
  b.write('あいうえお', encoding);
  assert.strictEqual(b.toString(encoding), 'あいうえお');
});

{
  // latin1 encoding should write only one byte per character.
  const b = Buffer([0xde, 0xad, 0xbe, 0xef]);
  let s = String.fromCharCode(0xffff);
  b.write(s, 0, 'latin1');
  assert.strictEqual(0xff, b[0]);
  assert.strictEqual(0xad, b[1]);
  assert.strictEqual(0xbe, b[2]);
  assert.strictEqual(0xef, b[3]);
  s = String.fromCharCode(0xaaee);
  b.write(s, 0, 'latin1');
  assert.strictEqual(0xee, b[0]);
  assert.strictEqual(0xad, b[1]);
  assert.strictEqual(0xbe, b[2]);
  assert.strictEqual(0xef, b[3]);
}

{
  // Binary encoding should write only one byte per character.
  const b = Buffer([0xde, 0xad, 0xbe, 0xef]);
  let s = String.fromCharCode(0xffff);
  b.write(s, 0, 'binary');
  assert.strictEqual(0xff, b[0]);
  assert.strictEqual(0xad, b[1]);
  assert.strictEqual(0xbe, b[2]);
  assert.strictEqual(0xef, b[3]);
  s = String.fromCharCode(0xaaee);
  b.write(s, 0, 'binary');
  assert.strictEqual(0xee, b[0]);
  assert.strictEqual(0xad, b[1]);
  assert.strictEqual(0xbe, b[2]);
  assert.strictEqual(0xef, b[3]);
}

{
  // #1210 Test UTF-8 string includes null character
  let buf = new Buffer('\0');
  assert.strictEqual(buf.length, 1);
  buf = new Buffer('\0\0');
  assert.strictEqual(buf.length, 2);
}

{
  const buf = new Buffer(2);
  let written = buf.write(''); // 0byte
  assert.strictEqual(written, 0);
  written = buf.write('\0'); // 1byte (v8 adds null terminator)
  assert.strictEqual(written, 1);
  written = buf.write('a\0'); // 1byte * 2
  assert.strictEqual(written, 2);
  written = buf.write('あ'); // 3bytes
  assert.strictEqual(written, 0);
  written = buf.write('\0あ'); // 1byte + 3bytes
  assert.strictEqual(written, 1);
  written = buf.write('\0\0あ'); // 1byte * 2 + 3bytes
  assert.strictEqual(written, 2);
}

{
  const buf = new Buffer(10);
  written = buf.write('あいう'); // 3bytes * 3 (v8 adds null terminator)
  assert.strictEqual(written, 9);
  written = buf.write('あいう\0'); // 3bytes * 3 + 1byte
  assert.strictEqual(written, 10);
}

{
  // #243 Test write() with maxLength
  const buf = new Buffer(4);
  buf.fill(0xFF);
  let written = buf.write('abcd', 1, 2, 'utf8');
  console.log(buf);
  assert.strictEqual(written, 2);
  assert.strictEqual(buf[0], 0xFF);
  assert.strictEqual(buf[1], 0x61);
  assert.strictEqual(buf[2], 0x62);
  assert.strictEqual(buf[3], 0xFF);

  buf.fill(0xFF);
  written = buf.write('abcd', 1, 4);
  console.log(buf);
  assert.strictEqual(written, 3);
  assert.strictEqual(buf[0], 0xFF);
  assert.strictEqual(buf[1], 0x61);
  assert.strictEqual(buf[2], 0x62);
  assert.strictEqual(buf[3], 0x63);

  buf.fill(0xFF);
  written = buf.write('abcd', 1, 2, 'utf8');
  console.log(buf);
  assert.strictEqual(written, 2);
  assert.strictEqual(buf[0], 0xFF);
  assert.strictEqual(buf[1], 0x61);
  assert.strictEqual(buf[2], 0x62);
  assert.strictEqual(buf[3], 0xFF);

  buf.fill(0xFF);
  written = buf.write('abcdef', 1, 2, 'hex');
  console.log(buf);
  assert.strictEqual(written, 2);
  assert.strictEqual(buf[0], 0xFF);
  assert.strictEqual(buf[1], 0xAB);
  assert.strictEqual(buf[2], 0xCD);
  assert.strictEqual(buf[3], 0xFF);

  ['ucs2', 'ucs-2', 'utf16le', 'utf-16le'].forEach(function(encoding) {
    buf.fill(0xFF);
    written = buf.write('abcd', 0, 2, encoding);
    console.log(buf);
    assert.strictEqual(written, 2);
    assert.strictEqual(buf[0], 0x61);
    assert.strictEqual(buf[1], 0x00);
    assert.strictEqual(buf[2], 0xFF);
    assert.strictEqual(buf[3], 0xFF);
  });
}

{
  // test offset returns are correct
  const b = new Buffer(16);
  assert.strictEqual(4, b.writeUInt32LE(0, 0));
  assert.strictEqual(6, b.writeUInt16LE(0, 4));
  assert.strictEqual(7, b.writeUInt8(0, 6));
  assert.strictEqual(8, b.writeInt8(0, 7));
  assert.strictEqual(16, b.writeDoubleLE(0, 8));
}

{
  // test unmatched surrogates not producing invalid utf8 output
  // ef bf bd = utf-8 representation of unicode replacement character
  // see https://codereview.chromium.org/121173009/
  const buf = new Buffer('ab\ud800cd', 'utf8');
  assert.strictEqual(buf[0], 0x61);
  assert.strictEqual(buf[1], 0x62);
  assert.strictEqual(buf[2], 0xef);
  assert.strictEqual(buf[3], 0xbf);
  assert.strictEqual(buf[4], 0xbd);
  assert.strictEqual(buf[5], 0x63);
  assert.strictEqual(buf[6], 0x64);
}

{
  // test for buffer overrun
  const buf = new Buffer([0, 0, 0, 0, 0]); // length: 5
  const sub = buf.slice(0, 4);         // length: 4
  written = sub.write('12345', 'latin1');
  assert.strictEqual(written, 4);
  assert.strictEqual(buf[4], 0);
  written = sub.write('12345', 'binary');
  assert.strictEqual(written, 4);
  assert.strictEqual(buf[4], 0);
}

// Check for fractional length args, junk length args, etc.
// https://github.com/joyent/node/issues/1758

// Call .fill() first, stops valgrind warning about uninitialized memory reads.
Buffer(3.3).fill().toString(); // throws bad argument error in commit 43cb4ec
assert.strictEqual(Buffer(-1).length, 0);
assert.strictEqual(Buffer(NaN).length, 0);
assert.strictEqual(Buffer(3.3).length, 3);
assert.strictEqual(Buffer({length: 3.3}).length, 3);
assert.strictEqual(Buffer({length: 'BAM'}).length, 0);

// Make sure that strings are not coerced to numbers.
assert.strictEqual(Buffer('99').length, 2);
assert.strictEqual(Buffer('13.37').length, 5);

// Ensure that the length argument is respected.
'ascii utf8 hex base64 latin1 binary'.split(' ').forEach(function(enc) {
  assert.strictEqual(Buffer(1).write('aaaaaa', 0, 1, enc), 1);
});

{
  // Regression test, guard against buffer overrun in the base64 decoder.
  const a = Buffer(3);
  const b = Buffer('xxx');
  a.write('aaaaaaaa', 'base64');
  assert.strictEqual(b.toString(), 'xxx');
}

// issue GH-3416
Buffer(Buffer(0), 0, 0);

[ 'hex',
  'utf8',
  'utf-8',
  'ascii',
  'latin1',
  'binary',
  'base64',
  'ucs2',
  'ucs-2',
  'utf16le',
  'utf-16le' ].forEach(function(enc) {
  assert.strictEqual(Buffer.isEncoding(enc), true);
});

[ 'utf9',
  'utf-7',
  'Unicode-FTW',
  'new gnu gun' ].forEach(function(enc) {
  assert.strictEqual(Buffer.isEncoding(enc), false);
});


// GH-5110
{
  const buffer = new Buffer('test');
  const string = JSON.stringify(buffer);

  assert.strictEqual(string, '{"type":"Buffer","data":[116,101,115,116]}');

  assert.deepStrictEqual(buffer, JSON.parse(string, function(key, value) {
    return value && value.type === 'Buffer'
      ? new Buffer(value.data)
      : value;
  }));
}

// issue GH-7849
{
  const buf = new Buffer('test');
  const json = JSON.stringify(buf);
  const obj = JSON.parse(json);
  const copy = new Buffer(obj);

  assert(buf.equals(copy));
}

// issue GH-4331
assert.throws(function() {
  Buffer(0xFFFFFFFF);
}, RangeError);
assert.throws(function() {
  Buffer(0xFFFFFFFFF);
}, RangeError);

// issue GH-5587
assert.throws(function() {
  const buf = new Buffer(8);
  buf.writeFloatLE(0, 5);
}, RangeError);
assert.throws(function() {
  const buf = new Buffer(16);
  buf.writeDoubleLE(0, 9);
}, RangeError);


// attempt to overflow buffers, similar to previous bug in array buffers
assert.throws(function() {
  const buf = Buffer(8);
  buf.readFloatLE(0xffffffff);
}, RangeError);

assert.throws(function() {
  const buf = Buffer(8);
  buf.writeFloatLE(0.0, 0xffffffff);
}, RangeError);

assert.throws(function() {
  const buf = Buffer(8);
  buf.readFloatLE(0xffffffff);
}, RangeError);

assert.throws(function() {
  const buf = Buffer(8);
  buf.writeFloatLE(0.0, 0xffffffff);
}, RangeError);


// ensure negative values can't get past offset
assert.throws(function() {
  const buf = Buffer(8);
  buf.readFloatLE(-1);
}, RangeError);

assert.throws(function() {
  const buf = Buffer(8);
  buf.writeFloatLE(0.0, -1);
}, RangeError);

assert.throws(function() {
  const buf = Buffer(8);
  buf.readFloatLE(-1);
}, RangeError);

assert.throws(function() {
  const buf = Buffer(8);
  buf.writeFloatLE(0.0, -1);
}, RangeError);

// offset checks
{
  const buf = new Buffer(0);

  assert.throws(function() { buf.readUInt8(0); }, RangeError);
  assert.throws(function() { buf.readInt8(0); }, RangeError);
}

{
  const buf = new Buffer([0xFF]);

  assert.strictEqual(buf.readUInt8(0), 255);
  assert.strictEqual(buf.readInt8(0), -1);
}

[16, 32].forEach(function(bits) {
  const buf = new Buffer(bits / 8 - 1);

  assert.throws(function() { buf['readUInt' + bits + 'BE'](0); },
                RangeError,
                'readUInt' + bits + 'BE');

  assert.throws(function() { buf['readUInt' + bits + 'LE'](0); },
                RangeError,
                'readUInt' + bits + 'LE');

  assert.throws(function() { buf['readInt' + bits + 'BE'](0); },
                RangeError,
                'readInt' + bits + 'BE()');

  assert.throws(function() { buf['readInt' + bits + 'LE'](0); },
                RangeError,
                'readInt' + bits + 'LE()');
});

[16, 32].forEach(function(bits) {
  const buf = new Buffer([0xFF, 0xFF, 0xFF, 0xFF]);

  assert.strictEqual(buf['readUInt' + bits + 'BE'](0),
                     (0xFFFFFFFF >>> (32 - bits)));

  assert.strictEqual(buf['readUInt' + bits + 'LE'](0),
                     (0xFFFFFFFF >>> (32 - bits)));

  assert.strictEqual(buf['readInt' + bits + 'BE'](0),
                     (0xFFFFFFFF >> (32 - bits)));

  assert.strictEqual(buf['readInt' + bits + 'LE'](0),
                     (0xFFFFFFFF >> (32 - bits)));
});

// test for common read(U)IntLE/BE
{
  const buf = new Buffer([0x01, 0x02, 0x03, 0x04, 0x05, 0x06]);

  assert.strictEqual(buf.readUIntLE(0, 1), 0x01);
  assert.strictEqual(buf.readUIntBE(0, 1), 0x01);
  assert.strictEqual(buf.readUIntLE(0, 3), 0x030201);
  assert.strictEqual(buf.readUIntBE(0, 3), 0x010203);
  assert.strictEqual(buf.readUIntLE(0, 5), 0x0504030201);
  assert.strictEqual(buf.readUIntBE(0, 5), 0x0102030405);
  assert.strictEqual(buf.readUIntLE(0, 6), 0x060504030201);
  assert.strictEqual(buf.readUIntBE(0, 6), 0x010203040506);
  assert.strictEqual(buf.readIntLE(0, 1), 0x01);
  assert.strictEqual(buf.readIntBE(0, 1), 0x01);
  assert.strictEqual(buf.readIntLE(0, 3), 0x030201);
  assert.strictEqual(buf.readIntBE(0, 3), 0x010203);
  assert.strictEqual(buf.readIntLE(0, 5), 0x0504030201);
  assert.strictEqual(buf.readIntBE(0, 5), 0x0102030405);
  assert.strictEqual(buf.readIntLE(0, 6), 0x060504030201);
  assert.strictEqual(buf.readIntBE(0, 6), 0x010203040506);
}

// test for common write(U)IntLE/BE
{
  let buf = Buffer(3);
  buf.writeUIntLE(0x123456, 0, 3);
  assert.deepStrictEqual(buf.toJSON().data, [0x56, 0x34, 0x12]);
  assert.strictEqual(buf.readUIntLE(0, 3), 0x123456);

  buf = Buffer(3);
  buf.writeUIntBE(0x123456, 0, 3);
  assert.deepStrictEqual(buf.toJSON().data, [0x12, 0x34, 0x56]);
  assert.strictEqual(buf.readUIntBE(0, 3), 0x123456);

  buf = Buffer(3);
  buf.writeIntLE(0x123456, 0, 3);
  assert.deepStrictEqual(buf.toJSON().data, [0x56, 0x34, 0x12]);
  assert.strictEqual(buf.readIntLE(0, 3), 0x123456);

  buf = Buffer(3);
  buf.writeIntBE(0x123456, 0, 3);
  assert.deepStrictEqual(buf.toJSON().data, [0x12, 0x34, 0x56]);
  assert.strictEqual(buf.readIntBE(0, 3), 0x123456);

  buf = Buffer(3);
  buf.writeIntLE(-0x123456, 0, 3);
  assert.deepStrictEqual(buf.toJSON().data, [0xaa, 0xcb, 0xed]);
  assert.strictEqual(buf.readIntLE(0, 3), -0x123456);

  buf = Buffer(3);
  buf.writeIntBE(-0x123456, 0, 3);
  assert.deepStrictEqual(buf.toJSON().data, [0xed, 0xcb, 0xaa]);
  assert.strictEqual(buf.readIntBE(0, 3), -0x123456);

  buf = Buffer(3);
  buf.writeIntLE(-0x123400, 0, 3);
  assert.deepStrictEqual(buf.toJSON().data, [0x00, 0xcc, 0xed]);
  assert.strictEqual(buf.readIntLE(0, 3), -0x123400);

  buf = Buffer(3);
  buf.writeIntBE(-0x123400, 0, 3);
  assert.deepStrictEqual(buf.toJSON().data, [0xed, 0xcc, 0x00]);
  assert.strictEqual(buf.readIntBE(0, 3), -0x123400);

  buf = Buffer(3);
  buf.writeIntLE(-0x120000, 0, 3);
  assert.deepStrictEqual(buf.toJSON().data, [0x00, 0x00, 0xee]);
  assert.strictEqual(buf.readIntLE(0, 3), -0x120000);

  buf = Buffer(3);
  buf.writeIntBE(-0x120000, 0, 3);
  assert.deepStrictEqual(buf.toJSON().data, [0xee, 0x00, 0x00]);
  assert.strictEqual(buf.readIntBE(0, 3), -0x120000);

  buf = Buffer(5);
  buf.writeUIntLE(0x1234567890, 0, 5);
  assert.deepStrictEqual(buf.toJSON().data, [0x90, 0x78, 0x56, 0x34, 0x12]);
  assert.strictEqual(buf.readUIntLE(0, 5), 0x1234567890);

  buf = Buffer(5);
  buf.writeUIntBE(0x1234567890, 0, 5);
  assert.deepStrictEqual(buf.toJSON().data, [0x12, 0x34, 0x56, 0x78, 0x90]);
  assert.strictEqual(buf.readUIntBE(0, 5), 0x1234567890);

  buf = Buffer(5);
  buf.writeIntLE(0x1234567890, 0, 5);
  assert.deepStrictEqual(buf.toJSON().data, [0x90, 0x78, 0x56, 0x34, 0x12]);
  assert.strictEqual(buf.readIntLE(0, 5), 0x1234567890);

  buf = Buffer(5);
  buf.writeIntBE(0x1234567890, 0, 5);
  assert.deepStrictEqual(buf.toJSON().data, [0x12, 0x34, 0x56, 0x78, 0x90]);
  assert.strictEqual(buf.readIntBE(0, 5), 0x1234567890);

  buf = Buffer(5);
  buf.writeIntLE(-0x1234567890, 0, 5);
  assert.deepStrictEqual(buf.toJSON().data, [0x70, 0x87, 0xa9, 0xcb, 0xed]);
  assert.strictEqual(buf.readIntLE(0, 5), -0x1234567890);

  buf = Buffer(5);
  buf.writeIntBE(-0x1234567890, 0, 5);
  assert.deepStrictEqual(buf.toJSON().data, [0xed, 0xcb, 0xa9, 0x87, 0x70]);
  assert.strictEqual(buf.readIntBE(0, 5), -0x1234567890);

  buf = Buffer(5);
  buf.writeIntLE(-0x0012000000, 0, 5);
  assert.deepStrictEqual(buf.toJSON().data, [0x00, 0x00, 0x00, 0xee, 0xff]);
  assert.strictEqual(buf.readIntLE(0, 5), -0x0012000000);

  buf = Buffer(5);
  buf.writeIntBE(-0x0012000000, 0, 5);
  assert.deepStrictEqual(buf.toJSON().data, [0xff, 0xee, 0x00, 0x00, 0x00]);
  assert.strictEqual(buf.readIntBE(0, 5), -0x0012000000);
}

// test Buffer slice
{
  const buf = new Buffer('0123456789');
  assert.strictEqual(buf.slice(-10, 10).toString(), '0123456789');
  assert.strictEqual(buf.slice(-20, 10).toString(), '0123456789');
  assert.strictEqual(buf.slice(-20, -10).toString(), '');
  assert.strictEqual(buf.slice().toString(), '0123456789');
  assert.strictEqual(buf.slice(0).toString(), '0123456789');
  assert.strictEqual(buf.slice(0, 0).toString(), '');
  assert.strictEqual(buf.slice(undefined).toString(), '0123456789');
  assert.strictEqual(buf.slice('foobar').toString(), '0123456789');
  assert.strictEqual(buf.slice(undefined, undefined).toString(), '0123456789');

  assert.strictEqual(buf.slice(2).toString(), '23456789');
  assert.strictEqual(buf.slice(5).toString(), '56789');
  assert.strictEqual(buf.slice(10).toString(), '');
  assert.strictEqual(buf.slice(5, 8).toString(), '567');
  assert.strictEqual(buf.slice(8, -1).toString(), '8');
  assert.strictEqual(buf.slice(-10).toString(), '0123456789');
  assert.strictEqual(buf.slice(0, -9).toString(), '0');
  assert.strictEqual(buf.slice(0, -10).toString(), '');
  assert.strictEqual(buf.slice(0, -1).toString(), '012345678');
  assert.strictEqual(buf.slice(2, -2).toString(), '234567');
  assert.strictEqual(buf.slice(0, 65536).toString(), '0123456789');
  assert.strictEqual(buf.slice(65536, 0).toString(), '');
  assert.strictEqual(buf.slice(-5, -8).toString(), '');
  assert.strictEqual(buf.slice(-5, -3).toString(), '56');
  assert.strictEqual(buf.slice(-10, 10).toString(), '0123456789');
  for (let i = 0, s = buf.toString(); i < buf.length; ++i) {
    assert.strictEqual(buf.slice(i).toString(), s.slice(i));
    assert.strictEqual(buf.slice(0, i).toString(), s.slice(0, i));
    assert.strictEqual(buf.slice(-i).toString(), s.slice(-i));
    assert.strictEqual(buf.slice(0, -i).toString(), s.slice(0, -i));
  }

  const utf16Buf = new Buffer('0123456789', 'utf16le');
  assert.deepStrictEqual(utf16Buf.slice(0, 6), Buffer('012', 'utf16le'));

  assert.strictEqual(buf.slice('0', '1').toString(), '0');
  assert.strictEqual(buf.slice('-5', '10').toString(), '56789');
  assert.strictEqual(buf.slice('-10', '10').toString(), '0123456789');
  assert.strictEqual(buf.slice('-10', '-5').toString(), '01234');
  assert.strictEqual(buf.slice('-10', '-0').toString(), '');
  assert.strictEqual(buf.slice('111').toString(), '');
  assert.strictEqual(buf.slice('0', '-111').toString(), '');

  // try to slice a zero length Buffer
  // see https://github.com/joyent/node/issues/5881
  SlowBuffer(0).slice(0, 1);
}

// Regression test for #5482: should throw but not assert in C++ land.
assert.throws(function() {
  Buffer('', 'buffer');
}, TypeError);

// Regression test for #6111. Constructing a buffer from another buffer
// should a) work, and b) not corrupt the source buffer.
{
  let a = [0];
  for (let i = 0; i < 7; ++i) a = a.concat(a);
  a = a.map(function(_, i) { return i; });
  const b = Buffer(a);
  const c = Buffer(b);
  assert.strictEqual(b.length, a.length);
  assert.strictEqual(c.length, a.length);
  for (let i = 0, k = a.length; i < k; ++i) {
    assert.strictEqual(a[i], i);
    assert.strictEqual(b[i], i);
    assert.strictEqual(c[i], i);
  }
}


assert.throws(function() {
  new Buffer((-1 >>> 0) + 1);
}, RangeError);

assert.throws(function() {
  SlowBuffer((-1 >>> 0) + 1);
}, RangeError);

if (common.hasCrypto) {
  // Test truncation after decode
  const crypto = require('crypto');

  const b1 = new Buffer('YW55=======', 'base64');
  const b2 = new Buffer('YW55', 'base64');

  assert.strictEqual(
    crypto.createHash('sha1').update(b1).digest('hex'),
    crypto.createHash('sha1').update(b2).digest('hex')
  );
} else {
  common.printSkipMessage('missing crypto');
}

// Test Compare
{
  const b = new Buffer(1).fill('a');
  const c = new Buffer(1).fill('c');
  const d = new Buffer(2).fill('aa');

  assert.strictEqual(b.compare(c), -1);
  assert.strictEqual(c.compare(d), 1);
  assert.strictEqual(d.compare(b), 1);
  assert.strictEqual(b.compare(d), -1);
  assert.strictEqual(b.compare(b), 0);

  assert.strictEqual(Buffer.compare(b, c), -1);
  assert.strictEqual(Buffer.compare(c, d), 1);
  assert.strictEqual(Buffer.compare(d, b), 1);
  assert.strictEqual(Buffer.compare(b, d), -1);
  assert.strictEqual(Buffer.compare(c, c), 0);

  assert.strictEqual(Buffer.compare(Buffer(0), Buffer(0)), 0);
  assert.strictEqual(Buffer.compare(Buffer(0), Buffer(1)), -1);
  assert.strictEqual(Buffer.compare(Buffer(1), Buffer(0)), 1);
}

assert.throws(function() {
  const b = Buffer(1);
  Buffer.compare(b, 'abc');
}, /^TypeError: Arguments must be Buffers$/);

assert.throws(function() {
  const b = Buffer(1);
  Buffer.compare('abc', b);
}, /^TypeError: Arguments must be Buffers$/);

assert.throws(function() {
  const b = Buffer(1);
  b.compare('abc');
}, /^TypeError: Argument must be a Buffer$/);

// Test Equals
{
  const b = new Buffer(5).fill('abcdf');
  const c = new Buffer(5).fill('abcdf');
  const d = new Buffer(5).fill('abcde');
  const e = new Buffer(6).fill('abcdef');

  assert.ok(b.equals(c));
  assert.ok(!c.equals(d));
  assert.ok(!d.equals(e));
  assert.ok(d.equals(d));
}

assert.throws(function() {
  const b = Buffer(1);
  b.equals('abc');
}, /^TypeError: Argument must be a Buffer$/);

// Regression test for https://github.com/nodejs/node/issues/649.
assert.throws(function() {
  Buffer(1422561062959).toString('utf8');
}, /^RangeError: Invalid typed array length$/);

const ps = Buffer.poolSize;
Buffer.poolSize = 0;
assert.strictEqual(Buffer(1).parent, undefined);
Buffer.poolSize = ps;

// Test Buffer.copy() segfault
assert.throws(function() {
  Buffer(10).copy();
}, /^TypeError: argument should be a Buffer$/);

const regErrorMsg = new RegExp('First argument must be a string, Buffer, ' +
                               'ArrayBuffer, Array, or array-like object.');

assert.throws(function() {
  new Buffer();
}, regErrorMsg);

assert.throws(function() {
  new Buffer(null);
}, regErrorMsg);


// Test prototype getters don't throw
assert.strictEqual(Buffer.prototype.parent, undefined);
assert.strictEqual(Buffer.prototype.offset, undefined);
assert.strictEqual(SlowBuffer.prototype.parent, undefined);
assert.strictEqual(SlowBuffer.prototype.offset, undefined);

{
  // Test that large negative Buffer length inputs don't affect the pool offset.
  assert.deepStrictEqual(Buffer(-Buffer.poolSize), Buffer.from(''));
  assert.deepStrictEqual(Buffer(-100), Buffer.from(''));
  assert.deepStrictEqual(Buffer.allocUnsafe(-Buffer.poolSize), Buffer.from(''));
  assert.deepStrictEqual(Buffer.allocUnsafe(-100), Buffer.from(''));

  // Check pool offset after that by trying to write string into the pool.
  assert.doesNotThrow(() => Buffer.from('abc'));
}

// UCS-2 overflow CVE-2018-12115
for (let i = 1; i < 4; i++) {
  // Allocate two Buffers sequentially off the pool. Run more than once in case
  // we hit the end of the pool and don't get sequential allocations
  const x = Buffer.allocUnsafe(4).fill(0);
  const y = Buffer.allocUnsafe(4).fill(1);
  // Should not write anything, pos 3 doesn't have enough room for a 16-bit char
  assert.strictEqual(x.write('ыыыыыы', 3, 'ucs2'), 0);
  // CVE-2018-12115 experienced via buffer overrun to next block in the pool
  assert.strictEqual(Buffer.compare(y, Buffer.alloc(4, 1)), 0);
}

// Should not write any data when there is no space for 16-bit chars
const z = Buffer.alloc(4, 0);
assert.strictEqual(z.write('\u0001', 3, 'ucs2'), 0);
assert.strictEqual(Buffer.compare(z, Buffer.alloc(4, 0)), 0);

// Large overrun could corrupt the process
assert.strictEqual(Buffer.alloc(4)
  .write('ыыыыыы'.repeat(100), 3, 'utf16le'), 0);
