'use strict';

describe('SCE', function() {

  describe('disabled', function() {
    beforeEach(function() {
      module(function($sceProvider) {
        $sceProvider.enabled(false);
      });
    });

    it('should provide the getter for enabled', inject(function($sce) {
      expect($sce.isEnabled()).toBe(false);
    }));

    it('should not wrap/unwrap any value', inject(function($sce) {
      var originalValue = { foo: "bar" };
      expect($sce.trustAs(originalValue)).toBe(originalValue);
      expect($sce.getAsTrusted(originalValue)).toBe(originalValue);
    }));
  });

  describe('IE8 quirks mode', function() {
    function runTest(enabled, documentMode, expectException) {
      module(function($provide) {
        $provide.value('$document', [{
          documentMode: documentMode,
          createElement: function() {}
        }]);
        $provide.value('$sceDelegate', {trustAs: null, isTrusted: null, getAsTrusted: null});
      });

      inject(function($window, $injector) {
        function constructSce() {
          var sceProvider = new $SceProvider();
          sceProvider.enabled(enabled);
          return $injector.invoke(sceProvider.$get, sceProvider);
        }

        var origMsie = $window.msie;
        try {
          $window.msie = true;
          if (expectException) {
            expect(constructSce).toThrow(
                '[$sce:iequirks] Strict Contextual Escaping does not support Internet Explorer ' +
                'version < 10 in quirks mode.  You can fix this by adding the text <!doctype html> to ' +
                'the top of your HTML document.  See http://docs.angularjs.org/api/ng.$sce for more ' +
                'information.');
          } else {
            // no exception.
            constructSce();
          }
        }
        finally {
          $window.msie = origMsie;
        }
      });
    }

    it('should throw an exception when sce is enabled in quirks mode', function() {
      runTest(true, 7, true);
    });

    it('should NOT throw an exception when sce is enabled and in standards mode', function() {
      runTest(true, 8, false);
    });

    it('should NOT throw an exception when sce is enabled and documentMode is undefined', function() {
      runTest(true, undefined, false);
    });

    it('should NOT throw an exception when sce is disabled even when in quirks mode', function() {
      runTest(false, 7, false);
    });

    it('should NOT throw an exception when sce is disabled and in standards mode', function() {
      runTest(false, 8, false);
    });

    it('should NOT throw an exception when sce is disabled and documentMode is undefined', function() {
      runTest(false, undefined, false);
    });
  });

  describe('enabled', function() {
    it('should wrap values with TrustedValueHolder', inject(function($sce) {
      var originalValue = 'originalValue';
      var wrappedValue = $sce.trustAs(originalValue, $sce.HTML);
      expect(typeof wrappedValue).toBe('object');
      expect($sce.isTrusted(wrappedValue, $sce.HTML)).toBe(true);
      expect($sce.isTrusted(wrappedValue, $sce.CSS)).toBe(false);
      expect($sce.isTrusted(wrappedValue, 'UNDEFINED')).toBe(false);
      wrappedValue = $sce.trustAs(originalValue, $sce.CSS);
      expect(typeof wrappedValue).toBe('object');
      expect($sce.isTrusted(wrappedValue, $sce.CSS)).toBe(true);
      expect($sce.isTrusted(wrappedValue, $sce.HTML)).toBe(false);
      wrappedValue = $sce.trustAs(originalValue, $sce.URL);
      expect(typeof wrappedValue).toBe('object');
      expect($sce.isTrusted(wrappedValue, $sce.URL)).toBe(true);
      wrappedValue = $sce.trustAs(originalValue, $sce.JS);
      expect(typeof wrappedValue).toBe('object');
      expect($sce.isTrusted(wrappedValue, $sce.JS)).toBe(true);
    }));

    it('should NOT wrap unknown type / wildcard type values', inject(function($sce) {
      expect(function() { $sce.trustAs(123, $sce.ANY); }).toThrow(
          '[$sce:mistyped] Attempting to use a trusted value of one type as a different type.');
      expect(function() { $sce.trustAs(123, "UNDEFINED" ); }).toThrow(
          '[$sce:mistyped] Attempting to use a trusted value of one type as a different type.');
    }));

    it('should unwrap null into null', inject(function($sce) {
      expect($sce.getAsTrusted(null, $sce.HTML)).toBe(null);
    }));

    it('should unwrap undefined into undefined', inject(function($sce) {
      expect($sce.getAsTrusted(undefined, $sce.HTML)).toBe(undefined);
    }));

    it('should unwrap values and return the original', inject(function($sce) {
      var originalValue = "originalValue";
      var wrappedValue = $sce.trustAs(originalValue, $sce.HTML);
      expect($sce.getAsTrusted(wrappedValue, $sce.HTML)).toBe(originalValue);
    }));

    it('should NOT unwrap values when the type is different', inject(function($sce) {
      var originalValue = "originalValue";
      var wrappedValue = $sce.trustAs(originalValue, $sce.HTML);
      expect(function () { $sce.getAsTrusted(wrappedValue, $sce.CSS); }).toThrow(
          '[$sce:unsafe] Attempting to use an unsafe value in a safe context.');
    }));

    it('should NOT unwrap values that had not been wrapped', inject(function($sce) {
      function TrustedValueHolder(trustedValue) {
        this.$unwrapTrustedValue = function() {
          return trustedValue;
        };
      }
      var wrappedValue = new TrustedValueHolder("originalValue");
      expect(function() { return $sce.getAsTrusted(wrappedValue, $sce.HTML) }).toThrow(
          '[$sce:unsafe] Attempting to use an unsafe value in a safe context.');
    }));

    it('should implement toString on trusted values', inject(function($sce) {
      var originalValue = 123,
          wrappedValue = $sce.trustAsHtml(originalValue);
      expect($sce.getAsTrustedHtml(wrappedValue)).toBe(originalValue);
      expect(wrappedValue.toString()).toBe(originalValue.toString());
    }));
  });


  describe('replace $sceDelegate', function() {
    it('should override the default $sce.trustAs/isTrusted/etc.', function() {
      module(function($provide) {
        $provide.value('$sceDelegate', {
            trustAs:      function (value) { return "wrapped:"   + value; },
            isTrusted:  function (value) { return "isTrusted:" + value; },
            getAsTrusted: function (value) { return "unwrapped:" + value; }
        });
      });

      inject(function($sce) {
        expect($sce.trustAs("value")).toBe("wrapped:value");
        expect($sce.isTrusted("value")).toBe("isTrusted:value");
        expect($sce.getAsTrusted("value")).toBe("unwrapped:value");
        expect($sce.parseAs("name")({name: "chirayu"})).toBe("unwrapped:chirayu");
      });
    });
  });


  describe('$sce.parseAs', function($sce) {
   it('should parse constant literals as trusted', inject(function($sce) {
      expect($sce.parseAs('1')()).toBe(1);
      expect($sce.parseAs('1', $sce.ANY)()).toBe(1);
      expect($sce.parseAs('1', $sce.HTML)()).toBe(1);
      expect($sce.parseAs('1', 'UNDEFINED')()).toBe(1);
      expect($sce.parseAs('true')()).toBe(true);
      expect($sce.parseAs('false')()).toBe(false);
      expect($sce.parseAs('null')()).toBe(null);
      expect($sce.parseAs('undefined')()).toBe(undefined);
      expect($sce.parseAs('"string"')()).toBe("string");
    }));

    it('should NOT parse constant non-literals', inject(function($sce) {
      // Until there's a real world use case for this, we're disallowing
      // constant non-literals.  See $SceParseProvider.
      var exprFn = $sce.parseAs('1+1');
      expect(exprFn).toThrow();
    }));

    it('should NOT return untrusted values from expression function', inject(function($sce) {
      var exprFn = $sce.parseAs('foo', $sce.HTML);
      expect(function() {
        return exprFn({}, {'foo': true})
      }).toThrow(
          '[$sce:unsafe] Attempting to use an unsafe value in a safe context.');
    }));

    it('should NOT return trusted values of the wrong type from expression function', inject(function($sce) {
      var exprFn = $sce.parseAs('foo', $sce.HTML);
      expect(function() {
        return exprFn({}, {'foo': $sce.trustAs(123, $sce.JS)})
      }).toThrow(
          '[$sce:unsafe] Attempting to use an unsafe value in a safe context.');
    }));

    it('should return trusted values from expression function', inject(function($sce) {
      var exprFn = $sce.parseAs('foo', $sce.HTML);
      expect(exprFn({}, {'foo': $sce.trustAs('trustedValue', $sce.HTML)})).toBe('trustedValue');
    }));

    it('should support shorthand methods', inject(function($sce) {
      // Test shorthand parse methods.
      expect($sce.parseAsAny('1')()).toBe(1);
      expect($sce.parseAsHtml('1')()).toBe(1);
      // Test short trustAs methods.
      expect($sce.trustAsAny).toBeUndefined();
      expect($sce.parseAsAny('foo')({}, {'foo': $sce.trustAsHtml(1)})).toBe(1);
      expect(function() {
        // mismatched types.
        $sce.parseAsCss('foo')({}, {'foo': $sce.trustAsHtml(1)});
      }).toThrow(
          '[$sce:unsafe] Attempting to use an unsafe value in a safe context.');
    }));

  });

  describe('$sceDelegate resource url policies', function() {
    function runTest(cfg, testFn) {
      return function() {
        module(function($sceDelegateProvider) {
          if (cfg.whiteList !== undefined) {
            $sceDelegateProvider.resourceUrlWhitelist(cfg.whiteList);
          }
          if (cfg.blackList !== undefined) {
            $sceDelegateProvider.resourceUrlBlacklist(cfg.blackList);
          }
        });
        inject(testFn);
      }
    }

    it('should default to "self" which allows relative urls', runTest({}, function($sce, $document) {
        expect($sce.getAsTrustedResourceUrl('foo/bar')).toEqual('foo/bar');
    }));

    it('should reject everything when whitelist is empty', runTest(
      {
        whiteList: [],
        blackList: []
      }, function($sce) {
        expect(function() { $sce.getAsTrustedResourceUrl('#'); }).toThrow(
          '[$sce:isecrurl] Blocked loading resource from url not allowed by sceDelegate policy.  URL: #');
    }));

    it('should match against normalized urls', runTest(
      {
        whiteList: [/^foo$/],
        blackList: []
      }, function($sce) {
        expect(function() { $sce.getAsTrustedResourceUrl('foo'); }).toThrow(
          '[$sce:isecrurl] Blocked loading resource from url not allowed by sceDelegate policy.  URL: foo');
    }));

    it('should support custom regex', runTest(
      {
        whiteList: [/^http:\/\/example\.com.*/],
        blackList: []
      }, function($sce) {
        expect($sce.getAsTrustedResourceUrl('http://example.com/foo')).toEqual('http://example.com/foo');
        expect(function() { $sce.getAsTrustedResourceUrl('https://example.com/foo'); }).toThrow(
          '[$sce:isecrurl] Blocked loading resource from url not allowed by sceDelegate policy.  URL: https://example.com/foo');
    }));

    it('should support the special string "self" in whitelist', runTest(
      {
        whiteList: ['self'],
        blackList: []
      }, function($sce) {
        expect($sce.getAsTrustedResourceUrl('foo')).toEqual('foo');
    }));

    it('should support the special string "self" in blacklist', runTest(
      {
        whiteList: [/.*/],
        blackList: ['self']
      }, function($sce) {
        expect(function() { $sce.getAsTrustedResourceUrl('foo'); }).toThrow(
          '[$sce:isecrurl] Blocked loading resource from url not allowed by sceDelegate policy.  URL: foo');
    }));

    it('should have blacklist override the whitelist', runTest(
      {
        whiteList: ['self'],
        blackList: ['self']
      }, function($sce) {
        expect(function() { $sce.getAsTrustedResourceUrl('foo'); }).toThrow(
          '[$sce:isecrurl] Blocked loading resource from url not allowed by sceDelegate policy.  URL: foo');
    }));

    it('should support multiple items in both lists', runTest(
      {
        whiteList: [/^http:\/\/example.com\/1$/, /^http:\/\/example.com\/2$/, /^http:\/\/example.com\/3$/, 'self'],
        blackList: [/^http:\/\/example.com\/3$/, /open_redirect/],
      }, function($sce) {
        expect($sce.getAsTrustedResourceUrl('same_domain')).toEqual('same_domain');
        expect($sce.getAsTrustedResourceUrl('http://example.com/1')).toEqual('http://example.com/1');
        expect($sce.getAsTrustedResourceUrl('http://example.com/2')).toEqual('http://example.com/2');
        expect(function() { $sce.getAsTrustedResourceUrl('http://example.com/3'); }).toThrow(
          '[$sce:isecrurl] Blocked loading resource from url not allowed by sceDelegate policy.  URL: http://example.com/3');
        expect(function() { $sce.getAsTrustedResourceUrl('open_redirect'); }).toThrow(
          '[$sce:isecrurl] Blocked loading resource from url not allowed by sceDelegate policy.  URL: open_redirect');
    }));

  });
});

