'use strict';

var $sceMinError = minErr('$sce');

var SCE_CONTEXTS = {};
// The ANY context is used by code that optionally accepts $sce.trustAs() results.
// This is not a valid value for $sce.trustAs() so you can't create values for this context.
SCE_CONTEXTS.ANY = -1;
SCE_CONTEXTS.HTML = 1;
SCE_CONTEXTS.CSS = 2;
SCE_CONTEXTS.URL = 3;
// RESOURCE_URL is a subtype of URL used in contexts where a priviliged resource is sourced from a
// url.  (e.g. ng-include, script src)
SCE_CONTEXTS.RESOURCE_URL = 4;
SCE_CONTEXTS.JS = 5;


/**
 * @ngdoc service
 * @name ng.$sceDelegate
 * @function
 *
 * @description
 *
 * `$sceDelegate` is a service that is used by the `$sce` service to provide {@link ng.$sce Strict
 * Contextual Escaping (SCE)} services to AngularJS.
 *
 * Typically, you would configure or override the {@link ng.$sceDelegate $sceDelegate} instead of
 * the `$sce` service to customize the way Strict Contextual Escaping works in AngularJS.  This is
 * because, while the `$sce` provides numerous shorthand methods, etc., you really only need to
 * override 3 core functions (`trustAs`, `isTrusted` and `getAsTrusted`) to replace the way things
 * work because `$sce` delegates to `$sceDelegate` for these operations.
 *
 * Refer {@link ng.$sceDelegateProvider $sceDelegateProvider} to configure this service.
 *
 * The default instance of `$sceDelegate` should work out of the box with little pain.  While you
 * can override it complete to change the behavior of `$sce` completely, the common case would
 * involve configuring the {@link ng.$sceDelegateProvider $sceDelegateProvider} instead by setting
 * your own whitelists and blacklists for trusting URLs used for loading AngularJS resources such as
 * templates.  Refer {@link ng.$sceDelegateProvider#resourceUrlWhitelist
 * $sceDelegateProvider.resourceUrlWhitelist} and {@link
 * ng.$sceDelegateProvider#resourceUrlBlacklist $sceDelegateProvider.resourceUrlBlacklist}
 */

/**
 * @ngdoc object
 * @name ng.$sceDelegateProvider
 * @description
 *
 * The $sceDelegateProvider provider allows developers to configure the {@link ng.$sceDelegate
 * $sceDelegate} service.  This allows one to get/set the whitelists and blacklists used to ensure
 * that URLs used for sourcing Angular templates are safe.  Refer {@link
 * ng.$sceDelegateProvider#resourceUrlWhitelist $sceDelegateProvider.resourceUrlWhitelist} and
 * {@link ng.$sceDelegateProvider#resourceUrlBlacklist $sceDelegateProvider.resourceUrlBlacklist}
 *
 * Read more about {@link ng.$sce Strict Contextual Escaping (SCE)}.
 */

