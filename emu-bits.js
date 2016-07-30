//console.log( (new MoreBits()).test(10, -100000, 100000) );
function MoreBits(number, ext) {
	this.bits = new Int8Array();
	this._mod = 0;
	this._div = 0;

	this.str_repeat = function(input, count) {
		var buf = '';
		while (count) {
			if (count & 1)
				buf += input;
			input += input;
			count >>= 1;
		}
		return buf;
	}
	this.rand = function(start, end) {
		return Math.round( start + (end - start) * Math.random() );
	}


	this.compare = function(num) {
		var r = this.clone().sub( new MoreBits(num, this) );
		if ( r.isNull() ) {
			return 0;
		}
		return r.isLessNull() ? -1 : 1;
	}
	
	this.shPrepare = function(sh) {
		sh = new MoreBits(sh, this);
		if ( sh.compare(0) < 0 ) {
			throw {message: "Sh lvl < 0"}
		}	
		return sh;
	}
	
	this.shl_Logic = function(sh) {
		sh = this.shPrepare(sh);
		
		while( sh.compare(0) > 0 ) {
			if ( this.bits[this.bits.length - 1] || this.bits[this.bits.length - 2] || this.bits[this.bits.length - 3] ) {
				this.bits = this.bitsExtends( this.bits.length + 1 ).bits;
			}
			prev = 0;
			this.map(function(n,i) {
				var set = prev;
				prev = n;
				return set;
			});
			sh.sub(1);
		}
		return this;
	}
	this.shr_Logic = function(sh) {
		sh = this.shPrepare(sh);
		
		while( sh.compare(0) > 0 ) {
			prev = 0;
			this.map(function(n,i) {
				var set = prev;
				prev = n;
				return set;
			}, true);
			sh.sub(1);
		}
		return this;
	}
	this.shl_Arithmetic = function(sh) {
		return this.shl_Logic(sh);
	}
	this.shr_Arithmetic = function(sh) {
		sh = this.shPrepare(sh);
		
		while( sh.compare(0) > 0 ) {
			prev = this.isLessNull() ? 1 : 0;
			this.map(function(n,i) {
				var set = prev;
				prev = n;
				return set;
			}, true);
			sh.sub(1);
		}
		return this;
	}

	this.or = function(num) {
		return this.map2(num, function(left, right) {
			return left | right;
		});
	}
	this.and = function(num) {
		return this.map2(num, function(left, right) {
			return left & right;
		});
	}
	this.xor = function(num) {
		return this.map2(num, function(left, right) {
			return left ^ right;
		});
	}

	this.add = function(num) {
		num = new MoreBits(num, this);
		var next = 0;
		return this.map(function(n, i) {
			switch( next + num.bits[i] + n ) {
				case 0:
					return 0;
				case 1:
					next = 0;
					return 1;
				case 2:
					next = 1;
					return 0;
				case 3:
					next = 1;
					return 1;
			}
		});
	}
	this.sub = function(num) {
		num = new MoreBits(num, this);
		return this.add( num.additionalCode() );
	}

	this.mul = function(num) {
		num = new MoreBits(num, this);
		var result = new MoreBits(0);
		var tmp = this.clone();
		
		var ac = false;
		if ( num.isLessNull() ) {
			num.additionalCode();
			ac = true;
		}
		
		this.each(function(n) {
			if ( num.clone().and(1).toNumber() !== "0" ) {
				result.add(tmp);
			}
			tmp.shl_Arithmetic(1);
			num.shr_Arithmetic(1);
		});
		
		this.bits = result.bits;
		
		if ( ac ) {
			this.additionalCode();
		}
		return this;
	}
	this.div = function(num) {
		num = new MoreBits(num, this);

		if ( num.isNull() ) {
			throw {message: "Div 0"}
		}
		
		var div = (new MoreBits(0)).bitsExtends(this.bits.length);
		var mod = new MoreBits(0);

		var isLessNull = false;
		if ( this.isLessNull() ) {
			this.additionalCode();
			isLessNull = !isLessNull;
		}
		if ( num.isLessNull() ) {
			num.additionalCode();
			isLessNull = !isLessNull;
		}

		this.each(function(n, i) {
			mod.shl_Arithmetic(1);
			mod.bits[0] = this.bits[i];
			if ( mod.compare( num ) >= 0 ) {
				mod.sub( num );
				div.bits[i] =1;
			}
		}, true);

		this.bits = div.bits;
		if ( isLessNull ) {
			this.additionalCode();
		}
		
		this._mod = mod;
		this._div = div;

		return this;
	}
	this.mod = function(num) {
		var isLessNull = this.isLessNull();
		this.div(num).bits = (new MoreBits(this._mod)).bits;
		if ( isLessNull ) {
			this.bits = (new MoreBits(0)).sub(this).bits;
		}
		return this;
	}

	this.invert = function() {
		return this.map(function(n) {
			return ~n;
		});
	}

	this.additionalCode = function() {
		return this.invert().add( 1 );
	}

	this.bitsExtends = function(newCountBits) {
		if ( newCountBits <= this.bits.length ) {
			return this;
		}
		var newBits = new Int8Array( newCountBits );
		for(var i = 0; i < this.bits.length - 1; i++) {
			newBits[i] = this.bits[i];
		}
		var fl = this.isLessNull();
		for(; i < newBits.length; i++) {
			newBits[i] = fl;
		}
		this.bits = newBits;
		return this;
	}
	
	this.isLessNull = function() {
		return this.bits[ this.bits.length - 1 ];
	}
	this.isNull = function() {
		for(var i = 0; i < this.bits.length; i++) {
			if ( this.bits[i] ) {
				return false;
			}
		}
		return true;
	}
	
	this.each = function(callback, isDown) {
		if ( isDown ) {
			for(var i = this.bits.length - 1; i >= 0; i--) {
				callback.call(this, this.bits[i], i);
			}
		} else {
			for(var i = 0; i < this.bits.length; i++) {
				callback.call(this, this.bits[i], i);
			}
		}
		return this;
	}
	this.map = function(callback, isDown) {
		if ( isDown ) {
			for(var i = this.bits.length - 1; i >= 0; i--) {
				this.bits[i] = 1 & callback.call(this, this.bits[i], i);
			}		
		} else {
			for(var i = 0; i < this.bits.length; i++) {
				this.bits[i] = 1 & callback.call(this, this.bits[i], i);
			}
		}
		return this;
	}
	this.map2 = function(num, callback, isDown) {
		num = new MoreBits(num, this);
		if ( isDown ) {
			for(var i = this.bits.length - 1; i >= 0; i--) {
				this.bits[i] = 1 & callback.call(this, this.bits[i], num.bits[i], i);
			}
		} else {
			for(var i = 0; i < this.bits.length; i++) {
				this.bits[i] = 1 & callback.call(this, this.bits[i], num.bits[i], i);
			}
		}
		return this;
	}
	
	this.clone = function() {
		var clone = (new MoreBits()).bitsExtends(this.bits.length);
		this.each(function(n, i) {
			clone.bits[i] = n;
		});
		return clone;
	}
	
	this.parse = function(_number) {
		if ( typeof _number === "object" ) {
			this.bits = _number.clone().bits;
		} else if ( number = _number.toString().match( /\s*(\-?)\s*(\d+)/ ) ) {
			var isMinus = !!number[1];
			var number = number[2].replace( /^0*/ , '' );
			number = this.decToBin( number );
			this.setBits( number );
			if ( isMinus ) {
				this.additionalCode();
			}
		} else {
			throw {message: 'Parse invalid number "'+(_number.toString())+'"'}
		}
		return this;
	}
	this.decDiv2 = function(nums) {
		var res = "";
		var mod = 0;
		for(var i = 0; i<nums.length; i++) {
			var n = nums[i];
			var div = n / 2;
			var iDiv = parseInt(div);
			if ( iDiv + mod ) {
				res += iDiv + mod;
				mod = ( iDiv !== div ) ? 5 : 0;
				
				for(i++; i<nums.length; i++) {
					var n = nums[i];
					var div = n / 2;
					var iDiv = parseInt(div);
					res += iDiv + mod;
					mod = ( iDiv !== div ) ? 5 : 0;
				}
				break;
			}
			mod = ( iDiv !== div ) ? 5 : 0;
		}
		return {
			div: res.length ? res : "0" ,
			mod: mod ? 1 : 0
		};
	}
	this.decToBin = function(number) {
		number = number.toString();
		if ( !number.length || number === "0" ) {
			return "0";
		}
		var res = "";
		data = {div: number, mod: 0}
		while( 1 ) {
			data = this.decDiv2(data.div);
			res = data.mod + res;
			if ( data.div === "0" ) {
				break;
			}
		}
		return res;
	}
	this.setBits = function(number) {
		if ( !number.length ) {
			number = "0";
		}
		this.bits = new Int8Array( number.length + 8 );
		var j = 0;
		for(var i = number.length - 1; i >= 0; i--) {
			this.bits[j++] = parseInt(number[i]);
		}
	}
	this.dec2Pow = function(number) {
		var res = "";
		var prev = 0;
		for(var i = number.length - 1; i >= 0; i--) {
			var n = number[i] * 2 + prev;
			if ( n >= 10 ) {
				prev = 1;
				n = n  - 10;
			} else {
				prev = 0;
			}
			res = n + res;
		}
		if ( prev ) {
			res = prev + res;
		}
		return res;
	}
	this.dec2PowE = function(number, e) {
		while(e--) {
			number = this.dec2Pow(number);
		}
		return number;
	}
	this.decAdd = function(number, added) {
		if ( number.length > added.length ) {
			added = this.str_repeat("0", number.length - added.length) + added;
		} else if ( number.length < added.length ) {
			number = this.str_repeat("0", added.length - number.length) + number;
		}
		
		var res = "";
		var prev = 0;
		for(var i = 0; i < number.length; i++) {
			var n = parseInt(number[ number.length - i - 1 ]) + parseInt(added[ added.length - i - 1 ]) + prev;
			if ( n >= 10 ) {
				prev = parseInt(n / 10);
				n = n % 10;
			} else {
				prev = 0;
			}
			res = n + res;
		}
		if ( prev ) {
			res = prev + res;
		}
		return res;
	}
	
	this.toNumber = function(countBits, uint = false) {
		var res = "0";
		var tg = this.clone();

		if ( countBits === undefined ) {
			countBits = tg.bits.length;
		}
		
		var _this = this;
		tg = (new MoreBits()).bitsExtends( countBits );
		tg.map(function(n, i) {
			return _this.bits[i];
		});
		//tg.bits[tg.bits.length-1] = this.isLessNull() ? 1 : 0;

		var isLessNull = tg.isLessNull();
		if ( !uint && isLessNull ) {
			tg.additionalCode();
		}

		for(var i=0; i<countBits; i++) {
			var n = tg.bits[i];
			if ( n ) {
				res = this.decAdd(res, this.dec2PowE(n.toString(), i.toString()));
			}
		}
		if ( !uint && res !== "0" && isLessNull ) {
			return "-" + res;
		}
		return res;
	}
	
	
	this.test = function(count, min, max) {
		var rand = function(s,e) {
			return (new MoreBits()).rand(s,e);
		}
		var log = "";
		
		[
			function(left, right) { return { "op": "+", "origResult": left + right , "myResult": (new MoreBits(left)).add(right) } } ,
			function(left, right) { return { "op": "-", "origResult": left - right , "myResult": (new MoreBits(left)).sub(right) } } ,
			function(left, right) { return { "op": "*", "origResult": left * right , "myResult": (new MoreBits(left)).mul(right) } } ,
			function(left, right) { return { "op": "/", "origResult": left / right , "myResult": (new MoreBits(left)).div(right) } } ,
			function(left, right) { return { "op": "%", "origResult": left % right , "myResult": (new MoreBits(left)).mod(right) } } ,
		].forEach(function(f) {
			for(var i = 0; i < count; i++) {
				var left = rand(min, max);
				var right = rand(min, max);
				
				var v = f(left, right);
				v.origResult = parseInt(v.origResult);
				v.myResult = v.myResult.toNumber();
				
				if ( v.origResult.toString() !== v.myResult.toString() ) {
					log += "Error: [ op: " + v.op + " ] [ orig: " + v.origResult + " ] [ my: " + v.myResult + " ] \r\n";
				}
			}
		});
		
		return log;
	}
	
	if ( number === undefined ) {
		return;
	}
	this.parse( number );
	if ( ext !== undefined ) {
		var newCountBits = Math.max( this.bits.length, ext.bits.length );
		ext.bitsExtends(newCountBits);
		this.bitsExtends(newCountBits);
	}
}