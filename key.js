/*
 Source: http://hg.mozilla.org/mozilla-central/file/895e12563245/dom/indexedDB/Key.cpp
 ---
 Here's how we encode keys:

 Basic strategy is the following

 Numbers: 1 n n n n n n n n    ("n"s are encoded 64bit float)
 Dates:   2 n n n n n n n n    ("n"s are encoded 64bit float)
 Strings: 3 s s s ... 0        ("s"s are encoded unicode bytes)
 Arrays:  4 i i i ... 0        ("i"s are encoded array items)


 When encoding floats, 64bit IEEE 754 are almost sortable, except that
 positive sort lower than negative, and negative sort descending. So we use
 the following encoding:

 value < 0 ?
   (-to64bitInt(value)) :
   (to64bitInt(value) | 0x8000000000000000)


 When encoding strings, we use variable-size encoding per the following table

 Chars 0         - 7E           are encoded as 0xxxxxxx with 1 added
 Chars 7F        - (3FFF+7F)    are encoded as 10xxxxxx xxxxxxxx with 7F subtracted
 Chars (3FFF+80) - FFFF         are encoded as 11xxxxxx xxxxxxxx xx000000

 This ensures that the first byte is never encoded as 0, which means that the
 string terminator (per basic-stategy table) sorts before any character.
 The reason that (3FFF+80) - FFFF is encoded "shifted up" 6 bits is to maximize
 the chance that the last character is 0. See below for why.


 When encoding Arrays, we use an additional trick. Rather than adding a byte
 containing the value '4' to indicate type, we instead add 4 to the next byte.
 This is usually the byte containing the type of the first item in the array.
 So simple examples are

 ["foo"]       7 s s s 0 0                              // 7 is 3 + 4
 [1, 2]        5 n n n n n n n n 1 n n n n n n n n 0    // 5 is 1 + 4

 Whe do this iteratively if the first item in the array is also an array

 [["foo"]]    11 s s s 0 0 0

 However, to avoid overflow in the byte, we only do this 3 times. If the first
 item in an array is an array, and that array also has an array as first item,
 we simply write out the total value accumulated so far and then follow the
 "normal" rules.

 [[["foo"]]]  12 3 s s s 0 0 0 0

 There is another edge case that can happen though, which is that the array
 doesn't have a first item to which we can add 4 to the type. Instead the
 next byte would normally be the array terminator (per basic-strategy table)
 so we simply add the 4 there.

 [[]]         8 0             // 8 is 4 + 4 + 0
 []           4               // 4 is 4 + 0
 [[], "foo"]  8 3 s s s 0 0   // 8 is 4 + 4 + 0

 Note that the max-3-times rule kicks in before we get a chance to add to the
 array terminator

 [[[]]]       12 0 0 0        // 12 is 4 + 4 + 4

 We could use a much higher number than 3 at no complexity or performance cost,
 however it seems unlikely that it'll make a practical difference, and the low
 limit makes testing eaiser.


 As a final optimization we do a post-encoding step which drops all 0s at the
 end of the encoded buffer.

 "foo"         // 3 s s s
 1             // 1 bf f0
 ["a", "b"]    // 7 s 3 s
 [1, 2]        // 5 bf f0 0 0 0 0 0 0 1 c0
 [[]]          // 8
*/