function $SceDelegateProvider() {
  this.SCE_CONTEXTS = SCE_CONTEXTS;

  // Resource URLs can also be trusted by policy.
  var resourceUrlWhitelist = ['self'],
      resourceUrlBlacklist = [];

  /**
   * @ngdoc function
   * @name ng.sceDelegateProvider#resourceUrlWhitelist
   * @methodOf ng.$sceDelegateProvider
   * @function
   *
   * @param {Array=} whitelist When provided, replaces the resourceUrlWhitelist with the value
   *     provided.  This must be an array.
   *
   *     Each element of this array must either be a regex or the special string `self`.
   *
   *     When a regex is used, it is matched against the normalized / absolute URL of the resource
   *     being tested.
   *
   *     The **special string** `self` can be used to match against all URLs of the same domain as the
   *     document with the same protocol (allows sourcing https resources from http documents.)
   *
   *     Please note that **an empty whitelist array will block all URLs**!
   *
   * @return {Array} the currently set whitelist array.
   *
   * The **default value** when no whitelist has been explicitly set is `['self']`.
   *
   * @description
   * Sets/Gets the whitelist of trusted resource URLs.
   */
  this.resourceUrlWhitelist = function (value) {
    if (arguments.length) {
      resourceUrlWhitelist = value;
    }
    return resourceUrlWhitelist;
  };

  /**
   * @ngdoc function
   * @name ng.sceDelegateProvider#resourceUrlBlacklist
   * @methodOf ng.$sceDelegateProvider
   * @function
   *
   * @param {Array=} blacklist When provided, replaces the resourceUrlBlacklist with the value
   *     provided.  This must be an array.
   *
   *     Each element of this array must either be a regex or the special string `self` (see
   *     `resourceUrlWhitelist` for meaning - it's only really useful there.)
   *
   *     When a regex is used, it is matched against the normalized / absolute URL of the resource
   *     being tested.
   *
   *     The typical usage for the blacklist is to **block open redirects** served by your domain as
   *     these would otherwise be trusted but actually return content from the redirected domain.
   *
   *     Finally, **the blacklist overrides the whitelist** and has the final say.
   *
   * @return {Array} the currently set blacklist array.
   *
   * The **default value** when no whitelist has been explicitly set is the empty array (i.e. there is
   * no blacklist.)
   *
   * @description
   * Sets/Gets the blacklist of trusted resource URLs.
   */

  this.resourceUrlBlacklist = function (value) {
    if (arguments.length) {
      resourceUrlBlacklist = value;
    }
    return resourceUrlBlacklist;
  };

  // Helper functions for matching resource urls by policy.
  function isCompatibleProtocol(documentProtocol, resourceProtocol) {
    return ((documentProtocol === resourceProtocol) ||
            (documentProtocol === "http:" && resourceProtocol === "https:"));
  }

  function isUrlReferenceToSameHost(documentLocation, urlParsingNode) {
    return ((documentLocation.hostname === urlParsingNode.hostname) &&
            isCompatibleProtocol(documentLocation.protocol, urlParsingNode.protocol));
  }

  function matchUrl(matcher, urlParsingNode, documentLocation) {
    if (matcher === 'self') {
      return isUrlReferenceToSameHost(documentLocation, urlParsingNode);
    } else {
      return !!urlParsingNode.href.match(matcher);
    }
  }

  function isResourceUrlAllowedByPolicy(urlParsingNode, url, documentLocation) {
    url = url.toString();
    urlParsingNode.setAttribute('href', url);
    if (msie) {
      // IE8-10 do not populate urlParsingNode.hostname, urlParsingNode.protocol, etc. if the url
      // assigned was not already normalized.  So we assign it again so that this will work.
      urlParsingNode.setAttribute('href', urlParsingNode.href);
    }
    // href property always returns normalized absolute url
    var i, n, matcher, allowed = false;
    // Ensure that at least item from the whitelist allows this url.
    for (i = 0, n = resourceUrlWhitelist.length; i < n; i++) {
      if (matchUrl(resourceUrlWhitelist[i], urlParsingNode, documentLocation)) {
        allowed = true;
        break;
      }
    }
    if (allowed) {
      // Ensure that no item from the blacklist blocked this url.
      for (i = 0, n = resourceUrlBlacklist.length; i < n; i++) {
        if (matchUrl(resourceUrlBlacklist[i], urlParsingNode, documentLocation)) {
          allowed = false;
          break;
        }
      }
    }
    return allowed;
  }

  this.$get = ['$log', '$exceptionHandler', '$document', function(
                $log,   $exceptionHandler,   $document) {

    // TODO(chirayu): Ensure that we're using the right document for contexts like IFRAMES, etc.
    var urlParsingNode = $document[0].createElement('a');

    function generateHolderType(base) {
      var holderType = function TrustedValueHolderType(trustedValue) {
        this.$$unwrapTrustedValue = function() {
          return trustedValue;
        };
      };
      if (base) {
        holderType.prototype = new base();
      }
      holderType.prototype.toString = function sceToString() {
        return this.$$unwrapTrustedValue().toString();
      }
      return holderType;
    }

    var trustedValueHolderBase = generateHolderType(),
        byType = {};

    byType[SCE_CONTEXTS.ANY] = trustedValueHolderBase;
    byType[SCE_CONTEXTS.HTML] = generateHolderType(trustedValueHolderBase);
    byType[SCE_CONTEXTS.CSS] = generateHolderType(trustedValueHolderBase);
    byType[SCE_CONTEXTS.URL] = generateHolderType(trustedValueHolderBase);
    byType[SCE_CONTEXTS.JS] = generateHolderType(trustedValueHolderBase);
    byType[SCE_CONTEXTS.RESOURCE_URL] = generateHolderType(byType[SCE_CONTEXTS.URL]);

    /**
     * @ngdoc method
     * @name ng.$sceDelegate#trustAs
     * @methodOf ng.$sceDelegate
     *
     * @description
     * Returns an object that is trusted by angular for use in specified strict
     * contextual escaping contexts (such as ng-html-bind-unsafe, ng-include, any src
     * attribute interpolation, any dom event binding attribute interpolation
     * such as for onclick,  etc.) that uses the provided value.
     * See {@link ng.$sce $sce} for enabling strict contextual escaping.
     *
     * @param {*} value The value that that should be considered trusted/safe.
     * @param {Number} type The kind of context in which this value is safe for use.  e.g. url,
     *   resource_url, html, js and css.
     * @returns {opaque} A value that can be used to stand in for the provided `value` in places
     * where Angular expects a $sce.trustAs() return value.
     */
    function trustAs(trustedValue, type) {
      var constructor = byType[type];
      if (type === SCE_CONTEXTS.ANY || !constructor) {
        throw $sceMinError('mistyped', 'Attempting to use a trusted value of one type as a different type.');
      }
      return new constructor(trustedValue);
    }

    /**
     * @ngdoc method
     * @name ng.$sceDelegate#isTrusted
     * @methodOf ng.$sceDelegate
     *
     * @description
     * Tests if a given value is considered safe for use in the queried context type.  This implies
     * that the value is the result of a prior {@link ng.$sceDelegate#trustAs `$sceDelegatetrust`} call
     * and that the queried type is a supertype of the type used in the {@link ng.$sceDelegate#trustAs
     * `$sceDelegate.trustAs`} creation call.
     *
     * @param {*} maybeTrusted The value that is to be tested.
     * @param {Number} type The enum value for the kind of context in which this value is tested to
     *   be safe for use.
     * @returns {boolean} True if the value is trusted/safe for use in the queried contexts.  False
     *   otherwise.
     */
    function isTrusted(maybeTrusted, type) {
      if (maybeTrusted === null || maybeTrusted === undefined) {
        return true;
      }
      var constructor = byType[type];
      if (constructor && maybeTrusted instanceof constructor) {
        return true;
      }
      var documentLocation = $document[0].location;
      if (type === SCE_CONTEXTS.RESOURCE_URL &&
          isResourceUrlAllowedByPolicy(urlParsingNode, maybeTrusted, documentLocation)) {
        return true;
      }
      return false;
    }

    /**
     * @ngdoc method
     * @name ng.$sceDelegate#getAsTrusted
     * @methodOf ng.$sceDelegate
     *
     * @description
     * Takes the result of a {@link ng.$sceDelegate#trustAs `$sceDelegatetrust`} call and returns the
     * originally supplied value if the queried context type is a supertype of the created type.  If
     * this condition isn't satisfied, throws an exception.
     *
     * @param {*} maybeTrusted The result of a prior {@link ng.$sceDelegate#trustAs `$sceDelegatetrust`} call.
     * @param {Number} type The kind of context in which this value is to be used.
     * @returns {*} The value the was originally provided to {@link ng.$sceDelegate#trustAs
     *     `$sceDelegate.trustAs`} if valid in this context.  Otherwise, throws an exception.
     */
    function getAsTrusted(maybeTrusted, type) {
      if (maybeTrusted === null || maybeTrusted === undefined) {
        return maybeTrusted;
      }
      var constructor = byType[type];
      if (constructor && maybeTrusted instanceof constructor) {
        return maybeTrusted.$$unwrapTrustedValue();
      }
      var documentLocation = $document[0].location;
      if (type === SCE_CONTEXTS.RESOURCE_URL) {
        if (isResourceUrlAllowedByPolicy(urlParsingNode, maybeTrusted, documentLocation)) {
          return maybeTrusted;
        } else {
            $exceptionHandler($sceMinError('isecrurl',
                'Blocked loading resource from url not allowed by sceDelegate policy.  URL: {0}', maybeTrusted.toString()));
            return;
        }
      }
      $exceptionHandler($sceMinError('unsafe', 'Attempting to use an unsafe value in a safe context.'));
    }

    return { trustAs: trustAs,
             isTrusted: isTrusted,
             getAsTrusted: getAsTrusted };
  }];
}


/**
 * @ngdoc object
 * @name ng.$sceProvider
 * @description
 *
 * The $sceProvider provider allows developers to configure the {@link ng.$sce $sce} service.
 * -   enable/disable Strict Contextual Escaping (SCE) in a module
 * -   override the default implementation with a custom delegate
 *
 * Read more about {@link ng.$sce Strict Contextual Escaping (SCE)}.
 */

/**
 * @ngdoc service
 * @name ng.$sce
 * @function
 *
 * @description
 *
 * `$sce` is a service that provides Strict Contextual Escaping services to AngularJS.
 *
 * # Strict Contextual Escaping
 *
 * Strict Contextual Escaping (SCE) is a mode in which AngularJS requires bindings in certain
 * contexts to result in a value that is marked as safe to use for that context One example of such
 * a context is binding arbitrary html controlled by the user via `ng-bind-html-unsafe`.  We refer
 * to these contexts as priviliged or SCE contexts.
 *
 * As of version 1.1.6/1.2, Angular ships with SCE enabled by default.
 *
 * Note:  When enabled (the default), IE8 in quirks mode is not supported.  In this mode, IE8 allows
 * one to execute arbitrary javascript by the use of the expression() syntax.  Refer
 * <http://blogs.msdn.com/b/ie/archive/2008/10/16/ending-expressions.aspx> to learn more about them.
 * You can ensure your document is in standards mode and not quirks mode by adding `<!doctype html>`
 * to the top of your HTML document.
 *
 * SCE assists in writing code in way that (a) is secure by default and (b) makes auditing for
 * security vulnerabilities such as XSS, clickjacking, etc. a lot easier.
 *
 * Here's an example of a binding in a priviliged context:
 *
 * <pre class="prettyprint">
 *     <input ng-model="userHtml">
 *     <div ng-bind-html-unsafe="{{userHtml}}">
 * </pre>
 *
 * Notice that `ng-bind-html-unsafe` is bound to `{{userHtml}}` controlled by the user.  With SCE
 * disabled, this application allows the user render arbitrary HTML into the DIV.
 * In a more realistic example, one may be rendering user comments, blog articles, etc. via
 * bindings.  (HTML is just one example of a context where rendering user controlled input creates
 * security vulnerabilities.)
 *
 * For the case of HTML, you might use a library, either on the client side, or on the server side,
 * to sanitize unsafe HTML before binding to the value and rendering it in the document.
 *
 * How would you ensure that every place that used these types of bindings was bound to a value that
 * was sanitized by your library (or returned as safe for rendering by your server?)  How can you
 * ensure that you didn't accidentally delete the line that sanitized the value, or renamed some
 * properties/fields and forgot to update the binding to the sanitized value?
 *
 * To be secure by default, you want to ensure that any such bindings are disallowed unless you can
 * determine that something explicitly says it's safe to use a value for binding in that
 * context.  You can then audit your code (a simple grep would do) to ensure that this is only done
 * for those values that you can easily tell are safe - because they were received from your server,
 * sanitized by your library, etc.  You can organize your codebase to help with this - perhaps
 * allowing only the files in a specific directory to do this.  Ensuring that the internal API
 * exposed by that code doesn't markup arbitrary values as safe then becomes a more manageable task.
 *
 * In the case of AngularJS' SCE service, one uses {@link ng.$sce#trustAs $sce.trustAs} (and shorthand
 * methods such as {@link ng.$sce#trustAsHtml $sce.trustAsHtml}, etc.) to obtain values that will be
 * accepted by SCE / priviliged contexts.
 *
 *
 * ## How does it work?
 *
 * In priviliged contexts, directives and code will bind to the result of {@link ng.$sce#getAsTrusted
 * $sce.getAsTrusted(value)} rather than to the value directly.  Directives use {@link
 * ng.$sce#parse $sce.parseAs} rather than `$parse` to watch attribute bindings, which performs the
 * {@link ng.$sce#getAsTrusted $sce.getAsTrusted} behind the scenes on non-constant literals.
 *
 * As an example, {@link ng.directive:ngBindHtmlUnsafe ngBindHtmlUnsafe} uses {@link
 * ng.$sce#parseHtml $sce.parseAsHtml(binding expression)}.  Here's the actual code (slightly
 * simplified):
 *
 * <pre class="prettyprint">
 *   var ngBindHtmlUnsafeDirective = ['$sce', function($sce) {
 *     return function(scope, element, attr) {
 *       scope.$watch($sce.parseAsHtml(attr.ngBindHtmlUnsafe), function(value) {
 *         element.html(value || '');
 *       });
 *     };
 *   }];
 * </pre>
 *
 * ## Impact on loading templates
 *
 * This applies both to the {@link ng.directive:ngInclude `ng-include`} directive as well as
 * `templateUrl`'s specified by {@link guide/directive directives}.
 *
 * By default, Angular only loads templates from the same domain and protocol as the application
 * document.  This is done by calling {@link ng.$sce#getAsTrustedResourceUrl
 * $sce.getAsTrustedResourceUrl} on the template URL.  To load templates from other domains and/or
 * protocols, you may either either {@link ng.$sceDelegateProvider#resourceUrlWhitelist whitelist
 * them} or {@link ng.$sce#trustAsResourceUrl wrap it} into a trusted value.
 *
 * *Please note*:
 * The browser's
 * {@link https://code.google.com/p/browsersec/wiki/Part2#Same-origin_policy_for_XMLHttpRequest
 * Same Origin Policy} and {@link http://www.w3.org/TR/cors/ Cross-Origin Resource Sharing (CORS)}
 * policy apply in addition to this and may further restrict whether the template is successfully
 * loaded.  This means that without the right CORS policy, loading templates from a different domain
 * won't work on all browsers.  Also, loading templates from `file://` URL does not work on some
 * browsers.
 *
 * ## This feels like too much overhead for the developer?
 *
 * It's important to remember that SCE only applies to interpolation expressions.
 *
 * If your expressions are constant literals, they're automatically trusted and you don't need to
 * call `$sce.trustAs` on them.  (e.g.
 * `<div ng-html-bind-unsafe="'<b>implicitly trusted</b>'"></div>`) just works.
 *
 * Additionally, `a[href]` and `img[src]` automatically sanitize their URLs and do not pass them
 * through {@link ng.$sce#getAsTrusted $sce.getAsTrusted}.  SCE doesn't play a role here.
 *
 * The included {@link ng.$sceDelegate $sceDelegate} comes with sane defaults to allow you to load
 * templates in `ng-include` from your application's domain without having to even know about SCE.
 * It blocks loading templates from other domains or loading templates over http from an https
 * served document.  You can change these by setting your own custom {@link
 * ng.$sceDelegateProvider#resourceUrlWhitelist whitelists} and {@link
 * ng.$sceDelegateProvider#resourceUrlBlacklist blacklists} for matching such URLs.
 *
 * This significantly reduces the overhead.  It is far easier to pay the small overhead and have an
 * application that's secure and can be audited to verify that with much more ease than bolting
 * security onto an application later.
 *
 * ## What trusted context types are supported?
 *
 * | Context        | Notes |
 * |================|================|
 * | `$sce.HTML`        | For HTML that's safe to that's safe to source into the application.  The {@link ng.directive:ngBindHtmlUnsafe ngBindHtmlUnsafe} directive requires bindings to pass {@link ng.$sce#isTrustedHtml} |
 * | `$sce.CSS`        | For CSS that's safe to source into the application.  Currently unused.  Feel free to use it in your own directives. |
 * | `$sce.URL`        | For URLs that are safe to follow as links.  Currently unused (`<a href=` sanitizes urls and does not require `$sce.isTrustedHtml` bindings. |
 * | `$sce.RESOURCE_URL`        | For URLs that are not only safe to follow as links, but whose contens are also safe to include in your application.  Examples include `ng-include`, `src` / `ngSrc` bindings for tags other than `IMG` (e.g. `IFRAME`, `OBJECT`, etc.)  <br><br>Note that `$sce.RESOURCE_URL` makes a stronger statement about the URL than `$sce.URL` does and therefore contexts requiring values trusted for `$sce.RESOURCE_URL` can be used anywhere that values trusted for `$sce.URL` are required. |
 * | `$sce.JS`        | For JavaScript that is safe to execute in your application's context.  Currently unused.  Feel free to use it in your own directives. |
 *
 * ## Show me an example.
 *
 *
 *
 * @example
 <example module="mySceApp">
  <file name="index.html">
    <div ng-controller="myAppController as myCtrl">
      <button ng-click="myCtrl.fetchUserComments()" id="fetchBtn">Fetch Comments</button>
      <div ng-show="myCtrl.errorMsg">Error: {{myCtrl.errorMsg}}</div>
      <div ng-repeat="userComment in myCtrl.userComments">
        <hr>
        <b>{{userComment.name}}</b>: 
        <span ng-bind-html-unsafe="userComment.htmlComment" class="htmlComment"></span>
      </div>
      <div ng-bind-html-unsafe="myCtrl.someHtml" id="someHtml"></div>
    </div>
  </file>

  <file name="script.js">
    // These types of functions would be in the data access layer of your application code.
    function fetchUserCommentsFromServer($http, $q, $templateCache, $sce) {
      var deferred = $q.defer();
      $http({method: "GET", url: "test_data.json", cache: $templateCache}).
        success(function(userComments, status) {
          // The comments coming from the server have been sanitized by the server and can be
          // trusted.
          angular.forEach(userComments, function(userComment) {
            userComment.htmlComment = $sce.trustAsHtml(userComment.htmlComment);
          });
          deferred.resolve(userComments);
        }).
        error(function (data, status) {
          deferred.reject("HTTP status code " + status + ": " + data);
        });
      return deferred.promise;
    };

    var mySceApp = angular.module('mySceApp', []);

    mySceApp.controller("myAppController", function myAppController($injector) {
      var self = this;

      self.someHtml = "This might have been any binding including an input element " +
                      "controlled by the user.";

      self.fetchUserComments = function() {
        $injector.invoke(fetchUserCommentsFromServer).then(
            function onSuccess(userComments) {
              self.errorMsg = null;
              self.userComments = userComments;
            },
            function onFailure(errorMsg) {
              self.errorMsg = errorMsg;
            });
      }
    });
  </file>

  <file name="test_data.json">
    [
      { "name": "Alice",
        "htmlComment": "Is <i>anyone</i> reading this?"
      },
      { "name": "Bob",
        "htmlComment": "<i>Yes!</i>  Am I the only other one?"
      }
    ]
  </file>

  <file name="scenario.js">
     describe('SCE doc demo', function() {
       it('should bind trusted values', function() {
         element('#fetchBtn').click();
         expect(element('.htmlComment').html()).toBe('Is <i>anyone</i> reading this?');
       });
       it('should NOT bind arbitrary values', function() {
         expect(element('#someHtml').html()).toBe('');
       });
    });
  </file>
 </example>
 *
 *
 *
 * ## Can I disable SCE completely?
 *
 * Yes, you can.  However, this is strongly discouraged.  SCE gives you a lot of security benefits
 * for little coding overhead.  It will be much harder to take an SCE disabled application and
 * either secure it on your own or enable SCE at a later stage.  It might make sense to disable SCE
 * for cases where you have a lot of existing code that was written before SCE was introduced and
 * you're migrating them a module at a time.
 *
 * That said, here's how you can completely disable SCE:
 *
 * <pre class="prettyprint">
 *   angular.module('myAppWithSceDisabledmyApp', []).config(function($sceProvider) {
 *     // Completely disable SCE.  For demonstration purposes only!
 *     // Do not use in new projects.
 *     $sceProvider.enabled(false);
 *   });
 * </pre>
 *
 */