if (window.indexedDB.polyfill)
(function(util, undefined)
{
	var ARRAY_TERMINATOR = { };
	var BYTE_TERMINATOR = 0;
	var TYPE_NUMBER = 1;
	var TYPE_DATE = 2;
	var TYPE_STRING = 3;
	var TYPE_ARRAY = 4;
	var MAX_TYPE_BYTE_SIZE = 12; // NOTE: Cannot be greater than 255

	util.encodeKey = function (key)
	{
		var stack = [key], buffer = [], type = 0, dataType, obj, tmp;
		while ((obj = stack.pop()) !== undefined)
		{
			if (type % 4 === 0 && type + TYPE_ARRAY > MAX_TYPE_BYTE_SIZE)
			{
				buffer.push(type);
				type = 0;
			}
			dataType = typeof obj;
			if (obj instanceof Array)
			{
				type += TYPE_ARRAY;
				if (obj.length > 0)
				{
					stack.push(ARRAY_TERMINATOR);
					var i = obj.length;
					while (i--) stack.push(obj[i]);
					continue;
				}
				else
				{
					buffer.push(type);
				}
			}
			else if (dataType === "number")
			{
				type += TYPE_NUMBER;
				buffer.push(type);
				encodeNumber(buffer, obj);
			}
			else if (obj instanceof Date)
			{
				type += TYPE_DATE;
				buffer.push(type);
				encodeNumber(buffer, obj.valueOf());
			}
			else if (dataType === "string")
			{
				type += TYPE_STRING;
				buffer.push(type);
				encodeString(buffer, obj);
			}
			else if (obj === ARRAY_TERMINATOR)
			{
				buffer.push(BYTE_TERMINATOR);
			}
			else return null;
			type = 0;
		}
		return bufferToUnicodeString(buffer);
	};

	util.decodeKey = function (encodedKey)
	{
		var rootArray = []; // one-element root array that contains the result
		var parentArray = rootArray;
		var type, arrayStack = [], depth, tmp;
		var byteReader = new ByteReader(encodedKey);
		while (byteReader.read() != null)
		{
			if (byteReader.current === 0) // end of array
			{
				parentArray = arrayStack.pop();
				continue;
			}
			if (byteReader.current === null)
			{
				return rootArray[0];
			}
			do
			{
				depth = byteReader.current / 4 | 0;
				type = byteReader.current % 4;
				for (var i = 0; i < depth; i++)
				{
					tmp = [];
					parentArray.push(tmp);
					arrayStack.push(parentArray);
					parentArray = tmp;
				}
				if (type === 0 && byteReader.current + TYPE_ARRAY > MAX_TYPE_BYTE_SIZE)
				{
					byteReader.read();
				}
				else break;
			} while (true);

			if (type === TYPE_NUMBER)
			{
				parentArray.push(decodeNumber(byteReader));
			}
			else if (type === TYPE_DATE)
			{
				parentArray.push(new Date(decodeNumber(byteReader)));
			}
			else if (type === TYPE_STRING)
			{
				parentArray.push(decodeString(byteReader));
			}
			else if (type === 0) // empty array case
			{
				parentArray = arrayStack.pop();
			}
		}
		return rootArray[0];
	};

	// Utils
	var p16 = 0x10000;
	var p32 = 0x100000000;
	var p48 = 0x1000000000000;
	var p52 = 0x10000000000000;
	var pNeg1074 = 5e-324;                      // 2^-1074);
	var pNeg1022 = 2.2250738585072014e-308;     // 2^-1022

	function ieee754(number)
	{
		var s = 0, e = 0, m = 0;
		if (number !== 0)
		{
			if (isFinite(number))
			{
				if (number < 0)
				{
					s = 1;
					number = -number;
				}
				var p = 0;
				if (number >= pNeg1022)
				{
					var n = number;
					while (n < 1) { p--; n *= 2; }
					while (n >= 2) { p++; n /= 2; }
					e = p + 1023;
				}
				m = e ? Math.floor((number / Math.pow(2, p) - 1) * p52) : Math.floor(number / pNeg1074);
			}
			else
			{
				e = 0x7FF;
				if (isNaN(number))
				{
					m = 2251799813685248; // QNan
				}
				else
				{
					if (number === -Infinity) s = 1;
				}
			}
		}
		return { sign : s, exponent : e, mantissa : m };
	}

	function encodeNumber(buffer, number)
	{
		var number = ieee754(number);
		if (number.sign)
		{
			number.mantissa = p52 - 1 - number.mantissa;
			number.exponent = 0x7FF - number.exponent;
		}
		var word, m = number.mantissa;

		buffer.push((number.sign ? 0 : 0x80) | (number.exponent >> 4));
		buffer.push((number.exponent & 0xF) << 4 | (0 | m / p48));

		m %= p48; word = 0 | m / p32;
		buffer.push(word >> 8, word & 0xFF);

		m %= p32; word = 0 | m / p16;
		buffer.push(word >> 8, word & 0xFF);

		word = m % p16;
		buffer.push(word >> 8, word & 0xFF);
	}

	function decodeNumber(byteReader)
	{
		var b = byteReader.read();
		var sign = b >> 7 ? false : true;

		var s = sign ? -1 : 1;

		var e = (b & 0x7F) << 4;
		b = byteReader.read();
		e += b >> 4;
		if (sign) e = 0x7FF - e;

		var tmp = [sign ? (0xF - (b & 0xF)) : b & 0xF];
		var i = 6;
		while (i--) tmp.push(sign ? (0xFF - byteReader.read()) : byteReader.read());

		var m = 0; i = 7;
		while (i--)
		{
			m = m / 256 + tmp[i];
		}
		m /= 16;

		if (m === 0 && e === 0) return 0;
		return (m + 1) * Math.pow(2, e - 1023) * s;
	}

	var secondLayer = 0x3FFF + 0x7F;

	function encodeString(buffer, string)
	{
		/* 3 layers:
		 Chars 0         - 7E            are encoded as 0xxxxxxx with 1 added
		 Chars 7F        - (3FFF+7F)     are encoded as 10xxxxxx xxxxxxxx with 7F subtracted
		 Chars (3FFF+80) - FFFF          are encoded as 11xxxxxx xxxxxxxx xx000000
		 */
		for (var i = 0; i < string.length; i++)
		{
			var code = string.charCodeAt(i);
			if (code <= 0x7E)
			{
				buffer.push(code + 1);
			}
			else if (code <= secondLayer)
			{
				code -= 0x7F;
				buffer.push(0x80 | code >> 8, code & 0xFF);
			}
			else
			{
				buffer.push(0xC0 | code >> 10, code >> 2 | 0xFF, (code | 3) << 6);
			}
		}
		buffer.push(BYTE_TERMINATOR);
	}

	function decodeString(byteReader)
	{
		var buffer = [], layer = 0, unicode = 0, count = 0, byte, tmp;
		while (true)
		{
			byte = byteReader.read();
			if (byte === 0 || byte == null) break;

			if (layer === 0)
			{
				tmp = byte >> 6;
				if (tmp < 2)
				{
					buffer.push(String.fromCharCode(byte - 1));
				}
				else // tmp equals 2 or 3
				{
					layer = tmp;
					unicode = byte << 10;
					count++;
				}
			}
			else if (layer === 2)
			{
				buffer.push(String.fromCharCode(unicode + byte + 0x7F));
				layer = unicode = count = 0;
			}
			else // layer === 3
			{
				if (count === 2)
				{
					unicode += byte << 2;
					count++;
				}
				else // count === 3
				{
					buffer.push(String.fromCharCode(unicode | byte >> 6));
					layer = unicode = count = 0;
				}
			}
		}
		return buffer.join("");
	}

	var ByteReader = function (string)
	{
		this.current = null;

		var string = string;
		var code, index = -1, high = false;

		this.read = function ()
		{
			high = !high;
			if (high)
			{
				index++;
				code = string.charCodeAt(index);
			}
			if (isNaN(code))
			{
				this.current = null;
			}
			else
			{
				this.current = high ? code >> 8 : code & 0xFF;
			}
			return this.current;
		}
	};

	function bufferToUnicodeString(buffer)
	{
		var index = buffer.length;
		while (buffer[--index] === 0);
		buffer.length = ++index;

		if ((index & 1) === 1) buffer.push(0);
		var result = [], length = buffer.length >> 1;

		for (var i = 0; i < length; i++)
		{
			index = i << 1;
			result.push(String.fromCharCode(buffer[index] << 8 | buffer[index + 1]));
		}
		return result.join("");
	}

}(window.indexedDB.util));