function $SceProvider() {
  var enabled = true;

  /**
   * @ngdoc function
   * @name ng.sceProvider#enabled
   * @methodOf ng.$sceProvider
   * @function
   *
   * @param {Boolean=} If provided, then enables/disables SCE.
   * @return {Boolean} true if SCE is enabled, false otherwise.  
   *
   * @description
   * Enables/disables SCE and returns the current value.
   */
  this.enabled = function (value) {
    if (arguments.length) {
      enabled = !!value;
    }
    return enabled;
  };


  /* Default implementation for SCE.
   *
   * The API contract for the SCE delegate
   * -------------------------------------
   * The SCE delegate object must provide the following 3 methods:
   *
   * - trustAs(value, contextEnum)
   *     This method is used to tell the SCE service that the provided value is OK for using the the
   *     context specified by contextEnum.  It must return an object that will be accepted by
   *     getAsTrusted() for a compatible contextEnum and return this value.
   *
   * - isTrusted(value, contextEnum)
   *     This function should return true if the provided value is safe for use in the context
   *     specified by contextEnum and false otherwise.
   *
   * - getAsTrusted(value, contextEnum)
   *     This function should return the a value that is safe to use in the context specified by
   *     contextEnum or throw and exception otherwise.
   *
   * NOTE: This contract deliberately does NOT state that values returned by trustAs() must be opaque
   * or wrapped in some holder object.  That happens to be an implementation detail.  For instance,
   * an implementation could maintain a registry of all trusted objects by context.  In such a case,
   * trustAs() would return the same object that was passed in.  getAsTrusted() would return the same
   * object passed in if it was found in the registry under a compatible context or throw an
   * exception otherwise.  An implementation might only wrap values some of the time based on
   * some criteria.  getAsTrusted() might return a value and not throw an exception for special
   * constants or objects even if not wrapped.  All such implementations fulfill this contract.
   *
   *
   * A note on the inheritance model for SCE contexts
   * ------------------------------------------------
   * I've used inheritance and made RESOURCE_URL wrapped types a subtype of URL wrapped types.  This
   * is purely an implementation details.
   *
   * The contract is simply this:
   *
   *     isTrusted(value, $sce.RESOURCE_URL) => (implies) isTrusted(value, $sce.URL)
   * 
   * and that if getAsTrusted(value, $sce.RESOURCE_URL) returns a value, then
   * getAsTrusted(value, $sce.URL) will also return that same value.  Inheritance happens to capture
   * this in a natural way.  In some future, we may not use inheritance anymore.  That is OK because
   * no code outside of sce.js and sceSpecs.js would need to be aware of this detail.
   */

  this.$get = ['$parse', '$exceptionHandler', '$document', '$sceDelegate', function(
                $parse,   $exceptionHandler,   $document,   $sceDelegate) {
    // Prereq: Ensure that we're not running in IE8 quirks mode.  In that mode, IE allows
    // the "expression(javascript expression)" syntax which is insecure.
    if (enabled && msie) {
      var documentMode = $document[0].documentMode;
      if (documentMode !== undefined && documentMode < 8) {
        throw $sceMinError('iequirks',
          'Strict Contextual Escaping does not support Internet Explorer version < 10 in quirks ' +
          'mode.  You can fix this by adding the text <!doctype html> to the top of your HTML ' +
          'document.  See http://docs.angularjs.org/api/ng.$sce for more information.');
      }
    }

    var sce = angular.copy(SCE_CONTEXTS);

    /**
     * @ngdoc function
     * @name ng.sce#isEnabled
     * @methodOf ng.$sce
     * @function
     *
     * @return {Boolean} true if SCE is enabled, false otherwise.  If you want to set the value, you
     * have to do it at module config time on {@link ng.$sceProvider $sceProvider}.
     *
     * @description
     * Returns a boolean indicating if SCE is enabled.
     */
    sce.isEnabled = function () {
      return enabled;
    };
    sce.trustAs = $sceDelegate.trustAs;
    sce.isTrusted = $sceDelegate.isTrusted;
    sce.getAsTrusted = $sceDelegate.getAsTrusted;

    if (!enabled) {
      sce.trustAs = identity;
      sce.isTrusted = valueFn(true);
      sce.getAsTrusted = identity;
    }

    /**
     * @ngdoc method
     * @name ng.$sce#parse
     * @methodOf ng.$sce
     *
     * @description
     * Converts Angular {@link guide/expression expression} into a function.  This is like {@link
     * ng.$parse $parse} and is identical when the expression is a literal constant.  Otherwise, it
     * wraps the expression in a call to {@link ng.$sce#getAsTrusted $sce.getAsTrusted(*result*,
     * *type*)}
     *
     * @param {string} expression String expression to compile.
     * @param {Number} type The kind of SCE context in which this result will be used.
     * @returns {function(context, locals)} a function which represents the compiled expression:
     *
     *    * `context` – `{object}` – an object against which any expressions embedded in the strings
     *      are evaluated against (typically a scope object).
     *    * `locals` – `{object=}` – local variables context object, useful for overriding values in
     *      `context`.
     */
    sce.parseAs = function sceParse(expr, type) {
      var parsed = $parse(expr);
      if (parsed.literal && parsed.constant) {
        return parsed;
      } else {
        return function sceParseTrusted(self, locals) {
          return sce.getAsTrusted(parsed(self, locals), type);
        }
      }
    }

    /**
     * @ngdoc method
     * @name ng.$sce#trustAs
     * @methodOf ng.$sce
     *
     * @description
     * Delegates to {@link ng.$sceDelegate#trustAs `$sceDelegate.trustAs`}.  As such, returns an object
     * that is trusted by angular for use in specified strict contextual escaping contexts (such as
     * ng-html-bind-unsafe, ng-include, any src attribute interpolation, any dom event binding
     * attribute interpolation such as for onclick,  etc.) that uses the provided value.  See *
     * {@link ng.$sce $sce} for enabling strict contextual escaping.
     *
     * @param {*} value The value that that should be considered trusted/safe.
     * @param {Number} type The kind of context in which this value is safe for use.  e.g. url,
     *   resource_url, html, js and css.
     * @returns {opaque} A value that can be used to stand in for the provided `value` in places
     * where Angular expects a $sce.trustAs() return value.
     */

    /**
     * @ngdoc method
     * @name ng.$sce#trustAsHtml
     * @methodOf ng.$sce
     *
     * @description
     * Shorthand method.  `$sce.trustAsHtml(value)` → {@link ng.$sceDelegate#trustAs `$sceDelegate.trustAs(value, $sce.HTML)`}
     *
     * @param {*} value The value to trustAs.
     * @returns {opaque} An object that can be passed to {@link ng.$sce#getAsTrustedHtml
     *     $sce.getAsTrustedHtml(value)} to obtain the original value.  (Priviliged directives
     *     only accept expressions that are either literal constants or are the
     *     return value of {@link ng.$sce#trustAs $sce.trustAs}.)
     */

    /**
     * @ngdoc method
     * @name ng.$sce#trustAsCss
     * @methodOf ng.$sce
     *
     * @description
     * Shorthand method.  `$sce.trustAsCss(value)` → {@link ng.$sceDelegate#trustAs `$sceDelegate.trustAs(value, $sce.CSS)`}
     *
     * @param {*} value The value to trustAs.
     * @returns {opaque} An object that can be passed to {@link ng.$sce#getAsTrustedCss
     *     $sce.getAsTrustedCss(value)} to obtain the original value.  (Priviliged directives
     *     only accept expressions that are either literal constants or are the
     *     return value of {@link ng.$sce#trustAs $sce.trustAs}.)
     */

    /**
     * @ngdoc method
     * @name ng.$sce#trustAsUrl
     * @methodOf ng.$sce
     *
     * @description
     * Shorthand method.  `$sce.trustAsUrl(value)` → {@link ng.$sceDelegate#trustAs `$sceDelegate.trustAs(value, $sce.URL)`}
     *
     * @param {*} value The value to trustAs.
     * @returns {opaque} An object that can be passed to {@link ng.$sce#getAsTrustedUrl
     *     $sce.getAsTrustedUrl(value)} to obtain the original value.  (Priviliged directives
     *     only accept expressions that are either literal constants or are the
     *     return value of {@link ng.$sce#trustAs $sce.trustAs}.)
     */

    /**
     * @ngdoc method
     * @name ng.$sce#trustAsResourceUrl
     * @methodOf ng.$sce
     *
     * @description
     * Shorthand method.  `$sce.trustAsResourceUrl(value)` → {@link ng.$sceDelegate#trustAs `$sceDelegate.trustAs(value, $sce.RESOURCE_URL)`}
     *
     * @param {*} value The value to trustAs.
     * @returns {opaque} An object that can be passed to {@link ng.$sce#getAsTrustedResourceUrl
     *     $sce.getAsTrustedResourceUrl(value)} to obtain the original value.  (Priviliged directives
     *     only accept expressions that are either literal constants or are the return
     *     value of {@link ng.$sce#trustAs $sce.trustAs}.)
     */

    /**
     * @ngdoc method
     * @name ng.$sce#trustAsJs
     * @methodOf ng.$sce
     *
     * @description
     * Shorthand method.  `$sce.trustAsJs(value)` → {@link ng.$sceDelegate#trustAs `$sceDelegate.trustAs(value, $sce.JS)`}
     *
     * @param {*} value The value to trustAs.
     * @returns {opaque} An object that can be passed to {@link ng.$sce#getAsTrustedJs
     *     $sce.getAsTrustedJs(value)} to obtain the original value.  (Priviliged directives
     *     only accept expressions that are either literal constants or are the
     *     return value of {@link ng.$sce#trustAs $sce.trustAs}.)
     */

    /**
     * @ngdoc method
     * @name ng.$sce#isTrusted
     * @methodOf ng.$sce
     *
     * @description
     * Delegates to {@link ng.$sceDelegate#isTrusted `$sceDelegate.isTrusted`}.  As such, tests if a
     * given value is considered safe for use in the queried context type.  This implies that the
     * value is the result of a prior {@link ng.$sce#trustAs `$sce.trustAs`} call and that the queried
     * type is a supertype of the type used in the {@link ng.$sce#trustAs `$sce.trustAs`} creation call.
     *
     * @param {*} maybeTrusted The value that is to be tested.
     * @param {Number} type The enum value for the kind of context in which this value is tested to
     *   be safe for use.
     * @returns {boolean} True if the value is trusted/safe for use in the queried contexts.  False
     *   otherwise.
     */

    /**
     * @ngdoc method
     * @name ng.$sce#isTrustedHtml
     * @methodOf ng.$sce
     *
     * @description
     * Shorthand method.  `$sce.isTrustedHtml(value)` → {@link ng.$sceDelegate#isTrusted `$sceDelegate.isTrusted(value, $sce.HTML)`}
     *
     * @param {*} value The value to be tested.
     * @returns {boolean} True if the value is trusted/safe for use in the $sce.HTML context.  False
     *     otherwise.
     */

    /**
     * @ngdoc method
     * @name ng.$sce#isTrustedCss
     * @methodOf ng.$sce
     *
     * @description
     * Shorthand method.  `$sce.isTrustedCss(value)` → {@link ng.$sceDelegate#isTrusted `$sceDelegate.isTrusted(value, $sce.CSS)`}
     *
     * @param {*} value The value to be tested.
     * @returns {boolean} True if the value is trusted/safe for use in the $sce.CSS context.  False
     *     otherwise.
     */

    /**
     * @ngdoc method
     * @name ng.$sce#isTrustedUrl
     * @methodOf ng.$sce
     *
     * @description
     * Shorthand method.  `$sce.isTrustedUrl(value)` → {@link ng.$sceDelegate#isTrusted `$sceDelegate.isTrusted(value, $sce.URL)`}
     *
     * @param {*} value The value to be tested.
     * @returns {boolean} True if the value is trusted/safe for use in the $sce.URL context.  False
     *     otherwise.
     */

    /**
     * @ngdoc method
     * @name ng.$sce#isTrustedResourceUrl
     * @methodOf ng.$sce
     *
     * @description
     * Shorthand method.  `$sce.isTrustedResourceUrl(value)` → {@link ng.$sceDelegate#isTrusted `$sceDelegate.isTrusted(value, $sce.RESOURCE_URL)`}
     *
     * @param {*} value The value to be tested.
     * @returns {boolean} True if the value is trusted/safe for use in the $sce.RESOURCE_URL
     *     context.  False otherwise.
     */

    /**
     * @ngdoc method
     * @name ng.$sce#isTrustedJs
     * @methodOf ng.$sce
     *
     * @description
     * Shorthand method.  `$sce.isTrustedJs(value)` → {@link ng.$sceDelegate#isTrusted `$sceDelegate.isTrusted(value, $sce.JS)`}
     *
     * @param {*} value The value to be tested.
     * @returns {boolean} True if the value is trusted/safe for use in the $sce.JS context.  False
     *     otherwise.
     */

    /**
     * @ngdoc method
     * @name ng.$sce#getAsTrusted
     * @methodOf ng.$sce
     *
     * @description
     * Delegates to {@link ng.$sceDelegate#getAsTrusted `$sceDelegate.getAsTrusted`}.  As such, takes
     * the result of a {@link ng.$sce#trustAs `$sce.trustAs`}() call and returns the originally supplied
     * value if the queried context type is a supertype of the created type.  If this condition
     * isn't satisfied, throws an exception.
     *
     * @param {*} maybeTrusted The result of a prior {@link ng.$sce#trustAs `$sce.trustAs`} call.
     * @param {Number} type The kind of context in which this value is to be used.
     * @returns {*} The value the was originally provided to {@link ng.$sce#trustAs `$sce.trustAs`} if
     *     valid in this context.  Otherwise, throws an exception.
     */

    /**
     * @ngdoc method
     * @name ng.$sce#getAsTrustedHtml
     * @methodOf ng.$sce
     *
     * @description
     * Shorthand method.  `$sce.getAsTrustedHtml(value)` → {@link ng.$sceDelegate#getAsTrusted `$sceDelegate.getAsTrusted(value, $sce.HTML)`}
     *
     * @param {*} value The value to pass to `$sce.getAsTrusted`.
     * @returns {*} The return value of `$sce.getAsTrusted(value, $sce.HTML)`
     */

    /**
     * @ngdoc method
     * @name ng.$sce#getAsTrustedCss
     * @methodOf ng.$sce
     *
     * @description
     * Shorthand method.  `$sce.getAsTrustedCss(value)` → {@link ng.$sceDelegate#getAsTrusted `$sceDelegate.getAsTrusted(value, $sce.CSS)`}
     *
     * @param {*} value The value to pass to `$sce.getAsTrusted`.
     * @returns {*} The return value of `$sce.getAsTrusted(value, $sce.CSS)`
     */

    /**
     * @ngdoc method
     * @name ng.$sce#getAsTrustedUrl
     * @methodOf ng.$sce
     *
     * @description
     * Shorthand method.  `$sce.getAsTrustedUrl(value)` → {@link ng.$sceDelegate#getAsTrusted `$sceDelegate.getAsTrusted(value, $sce.URL)`}
     *
     * @param {*} value The value to pass to `$sce.getAsTrusted`.
     * @returns {*} The return value of `$sce.getAsTrusted(value, $sce.URL)`
     */

    /**
     * @ngdoc method
     * @name ng.$sce#getAsTrustedResourceUrl
     * @methodOf ng.$sce
     *
     * @description
     * Shorthand method.  `$sce.getAsTrustedResourceUrl(value)` → {@link ng.$sceDelegate#getAsTrusted `$sceDelegate.getAsTrusted(value, $sce.RESOURCE_URL)`}
     *
     * @param {*} value The value to pass to `$sceDelegate.getAsTrusted`.
     * @returns {*} The return value of `$sce.getAsTrusted(value, $sce.RESOURCE_URL)`
     */

    /**
     * @ngdoc method
     * @name ng.$sce#getAsTrustedJs
     * @methodOf ng.$sce
     *
     * @description
     * Shorthand method.  `$sce.getAsTrustedJs(value)` → {@link ng.$sceDelegate#getAsTrusted `$sceDelegate.getAsTrusted(value, $sce.JS)`}
     *
     * @param {*} value The value to pass to `$sce.getAsTrusted`.
     * @returns {*} The return value of `$sce.getAsTrusted(value, $sce.JS)`
     */

    /**
     * @ngdoc method
     * @name ng.$sce#parseHtml
     * @methodOf ng.$sce
     *
     * @description
     * Shorthand method.  `$sce.parseAsHtml(expression string)` → {@link ng.$sce#parse `$sce.parseAs(value, $sce.HTML)`}
     *
     * @param {string} expression String expression to compile.
     * @returns {function(context, locals)} a function which represents the compiled expression:
     *
     *    * `context` – `{object}` – an object against which any expressions embedded in the strings
     *      are evaluated against (typically a scope object).
     *    * `locals` – `{object=}` – local variables context object, useful for overriding values in
     *      `context`.
     */

    /**
     * @ngdoc method
     * @name ng.$sce#parseCss
     * @methodOf ng.$sce
     *
     * @description
     * Shorthand method.  `$sce.parseAsCss(value)` → {@link ng.$sce#parse `$sce.parseAs(value, $sce.CSS)`}
     *
     * @param {string} expression String expression to compile.
     * @returns {function(context, locals)} a function which represents the compiled expression:
     *
     *    * `context` – `{object}` – an object against which any expressions embedded in the strings
     *      are evaluated against (typically a scope object).
     *    * `locals` – `{object=}` – local variables context object, useful for overriding values in
     *      `context`.
     */

    /**
     * @ngdoc method
     * @name ng.$sce#parseUrl
     * @methodOf ng.$sce
     *
     * @description
     * Shorthand method.  `$sce.parseAsUrl(value)` → {@link ng.$sce#parse `$sce.parseAs(value, $sce.URL)`}
     *
     * @param {string} expression String expression to compile.
     * @returns {function(context, locals)} a function which represents the compiled expression:
     *
     *    * `context` – `{object}` – an object against which any expressions embedded in the strings
     *      are evaluated against (typically a scope object).
     *    * `locals` – `{object=}` – local variables context object, useful for overriding values in
     *      `context`.
     */

    /**
     * @ngdoc method
     * @name ng.$sce#parseResourceUrl
     * @methodOf ng.$sce
     *
     * @description
     * Shorthand method.  `$sce.parseAsResourceUrl(value)` → {@link ng.$sce#parse `$sce.parseAs(value, $sce.RESOURCE_URL)`}
     *
     * @param {string} expression String expression to compile.
     * @returns {function(context, locals)} a function which represents the compiled expression:
     *
     *    * `context` – `{object}` – an object against which any expressions embedded in the strings
     *      are evaluated against (typically a scope object).
     *    * `locals` – `{object=}` – local variables context object, useful for overriding values in
     *      `context`.
     */

    /**
     * @ngdoc method
     * @name ng.$sce#parseJs
     * @methodOf ng.$sce
     *
     * @description
     * Shorthand method.  `$sce.parseAsJs(value)` → {@link ng.$sce#parse `$sce.parseAs(value, $sce.JS)`}
     *
     * @param {string} expression String expression to compile.
     * @returns {function(context, locals)} a function which represents the compiled expression:
     *
     *    * `context` – `{object}` – an object against which any expressions embedded in the strings
     *      are evaluated against (typically a scope object).
     *    * `locals` – `{object=}` – local variables context object, useful for overriding values in
     *      `context`.
     */

    // Shorthand delegations.
    var parse = sce.parseAs,
        isTrusted = sce.isTrusted,
        getAsTrusted = sce.getAsTrusted,
        trustAs = sce.trustAs;

    angular.forEach(SCE_CONTEXTS, function (enumValue, name) {
      var lName = name.toLowerCase();
      sce[camelCase("parse_as_" + lName)] = function (expr) {
        return parse(expr, enumValue);
      }
      sce[camelCase("is_trusted_" + lName)] = function (value) {
        return isTrusted(value, enumValue);
      }
      sce[camelCase("get_as_trusted_" + lName)] = function (value) {
        return getAsTrusted(value, enumValue);
      }
      if (name != "ANY") {
        sce[camelCase("trust_as_" + lName)] = function (value) {
          return trustAs(value, enumValue);
        }
      }
    });

    return sce;
  }];
}
