// node_modules/hono/dist/compose.js
var compose = (middleware, onError, onNotFound) => {
  return (context, next) => {
    let index = -1;
    return dispatch(0);
    async function dispatch(i) {
      if (i <= index) {
        throw new Error("next() called multiple times");
      }
      index = i;
      let res;
      let isError = false;
      let handler;
      if (middleware[i]) {
        handler = middleware[i][0][0];
        context.req.routeIndex = i;
      } else {
        handler = i === middleware.length && next || void 0;
      }
      if (handler) {
        try {
          res = await handler(context, () => dispatch(i + 1));
        } catch (err) {
          if (err instanceof Error && onError) {
            context.error = err;
            res = await onError(err, context);
            isError = true;
          } else {
            throw err;
          }
        }
      } else {
        if (context.finalized === false && onNotFound) {
          res = await onNotFound(context);
        }
      }
      if (res && (context.finalized === false || isError)) {
        context.res = res;
      }
      return context;
    }
  };
};

// node_modules/hono/dist/request/constants.js
var GET_MATCH_RESULT = /* @__PURE__ */ Symbol();

// node_modules/hono/dist/utils/buffer.js
var bufferToFormData = (arrayBuffer, contentType) => {
  const response = new Response(arrayBuffer, {
    headers: {
      // Normalize the media type (case-insensitive) while keeping parameters like the boundary
      "Content-Type": contentType.replace(/^[^;]+/, (mediaType) => mediaType.toLowerCase())
    }
  });
  return response.formData();
};

// node_modules/hono/dist/utils/body.js
var isRawRequest = (request) => "headers" in request;
var parseBody = async (request, options = /* @__PURE__ */ Object.create(null)) => {
  const { all = false, dot = false } = options;
  const headers = isRawRequest(request) ? request.headers : request.raw.headers;
  const contentType = headers.get("Content-Type");
  const mediaType = contentType?.split(";")[0].trim().toLowerCase();
  if (mediaType === "multipart/form-data" || mediaType === "application/x-www-form-urlencoded") {
    return parseFormData(request, { all, dot });
  }
  return {};
};
async function parseFormData(request, options) {
  if (!isRawRequest(request) && request.bodyCache.formData) {
    return convertFormDataToBodyData(
      await request.bodyCache.formData,
      options
    );
  }
  const headers = isRawRequest(request) ? request.headers : request.raw.headers;
  const arrayBuffer = await request.arrayBuffer();
  const formDataPromise = bufferToFormData(arrayBuffer, headers.get("Content-Type") || "");
  if (!isRawRequest(request)) {
    request.bodyCache.formData = formDataPromise;
  }
  const formData = await formDataPromise;
  if (formData) {
    return convertFormDataToBodyData(formData, options);
  }
  return {};
}
function convertFormDataToBodyData(formData, options) {
  const form = /* @__PURE__ */ Object.create(null);
  formData.forEach((value, key) => {
    const shouldParseAllValues = options.all || key.endsWith("[]");
    if (!shouldParseAllValues) {
      form[key] = value;
    } else {
      handleParsingAllValues(form, key, value);
    }
  });
  if (options.dot) {
    Object.entries(form).forEach(([key, value]) => {
      const shouldParseDotValues = key.includes(".");
      if (shouldParseDotValues) {
        handleParsingNestedValues(form, key, value);
        delete form[key];
      }
    });
  }
  return form;
}
var handleParsingAllValues = (form, key, value) => {
  if (form[key] !== void 0) {
    if (Array.isArray(form[key])) {
      ;
      form[key].push(value);
    } else {
      form[key] = [form[key], value];
    }
  } else {
    if (!key.endsWith("[]")) {
      form[key] = value;
    } else {
      form[key] = [value];
    }
  }
};
var handleParsingNestedValues = (form, key, value) => {
  if (/(?:^|\.)__proto__\./.test(key)) {
    return;
  }
  let nestedForm = form;
  const keys = key.split(".");
  keys.forEach((key2, index) => {
    if (index === keys.length - 1) {
      nestedForm[key2] = value;
    } else {
      if (!nestedForm[key2] || typeof nestedForm[key2] !== "object" || Array.isArray(nestedForm[key2]) || nestedForm[key2] instanceof File) {
        nestedForm[key2] = /* @__PURE__ */ Object.create(null);
      }
      nestedForm = nestedForm[key2];
    }
  });
};

// node_modules/hono/dist/utils/url.js
var splitPath = (path) => {
  const paths = path.split("/");
  if (paths[0] === "") {
    paths.shift();
  }
  return paths;
};
var splitRoutingPath = (routePath) => {
  const { groups, path } = extractGroupsFromPath(routePath);
  const paths = splitPath(path);
  return replaceGroupMarks(paths, groups);
};
var extractGroupsFromPath = (path) => {
  const groups = [];
  path = path.replace(/\{[^}]+\}/g, (match2, index) => {
    const mark = `@${index}`;
    groups.push([mark, match2]);
    return mark;
  });
  return { groups, path };
};
var replaceGroupMarks = (paths, groups) => {
  for (let i = groups.length - 1; i >= 0; i--) {
    const [mark] = groups[i];
    for (let j = paths.length - 1; j >= 0; j--) {
      if (paths[j].includes(mark)) {
        paths[j] = paths[j].replace(mark, groups[i][1]);
        break;
      }
    }
  }
  return paths;
};
var patternCache = {};
var getPattern = (label, next) => {
  if (label === "*") {
    return "*";
  }
  const match2 = label.match(/^\:([^\{\}]+)(?:\{(.+)\})?$/);
  if (match2) {
    const cacheKey = `${label}#${next}`;
    if (!patternCache[cacheKey]) {
      if (match2[2]) {
        patternCache[cacheKey] = next && next[0] !== ":" && next[0] !== "*" ? [cacheKey, match2[1], new RegExp(`^${match2[2]}(?=/${next})`)] : [label, match2[1], new RegExp(`^${match2[2]}$`)];
      } else {
        patternCache[cacheKey] = [label, match2[1], true];
      }
    }
    return patternCache[cacheKey];
  }
  return null;
};
var tryDecode = (str, decoder) => {
  try {
    return decoder(str);
  } catch {
    return str.replace(/(?:%[0-9A-Fa-f]{2})+/g, (match2) => {
      try {
        return decoder(match2);
      } catch {
        return match2;
      }
    });
  }
};
var tryDecodeURI = (str) => tryDecode(str, decodeURI);
var getPath = (request) => {
  const url = request.url;
  const start = url.indexOf("/", url.indexOf(":") + 4);
  let i = start;
  for (; i < url.length; i++) {
    const charCode = url.charCodeAt(i);
    if (charCode === 37) {
      const queryIndex = url.indexOf("?", i);
      const hashIndex = url.indexOf("#", i);
      const end = queryIndex === -1 ? hashIndex === -1 ? void 0 : hashIndex : hashIndex === -1 ? queryIndex : Math.min(queryIndex, hashIndex);
      const path = url.slice(start, end);
      return tryDecodeURI(path.includes("%25") ? path.replace(/%25/g, "%2525") : path);
    } else if (charCode === 63 || charCode === 35) {
      break;
    }
  }
  return url.slice(start, i);
};
var getPathNoStrict = (request) => {
  const result = getPath(request);
  return result.length > 1 && result.at(-1) === "/" ? result.slice(0, -1) : result;
};
var mergePath = (base, sub, ...rest) => {
  if (rest.length) {
    sub = mergePath(sub, ...rest);
  }
  return `${base?.[0] === "/" ? "" : "/"}${base}${sub === "/" ? "" : `${base?.at(-1) === "/" ? "" : "/"}${sub?.[0] === "/" ? sub.slice(1) : sub}`}`;
};
var checkOptionalParameter = (path) => {
  if (path.charCodeAt(path.length - 1) !== 63 || !path.includes(":")) {
    return null;
  }
  const segments = path.split("/");
  const results = [];
  let basePath = "";
  segments.forEach((segment) => {
    if (segment !== "" && !/\:/.test(segment)) {
      basePath += "/" + segment;
    } else if (/\:/.test(segment)) {
      if (segment.charCodeAt(segment.length - 1) === 63) {
        if (results.length === 0 && basePath === "") {
          results.push("/");
        } else {
          results.push(basePath);
        }
        const optionalSegment = segment.slice(0, -1);
        basePath += "/" + optionalSegment;
        results.push(basePath);
      } else {
        basePath += "/" + segment;
      }
    }
  });
  return results.filter((v, i, a) => a.indexOf(v) === i);
};
var tryDecodeURIComponent = (str) => str.indexOf("%") !== -1 ? tryDecode(str, decodeURIComponent_) : str;
var _decodeURI = (value) => {
  if (value.indexOf("+") !== -1) {
    value = value.replace(/\+/g, " ");
  }
  return tryDecodeURIComponent(value);
};
var _getQueryParam = (url, key, multiple) => {
  let encoded;
  if (!multiple && key && key.indexOf("%") === -1 && key.indexOf("+") === -1) {
    let keyIndex2 = url.indexOf("?", 8);
    if (keyIndex2 === -1) {
      return void 0;
    }
    if (!url.startsWith(key, keyIndex2 + 1)) {
      keyIndex2 = url.indexOf(`&${key}`, keyIndex2 + 1);
    }
    while (keyIndex2 !== -1) {
      const trailingKeyCode = url.charCodeAt(keyIndex2 + key.length + 1);
      if (trailingKeyCode === 61) {
        const valueIndex = keyIndex2 + key.length + 2;
        const endIndex = url.indexOf("&", valueIndex);
        return _decodeURI(url.slice(valueIndex, endIndex === -1 ? void 0 : endIndex));
      } else if (trailingKeyCode == 38 || isNaN(trailingKeyCode)) {
        return "";
      }
      keyIndex2 = url.indexOf(`&${key}`, keyIndex2 + 1);
    }
    encoded = /[%+]/.test(url);
    if (!encoded) {
      return void 0;
    }
  }
  const results = /* @__PURE__ */ Object.create(null);
  encoded ??= /[%+]/.test(url);
  let keyIndex = url.indexOf("?", 8);
  while (keyIndex !== -1) {
    const nextKeyIndex = url.indexOf("&", keyIndex + 1);
    let valueIndex = url.indexOf("=", keyIndex);
    if (valueIndex > nextKeyIndex && nextKeyIndex !== -1) {
      valueIndex = -1;
    }
    let name = url.slice(
      keyIndex + 1,
      valueIndex === -1 ? nextKeyIndex === -1 ? void 0 : nextKeyIndex : valueIndex
    );
    if (encoded) {
      name = _decodeURI(name);
    }
    keyIndex = nextKeyIndex;
    if (name === "") {
      continue;
    }
    let value;
    if (valueIndex === -1) {
      value = "";
    } else {
      value = url.slice(valueIndex + 1, nextKeyIndex === -1 ? void 0 : nextKeyIndex);
      if (encoded) {
        value = _decodeURI(value);
      }
    }
    if (multiple) {
      if (!(results[name] && Array.isArray(results[name]))) {
        results[name] = [];
      }
      ;
      results[name].push(value);
    } else {
      results[name] ??= value;
    }
  }
  return key ? results[key] : results;
};
var getQueryParam = _getQueryParam;
var getQueryParams = (url, key) => {
  return _getQueryParam(url, key, true);
};
var decodeURIComponent_ = decodeURIComponent;

// node_modules/hono/dist/request.js
var HonoRequest = class {
  /**
   * `.raw` can get the raw Request object.
   *
   * @see {@link https://hono.dev/docs/api/request#raw}
   *
   * @example
   * ```ts
   * // For Cloudflare Workers
   * app.post('/', async (c) => {
   *   const metadata = c.req.raw.cf?.hostMetadata?
   *   ...
   * })
   * ```
   */
  raw;
  #validatedData;
  // Short name of validatedData
  #matchResult;
  routeIndex = 0;
  /**
   * `.path` can get the pathname of the request.
   *
   * @see {@link https://hono.dev/docs/api/request#path}
   *
   * @example
   * ```ts
   * app.get('/about/me', (c) => {
   *   const pathname = c.req.path // `/about/me`
   * })
   * ```
   */
  path;
  bodyCache = {};
  constructor(request, path = "/", matchResult = [[]]) {
    this.raw = request;
    this.path = path;
    this.#matchResult = matchResult;
  }
  param(key) {
    return key ? this.#getDecodedParam(key) : this.#getAllDecodedParams();
  }
  #getDecodedParam(key) {
    const paramKey = this.#matchResult[0][this.routeIndex][1][key];
    const param = this.#getParamValue(paramKey);
    return param && tryDecodeURIComponent(param);
  }
  #getAllDecodedParams() {
    const decoded = {};
    const keys = Object.keys(this.#matchResult[0][this.routeIndex][1]);
    for (const key of keys) {
      const value = this.#getParamValue(this.#matchResult[0][this.routeIndex][1][key]);
      if (value !== void 0) {
        decoded[key] = tryDecodeURIComponent(value);
      }
    }
    return decoded;
  }
  #getParamValue(paramKey) {
    return this.#matchResult[1] ? this.#matchResult[1][paramKey] : paramKey;
  }
  query(key) {
    return getQueryParam(this.url, key);
  }
  queries(key) {
    return getQueryParams(this.url, key);
  }
  header(name) {
    if (name) {
      return this.raw.headers.get(name) ?? void 0;
    }
    const headerData = /* @__PURE__ */ Object.create(null);
    this.raw.headers.forEach((value, key) => {
      headerData[key] = value;
    });
    return headerData;
  }
  async parseBody(options) {
    return parseBody(this, options);
  }
  #cachedBody = (key) => {
    const { bodyCache, raw: raw2 } = this;
    const cachedBody = bodyCache[key];
    if (cachedBody) {
      return cachedBody;
    }
    for (const anyCachedKey in bodyCache) {
      return bodyCache[anyCachedKey].then((body) => {
        if (anyCachedKey === "json") {
          body = JSON.stringify(body);
        }
        return new Response(body)[key]();
      });
    }
    return bodyCache[key] = raw2[key]();
  };
  /**
   * `.json()` can parse Request body of type `application/json`
   *
   * @see {@link https://hono.dev/docs/api/request#json}
   *
   * @example
   * ```ts
   * app.post('/entry', async (c) => {
   *   const body = await c.req.json()
   * })
   * ```
   */
  json() {
    return this.#cachedBody("text").then((text) => JSON.parse(text));
  }
  /**
   * `.text()` can parse Request body of type `text/plain`
   *
   * @see {@link https://hono.dev/docs/api/request#text}
   *
   * @example
   * ```ts
   * app.post('/entry', async (c) => {
   *   const body = await c.req.text()
   * })
   * ```
   */
  text() {
    return this.#cachedBody("text");
  }
  /**
   * `.arrayBuffer()` parse Request body as an `ArrayBuffer`
   *
   * @see {@link https://hono.dev/docs/api/request#arraybuffer}
   *
   * @example
   * ```ts
   * app.post('/entry', async (c) => {
   *   const body = await c.req.arrayBuffer()
   * })
   * ```
   */
  arrayBuffer() {
    return this.#cachedBody("arrayBuffer");
  }
  /**
   * `.bytes()` parses the request body as a `Uint8Array`.
   *
   * @see {@link https://hono.dev/docs/api/request#bytes}
   *
   * @example
   * ```ts
   * app.post('/entry', async (c) => {
   *   const body = await c.req.bytes()
   * })
   * ```
   */
  bytes() {
    return this.#cachedBody("arrayBuffer").then((buffer) => new Uint8Array(buffer));
  }
  /**
   * Parses the request body as a `Blob`.
   * @example
   * ```ts
   * app.post('/entry', async (c) => {
   *   const body = await c.req.blob();
   * });
   * ```
   * @see https://hono.dev/docs/api/request#blob
   */
  blob() {
    return this.#cachedBody("blob");
  }
  /**
   * Parses the request body as `FormData`.
   * @example
   * ```ts
   * app.post('/entry', async (c) => {
   *   const body = await c.req.formData();
   * });
   * ```
   * @see https://hono.dev/docs/api/request#formdata
   */
  formData() {
    return this.#cachedBody("formData");
  }
  /**
   * Adds validated data to the request.
   *
   * @param target - The target of the validation.
   * @param data - The validated data to add.
   */
  addValidatedData(target, data) {
    ;
    (this.#validatedData ??= {})[target] = data;
  }
  valid(target) {
    return this.#validatedData?.[target];
  }
  /**
   * `.url()` can get the request url strings.
   *
   * @see {@link https://hono.dev/docs/api/request#url}
   *
   * @example
   * ```ts
   * app.get('/about/me', (c) => {
   *   const url = c.req.url // `http://localhost:8787/about/me`
   *   ...
   * })
   * ```
   */
  get url() {
    return this.raw.url;
  }
  /**
   * `.method()` can get the method name of the request.
   *
   * @see {@link https://hono.dev/docs/api/request#method}
   *
   * @example
   * ```ts
   * app.get('/about/me', (c) => {
   *   const method = c.req.method // `GET`
   * })
   * ```
   */
  get method() {
    return this.raw.method;
  }
  get [GET_MATCH_RESULT]() {
    return this.#matchResult;
  }
  /**
   * `.matchedRoutes()` can return a matched route in the handler
   *
   * @deprecated
   *
   * Use matchedRoutes helper defined in "hono/route" instead.
   *
   * @see {@link https://hono.dev/docs/api/request#matchedroutes}
   *
   * @example
   * ```ts
   * app.use('*', async function logger(c, next) {
   *   await next()
   *   c.req.matchedRoutes.forEach(({ handler, method, path }, i) => {
   *     const name = handler.name || (handler.length < 2 ? '[handler]' : '[middleware]')
   *     console.log(
   *       method,
   *       ' ',
   *       path,
   *       ' '.repeat(Math.max(10 - path.length, 0)),
   *       name,
   *       i === c.req.routeIndex ? '<- respond from here' : ''
   *     )
   *   })
   * })
   * ```
   */
  get matchedRoutes() {
    return this.#matchResult[0].map(([[, route]]) => route);
  }
  /**
   * `routePath()` can retrieve the path registered within the handler
   *
   * @deprecated
   *
   * Use routePath helper defined in "hono/route" instead.
   *
   * @see {@link https://hono.dev/docs/api/request#routepath}
   *
   * @example
   * ```ts
   * app.get('/posts/:id', (c) => {
   *   return c.json({ path: c.req.routePath })
   * })
   * ```
   */
  get routePath() {
    return this.#matchResult[0].map(([[, route]]) => route)[this.routeIndex].path;
  }
};

// node_modules/hono/dist/utils/html.js
var HtmlEscapedCallbackPhase = {
  Stringify: 1,
  BeforeStream: 2,
  Stream: 3
};
var raw = (value, callbacks) => {
  const escapedString = new String(value);
  escapedString.isEscaped = true;
  escapedString.callbacks = callbacks;
  return escapedString;
};
var resolveCallback = async (str, phase, preserveCallbacks, context, buffer) => {
  if (typeof str === "object" && !(str instanceof String)) {
    if (!(str instanceof Promise)) {
      str = str.toString();
    }
    if (str instanceof Promise) {
      str = await str;
    }
  }
  const callbacks = str.callbacks;
  if (!callbacks?.length) {
    return Promise.resolve(str);
  }
  if (buffer) {
    buffer[0] += str;
  } else {
    buffer = [str];
  }
  const resStr = Promise.all(callbacks.map((c) => c({ phase, buffer, context }))).then(
    (res) => Promise.all(
      res.filter(Boolean).map((str2) => resolveCallback(str2, phase, false, context, buffer))
    ).then(() => buffer[0])
  );
  if (preserveCallbacks) {
    return raw(await resStr, callbacks);
  } else {
    return resStr;
  }
};

// node_modules/hono/dist/context.js
var TEXT_PLAIN = "text/plain; charset=UTF-8";
var setDefaultContentType = (contentType, headers) => {
  return {
    "Content-Type": contentType,
    ...headers
  };
};
var createResponseInstance = (body, init) => new Response(body, init);
var Context = class {
  #rawRequest;
  #req;
  /**
   * `.env` can get bindings (environment variables, secrets, KV namespaces, D1 database, R2 bucket etc.) in Cloudflare Workers.
   *
   * @see {@link https://hono.dev/docs/api/context#env}
   *
   * @example
   * ```ts
   * // Environment object for Cloudflare Workers
   * app.get('*', async c => {
   *   const counter = c.env.COUNTER
   * })
   * ```
   */
  env = {};
  #var;
  finalized = false;
  /**
   * `.error` can get the error object from the middleware if the Handler throws an error.
   *
   * @see {@link https://hono.dev/docs/api/context#error}
   *
   * @example
   * ```ts
   * app.use('*', async (c, next) => {
   *   await next()
   *   if (c.error) {
   *     // do something...
   *   }
   * })
   * ```
   */
  error;
  #status;
  #executionCtx;
  #res;
  #layout;
  #renderer;
  #notFoundHandler;
  #preparedHeaders;
  #matchResult;
  #path;
  /**
   * Creates an instance of the Context class.
   *
   * @param req - The Request object.
   * @param options - Optional configuration options for the context.
   */
  constructor(req, options) {
    this.#rawRequest = req;
    if (options) {
      this.#executionCtx = options.executionCtx;
      this.env = options.env;
      this.#notFoundHandler = options.notFoundHandler;
      this.#path = options.path;
      this.#matchResult = options.matchResult;
    }
  }
  /**
   * `.req` is the instance of {@link HonoRequest}.
   */
  get req() {
    this.#req ??= new HonoRequest(this.#rawRequest, this.#path, this.#matchResult);
    return this.#req;
  }
  /**
   * @see {@link https://hono.dev/docs/api/context#event}
   * The FetchEvent associated with the current request.
   *
   * @throws Will throw an error if the context does not have a FetchEvent.
   */
  get event() {
    if (this.#executionCtx && "respondWith" in this.#executionCtx) {
      return this.#executionCtx;
    } else {
      throw Error("This context has no FetchEvent");
    }
  }
  /**
   * @see {@link https://hono.dev/docs/api/context#executionctx}
   * The ExecutionContext associated with the current request.
   *
   * @throws Will throw an error if the context does not have an ExecutionContext.
   */
  get executionCtx() {
    if (this.#executionCtx) {
      return this.#executionCtx;
    } else {
      throw Error("This context has no ExecutionContext");
    }
  }
  /**
   * @see {@link https://hono.dev/docs/api/context#res}
   * The Response object for the current request.
   */
  get res() {
    return this.#res ||= createResponseInstance(null, {
      headers: this.#preparedHeaders ??= new Headers()
    });
  }
  /**
   * Sets the Response object for the current request.
   *
   * @param _res - The Response object to set.
   */
  set res(_res) {
    if (this.#res && _res) {
      _res = createResponseInstance(_res.body, _res);
      for (const [k, v] of this.#res.headers.entries()) {
        if (k === "content-type") {
          continue;
        }
        if (k === "set-cookie") {
          const cookies = this.#res.headers.getSetCookie();
          _res.headers.delete("set-cookie");
          for (const cookie of cookies) {
            _res.headers.append("set-cookie", cookie);
          }
        } else {
          _res.headers.set(k, v);
        }
      }
    }
    this.#res = _res;
    this.finalized = true;
  }
  /**
   * `.render()` can create a response within a layout.
   *
   * @see {@link https://hono.dev/docs/api/context#render-setrenderer}
   *
   * @example
   * ```ts
   * app.get('/', (c) => {
   *   return c.render('Hello!')
   * })
   * ```
   */
  render = (...args) => {
    this.#renderer ??= (content) => this.html(content);
    return this.#renderer(...args);
  };
  /**
   * Sets the layout for the response.
   *
   * @param layout - The layout to set.
   * @returns The layout function.
   */
  setLayout = (layout2) => this.#layout = layout2;
  /**
   * Gets the current layout for the response.
   *
   * @returns The current layout function.
   */
  getLayout = () => this.#layout;
  /**
   * `.setRenderer()` can set the layout in the custom middleware.
   *
   * @see {@link https://hono.dev/docs/api/context#render-setrenderer}
   *
   * @example
   * ```tsx
   * app.use('*', async (c, next) => {
   *   c.setRenderer((content) => {
   *     return c.html(
   *       <html>
   *         <body>
   *           <p>{content}</p>
   *         </body>
   *       </html>
   *     )
   *   })
   *   await next()
   * })
   * ```
   */
  setRenderer = (renderer) => {
    this.#renderer = renderer;
  };
  /**
   * `.header()` can set headers.
   *
   * @see {@link https://hono.dev/docs/api/context#header}
   *
   * @example
   * ```ts
   * app.get('/welcome', (c) => {
   *   // Set headers
   *   c.header('X-Message', 'Hello!')
   *   c.header('Content-Type', 'text/plain')
   *
   *   // Append multiple headers using the append option (e.g. Vary)
   *   c.header('Vary', 'Accept-Encoding', { append: true })
   *   c.header('Vary', 'User-Agent', { append: true })
   *
   *   return c.body('Thank you for coming')
   * })
   * ```
   */
  header = (name, value, options) => {
    if (this.finalized) {
      this.#res = createResponseInstance(this.#res.body, this.#res);
    }
    const headers = this.#res ? this.#res.headers : this.#preparedHeaders ??= new Headers();
    if (value === void 0) {
      headers.delete(name);
    } else if (options?.append) {
      headers.append(name, value);
    } else {
      headers.set(name, value);
    }
  };
  status = (status) => {
    this.#status = status;
  };
  /**
   * `.set()` can set the value specified by the key.
   *
   * @see {@link https://hono.dev/docs/api/context#set-get}
   *
   * @example
   * ```ts
   * app.use('*', async (c, next) => {
   *   c.set('message', 'Hono is hot!!')
   *   await next()
   * })
   * ```
   */
  set = (key, value) => {
    this.#var ??= /* @__PURE__ */ new Map();
    this.#var.set(key, value);
  };
  /**
   * `.get()` can use the value specified by the key.
   *
   * @see {@link https://hono.dev/docs/api/context#set-get}
   *
   * @example
   * ```ts
   * app.get('/', (c) => {
   *   const message = c.get('message')
   *   return c.text(`The message is "${message}"`)
   * })
   * ```
   */
  get = (key) => {
    return this.#var ? this.#var.get(key) : void 0;
  };
  /**
   * `.var` can access the value of a variable.
   *
   * @see {@link https://hono.dev/docs/api/context#var}
   *
   * @example
   * ```ts
   * const result = c.var.client.oneMethod()
   * ```
   */
  // c.var.propName is a read-only
  get var() {
    if (!this.#var) {
      return {};
    }
    return Object.fromEntries(this.#var);
  }
  #newResponse(data, arg, headers) {
    let responseHeaders = this.#res ? new Headers(this.#res.headers) : this.#preparedHeaders;
    if (typeof arg === "object" && arg.headers) {
      responseHeaders ??= new Headers();
      for (const [key, value] of new Headers(arg.headers)) {
        if (key === "set-cookie") {
          responseHeaders.append(key, value);
        } else {
          responseHeaders.set(key, value);
        }
      }
    }
    if (headers) {
      if (!responseHeaders) {
        let count = 0;
        for (const k in headers) {
          if (++count > 1 || typeof headers[k] !== "string") {
            responseHeaders = new Headers();
            break;
          }
        }
      }
      if (responseHeaders) {
        for (const k in headers) {
          const v = headers[k];
          if (typeof v === "string") {
            responseHeaders.set(k, v);
          } else {
            responseHeaders.delete(k);
            for (const v2 of v) {
              responseHeaders.append(k, v2);
            }
          }
        }
      }
    }
    const status = typeof arg === "number" ? arg : arg?.status ?? this.#status;
    return createResponseInstance(data, {
      status,
      headers: responseHeaders ?? headers
    });
  }
  newResponse = (...args) => this.#newResponse(...args);
  /**
   * `.body()` can return the HTTP response.
   * You can set headers with `.header()` and set HTTP status code with `.status`.
   * This can also be set in `.text()`, `.json()` and so on.
   *
   * @see {@link https://hono.dev/docs/api/context#body}
   *
   * @example
   * ```ts
   * app.get('/welcome', (c) => {
   *   // Set headers
   *   c.header('X-Message', 'Hello!')
   *   c.header('Content-Type', 'text/plain')
   *   // Set HTTP status code
   *   c.status(201)
   *
   *   // Return the response body
   *   return c.body('Thank you for coming')
   * })
   * ```
   */
  body = (data, arg, headers) => this.#newResponse(data, arg, headers);
  /**
   * `.text()` can render text as `Content-Type:text/plain`.
   *
   * @see {@link https://hono.dev/docs/api/context#text}
   *
   * @example
   * ```ts
   * app.get('/say', (c) => {
   *   return c.text('Hello!')
   * })
   * ```
   */
  text = (text, arg, headers) => {
    return !this.#preparedHeaders && !this.#status && !arg && !headers && !this.finalized ? new Response(text) : this.#newResponse(
      text,
      arg,
      setDefaultContentType(TEXT_PLAIN, headers)
    );
  };
  /**
   * `.json()` can render JSON as `Content-Type:application/json`.
   *
   * @see {@link https://hono.dev/docs/api/context#json}
   *
   * @example
   * ```ts
   * app.get('/api', (c) => {
   *   return c.json({ message: 'Hello!' })
   * })
   * ```
   */
  json = (object, arg, headers) => {
    return this.#newResponse(
      JSON.stringify(object),
      arg,
      setDefaultContentType("application/json", headers)
    );
  };
  html = (html, arg, headers) => {
    const res = (html2) => this.#newResponse(html2, arg, setDefaultContentType("text/html; charset=UTF-8", headers));
    return typeof html === "object" ? resolveCallback(html, HtmlEscapedCallbackPhase.Stringify, false, {}).then(res) : res(html);
  };
  /**
   * `.redirect()` can Redirect, default status code is 302.
   *
   * @see {@link https://hono.dev/docs/api/context#redirect}
   *
   * @example
   * ```ts
   * app.get('/redirect', (c) => {
   *   return c.redirect('/')
   * })
   * app.get('/redirect-permanently', (c) => {
   *   return c.redirect('/', 301)
   * })
   * ```
   */
  redirect = (location, status) => {
    const locationString = String(location);
    this.header(
      "Location",
      // Multibyes should be encoded
      // eslint-disable-next-line no-control-regex
      !/[^\x00-\xFF]/.test(locationString) ? locationString : encodeURI(locationString)
    );
    return this.newResponse(null, status ?? 302);
  };
  /**
   * `.notFound()` can return the Not Found Response.
   *
   * @see {@link https://hono.dev/docs/api/context#notfound}
   *
   * @example
   * ```ts
   * app.get('/notfound', (c) => {
   *   return c.notFound()
   * })
   * ```
   */
  notFound = () => {
    this.#notFoundHandler ??= () => createResponseInstance();
    return this.#notFoundHandler(this);
  };
};

// node_modules/hono/dist/router.js
var METHOD_NAME_ALL = "ALL";
var METHOD_NAME_ALL_LOWERCASE = "all";
var METHODS = ["get", "post", "put", "delete", "options", "patch", "query"];
var MESSAGE_MATCHER_IS_ALREADY_BUILT = "Can not add a route since the matcher is already built.";
var UnsupportedPathError = class extends Error {
};

// node_modules/hono/dist/utils/constants.js
var COMPOSED_HANDLER = "__COMPOSED_HANDLER";

// node_modules/hono/dist/hono-base.js
var notFoundHandler = (c) => {
  return c.text("404 Not Found", 404);
};
var errorHandler = (err, c) => {
  if ("getResponse" in err) {
    const res = err.getResponse();
    return c.newResponse(res.body, res);
  }
  console.error(err);
  return c.text("Internal Server Error", 500);
};
var Hono = class _Hono {
  get;
  post;
  put;
  delete;
  options;
  patch;
  query;
  all;
  on;
  use;
  /*
    This class is like an abstract class and does not have a router.
    To use it, inherit the class and implement router in the constructor.
  */
  router;
  getPath;
  // Cannot use `#` because it requires visibility at JavaScript runtime.
  _basePath = "/";
  #path = "/";
  routes = [];
  constructor(options = {}) {
    const allMethods = [...METHODS, METHOD_NAME_ALL_LOWERCASE];
    allMethods.forEach((method) => {
      this[method] = (args1, ...args) => {
        if (typeof args1 === "string") {
          this.#path = args1;
        } else {
          this.#addRoute(method, this.#path, args1);
        }
        args.forEach((handler) => {
          this.#addRoute(method, this.#path, handler);
        });
        return this;
      };
    });
    this.on = (method, path, ...handlers) => {
      for (const p of [path].flat()) {
        this.#path = p;
        for (const m of [method].flat()) {
          handlers.map((handler) => {
            this.#addRoute(m.toUpperCase(), this.#path, handler);
          });
        }
      }
      return this;
    };
    this.use = (arg1, ...handlers) => {
      if (typeof arg1 === "string") {
        this.#path = arg1;
      } else {
        this.#path = "*";
        handlers.unshift(arg1);
      }
      handlers.forEach((handler) => {
        this.#addRoute(METHOD_NAME_ALL, this.#path, handler);
      });
      return this;
    };
    const { strict, ...optionsWithoutStrict } = options;
    Object.assign(this, optionsWithoutStrict);
    this.getPath = strict ?? true ? options.getPath ?? getPath : getPathNoStrict;
  }
  #clone() {
    const clone = new _Hono({
      router: this.router,
      getPath: this.getPath
    });
    clone.errorHandler = this.errorHandler;
    clone.#notFoundHandler = this.#notFoundHandler;
    clone.routes = this.routes;
    return clone;
  }
  #notFoundHandler = notFoundHandler;
  // Cannot use `#` because it requires visibility at JavaScript runtime.
  errorHandler = errorHandler;
  /**
   * `.route()` allows grouping other Hono instance in routes.
   *
   * @see {@link https://hono.dev/docs/api/routing#grouping}
   *
   * @param {string} path - base Path
   * @param {Hono} app - other Hono instance
   * @returns {Hono} routed Hono instance
   *
   * @example
   * ```ts
   * const app = new Hono()
   * const app2 = new Hono()
   *
   * app2.get("/user", (c) => c.text("user"))
   * app.route("/api", app2) // GET /api/user
   * ```
   */
  route(path, app2) {
    const subApp = this.basePath(path);
    app2.routes.map((r) => {
      let handler;
      if (app2.errorHandler === errorHandler) {
        handler = r.handler;
      } else {
        handler = async (c, next) => (await compose([], app2.errorHandler)(c, () => r.handler(c, next))).res;
        handler[COMPOSED_HANDLER] = r.handler;
      }
      subApp.#addRoute(r.method, r.path, handler, r.basePath);
    });
    return this;
  }
  /**
   * `.basePath()` allows base paths to be specified.
   *
   * @see {@link https://hono.dev/docs/api/routing#base-path}
   *
   * @param {string} path - base Path
   * @returns {Hono} changed Hono instance
   *
   * @example
   * ```ts
   * const api = new Hono().basePath('/api')
   * ```
   */
  basePath(path) {
    const subApp = this.#clone();
    subApp._basePath = mergePath(this._basePath, path);
    return subApp;
  }
  /**
   * `.onError()` handles an error and returns a customized Response.
   *
   * @see {@link https://hono.dev/docs/api/hono#error-handling}
   *
   * @param {ErrorHandler} handler - request Handler for error
   * @returns {Hono} changed Hono instance
   *
   * @example
   * ```ts
   * app.onError((err, c) => {
   *   console.error(`${err}`)
   *   return c.text('Custom Error Message', 500)
   * })
   * ```
   */
  onError = (handler) => {
    this.errorHandler = handler;
    return this;
  };
  /**
   * `.notFound()` allows you to customize a Not Found Response.
   *
   * @see {@link https://hono.dev/docs/api/hono#not-found}
   *
   * @param {NotFoundHandler} handler - request handler for not-found
   * @returns {Hono} changed Hono instance
   *
   * @example
   * ```ts
   * app.notFound((c) => {
   *   return c.text('Custom 404 Message', 404)
   * })
   * ```
   */
  notFound = (handler) => {
    this.#notFoundHandler = handler;
    return this;
  };
  /**
   * `.mount()` allows you to mount applications built with other frameworks into your Hono application.
   *
   * @see {@link https://hono.dev/docs/api/hono#mount}
   *
   * @param {string} path - base Path
   * @param {Function} applicationHandler - other Request Handler
   * @param {MountOptions} [options] - options of `.mount()`
   * @returns {Hono} mounted Hono instance
   *
   * @example
   * ```ts
   * import { Router as IttyRouter } from 'itty-router'
   * import { Hono } from 'hono'
   * // Create itty-router application
   * const ittyRouter = IttyRouter()
   * // GET /itty-router/hello
   * ittyRouter.get('/hello', () => new Response('Hello from itty-router'))
   *
   * const app = new Hono()
   * app.mount('/itty-router', ittyRouter.handle)
   * ```
   *
   * @example
   * ```ts
   * const app = new Hono()
   * // Send the request to another application without modification.
   * app.mount('/app', anotherApp, {
   *   replaceRequest: (req) => req,
   * })
   * ```
   */
  mount(path, applicationHandler, options) {
    let replaceRequest;
    let optionHandler;
    if (options) {
      if (typeof options === "function") {
        optionHandler = options;
      } else {
        optionHandler = options.optionHandler;
        if (options.replaceRequest === false) {
          replaceRequest = (request) => request;
        } else {
          replaceRequest = options.replaceRequest;
        }
      }
    }
    const getOptions = optionHandler ? (c) => {
      const options2 = optionHandler(c);
      return Array.isArray(options2) ? options2 : [options2];
    } : (c) => {
      let executionContext = void 0;
      try {
        executionContext = c.executionCtx;
      } catch {
      }
      return [c.env, executionContext];
    };
    replaceRequest ||= (() => {
      const mergedPath = mergePath(this._basePath, path);
      const pathPrefixLength = mergedPath === "/" ? 0 : mergedPath.length;
      return (request) => {
        const url = new URL(request.url);
        url.pathname = this.getPath(request).slice(pathPrefixLength) || "/";
        return new Request(url, request);
      };
    })();
    const handler = async (c, next) => {
      const res = await applicationHandler(replaceRequest(c.req.raw), ...getOptions(c));
      if (res) {
        return res;
      }
      await next();
    };
    this.#addRoute(METHOD_NAME_ALL, mergePath(path, "*"), handler);
    return this;
  }
  #addRoute(method, path, handler, baseRoutePath) {
    method = method.toUpperCase();
    path = mergePath(this._basePath, path);
    const r = {
      basePath: baseRoutePath !== void 0 ? mergePath(this._basePath, baseRoutePath) : this._basePath,
      path,
      method,
      handler
    };
    this.router.add(method, path, [handler, r]);
    this.routes.push(r);
  }
  #handleError(err, c) {
    if (err instanceof Error) {
      return this.errorHandler(err, c);
    }
    throw err;
  }
  #dispatch(request, executionCtx, env, method) {
    if (method === "HEAD") {
      return (async () => new Response(null, await this.#dispatch(request, executionCtx, env, "GET")))();
    }
    const path = this.getPath(request, { env });
    const matchResult = this.router.match(method, path);
    const c = new Context(request, {
      path,
      matchResult,
      env,
      executionCtx,
      notFoundHandler: this.#notFoundHandler
    });
    if (matchResult[0].length === 1) {
      let res;
      try {
        res = matchResult[0][0][0][0](c, async () => {
          c.res = await this.#notFoundHandler(c);
        });
      } catch (err) {
        return this.#handleError(err, c);
      }
      return res instanceof Promise ? res.then(
        (resolved) => resolved || (c.finalized ? c.res : this.#notFoundHandler(c))
      ).catch((err) => this.#handleError(err, c)) : res ?? this.#notFoundHandler(c);
    }
    const composed = compose(matchResult[0], this.errorHandler, this.#notFoundHandler);
    return (async () => {
      try {
        const context = await composed(c);
        if (!context.finalized) {
          throw new Error(
            "Context is not finalized. Did you forget to return a Response object or `await next()`?"
          );
        }
        return context.res;
      } catch (err) {
        return this.#handleError(err, c);
      }
    })();
  }
  /**
   * `.fetch()` will be entry point of your app.
   *
   * @see {@link https://hono.dev/docs/api/hono#fetch}
   *
   * @param {Request} request - request Object of request
   * @param {Env} env - env Object
   * @param {ExecutionContext} executionCtx - context of execution
   * @returns {Response | Promise<Response>} response of request
   *
   */
  fetch = (request, ...rest) => {
    return this.#dispatch(request, rest[1], rest[0], request.method);
  };
  /**
   * `.request()` is a useful method for testing.
   * You can pass a URL or pathname to send a GET request.
   * app will return a Response object.
   * ```ts
   * test('GET /hello is ok', async () => {
   *   const res = await app.request('/hello')
   *   expect(res.status).toBe(200)
   * })
   * ```
   * @see https://hono.dev/docs/api/hono#request
   */
  request = (input, requestInit, Env, executionCtx) => {
    if (input instanceof Request) {
      return this.fetch(requestInit ? new Request(input, requestInit) : input, Env, executionCtx);
    }
    input = input.toString();
    return this.fetch(
      new Request(
        /^https?:\/\//.test(input) ? input : `http://localhost${mergePath("/", input)}`,
        requestInit
      ),
      Env,
      executionCtx
    );
  };
  /**
   * `.fire()` automatically adds a global fetch event listener.
   * This can be useful for environments that adhere to the Service Worker API, such as non-ES module Cloudflare Workers.
   * @deprecated
   * Use `fire` from `hono/service-worker` instead.
   * ```ts
   * import { Hono } from 'hono'
   * import { fire } from 'hono/service-worker'
   *
   * const app = new Hono()
   * // ...
   * fire(app)
   * ```
   * @see https://hono.dev/docs/api/hono#fire
   * @see https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API
   * @see https://developers.cloudflare.com/workers/reference/migrate-to-module-workers/
   */
  fire = () => {
    addEventListener("fetch", (event) => {
      event.respondWith(this.#dispatch(event.request, event, void 0, event.request.method));
    });
  };
};

// node_modules/hono/dist/router/reg-exp-router/matcher.js
var emptyParam = [];
function match(method, path) {
  const matchers = this.buildAllMatchers();
  const match2 = ((method2, path2) => {
    const matcher = matchers[method2] || matchers[METHOD_NAME_ALL];
    const staticMatch = matcher[2][path2];
    if (staticMatch) {
      return staticMatch;
    }
    const match3 = path2.match(matcher[0]);
    if (!match3) {
      return [[], emptyParam];
    }
    const index = match3.indexOf("", 1);
    return [matcher[1][index], match3];
  });
  this.match = match2;
  return match2(method, path);
}

// node_modules/hono/dist/router/reg-exp-router/node.js
var LABEL_REG_EXP_STR = "[^/]+";
var ONLY_WILDCARD_REG_EXP_STR = ".*";
var TAIL_WILDCARD_REG_EXP_STR = "(?:|/.*)";
var PATH_ERROR = /* @__PURE__ */ Symbol();
var regExpMetaChars = new Set(".\\+*[^]$()");
function compareKey(a, b) {
  if (a.length === 1) {
    return b.length === 1 ? a < b ? -1 : 1 : -1;
  }
  if (b.length === 1) {
    return 1;
  }
  if (a === ONLY_WILDCARD_REG_EXP_STR || a === TAIL_WILDCARD_REG_EXP_STR) {
    return b === TAIL_WILDCARD_REG_EXP_STR ? -1 : 1;
  } else if (b === ONLY_WILDCARD_REG_EXP_STR || b === TAIL_WILDCARD_REG_EXP_STR) {
    return -1;
  }
  if (a === LABEL_REG_EXP_STR) {
    return 1;
  } else if (b === LABEL_REG_EXP_STR) {
    return -1;
  }
  return a.length === b.length ? a < b ? -1 : 1 : b.length - a.length;
}
var Node = class _Node {
  // handler index of a dynamic path, or -1 for a static path terminal
  #index;
  #varIndex;
  #children = /* @__PURE__ */ Object.create(null);
  insert(tokens, index, paramMap, context, isStatic) {
    let node = this;
    for (let i = 0, len = tokens.length; i < len; i++) {
      const token = tokens[i];
      const pattern = token.length === 1 ? token === "*" ? i === len - 1 ? ["", "", ONLY_WILDCARD_REG_EXP_STR] : ["", "", LABEL_REG_EXP_STR] : null : token === "/*" ? ["", "", TAIL_WILDCARD_REG_EXP_STR] : token.match(/^\:([^\{\}]+)(?:\{(.+)\})?$/);
      let nextNode;
      if (pattern) {
        const name = pattern[1];
        let regexpStr = pattern[2] || LABEL_REG_EXP_STR;
        if (name && pattern[2]) {
          if (regexpStr === ".*") {
            throw PATH_ERROR;
          }
          regexpStr = regexpStr.replace(/^\((?!\?:)(?=[^)]+\)$)/, "(?:");
          if (/\((?!\?:)/.test(regexpStr)) {
            throw PATH_ERROR;
          }
          if (regexpStr.length === 1 && regExpMetaChars.has(regexpStr)) {
            throw PATH_ERROR;
          }
        }
        nextNode = node.#children[regexpStr];
        if (!nextNode) {
          if (regexpStr !== ONLY_WILDCARD_REG_EXP_STR && regexpStr !== TAIL_WILDCARD_REG_EXP_STR) {
            for (const k in node.#children) {
              if (
                // a single-char pattern coexists with single-char literals as a literal does
                (regexpStr.length > 1 || k.length > 1) && k !== ONLY_WILDCARD_REG_EXP_STR && k !== TAIL_WILDCARD_REG_EXP_STR
              ) {
                throw PATH_ERROR;
              }
            }
          }
          nextNode = node.#children[regexpStr] = new _Node();
        }
        if (name !== "") {
          nextNode.#varIndex ??= context.varIndex++;
          paramMap.push([name, nextNode.#varIndex]);
        }
      } else {
        nextNode = node.#children[token];
        if (!nextNode) {
          for (const k in node.#children) {
            if (k.length > 1 && k !== ONLY_WILDCARD_REG_EXP_STR && k !== TAIL_WILDCARD_REG_EXP_STR) {
              throw PATH_ERROR;
            }
          }
          nextNode = node.#children[token] = new _Node();
        }
      }
      node = nextNode;
    }
    if (node.#index !== void 0) {
      throw PATH_ERROR;
    }
    node.#index = isStatic ? -1 : index;
  }
  buildRegExpStr() {
    const childKeys = Object.keys(this.#children).sort(compareKey);
    const strList = childKeys.map((k) => {
      const c = this.#children[k];
      const childStr = c.buildRegExpStr();
      return childStr === "" ? "" : (typeof c.#varIndex === "number" ? `(${k})@${c.#varIndex}` : regExpMetaChars.has(k) ? `\\${k}` : k) + childStr;
    }).filter(Boolean);
    if (typeof this.#index === "number" && this.#index !== -1) {
      strList.unshift(`#${this.#index}`);
    }
    if (strList.length === 0) {
      return "";
    }
    if (strList.length === 1) {
      return strList[0];
    }
    return "(?:" + strList.join("|") + ")";
  }
};

// node_modules/hono/dist/router/reg-exp-router/trie.js
var Trie = class {
  #context = { varIndex: 0 };
  #root = new Node();
  #index = 0;
  // dynamic path -> [handler index, param assoc]; static paths are not registered
  paths = /* @__PURE__ */ Object.create(null);
  insert(path, isStatic) {
    if (isStatic) {
      this.#root.insert(path.split(""), 0, [], this.#context, true);
      return;
    }
    const paramAssoc = [];
    const groups = [];
    let markedPath = path;
    for (let i = 0; ; ) {
      let replaced = false;
      markedPath = markedPath.replace(/\{[^}]+\}/g, (m) => {
        const mark = `@\\${i}`;
        groups[i] = [mark, m];
        i++;
        replaced = true;
        return mark;
      });
      if (!replaced) {
        break;
      }
    }
    const tokens = markedPath.match(/(?::[^\/]+)|(?:\/\*$)|./g) || [];
    for (let i = groups.length - 1; i >= 0; i--) {
      const [mark] = groups[i];
      for (let j = tokens.length - 1; j >= 0; j--) {
        if (tokens[j].indexOf(mark) !== -1) {
          tokens[j] = tokens[j].replace(mark, groups[i][1]);
          break;
        }
      }
    }
    this.#root.insert(tokens, this.#index, paramAssoc, this.#context, false);
    this.paths[path] = [this.#index++, paramAssoc];
  }
  buildRegExp() {
    let regexp = this.#root.buildRegExpStr();
    if (regexp === "") {
      return [/^$/, [], []];
    }
    let captureIndex = 0;
    const indexReplacementMap = [];
    const paramReplacementMap = [];
    regexp = regexp.replace(/#(\d+)|@(\d+)|\.\*\$/g, (_, handlerIndex, paramIndex) => {
      if (handlerIndex !== void 0) {
        indexReplacementMap[++captureIndex] = Number(handlerIndex);
        return "$()";
      }
      if (paramIndex !== void 0) {
        paramReplacementMap[Number(paramIndex)] = ++captureIndex;
        return "";
      }
      return "";
    });
    return [new RegExp(`^${regexp}`), indexReplacementMap, paramReplacementMap];
  }
};

// node_modules/hono/dist/router/reg-exp-router/router.js
var wildcardRegExpCache = /* @__PURE__ */ Object.create(null);
function buildWildcardRegExp(path) {
  return wildcardRegExpCache[path] ??= new RegExp(
    path === "*" ? "" : `^${path.replace(
      /\/\*$|([.\\+*[^\]$()])/g,
      (_, metaChar) => metaChar ? `\\${metaChar}` : "(?:|/.*)"
    )}$`
  );
}
function clearWildcardRegExpCache() {
  wildcardRegExpCache = /* @__PURE__ */ Object.create(null);
}
function findMiddleware(middleware, path) {
  if (!middleware) {
    return void 0;
  }
  for (const k of Object.keys(middleware).sort((a, b) => b.length - a.length)) {
    if (buildWildcardRegExp(k).test(path)) {
      return [...middleware[k]];
    }
  }
  return void 0;
}
var RegExpRouter = class {
  name = "RegExpRouter";
  #middleware;
  #routes;
  #tries;
  constructor() {
    this.#middleware = { [METHOD_NAME_ALL]: /* @__PURE__ */ Object.create(null) };
    this.#routes = { [METHOD_NAME_ALL]: /* @__PURE__ */ Object.create(null) };
    this.#tries = { [METHOD_NAME_ALL]: new Trie() };
  }
  #insertPath(method, path) {
    try {
      this.#tries[method].insert(path, !/\*|\/:/.test(path));
    } catch (e) {
      throw e === PATH_ERROR ? new UnsupportedPathError(path) : e;
    }
  }
  add(method, path, handler) {
    const middleware = this.#middleware;
    const routes = this.#routes;
    if (!middleware || !routes) {
      throw new Error(MESSAGE_MATCHER_IS_ALREADY_BUILT);
    }
    if (!middleware[method]) {
      this.#tries[method] = new Trie();
      [middleware, routes].forEach((handlerMap) => {
        handlerMap[method] = /* @__PURE__ */ Object.create(null);
        Object.keys(handlerMap[METHOD_NAME_ALL]).forEach((p) => {
          handlerMap[method][p] = [...handlerMap[METHOD_NAME_ALL][p]];
          this.#insertPath(method, p);
        });
      });
    }
    if (path === "/*") {
      path = "*";
    }
    const paramCount = (path.match(/\/:/g) || []).length;
    if (/\*$/.test(path)) {
      const re = buildWildcardRegExp(path);
      Object.keys(middleware).forEach((m) => {
        if ((method === METHOD_NAME_ALL || method === m) && !middleware[m][path]) {
          this.#insertPath(m, path);
          middleware[m][path] = findMiddleware(middleware[m], path) || findMiddleware(middleware[METHOD_NAME_ALL], path) || [];
        }
      });
      Object.keys(middleware).forEach((m) => {
        if (method === METHOD_NAME_ALL || method === m) {
          Object.keys(middleware[m]).forEach((p) => {
            re.test(p) && middleware[m][p].push([handler, paramCount]);
          });
        }
      });
      Object.keys(routes).forEach((m) => {
        if (method === METHOD_NAME_ALL || method === m) {
          Object.keys(routes[m]).forEach(
            (p) => re.test(p) && routes[m][p].push([handler, paramCount])
          );
        }
      });
      return;
    }
    const paths = checkOptionalParameter(path) || [path];
    for (let i = 0, len = paths.length; i < len; i++) {
      const path2 = paths[i];
      Object.keys(routes).forEach((m) => {
        if (method === METHOD_NAME_ALL || method === m) {
          if (!routes[m][path2]) {
            this.#insertPath(m, path2);
            routes[m][path2] = [
              ...findMiddleware(middleware[m], path2) || findMiddleware(middleware[METHOD_NAME_ALL], path2) || []
            ];
          }
          routes[m][path2].push([handler, paramCount - len + i + 1]);
        }
      });
    }
  }
  match = match;
  buildAllMatchers() {
    const matchers = /* @__PURE__ */ Object.create(null);
    Object.keys(this.#routes).concat(Object.keys(this.#middleware)).forEach((method) => {
      matchers[method] ||= this.#buildMatcher(method);
    });
    this.#middleware = this.#routes = this.#tries = void 0;
    clearWildcardRegExpCache();
    return matchers;
  }
  #buildMatcher(method) {
    const middleware = this.#middleware[method];
    const routes = this.#routes[method];
    const trie = this.#tries[method];
    const staticMap = /* @__PURE__ */ Object.create(null);
    const handlerData = [];
    [middleware, routes].forEach((r) => {
      for (const path in r) {
        const handlers = r[path];
        const pathData = trie.paths[path];
        if (!pathData) {
          staticMap[path] = [handlers.map(([h]) => [h, /* @__PURE__ */ Object.create(null)]), emptyParam];
          continue;
        }
        const paramAssoc = pathData[1];
        handlerData[pathData[0]] = handlers.map(([h, paramCount]) => {
          const paramIndexMap = /* @__PURE__ */ Object.create(null);
          paramCount -= 1;
          for (; paramCount >= 0; paramCount--) {
            const [key, value] = paramAssoc[paramCount];
            paramIndexMap[key] = value;
          }
          return [h, paramIndexMap];
        });
      }
    });
    const [regexp, indexReplacementMap, paramReplacementMap] = trie.buildRegExp();
    for (let i = 0, len = handlerData.length; i < len; i++) {
      for (let j = 0, len2 = handlerData[i].length; j < len2; j++) {
        const map = handlerData[i][j]?.[1];
        if (!map) {
          continue;
        }
        const keys = Object.keys(map);
        for (let k = 0, len3 = keys.length; k < len3; k++) {
          map[keys[k]] = paramReplacementMap[map[keys[k]]];
        }
      }
    }
    const handlerMap = [];
    for (const i in indexReplacementMap) {
      handlerMap[i] = handlerData[indexReplacementMap[i]];
    }
    return [regexp, handlerMap, staticMap];
  }
};

// node_modules/hono/dist/router/smart-router/router.js
var SmartRouter = class {
  name = "SmartRouter";
  #routers = [];
  #routes = [];
  constructor(init) {
    this.#routers = init.routers;
  }
  add(method, path, handler) {
    if (!this.#routes) {
      throw new Error(MESSAGE_MATCHER_IS_ALREADY_BUILT);
    }
    this.#routes.push([method, path, handler]);
  }
  match(method, path) {
    if (!this.#routes) {
      throw new Error("Fatal error");
    }
    const routers = this.#routers;
    const routes = this.#routes;
    const len = routers.length;
    let i = 0;
    let res;
    for (; i < len; i++) {
      const router = routers[i];
      try {
        for (let i2 = 0, len2 = routes.length; i2 < len2; i2++) {
          router.add(...routes[i2]);
        }
        res = router.match(method, path);
      } catch (e) {
        if (e instanceof UnsupportedPathError) {
          continue;
        }
        throw e;
      }
      this.match = router.match.bind(router);
      this.#routers = [router];
      this.#routes = void 0;
      break;
    }
    if (i === len) {
      throw new Error("Fatal error");
    }
    this.name = `SmartRouter + ${this.activeRouter.name}`;
    return res;
  }
  get activeRouter() {
    if (this.#routes || this.#routers.length !== 1) {
      throw new Error("No active router has been determined yet.");
    }
    return this.#routers[0];
  }
};

// node_modules/hono/dist/router/trie-router/node.js
var emptyParams = /* @__PURE__ */ Object.create(null);
var order = 0;
var Node2 = class _Node2 {
  #methods = [];
  #children = /* @__PURE__ */ Object.create(null);
  #patterns = [];
  #pattern;
  #params = emptyParams;
  insert(method, path, handler) {
    let curNode = this;
    const parts = splitRoutingPath(path);
    const possibleKeys = /* @__PURE__ */ new Set();
    let i = 0;
    for (const p of parts) {
      const nextP = parts[++i];
      const pattern = getPattern(p, nextP) || (nextP === void 0 && p && p.indexOf("*") === p.length - 1 ? p : null);
      const isParam = Array.isArray(pattern);
      const key = isParam ? pattern[0] : pattern || p;
      const child = curNode.#children[key] ||= new _Node2();
      if (pattern && !child.#pattern) {
        child.#pattern = pattern;
        curNode.#patterns.push(child);
      }
      curNode = child;
      if (isParam) {
        possibleKeys.add(pattern[1]);
      }
    }
    curNode.#methods.push({
      [method]: {
        handler,
        possibleKeys: [...possibleKeys],
        score: ++order
      }
    });
  }
  #pushHandlerSets(handlerSets, node, method, nodeParams, params) {
    for (let i = 0, len = node.#methods.length; i < len; i++) {
      const m = node.#methods[i];
      const handlerSet = m[method] || m[METHOD_NAME_ALL];
      if (handlerSet) {
        handlerSet.params = /* @__PURE__ */ Object.create(null);
        handlerSets.push(handlerSet);
        for (let i2 = 0, len2 = handlerSet.possibleKeys.length; i2 < len2; i2++) {
          const key = handlerSet.possibleKeys[i2];
          handlerSet.params[key] = params?.[key] && !i2 ? params[key] : nodeParams[key] ?? params?.[key];
        }
      }
    }
  }
  search(method, path) {
    const handlerSets = [];
    this.#params = emptyParams;
    const curNode = this;
    let curNodes = [curNode];
    const parts = splitPath(path);
    const curNodesQueue = [];
    const len = parts.length;
    let partOffsets = null;
    for (let i = 0; i < len; i++) {
      const part = parts[i];
      const isLast = i === len - 1;
      const tempNodes = [];
      for (let j = 0, len2 = curNodes.length; j < len2; j++) {
        const node = curNodes[j];
        const nextNode = node.#children[part];
        if (nextNode) {
          nextNode.#params = node.#params;
          if (isLast) {
            if (nextNode.#children["*"]) {
              this.#pushHandlerSets(handlerSets, nextNode.#children["*"], method, node.#params);
            }
            this.#pushHandlerSets(handlerSets, nextNode, method, node.#params);
          } else {
            tempNodes.push(nextNode);
          }
        }
        for (const child of node.#patterns) {
          const pattern = child.#pattern;
          const params = node.#params === emptyParams ? {} : { ...node.#params };
          if (typeof pattern === "string") {
            if (pattern === "*" || part.startsWith(pattern.slice(0, -1))) {
              this.#pushHandlerSets(handlerSets, child, method, node.#params);
              if (pattern === "*") {
                child.#params = params;
                tempNodes.push(child);
              }
            }
            continue;
          }
          const [, name, matcher] = pattern;
          if (!part && matcher === true) {
            continue;
          }
          if (matcher !== true) {
            if (!partOffsets) {
              partOffsets = [];
              let offset = path[0] === "/" ? 1 : 0;
              for (let p = 0; p < len; p++) {
                partOffsets[p] = offset;
                offset += parts[p].length + 1;
              }
            }
            const restPathString = path.slice(partOffsets[i]);
            const m = matcher.exec(restPathString);
            if (m) {
              params[name] = m[0];
              this.#pushHandlerSets(handlerSets, child, method, node.#params, params);
              if (m[0].length === restPathString.length && child.#children["*"]) {
                this.#pushHandlerSets(
                  handlerSets,
                  child.#children["*"],
                  method,
                  node.#params,
                  params
                );
              }
              for (const _ in child.#children) {
                child.#params = params;
                const componentCount = m[0].match(/\//g)?.length ?? 0;
                const targetCurNodes = curNodesQueue[componentCount] ||= [];
                targetCurNodes.push(child);
                break;
              }
              continue;
            }
          }
          if (matcher === true || matcher.test(part)) {
            params[name] = part;
            if (isLast) {
              this.#pushHandlerSets(handlerSets, child, method, params, node.#params);
              if (child.#children["*"]) {
                this.#pushHandlerSets(
                  handlerSets,
                  child.#children["*"],
                  method,
                  params,
                  node.#params
                );
              }
            } else {
              child.#params = params;
              tempNodes.push(child);
            }
          }
        }
      }
      const shifted = curNodesQueue.shift();
      curNodes = shifted ? tempNodes.concat(shifted) : tempNodes;
    }
    if (handlerSets[1]) {
      handlerSets.sort((a, b) => {
        return a.score - b.score;
      });
    }
    return [handlerSets.map(({ handler, params }) => [handler, params])];
  }
};

// node_modules/hono/dist/router/trie-router/router.js
var TrieRouter = class {
  name = "TrieRouter";
  #node = new Node2();
  add(method, path, handler) {
    for (const result of checkOptionalParameter(path) || [path]) {
      this.#node.insert(method, result, handler);
    }
  }
  match(method, path) {
    return this.#node.search(method, path);
  }
};

// node_modules/hono/dist/hono.js
var Hono2 = class extends Hono {
  /**
   * Creates an instance of the Hono class.
   *
   * @param options - Optional configuration options for the Hono instance.
   */
  constructor(options = {}) {
    super(options);
    this.router = options.router ?? new SmartRouter({
      routers: [new RegExpRouter(), new TrieRouter()]
    });
  }
};

// index.js
var app = new Hono2({ strict: false });
app.use("*", async (c, next) => {
  const host = c.req.header("host") || "";
  if (host.toLowerCase().startsWith("www.")) {
    const url = new URL(c.req.url);
    url.hostname = host.slice(4);
    return c.redirect(url.toString(), 301);
  }
  await next();
});
app.use("*", async (c, next) => {
  const url = new URL(c.req.url);
  const path = url.pathname;
  const method = c.req.method.toUpperCase();
  const excluded = path.startsWith("/api/") || path.startsWith("/media/") || path.startsWith("/search") || path === "/sitemap.xml" || path === "/robots.txt" || path === "/favicon.ico" || path === "/virtualcardx2026.txt";
  const eligible = method === "GET" && !url.search && !excluded && !c.req.header("authorization") && !c.req.header("cookie") && typeof caches !== "undefined" && caches.default;
  if (!eligible) return next();
  const cache = caches.default;
  const cacheKey = new Request(url.toString(), { method: "GET" });
  const cached = await cache.match(cacheKey);
  if (cached) {
    const hit = new Response(cached.body, cached);
    hit.headers.set("Cache-Control", "public, max-age=0, must-revalidate");
    hit.headers.set("CDN-Cache-Control", "public, max-age=1800");
    hit.headers.set("X-VCX-Cache", "HIT");
    return hit;
  }
  await next();
  const contentType = c.res.headers.get("Content-Type") || "";
  if (c.res.status === 200 && contentType.toLowerCase().includes("text/html") && !c.res.headers.has("Set-Cookie")) {
    const stored = c.res.clone();
    stored.headers.set("Cache-Control", "public, max-age=1800");
    stored.headers.set("CDN-Cache-Control", "public, max-age=1800");
    const put = cache.put(cacheKey, stored);
    try {
      c.executionCtx.waitUntil(put);
    } catch {
      await put;
    }
    c.header("X-VCX-Cache", "MISS");
  }
});
app.use("*", async (c, next) => {
  await next();
  c.header("X-Content-Type-Options", "nosniff");
  c.header("Referrer-Policy", "strict-origin-when-cross-origin");
  c.header("X-Frame-Options", "SAMEORIGIN");
  c.header("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  c.header("Content-Security-Policy", "default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'self'; img-src 'self' data: https:; font-src 'self' https://fonts.gstatic.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; script-src 'self' 'unsafe-inline' https://static.cloudflareinsights.com; connect-src 'self' https://cloudflareinsights.com; frame-src https:");
  const url = new URL(c.req.url);
  const method = c.req.method.toUpperCase();
  const path = url.pathname;
  const contentType = c.res.headers.get("Content-Type") || "";
  const excluded = path.startsWith("/api/") || path.startsWith("/media/") || path.startsWith("/search") || path === "/sitemap.xml" || path === "/robots.txt" || path === "/favicon.ico" || path === "/virtualcardx2026.txt";
  if ((method === "GET" || method === "HEAD") && !url.search && !excluded && contentType.toLowerCase().includes("text/html")) {
    c.header("Cache-Control", "public, max-age=0, must-revalidate");
    c.header("CDN-Cache-Control", "public, max-age=1800");
  }
});
var SITE = "https://virtualcardx.com";
var CSS = `
:root{
  --primary:#2563eb; --primary-dark:#1d4ed8; --primary-light:#eff6ff;
  --accent:#f59e0b; --text:#1f2937; --text-light:#6b7280;
  --bg:#f8fafc; --card:#ffffff; --border:#e5e7eb;
  --radius:12px; --shadow:0 1px 3px rgba(0,0,0,.08),0 4px 14px rgba(0,0,0,.05);
  --shadow-lg:0 8px 30px rgba(0,0,0,.12);
}
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC","Hiragino Sans GB","Microsoft YaHei",sans-serif;background:var(--bg);color:var(--text);line-height:1.75;font-size:16px}
a{color:var(--primary);text-decoration:none}
a:hover{color:var(--primary-dark)}
img{max-width:100%;height:auto}
.container{max-width:1140px;margin:0 auto;padding:0 20px}

/* \u9876\u90E8\u5BFC\u822A */
.site-header{background:#fff;border-bottom:1px solid var(--border);position:sticky;top:0;z-index:100;box-shadow:0 1px 4px rgba(0,0,0,.04)}
.header-inner{max-width:1140px;margin:0 auto;padding:0 20px;display:flex;align-items:center;justify-content:space-between;height:64px}
.logo{font-size:1.35rem;font-weight:800;color:var(--text);display:flex;align-items:center;gap:8px}
.logo-img{height:38px;width:auto;display:block}
.logo .logo-badge{background:linear-gradient(135deg,#2563eb,#7c3aed);color:#fff;width:34px;height:34px;border-radius:9px;display:flex;align-items:center;justify-content:center;font-size:1rem;font-weight:800}
.main-nav{display:flex;align-items:center;gap:22px}
.main-nav a{color:var(--text);font-size:.95rem;font-weight:500;padding:6px 2px;border-bottom:2px solid transparent}
.main-nav a:hover{color:var(--primary);border-bottom-color:var(--primary)}
.nav-right{display:flex;align-items:center;gap:12px}
/* \u6C49\u5821\u83DC\u5355\u6309\u94AE (\u9ED8\u8BA4\u9690\u85CF, \u79FB\u52A8\u7AEF\u663E\u793A) */
.menu-toggle{display:none;background:none;border:none;cursor:pointer;padding:8px;flex-direction:column;gap:5px;border-radius:6px}
.menu-toggle .bar{display:block;width:22px;height:2.5px;background:var(--text);border-radius:2px;transition:transform .25s,opacity .25s}
.menu-toggle:hover{background:var(--bg)}
.menu-toggle[aria-expanded="true"] .bar:nth-child(1){transform:translateY(7.5px) rotate(45deg)}
.menu-toggle[aria-expanded="true"] .bar:nth-child(2){opacity:0}
.menu-toggle[aria-expanded="true"] .bar:nth-child(3){transform:translateY(-7.5px) rotate(-45deg)}
.search-box{display:flex;align-items:center;background:var(--bg);border:1px solid var(--border);border-radius:8px;padding:0 4px 0 12px;height:38px}
.search-box input{border:none;background:transparent;outline:none;font-size:.9rem;width:160px;color:var(--text)}
.search-box button{border:none;background:var(--primary);color:#fff;border-radius:6px;height:30px;padding:0 12px;font-size:.85rem;cursor:pointer}
.lang-switch{font-size:.85rem;font-weight:600;color:var(--text-light);background:var(--bg);border:1px solid var(--border);padding:6px 12px;border-radius:8px}
.lang-switch:hover{color:var(--primary);border-color:var(--primary)}

/* \u5206\u7C7B\u6761 */
.cat-bar{background:#fff;border-bottom:1px solid var(--border)}
.cat-bar-inner{max-width:1140px;margin:0 auto;padding:0 20px;display:flex;gap:6px;overflow-x:auto;white-space:nowrap;padding:10px 20px}
.cat-bar a{font-size:.85rem;color:var(--text-light);padding:5px 14px;border-radius:20px;background:var(--bg);font-weight:500}
.cat-bar a:hover{color:var(--primary);background:var(--primary-light)}
/* \u4E3B\u5E03\u5C40 */
.layout{display:grid;grid-template-columns:1fr 300px;gap:28px;max-width:1140px;margin:0 auto;padding:28px 20px 40px}
.layout>main,.layout>.sidebar{min-width:0}
.layout.no-sidebar{grid-template-columns:1fr}
@media(max-width:900px){.layout{grid-template-columns:1fr}.sidebar{display:none}}

/* \u6587\u7AE0\u5361\u7247 */
.post-card{background:var(--card);border-radius:var(--radius);box-shadow:var(--shadow);overflow:hidden;margin-bottom:22px;display:flex;transition:transform .15s,box-shadow .15s}
.post-card:hover{transform:translateY(-2px);box-shadow:var(--shadow-lg)}
.post-thumb{flex:0 0 220px;min-height:150px;background:linear-gradient(135deg,#e0e7ff,#f5f3ff);display:flex;align-items:center;justify-content:center;overflow:hidden}
.post-thumb img{width:100%;height:100%;object-fit:cover}
.post-thumb .no-img{font-size:2.2rem;opacity:.35}
.post-body{padding:20px 24px;flex:1}
.post-meta{display:flex;align-items:center;gap:14px;font-size:.82rem;color:var(--text-light);margin-bottom:8px}
.post-meta .cat{color:var(--primary);font-weight:600}
.post-title{font-size:1.22rem;font-weight:700;line-height:1.45;margin-bottom:8px}
.post-title a{color:var(--text)}
.post-title a:hover{color:var(--primary)}
.post-excerpt{color:var(--text-light);font-size:.93rem;line-height:1.7}
@media(max-width:700px){.post-card{flex-direction:column}.post-thumb{flex:none;min-height:120px}}

/* \u5206\u9875 */
.pagination{display:flex;justify-content:center;align-items:center;gap:5px;margin:30px 0;flex-wrap:wrap}
.pagination a,.pagination .cur,.pagination .dots{min-width:36px;height:36px;display:flex;align-items:center;justify-content:center;border-radius:8px;font-size:.9rem;font-weight:600;background:#fff;border:1px solid var(--border);color:var(--text)}
.pagination a:hover{border-color:var(--primary);color:var(--primary);background:var(--primary-light)}
.pagination .cur{background:var(--primary);border-color:var(--primary);color:#fff}
.pagination .dots{border:none;background:transparent;color:var(--text-light);min-width:24px}
.pagination .disabled{opacity:.35;pointer-events:none;min-width:36px;height:36px;display:flex;align-items:center;justify-content:center;border-radius:8px;background:#fff;border:1px solid var(--border);color:var(--text-light)}
.pagination .prev,.pagination .next,.pagination .first,.pagination .last{min-width:36px}
.pagination .page-info{font-size:.82rem;color:var(--text-light);margin-left:6px;white-space:nowrap}
@media(max-width:700px){
  .pagination{gap:4px}
  .pagination a,.pagination .cur,.pagination .dots,.pagination .disabled{min-width:32px;height:32px;font-size:.82rem}
  .pagination .first,.pagination .last{display:none}
  .pagination .page-info{display:none}
}

/* \u4FA7\u8FB9\u680F */
.sidebar{display:flex;flex-direction:column;gap:22px}
.widget{background:var(--card);border-radius:var(--radius);box-shadow:var(--shadow);padding:22px}
.widget h3{font-size:1rem;font-weight:700;margin-bottom:14px;padding-bottom:10px;border-bottom:2px solid var(--primary-light);display:flex;align-items:center;gap:8px}
.widget h3::before{content:"";width:4px;height:16px;background:var(--primary);border-radius:2px;display:inline-block}
.widget ul{list-style:none}
.widget li{margin-bottom:9px;font-size:.9rem;border-bottom:1px dashed var(--border);padding-bottom:9px}
.widget li:last-child{border-bottom:none;padding-bottom:0}
.widget li a{color:var(--text);display:block}
.widget li a:hover{color:var(--primary)}
.author-card{text-align:center}
.author-avatar{width:64px;height:64px;border-radius:50%;background:linear-gradient(135deg,#2563eb,#7c3aed);color:#fff;display:flex;align-items:center;justify-content:center;font-size:1.5rem;font-weight:800;margin:0 auto 12px}
.author-card .author-name{font-size:1.05rem;font-weight:700;margin-bottom:6px}
.author-card p{font-size:.85rem;color:var(--text-light)}
.contact-list li{display:flex;align-items:center;gap:8px;font-size:.88rem}

/* \u6587\u7AE0\u9875 */
.article{background:var(--card);border-radius:var(--radius);box-shadow:var(--shadow);padding:36px 40px}
.article-header{margin-bottom:26px;padding-bottom:22px;border-bottom:1px solid var(--border)}
.article .article-hero{display:block;width:100%;max-height:420px;object-fit:cover;border-radius:12px;margin:18px 0 6px;border:1px solid var(--border)}
.article h1{font-size:1.75rem;font-weight:800;line-height:1.4;margin-bottom:14px}
.article-meta{display:flex;gap:16px;font-size:.86rem;color:var(--text-light);flex-wrap:wrap}
.article-meta .author-link{color:inherit;text-decoration:none}
.article-meta .author-link:hover{text-decoration:underline}
.breadcrumbs{font-size:.84rem;color:var(--text-light);margin:0 0 14px;line-height:1.5}
.breadcrumbs a{text-decoration:underline;text-underline-offset:2px}
.article .content{font-size:1.02rem}
.article .content h2{font-size:1.35rem;font-weight:700;margin:30px 0 14px;padding-left:12px;border-left:4px solid var(--primary)}
.article .content h3{font-size:1.15rem;font-weight:700;margin:24px 0 12px}
.article .content p{margin:0 0 16px}
.article .content ul,.article .content ol{margin:0 0 16px 22px}
.article .content li{margin-bottom:6px}
.article .content img{border-radius:8px;margin:10px 0}
.article .content table{width:100%;border-collapse:collapse;margin:16px 0;font-size:.92rem}
.article .content th{background:var(--primary-light);font-weight:700}
.article .content td,.article .content th{border:1px solid var(--border);padding:10px 12px;text-align:left}
.article .content blockquote{border-left:4px solid var(--accent);background:#fffbeb;padding:14px 18px;margin:16px 0;border-radius:0 8px 8px 0;color:#92400e}
.article .content a{text-decoration:underline;text-underline-offset:2px}
.article,.article .content,.article .content p,.article .content li,.article .content a{overflow-wrap:anywhere;word-break:break-word;min-width:0}
.article .content table{display:block;max-width:100%;overflow-x:auto}
.article .content code{background:var(--bg);padding:2px 6px;border-radius:4px;font-size:.9em}
pre{background:#f6f8fa;color:#212121;border:1px solid #e1e4e8;padding:18px;border-radius:8px;overflow-x:auto;margin:16px 0;max-width:100%;white-space:pre;word-wrap:normal;tab-size:4;font-size:.92rem;font-family:"JetBrains Mono","Fira Code","Cascadia Code","SF Mono",Menlo,Consolas,"Liberation Mono","Courier New",monospace;line-height:1.6}
pre code{background:none;color:inherit;padding:0;white-space:pre;font-size:.92rem;font-family:inherit;line-height:1.6}
.article .content code{background:var(--bg);padding:2px 6px;border-radius:4px;font-size:.9em;font-family:"JetBrains Mono","Fira Code","Cascadia Code","SF Mono",Menlo,Consolas,"Liberation Mono","Courier New",monospace}
.lang-toggle{background:var(--primary-light);color:var(--primary);padding:8px 16px;border-radius:8px;font-weight:600}

/* \u9875\u9762/\u5206\u7C7B/\u641C\u7D22 */
.page-title{font-size:1.6rem;font-weight:800;margin:24px 0 20px;padding-bottom:12px;border-bottom:2px solid var(--primary-light)}
.post-list{background:var(--card);border-radius:var(--radius);box-shadow:var(--shadow);padding:8px 24px}
.home-hero{margin:0;padding:0}
.home-hero h1{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
.home-hero p{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
.post-list li{padding:14px 0;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center;gap:14px}
.post-list li:last-child{border-bottom:none}
.post-list a{color:var(--text);font-weight:600;font-size:.98rem}
.post-list a:hover{color:var(--primary)}
.post-list time{color:var(--text-light);font-size:.82rem;white-space:nowrap}
.page-content{background:var(--card);border-radius:var(--radius);box-shadow:var(--shadow);padding:36px 40px;font-size:1.02rem}
.page-content h2{font-size:1.3rem;margin:22px 0 12px}
.page-content p{margin-bottom:14px}
.page-content ul{margin:0 0 14px 20px}

/* \u9875\u811A */
.site-footer{background:#0f172a;color:#94a3b8;padding:40px 0 28px;margin-top:40px}
.footer-inner{max-width:1140px;margin:0 auto;padding:0 20px;display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:30px}
.footer-col h4{color:#f1f5f9;font-size:1rem;margin-bottom:14px;font-weight:700}
.footer-col a{display:block;color:#94a3b8;font-size:.88rem;margin-bottom:8px}
.footer-col a:hover{color:#fff}
.footer-bottom{max-width:1140px;margin:24px auto 0;padding:18px 20px 0;border-top:1px solid #1e293b;font-size:.82rem;text-align:center;color:#94a3b8}

/* 404 */
.notfound{text-align:center;padding:80px 20px}
.notfound .code{font-size:5rem;font-weight:900;background:linear-gradient(135deg,#2563eb,#7c3aed);-webkit-background-clip:text;-webkit-text-fill-color:transparent}
.notfound h1{font-size:1.5rem;margin:10px 0 16px}

@media(max-width:700px){
  /* \u4E3B\u83DC\u5355: \u684C\u9762\u5BFC\u822A\u9690\u85CF, \u6C49\u5821\u6309\u94AE\u663E\u793A, \u70B9\u51FB\u5C55\u5F00\u4E0B\u62C9\u9762\u677F */
  .main-nav{display:none;position:absolute;top:100%;left:0;right:0;background:#fff;flex-direction:column;align-items:stretch;gap:0;padding:8px 0;border-bottom:1px solid var(--border);box-shadow:0 8px 20px rgba(0,0,0,.08);z-index:99}
  .main-nav.open{display:flex}
  .main-nav a{padding:14px 20px;border-bottom:1px solid var(--border);font-size:1rem}
  .main-nav a:last-child{border-bottom:none}
  .main-nav a:hover{background:var(--bg);color:var(--primary);border-bottom-color:var(--border)}
  .menu-toggle{display:flex}
  .header-inner{position:relative;height:auto;flex-wrap:wrap;padding:10px 16px;gap:8px 12px}
  .logo-img{height:28px;width:auto}
  .logo{font-size:1.1rem;gap:6px}
  .nav-right{width:100%;order:3;display:flex;gap:8px}
  .search-box{flex:1;min-width:0}
  .search-box input{width:auto;flex:1;min-width:0}
  .search-box button{padding:0 10px;white-space:nowrap}
  .lang-switch{padding:6px 10px}
  /* \u79FB\u52A8\u7AEF\u5206\u7C7B\u680F: \u5168\u90E8 8 \u4E2A\u5206\u7C7B\u663E\u793A, \u81EA\u52A8\u6362\u884C\u6210\u4E24\u884C\u80F6\u56CA */
  .cat-bar-inner{flex-wrap:wrap;gap:6px;padding:8px 12px;overflow-x:visible;white-space:normal}
  .cat-bar a{padding:5px 12px;font-size:.8rem}
  .article,.page-content{padding:22px 18px}
  .article h1{font-size:1.35rem}
  .post-title{font-size:1.08rem}
}
`;
function esc(s) {
  if (!s) return "";
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
function excerptText(value, max = 320) {
  const text = String(value || "").replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
  if (text.length <= max) return text;
  let cut = text.slice(0, max);
  if (/[A-Za-z0-9]$/.test(cut) && /[A-Za-z0-9]/.test(text.charAt(max))) {
    const wordSafe = cut.replace(/[A-Za-z0-9]+$/, "");
    if (wordSafe) cut = wordSafe;
  }
  return cut.trim();
}
function getLang(pathname) {
  return pathname.startsWith("/en") ? "en" : "zh";
}
function baseOf(lang) {
  return lang === "en" ? "/en/" : "/";
}
function fmtDate(d) {
  if (!d) return "";
  const s = String(d).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  return s;
}
function buildPageLinks(cur, totalPages, urlFor) {
  const WINDOW = 2;
  const pages = /* @__PURE__ */ new Set([1, totalPages]);
  for (let i = Math.max(1, cur - WINDOW); i <= Math.min(totalPages, cur + WINDOW); i++) pages.add(i);
  const sorted = [...pages].sort((a, b) => a - b);
  let out = "";
  let prev = 0;
  for (const p of sorted) {
    if (prev && p - prev > 1) out += '<span class="dots">\u2026</span>';
    if (p === 1) out += p === cur ? '<span class="cur" aria-current="page">1</span>' : `<a href="${urlFor(1)}">1</a>`;
    else out += p === cur ? `<span class="cur" aria-current="page">${p}</span>` : `<a href="${urlFor(p)}">${p}</a>`;
    prev = p;
  }
  return out;
}
function renderPagination(cur, totalPages, urlFor, opts = {}) {
  if (totalPages <= 1) return "";
  const prevHtml = cur > 1 ? `<a class="prev" rel="prev" href="${urlFor(cur - 1)}" aria-label="Previous">\u2039</a>` : '<span class="prev disabled">\u2039</span>';
  const nextHtml = cur < totalPages ? `<a class="next" rel="next" href="${urlFor(cur + 1)}" aria-label="Next">\u203A</a>` : '<span class="next disabled">\u203A</span>';
  const firstHtml = cur > 1 ? `<a class="first" href="${urlFor(1)}" aria-label="First">\xAB</a>` : '<span class="first disabled">\xAB</span>';
  const lastHtml = cur < totalPages ? `<a class="last" href="${urlFor(totalPages)}" aria-label="Last">\xBB</a>` : '<span class="last disabled">\xBB</span>';
  const links = buildPageLinks(cur, totalPages, urlFor);
  const info = opts.showInfo ? `<span class="page-info">${cur} / ${totalPages}</span>` : "";
  return `<nav class="pagination" aria-label="Pagination">${firstHtml}${prevHtml}${links}${nextHtml}${lastHtml}${info}</nav>`;
}
function parsePage(n) {
  if (!/^\d+$/.test(String(n || ""))) return null;
  const p = parseInt(n, 10);
  if (p < 1) return null;
  return p;
}
var CATS_ZH = [
  ["/virtual-credit-card/", "\u865A\u62DF\u5361\u8BC4\u6D4B"],
  ["/cross-border-collections/", "\u8DE8\u5883\u652F\u4ED8\u6536\u6B3E"],
  ["/technology-share/", "\u6280\u672F\u6559\u7A0B"],
  ["/artificial-intelligence/", "AI \u5DE5\u5177"],
  ["/seo/", "SEO \u4E0E\u6D41\u91CF"],
  ["/social-media/", "\u793E\u5A92\u8FD0\u8425\u5916\u8D38"],
  ["/cryptocurrency/", "\u52A0\u5BC6\u8D27\u5E01"],
  ["/resource-share/", "\u514D\u8D39\u8D44\u6E90"]
];
var CATS_EN = [
  ["/en/virtual-credit-card/", "Virtual Cards"],
  ["/en/cross-border-collections/", "Payments"],
  ["/en/technology-share/", "Tech"],
  ["/en/artificial-intelligence/", "AI Tools"],
  ["/en/seo/", "SEO"],
  ["/en/social-media/", "Social & Trade"],
  ["/en/cryptocurrency/", "Crypto"],
  ["/en/resource-share/", "Free Resources"]
];
var CATEGORY_NAMES_EN = {
  "virtual-credit-card": "Virtual Card Reviews",
  "cross-border-collections": "Cross-Border Payments",
  "technology-share": "Tech Tutorials",
  "artificial-intelligence": "AI Tools",
  "seo": "SEO & Traffic",
  "social-media": "Social Media & Foreign Trade",
  "cryptocurrency": "Cryptocurrency",
  "resource-share": "Free Resources & Tools"
};
function langSwitchHref(lang, curPath) {
  const en = lang === "en";
  if (!curPath) return en ? "/" : "/en/";
  let [p, query] = curPath.split("?");
  p = p.replace(/^\/+|\/+$/g, "");
  if (!p) {
    const q = query ? "?" + query : "";
    return en ? "/" + q : "/en/" + q;
  }
  let out;
  if (en) {
    if (p.startsWith("en/")) p = p.slice(3);
    out = "/" + p + "/";
  } else {
    out = "/en/" + p + "/";
  }
  return query ? out + "?" + query : out;
}
function layout(lang, title, desc, body, opts = {}) {
  const base = baseOf(lang);
  const cats = lang === "en" ? CATS_EN : CATS_ZH;
  const catLinks = cats.map(([u, n]) => `<a href="${u}">${n}</a>`).join("");
  const altHref = langSwitchHref(lang, opts.path);
  const altLabel = lang === "en" ? "\u4E2D\u6587" : "English";
  const searchPlaceholder = lang === "en" ? "Search..." : "\u641C\u7D22\u6587\u7AE0...";
  const homeLabel = lang === "en" ? "Home" : "\u9996\u9875";
  const canonical = opts.canonical || base + (opts.path || "");
  const sidebar = opts.noSidebar ? "" : `
  <aside class="sidebar">
    <div class="widget author-card">
      <div class="author-avatar">\u6728</div>
      <div class="author-name">${lang === "en" ? "Moyi Foreign Trade" : "\u6728\u6613\u5916\u8D38"}</div>
      <p>${lang === "en" ? "Virtual card reviews & cross-border payment guides." : "\u865A\u62DF\u4FE1\u7528\u5361\u5B9E\u6D4B\u8BC4\u6D4B\uFF0C\u8DE8\u5883\u7535\u5546\u652F\u4ED8\u7ECF\u9A8C\u5206\u4EAB\u3002"}</p>
    </div>
    <div class="widget">
      <h3>${lang === "en" ? "Recent Posts" : "\u6700\u65B0\u6587\u7AE0"}</h3>
      ${opts.recentPosts || ""}
    </div>
    <div class="widget">
      <h3>${lang === "en" ? "Contact" : "\u8054\u7CFB\u65B9\u5F0F"}</h3>
      <ul class="contact-list">
        <li>\u{1F4EE} TG\uFF1A${lang === "en" ? "VirtualCardx" : "@VirtualCardx"}</li>
      </ul>
    </div>
  </aside>`;
  return `<!DOCTYPE html>
<html lang="${lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="icon" type="image/png" href="/media/1556-cropped-logo.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
<link rel="canonical" href="${SITE}${canonical}">
<link rel="alternate" hreflang="${lang === "en" ? "zh" : "en"}" href="${SITE}${altHref}">
<link rel="alternate" hreflang="${lang}" href="${SITE}${canonical}">
<link rel="alternate" hreflang="x-default" href="${SITE}${lang === "zh" ? canonical : altHref}">
<meta property="og:type" content="${opts.ogType || "website"}">
<meta property="og:site_name" content="VirtualCardx">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${SITE}${canonical}">
<meta property="og:locale" content="${lang === "en" ? "en_US" : "zh_CN"}">
<meta name="twitter:card" content="summary">
${opts.jsonld ? `<script type="application/ld+json">${JSON.stringify(opts.jsonld)}<\/script>` : ""}
${opts.extraHead || ""}
<style>${CSS}</style>
</head>
<body>
<header class="site-header">
  <div class="header-inner">
    <a class="logo" href="${base}"><img class="logo-img" src="/media/1556-cropped-logo.png" alt="VirtualCardx" width="128" height="45"> VirtualCardx</a>
    <button class="menu-toggle" aria-label="${lang === "en" ? "Menu" : "\u83DC\u5355"}" aria-expanded="false">
      <span class="bar"></span><span class="bar"></span><span class="bar"></span>
    </button>
    <nav class="main-nav" id="mainNav">
      <a href="${base}">${homeLabel}</a>
      <a href="${base}virtual-credit-card/">${lang === "en" ? "Virtual Card Reviews" : "\u865A\u62DF\u5361\u8BC4\u6D4B"}</a>
      <a href="${base}about/">${lang === "en" ? "About" : "\u5173\u4E8E"}</a>
      <a href="${base}contact/">${lang === "en" ? "Contact" : "\u8054\u7CFB"}</a>
    </nav>
    <div class="nav-right">
      <form class="search-box" action="${base}" method="get">
        <input type="search" name="s" placeholder="${searchPlaceholder}" aria-label="Search">
        <button type="submit">${lang === "en" ? "Go" : "\u641C\u7D22"}</button>
      </form>
      <a class="lang-switch" href="${altHref}">${altLabel}</a>
    </div>
  </div>
</header>
<div class="cat-bar"><div class="cat-bar-inner">${catLinks}</div></div>
<div class="layout${opts.noSidebar ? " no-sidebar" : ""}">
  <main>${body}</main>
  ${sidebar}
</div>
<footer class="site-footer">
  <div class="footer-inner">
    <div class="footer-col">
      <h4>VirtualCardx</h4>
      <a href="${base}">${homeLabel}</a>
      <a href="${base}about/">${lang === "en" ? "About" : "\u5173\u4E8E\u672C\u7AD9"}</a>
      <a href="${base}contact/">${lang === "en" ? "Contact" : "\u8054\u7CFB\u7AD9\u957F"}</a>
    </div>
    <div class="footer-col">
      <h4>${lang === "en" ? "Categories" : "\u5206\u7C7B"}</h4>
      ${catLinks}
    </div>
    <div class="footer-col">
      <h4>${lang === "en" ? "Legal" : "\u6CD5\u5F8B"}</h4>
      <a href="${base}terms/">${lang === "en" ? "Terms of Use" : "\u4F7F\u7528\u6761\u6B3E"}</a>
      <a href="${base}privacy-policy/">${lang === "en" ? "Privacy Policy" : "\u9690\u79C1\u653F\u7B56"}</a>
    </div>
  </div>
  <div class="footer-bottom">\xA9 ${(/* @__PURE__ */ new Date()).getFullYear()} VirtualCardx \xB7 ${lang === "en" ? "Virtual credit card reviews" : "\u865A\u62DF\u4FE1\u7528\u5361\u8BC4\u6D4B"} \xB7 All rights reserved</div>
</footer>
<script>
(function(){
  var btn=document.querySelector('.menu-toggle'), nav=document.getElementById('mainNav');
  if(!btn||!nav) return;
  btn.addEventListener('click', function(e){
    e.stopPropagation();
    var open=nav.classList.toggle('open');
    btn.setAttribute('aria-expanded', open?'true':'false');
  });
  // \u70B9\u51FB\u83DC\u5355\u9879\u540E\u6536\u8D77
  nav.querySelectorAll('a').forEach(function(a){
    a.addEventListener('click', function(){ nav.classList.remove('open'); btn.setAttribute('aria-expanded','false'); });
  });
  // \u70B9\u51FB\u9875\u9762\u5176\u4ED6\u533A\u57DF\u5173\u95ED
  document.addEventListener('click', function(e){
    if(!nav.classList.contains('open')) return;
    if(!nav.contains(e.target) && !btn.contains(e.target)){
      nav.classList.remove('open'); btn.setAttribute('aria-expanded','false');
    }
  });
  // \u83DC\u5355\u5C55\u5F00\u65F6\u9501\u5B9A\u6EDA\u52A8 (\u53EF\u9009)
})();
<\/script>
</body>
</html>`;
}
async function recentPosts(c, lang, limit = 5) {
  const { results } = await c.env.DB.prepare(
    'SELECT slug, title, path FROM posts WHERE lang = ? AND status="publish" ORDER BY date DESC LIMIT ?'
  ).bind(lang, limit).all();
  const base = baseOf(lang);
  const items = results.map((p) => `<li><a href="${base}${p.path}/">${esc(p.title)}</a></li>`).join("");
  return `<ul class="recent-list">${items}</ul>`;
}
async function rewriteImages(c, html, fallbackAlt = "") {
  const re = /\/wp-content\/uploads\/[^"'\s)]+/g;
  const found = [...new Set(html.match(re) || [])];
  for (const oldPath of found) {
    let fname = oldPath.split("/").pop().split("?")[0];
    fname = fname.replace(/-\d+x\d+(?=\.[a-zA-Z]+$)/, "");
    const { results } = await c.env.DB.prepare("SELECT path FROM media WHERE filename = ? LIMIT 1").bind(fname).all();
    if (results.length) html = html.split(oldPath).join("/" + results[0].path);
  }
  html = html.split("https://virtualcardx.com/media/").join("/media/");
  html = html.split("https://virtualcardx.com/wp-content/uploads/").join("/wp-content/uploads/");
  html = html.replace(/<img([^>]*?)\sdata-src="([^"]*)"([^>]*)>/g, (m, pre, src, post) => {
    pre = pre.replace(/\ssrc="[^"]*"/, "");
    post = post.replace(/\ssrc="[^"]*"/, "");
    return `<img${pre} src="${src}"${post}>`;
  });
  html = html.replace(/<img([^>]*?)\sdata-srcset="([^"]*)"([^>]*)>/g, (m, pre, srcset, post) => {
    if (/srcset="/.test(pre + post)) return m;
    return `<img${pre} srcset="${srcset}"${post}>`;
  });
  const imageTags = [...new Set(html.match(/<img\b[^>]*>/gi) || [])];
  for (const tag of imageTags) {
    const srcMatch = tag.match(/\ssrc=["']\/?([^"']+)["']/i);
    if (!srcMatch || !srcMatch[1].startsWith("media/")) continue;
    let mediaPath;
    try {
      mediaPath = decodeURIComponent(srcMatch[1]);
    } catch {
      mediaPath = srcMatch[1];
    }
    const { results } = await c.env.DB.prepare("SELECT width, height, alt FROM media WHERE path = ? LIMIT 1").bind(mediaPath).all();
    if (!results.length) continue;
    const media = results[0];
    let updated = tag;
    if (media.width && media.height && !/\swidth=/i.test(updated)) {
      updated = updated.replace(/\s*\/?>$/, ` width="${media.width}" height="${media.height}">`);
    }
    const alt = esc(media.alt || fallbackAlt);
    if (alt) {
      if (/\salt=["']\s*["']/i.test(updated)) updated = updated.replace(/\salt=["']\s*["']/i, ` alt="${alt}"`);
      else if (!/\salt=/i.test(updated)) updated = updated.replace(/\s*\/?>$/, ` alt="${alt}">`);
    }
    html = html.split(tag).join(updated);
  }
  let imgCount = 0;
  html = html.replace(/<img(?![^>]*loading=)[^>]*>/g, (m) => {
    imgCount++;
    if (imgCount === 1) {
      return m.replace(/(<img[^>]*?)(\/?>)$/, '$1 fetchpriority="high" decoding="async">');
    }
    return m.replace(/(<img[^>]*?)(\/?>)$/, '$1 loading="lazy" decoding="async">');
  });
  return html;
}
app.get("/media/*", async (c) => {
  const key = c.req.path.replace("/media/", "");
  const accept = c.req.header("Accept") || "";
  const wantsWebp = /image\/webp/i.test(accept);
  if (wantsWebp) {
    const base = key.replace(/\.(jpg|jpeg|png)$/i, "");
    const webpObj = await c.env.R2.get(`media-webp/${base}.webp`);
    if (webpObj) {
      const headers2 = new Headers();
      webpObj.writeHttpMetadata(headers2);
      headers2.set("Cache-Control", "public, max-age=2592000, immutable");
      headers2.set("Vary", "Accept");
      headers2.set("Content-Type", "image/webp");
      return new Response(webpObj.body, { headers: headers2 });
    }
  }
  const obj = await c.env.R2.get("media/" + key);
  if (!obj) return c.notFound();
  const headers = new Headers();
  obj.writeHttpMetadata(headers);
  headers.set("Cache-Control", "public, max-age=2592000, immutable");
  headers.set("Vary", "Accept");
  return new Response(obj.body, { headers });
});
app.get("/search", async (c) => {
  const lang = getLang(c.req.path);
  const q = (c.req.query("q") || c.req.query("s") || "").trim();
  const base = baseOf(lang);
  if (!q) return c.redirect(base, 302);
  const { results } = await c.env.DB.prepare(
    'SELECT slug, title, path, date FROM posts WHERE lang = ? AND status="publish" AND (title LIKE ? OR content LIKE ?) ORDER BY date DESC LIMIT 20'
  ).bind(lang, `%${q}%`, `%${q}%`).all();
  const items = results.map((p) => `<li><a href="${base}${p.path}/">${esc(p.title)}</a> <time>${esc(fmtDate(p.date))}</time></li>`).join("") || "<li>No results found</li>";
  const body = `<h1 class="page-title">${lang === "en" ? "Search" : "\u641C\u7D22"}: ${esc(q)}</h1><ul class="post-list">${items}</ul>`;
  return c.html(layout(lang, `${q} - VirtualCardx`, `Search results for ${q}`, body, { noSidebar: true, path: `?s=${encodeURIComponent(q)}` }));
});
async function handleSearch(c, lang, q) {
  const base = baseOf(lang);
  const { results } = await c.env.DB.prepare(
    'SELECT slug, title, excerpt, path, date, featured_media, translation_id FROM posts WHERE lang = ? AND status="publish" AND (title LIKE ? OR content LIKE ?) ORDER BY date DESC LIMIT 20'
  ).bind(lang, `%${q}%`, `%${q}%`).all();
  const items = [];
  for (const p of results) {
    let imgHtml = '<div class="no-img">\u{1F4B3}</div>';
    let fm = p.featured_media;
    if (lang === "en" && !fm && p.translation_id) {
      const zhRes = await c.env.DB.prepare(
        "SELECT featured_media FROM posts WHERE lang = ? AND translation_id = ? AND featured_media IS NOT NULL AND featured_media != 0 LIMIT 1"
      ).bind("zh", p.translation_id).all();
      if (zhRes.results.length) fm = zhRes.results[0].featured_media;
    }
    if (fm) {
      const mRes = await c.env.DB.prepare("SELECT path, width, height FROM media WHERE id = ?").bind(fm).all();
      if (mRes.results.length) {
        const m = mRes.results[0];
        imgHtml = `<img src="/${m.path}" alt="${esc(p.title)}"${m.width && m.height ? ` width="${m.width}" height="${m.height}"` : ""} loading="lazy" decoding="async">`;
      }
    }
    const excerpt = excerptText(p.excerpt);
    items.push(`<article class="post-card">
      <a class="post-thumb" href="${base}${p.path}/">${imgHtml}</a>
      <div class="post-body">
        <div class="post-meta"><span>${esc(fmtDate(p.date))}</span></div>
        <h2 class="post-title"><a href="${base}${p.path}/">${esc(p.title)}</a></h2>
        <div class="post-excerpt">${esc(excerpt)}</div>
      </div>
    </article>`);
  }
  const listHtml = items.join("") || `<p style="padding:20px;color:var(--text-light)">${lang === "en" ? "No results found" : "\u6CA1\u6709\u627E\u5230\u76F8\u5173\u7ED3\u679C"}</p>`;
  const body = `<h1 class="page-title">${lang === "en" ? "Search" : "\u641C\u7D22"}: ${esc(q)}</h1>${listHtml}`;
  return layout(lang, `${q} - VirtualCardx`, `Search results for ${q}`, body, { noSidebar: true, path: `?s=${encodeURIComponent(q)}` });
}
async function renderCategory(c, lang, parentSlug, childSlug, page) {
  const base = baseOf(lang);
  let catRes;
  if (childSlug) {
    const { results: parents } = await c.env.DB.prepare("SELECT id FROM categories WHERE slug = ?").bind(parentSlug).all();
    if (!parents.length) return null;
    catRes = await c.env.DB.prepare("SELECT id, name FROM categories WHERE slug = ? AND parent = ?").bind(childSlug, parents[0].id).all();
  } else {
    catRes = await c.env.DB.prepare("SELECT id, name FROM categories WHERE slug = ?").bind(parentSlug).all();
  }
  if (!catRes.results.length) return null;
  const catId = catRes.results[0].id;
  const { results: posts } = await c.env.DB.prepare(
    'SELECT slug, title, path, date, category_ids, featured_media, translation_id, excerpt FROM posts WHERE lang = ? AND status="publish" ORDER BY date DESC'
  ).bind(lang).all();
  let zhCatMap = {};
  let zhAll = [];
  if (lang === "en") {
    const zhPosts = await c.env.DB.prepare(
      'SELECT translation_id, category_ids, slug, title, path, date, featured_media, excerpt FROM posts WHERE lang = ? AND status="publish"'
    ).bind("zh").all();
    zhAll = zhPosts.results;
    for (const zp of zhPosts.results) {
      if (zp.translation_id) zhCatMap[zp.translation_id] = zp.category_ids;
    }
  }
  let filtered = posts.filter((p) => {
    let catIds = p.category_ids;
    if (lang === "en" && (!catIds || catIds === "[]") && p.translation_id && zhCatMap[p.translation_id]) {
      catIds = zhCatMap[p.translation_id];
    }
    try {
      return (JSON.parse(catIds || "[]") || []).includes(catId);
    } catch {
      return false;
    }
  });
  if (lang === "en") {
    const enTids = new Set(filtered.filter((p) => p.translation_id).map((p) => p.translation_id));
    const zhFallback = zhAll.filter((zp) => {
      if (zp.translation_id && enTids.has(zp.translation_id)) return false;
      try {
        return (JSON.parse(zp.category_ids || "[]") || []).includes(catId);
      } catch {
        return false;
      }
    }).map((zp) => ({
      slug: zp.slug,
      title: zp.title,
      path: zp.path,
      date: zp.date,
      excerpt: zp.excerpt,
      featured_media: zp.featured_media,
      translation_id: null,
      isZhFallback: true
    }));
    filtered = [...filtered, ...zhFallback];
  }
  const perPage = 10;
  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  if (page > totalPages) return null;
  const pageItems = filtered.slice((page - 1) * perPage, page * perPage);
  const catPath = childSlug ? `${parentSlug}/${childSlug}` : parentSlug;
  const catUrl = `${base}${catPath}/`;
  const items = [];
  for (const p of pageItems) {
    let imgHtml = '<div class="no-img">\u{1F4B3}</div>';
    let fm = p.featured_media;
    if (lang === "en" && !fm && p.translation_id) {
      const zhRes = await c.env.DB.prepare(
        "SELECT featured_media FROM posts WHERE lang = ? AND translation_id = ? AND featured_media IS NOT NULL AND featured_media != 0 LIMIT 1"
      ).bind("zh", p.translation_id).all();
      if (zhRes.results.length) fm = zhRes.results[0].featured_media;
    }
    if (fm) {
      const mRes = await c.env.DB.prepare("SELECT path, width, height FROM media WHERE id = ?").bind(fm).all();
      if (mRes.results.length) {
        const m = mRes.results[0];
        imgHtml = `<img src="/${m.path}" alt="${esc(p.title)}"${m.width && m.height ? ` width="${m.width}" height="${m.height}"` : ""} loading="lazy" decoding="async">`;
      }
    }
    let catExcerpt = excerptText(p.excerpt);
    if (lang === "en" && !catExcerpt && p.translation_id) {
      const zhExRes = await c.env.DB.prepare(
        "SELECT excerpt FROM posts WHERE lang = ? AND translation_id = ? AND excerpt IS NOT NULL AND excerpt != '' LIMIT 1"
      ).bind("zh", p.translation_id).all();
      if (zhExRes.results.length) catExcerpt = excerptText(zhExRes.results[0].excerpt);
    }
    items.push(`<article class="post-card">
      <a class="post-thumb" href="${base}${p.path}/">${imgHtml}</a>
      <div class="post-body">
        <div class="post-meta"><span>${esc(fmtDate(p.date))}</span>${p.isZhFallback ? '<span class="cat">' + (lang === "en" ? "ZH" : "\u4E2D") + "</span>" : ""}</div>
        <h2 class="post-title"><a href="${base}${p.path}/">${esc(p.title)}</a></h2>
        ${catExcerpt ? `<div class="post-excerpt">${esc(catExcerpt)}</div>` : ""}
      </div>
    </article>`);
  }
  const listHtml = items.join("") || '<p style="padding:20px;color:var(--text-light)">No posts</p>';
  const urlFor = (p) => p === 1 ? catUrl : `${catUrl}page/${p}/`;
  const pagination = renderPagination(page, totalPages, urlFor, { showInfo: true });
  let name = catRes.results[0].name;
  if (lang === "en") {
    const nameSlug = childSlug || parentSlug;
    name = CATEGORY_NAMES_EN[nameSlug] || name;
  }
  const body = `<nav class="breadcrumbs" aria-label="Breadcrumb"><a href="${base}">${lang === "en" ? "Home" : "\u9996\u9875"}</a> / <span>${esc(name)}</span></nav><h1 class="page-title">${esc(name)}${page > 1 ? lang === "en" ? ` \u2014 Page ${page}` : `\u7B2C ${page} \u9875` : ""}</h1>${listHtml}${pagination}`;
  const canonicalPath = page > 1 ? `${catPath}/page/${page}/` : `${catPath}/`;
  const canonicalUrl = `${SITE}${base}${canonicalPath}`;
  const categoryJsonld = {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "CollectionPage", "@id": `${canonicalUrl}#webpage`, url: canonicalUrl, name, inLanguage: lang === "en" ? "en" : "zh-CN", isPartOf: { "@id": `${SITE}${base}#website` } },
      { "@type": "BreadcrumbList", itemListElement: [
        { "@type": "ListItem", position: 1, name: lang === "en" ? "Home" : "\u9996\u9875", item: `${SITE}${base}` },
        { "@type": "ListItem", position: 2, name, item: canonicalUrl }
      ] }
    ]
  };
  const pageTitle = page > 1 ? lang === "en" ? `${name} \u2014 Page ${page} - VirtualCardx` : `${name}\u7B2C ${page} \u9875 - VirtualCardx` : `${name} - VirtualCardx`;
  const pageDesc = page > 1 ? lang === "en" ? `Browse ${name} articles on page ${page}.` : `${name}\u6587\u7AE0\u5217\u8868\u7B2C ${page} \u9875\u3002` : `${name} category on VirtualCardx`;
  return layout(lang, pageTitle, pageDesc, body, { noSidebar: true, path: canonicalPath, jsonld: categoryJsonld });
}
async function renderHomePage(c, lang, page) {
  const base = baseOf(lang);
  const perPage = 10;
  const offset = (page - 1) * perPage;
  let total = 0;
  let results = [];
  if (lang === "en") {
    const isRealArticle = (p) => /^\d{4}\/\d{2}\/\d{2}\//.test(p.path) || !p.path.includes("/") && p.translation_id != null;
    results = (await c.env.DB.prepare(
      "SELECT slug, title, excerpt, path, date, featured_media, translation_id FROM posts WHERE lang = ? AND status = 'publish' ORDER BY date DESC"
    ).bind("en").all()).results.filter(isRealArticle);
    results.sort((a, b) => {
      const ts = (d) => {
        const s = String(d || "");
        if (/^\d{4}-\d{2}-\d{2}/.test(s)) return Date.parse(s.slice(0, 10));
        return Date.parse(s) || 0;
      };
      return ts(b.date) - ts(a.date);
    });
    total = results.length;
  } else {
    const { results: totalRes } = await c.env.DB.prepare('SELECT COUNT(*) as n FROM posts WHERE lang = ? AND status = "publish"').bind(lang).all();
    total = totalRes[0].n;
    const { results: r } = await c.env.DB.prepare(
      'SELECT slug, title, excerpt, path, date, featured_media, translation_id FROM posts WHERE lang = ? AND status = "publish" ORDER BY date DESC'
    ).bind(lang).all();
    results = r;
  }
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  if (page > totalPages) return null;
  const pageItems = results.slice(offset, offset + perPage);
  const cards = [];
  for (const p of pageItems) {
    let imgHtml = '<div class="no-img">\u{1F4B3}</div>';
    let fm = p.featured_media;
    if (lang === "en" && !fm && p.translation_id) {
      const zhRes = await c.env.DB.prepare(
        "SELECT featured_media FROM posts WHERE lang = ? AND translation_id = ? AND featured_media IS NOT NULL AND featured_media != 0 LIMIT 1"
      ).bind("zh", p.translation_id).all();
      if (zhRes.results.length) fm = zhRes.results[0].featured_media;
    }
    if (fm) {
      const mRes = await c.env.DB.prepare("SELECT path, width, height FROM media WHERE id = ?").bind(fm).all();
      const isFirst = page === 1 && cards.length === 0;
      if (mRes.results.length) {
        const m = mRes.results[0];
        const dims = m.width && m.height ? ` width="${m.width}" height="${m.height}"` : "";
        imgHtml = isFirst ? `<img src="/${m.path}" alt="${esc(p.title)}"${dims} fetchpriority="high" decoding="async">` : `<img src="/${m.path}" alt="${esc(p.title)}"${dims} loading="lazy" decoding="async">`;
      }
    }
    const excerpt = excerptText(p.excerpt);
    cards.push(`<article class="post-card">
      <a class="post-thumb" href="${base}${p.path}/">${imgHtml}</a>
      <div class="post-body">
        <div class="post-meta"><span class="cat">${lang === "en" ? "Review" : "\u8BC4\u6D4B"}</span><span>${esc(fmtDate(p.date))}</span></div>
        <h2 class="post-title"><a href="${base}${p.path}/">${esc(p.title)}</a></h2>
        <div class="post-excerpt">${esc(excerpt)}</div>
      </div>
    </article>`);
  }
  const urlFor = (p) => p === 1 ? base : `${base}page/${p}/`;
  const pagination = renderPagination(page, totalPages, urlFor, { showInfo: true });
  const recent = await recentPosts(c, lang);
  const heroSection = page === 1 ? `<section class="home-hero"><h1>${lang === "en" ? "Virtual Credit Card Reviews &amp; Recommendations \u2014 60+ Platforms Tested" : "\u865A\u62DF\u4FE1\u7528\u5361\u8BC4\u6D4B\u4E0E\u63A8\u8350 \u2014 60+ \u5E73\u53F0\u5B9E\u6D4B"}</h1><p>${lang === "en" ? "Independent, hands-on reviews of virtual credit cards for cross-border payments: fees, KYC, funding methods, and real-world usage." : "\u8DE8\u5883\u652F\u4ED8\u865A\u62DF\u4FE1\u7528\u5361\u5B9E\u6D4B\u8BC4\u6D4B\uFF1A\u8D39\u7387\u3001KYC\u3001\u5F00\u5361\u4E0E\u5145\u503C\u65B9\u5F0F\u3001\u98CE\u63A7\u4E0E\u771F\u5B9E\u4F7F\u7528\u4F53\u9A8C\u3002"}</p></section>` : "";
  const siteUrl = SITE + base;
  const homeJsonld = page === 1 ? {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": `${siteUrl}#website`,
        name: "VirtualCardx",
        url: siteUrl,
        description: lang === "en" ? "Independent virtual credit card reviews and recommendations." : "\u865A\u62DF\u4FE1\u7528\u5361\u5B9E\u6D4B\u8BC4\u6D4B\u4E0E\u63A8\u8350\u3002",
        inLanguage: lang === "en" ? "en" : "zh-CN",
        publisher: { "@id": `${SITE}/#organization` },
        potentialAction: { "@type": "SearchAction", target: { "@type": "EntryPoint", urlTemplate: `${siteUrl}?s={search_term_string}` }, "query-input": "required name=search_term_string" }
      },
      { "@type": "Organization", "@id": `${SITE}/#organization`, name: "VirtualCardx", url: SITE + "/", logo: { "@type": "ImageObject", url: `${SITE}/media/1556-cropped-logo.png`, width: 128, height: 45 } }
    ]
  } : void 0;
  const body = heroSection + (page > 1 ? `<h1 class="page-title">${lang === "en" ? `Latest Articles \u2014 Page ${page}` : `\u6700\u65B0\u6587\u7AE0\u7B2C ${page} \u9875`}</h1>` : "") + cards.join("") + pagination;
  const pageTitle = page > 1 ? lang === "en" ? `Latest Articles \u2014 Page ${page} - VirtualCardx` : `\u6700\u65B0\u6587\u7AE0\u7B2C ${page} \u9875 - VirtualCardx` : lang === "en" ? "VirtualCardx | Virtual Credit Card Reviews & Recommendations" : "\u865A\u62DF\u4FE1\u7528\u5361\u5E73\u53F0\u63A8\u8350\u4E0E\u8BC4\u6D4B | VirtualCardx 60+\u5E73\u53F0\u5B9E\u6D4B";
  const pageDesc = page > 1 ? lang === "en" ? `Browse the latest VirtualCardx reviews and guides on page ${page}.` : `VirtualCardx \u6700\u65B0\u8BC4\u6D4B\u548C\u6559\u7A0B\u7B2C ${page} \u9875\u3002` : lang === "en" ? "Independent virtual credit card reviews, fees comparison, KYC and recommendations for cross-border payments." : "\u865A\u62DF\u4FE1\u7528\u5361\u5B9E\u6D4B\u8BC4\u6D4B\u4E0E\u63A8\u8350\uFF1A60+\u5E73\u53F0\u8D39\u7387\u3001KYC\u3001\u8FD4\u73B0\u3001\u5B89\u5168\u6027\u5168\u9762\u5BF9\u6BD4\uFF0C\u8DE8\u5883\u652F\u4ED8\u4E0E\u5E7F\u544A\u6295\u653E\u573A\u666F\u5B9E\u6D4B\u3002";
  return layout(
    lang,
    pageTitle,
    pageDesc,
    body,
    { recentPosts: recent, path: page > 1 ? `page/${page}/` : "", jsonld: homeJsonld }
  );
}
app.get("/page/:n", async (c) => {
  const lang = getLang(c.req.path);
  const page = parsePage(c.req.param("n"));
  if (page === null) return c.notFound();
  if (page === 1) return c.redirect(lang === "en" ? "/en/" : "/", 301);
  const html = await renderHomePage(c, lang, page);
  return html ? c.html(html) : c.notFound();
});
app.get("/en/page/:n", async (c) => {
  const page = parsePage(c.req.param("n"));
  if (page === null) return c.notFound();
  if (page === 1) return c.redirect("/en/", 301);
  const html = await renderHomePage(c, "en", page);
  return html ? c.html(html) : c.notFound();
});
app.get("/category/:slug", async (c) => {
  const slug = c.req.param("slug");
  if (slug === "virutal-credit-card") return c.redirect("/virtual-credit-card/", 301);
  const { results } = await c.env.DB.prepare("SELECT id FROM categories WHERE slug = ? AND parent = 0").bind(slug).all();
  if (!results.length) return c.notFound();
  return c.redirect(`/${slug}/`, 301);
});
app.get("/en/category/:slug", async (c) => {
  const slug = c.req.param("slug");
  if (slug === "virutal-credit-card") return c.redirect("/en/virtual-credit-card/", 301);
  const { results } = await c.env.DB.prepare("SELECT id FROM categories WHERE slug = ? AND parent = 0").bind(slug).all();
  if (!results.length) return c.notFound();
  return c.redirect(`/en/${slug}/`, 301);
});
app.get("/virutal-credit-card/:rest*", (c) => {
  const rest = c.req.path.replace("/virutal-credit-card", "");
  if (rest.startsWith("/virtual-credit-card-platform-summary")) return c.redirect("/virtual-credit-card/", 301);
  return c.redirect(`/virtual-credit-card${rest}`, 301);
});
app.get("/virutal-credit-card", (c) => c.redirect("/virtual-credit-card/", 301));
app.get("/en/virutal-credit-card/:rest*", (c) => {
  const rest = c.req.path.replace("/en/virutal-credit-card", "");
  if (rest.startsWith("/virtual-credit-card-platform-summary")) return c.redirect("/en/virtual-credit-card/", 301);
  return c.redirect(`/en/virtual-credit-card${rest}`, 301);
});
app.get("/en/virutal-credit-card", (c) => c.redirect("/en/virtual-credit-card/", 301));
app.get("/favicon.ico", (c) => c.redirect("/media/1556-cropped-logo.png", 301));
app.get("/sitemap.xml", async (c) => {
  const { results } = await c.env.DB.prepare('SELECT path, lang, modified, translation_id FROM posts WHERE status = "publish"').all();
  const canonicalPosts = results.filter((p) => {
    const decodedPath = "/" + (p.lang === "en" ? "en/" : "") + p.path.replace(/^\/+|\/+$/g, "");
    if (OLD_URL_REDIRECTS[decodedPath]) return false;
    const postPath = decodedPath.replace(/^\/en\//, "").replace(/^\//, "");
    if (!/^\d{4}\/\d{2}\/\d{2}\//.test(p.path) && (p.path.includes("/") || p.translation_id == null)) return false;
    return !OLD_CAT_REDIRECTS.some(([from]) => postPath === from.slice(1) || postPath.startsWith(from.slice(1) + "/"));
  });
  const postUrls = canonicalPosts.map((p) => {
    const base = p.lang === "en" ? "/en/" : "/";
    const lastmod = (p.modified || "").slice(0, 10);
    return `<url><loc>${SITE}${base}${p.path}/</loc>${lastmod ? `<lastmod>${lastmod}</lastmod>` : ""}</url>`;
  }).join("");
  const staticSlugs = ["about", "contact", "terms", "privacy-policy", "technology-share", "virtual-credit-card", "cryptocurrency", "cross-border-collections", "social-media", "artificial-intelligence", "seo", "resource-share"];
  const staticUrls = ["/", "/en/", ...staticSlugs.flatMap((slug) => [`/${slug}/`, `/en/${slug}/`])].map((path) => `<url><loc>${SITE}${path}</loc></url>`).join("");
  return c.body(
    `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${staticUrls}${postUrls}</urlset>`,
    { headers: { "Content-Type": "application/xml" } }
  );
});
app.get("/robots.txt", (c) => c.text("User-agent: *\nAllow: /\nSitemap: " + SITE + "/sitemap.xml"));
app.get("/llms.txt", async (c) => {
  const { results } = await c.env.DB.prepare(
    "SELECT path, title, excerpt FROM posts WHERE status='publish' AND lang='zh' ORDER BY date DESC LIMIT 40"
  ).all();
  const { results: enPosts } = await c.env.DB.prepare(
    "SELECT path, title, excerpt FROM posts WHERE status='publish' AND lang='en' ORDER BY date DESC LIMIT 40"
  ).all();
  const lines = [];
  lines.push("# VirtualCardX");
  lines.push("");
  lines.push("> \u865A\u62DF\u4FE1\u7528\u5361\u8BC4\u6D4B\u4E0E\u8DE8\u5883\u652F\u4ED8\u6307\u5357:\u5B9E\u6D4B\u5404\u5E73\u53F0(\u5F00\u5361/\u8D39\u7387/\u5145\u503C/\u98CE\u63A7),\u9762\u5411\u6D77\u5916\u8BA2\u9605\u3001\u5E7F\u544A\u6295\u653E\u4E0E\u6536\u6B3E\u7684\u7528\u6237\u3002\u82F1\u6587\u7248 /en/\u3002");
  lines.push("");
  lines.push("## \u5206\u7C7B");
  lines.push("");
  lines.push("- [\u865A\u62DF\u5361\u8BC4\u6D4B](https://virtualcardx.com/virtual-credit-card/): \u5404\u5E73\u53F0\u5B9E\u6D4B\u8BC4\u5206");
  lines.push("- [\u8DE8\u5883\u652F\u4ED8\u4E0E\u6536\u6B3E](https://virtualcardx.com/cross-border-collections/): \u6536\u6B3E\u65B9\u6848");
  lines.push("- [SEO \u4E0E\u6D41\u91CF](https://virtualcardx.com/seo/): \u72EC\u7ACB\u7AD9\u83B7\u5BA2");
  lines.push("- [\u514D\u8D39\u8D44\u6E90](https://virtualcardx.com/resource-share/): \u9650\u65F6\u514D\u8D39\u989D\u5EA6");
  lines.push("");
  lines.push("## \u6700\u65B0\u6587\u7AE0(\u4E2D\u6587)");
  lines.push("");
  for (const p of results) {
    const u = SITE + "/" + String(p.path || "").replace(/^\/+|\/+$/g, "") + "/";
    const t = (p.title || "").replace(/\s+/g, " ").trim();
    const d = (p.excerpt || "").replace(/\s+/g, " ").trim().slice(0, 90);
    lines.push(`- [${t}](${u})${d ? ": " + d : ""}`);
  }
  lines.push("");
  lines.push("## Latest Posts (English)");
  lines.push("");
  for (const p of enPosts.slice(0, 20)) {
    const u = SITE + "/en/" + String(p.path || "").replace(/^\/+|\/+$/g, "") + "/";
    const t = (p.title || "").replace(/\s+/g, " ").trim();
    lines.push(`- [${t}](${u})`);
  }
  return c.text(lines.join("\n"), 200, { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=3600" });
});
app.get("/virtualcardx2026.txt", (c) => {
  c.header("Cache-Control", "no-store, no-cache, must-revalidate");
  return c.text("virtualcardx2026");
});
function apiAuth(c) {
  const auth = c.req.header("Authorization") || "";
  const token = c.env.API_TOKEN || "";
  if (!token) return { ok: false, err: "API_TOKEN not configured on worker" };
  if (auth !== `Bearer ${token}`) return { ok: false, err: "Unauthorized" };
  return { ok: true };
}
function apiJson(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" }
  });
}
function slugify(s) {
  return String(s || "").toLowerCase().trim().replace(/[^a-z0-9\u4e00-\u9fa5]+/g, "-").replace(/^-+|-+$/g, "");
}
app.get("/api/health", async (c) => {
  try {
    await c.env.DB.prepare("SELECT 1").all();
    return apiJson({ ok: true, service: "vcx-new", time: (/* @__PURE__ */ new Date()).toISOString() });
  } catch (e) {
    return apiJson({ ok: false, error: e.message }, 500);
  }
});
app.get("/api/posts", async (c) => {
  const a = apiAuth(c);
  if (!a.ok) return apiJson({ error: a.err }, 401);
  const lang = c.req.query("lang") || "zh";
  const status = c.req.query("status") || "publish";
  const limit = Math.min(parseInt(c.req.query("limit") || "20") || 20, 100);
  const offset = parseInt(c.req.query("offset") || "0") || 0;
  const q = (c.req.query("q") || "").trim();
  let where = "lang = ? AND status = ?";
  const params = [lang, status];
  if (q) {
    where += " AND (title LIKE ? OR content LIKE ?)";
    params.push(`%${q}%`, `%${q}%`);
  }
  const total = (await c.env.DB.prepare(`SELECT COUNT(*) as n FROM posts WHERE ${where}`).bind(...params).all()).results[0].n;
  const { results } = await c.env.DB.prepare(
    `SELECT id, lang, slug, title, excerpt, path, date, modified, status, featured_media, category_ids, tag_ids, translation_id FROM posts WHERE ${where} ORDER BY date DESC LIMIT ? OFFSET ?`
  ).bind(...params, limit, offset).all();
  return apiJson({ total, limit, offset, posts: results });
});
app.get("/api/posts/:id", async (c) => {
  const a = apiAuth(c);
  if (!a.ok) return apiJson({ error: a.err }, 401);
  const id = parseInt(c.req.param("id"));
  const { results } = await c.env.DB.prepare("SELECT * FROM posts WHERE id = ?").bind(id).all();
  if (!results.length) return apiJson({ error: "Post not found" }, 404);
  return apiJson({ post: results[0] });
});
app.post("/api/posts", async (c) => {
  const a = apiAuth(c);
  if (!a.ok) return apiJson({ error: a.err }, 401);
  let body;
  try {
    body = await c.req.json();
  } catch {
    return apiJson({ error: "Invalid JSON" }, 400);
  }
  const lang = body.lang === "en" ? "en" : "zh";
  if (!body.title) return apiJson({ error: "title required" }, 400);
  const slug = body.slug || slugify(body.title);
  let path = body.path;
  if (!path) {
    path = slug;
  }
  const dup = await c.env.DB.prepare("SELECT id FROM posts WHERE path = ? AND lang = ?").bind(path, lang).all();
  if (dup.results.length) return apiJson({ error: `Path already exists: ${path}`, existingId: dup.results[0].id }, 409);
  const date = body.date || (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
  const r = await c.env.DB.prepare(
    "INSERT INTO posts (lang, slug, title, content, excerpt, path, date, modified, status, featured_media, category_ids, tag_ids, translation_id) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)"
  ).bind(
    lang,
    slug,
    body.title,
    body.content || "",
    body.excerpt || "",
    path,
    date,
    (/* @__PURE__ */ new Date()).toISOString(),
    body.status || "publish",
    body.featured_media || null,
    JSON.stringify(body.category_ids || []),
    JSON.stringify(body.tag_ids || []),
    body.translation_id || null
  ).run();
  return apiJson({ ok: true, id: r.meta.last_row_id, path, slug, url: `/${path}/` }, 201);
});
app.put("/api/posts/:id", async (c) => {
  const a = apiAuth(c);
  if (!a.ok) return apiJson({ error: a.err }, 401);
  const id = parseInt(c.req.param("id"));
  let body;
  try {
    body = await c.req.json();
  } catch {
    return apiJson({ error: "Invalid JSON" }, 400);
  }
  const { results } = await c.env.DB.prepare("SELECT id, path, lang FROM posts WHERE id = ?").bind(id).all();
  if (!results.length) return apiJson({ error: "Post not found" }, 404);
  if (body.path !== void 0 && body.path !== results[0].path) {
    const dup = await c.env.DB.prepare("SELECT id FROM posts WHERE path = ? AND lang = ? AND id != ?").bind(body.path, results[0].lang, id).all();
    if (dup.results.length) return apiJson({ error: `Path already exists: ${body.path}`, existingId: dup.results[0].id }, 409);
  }
  const fields = ["title", "content", "excerpt", "slug", "path", "date", "status", "featured_media", "category_ids", "tag_ids", "translation_id"];
  const sets = [];
  const params = [];
  for (const f of fields) {
    if (body[f] !== void 0) {
      sets.push(`${f} = ?`);
      params.push(body[f] === null ? null : typeof body[f] === "object" ? JSON.stringify(body[f]) : body[f]);
    }
  }
  if (body.category_ids && Array.isArray(body.category_ids)) {
  }
  if (!sets.length) return apiJson({ error: "No fields to update" }, 400);
  sets.push("modified = ?");
  params.push((/* @__PURE__ */ new Date()).toISOString());
  params.push(id);
  await c.env.DB.prepare(`UPDATE posts SET ${sets.join(", ")} WHERE id = ?`).bind(...params).run();
  return apiJson({ ok: true, id });
});
app.delete("/api/posts/:id", async (c) => {
  const a = apiAuth(c);
  if (!a.ok) return apiJson({ error: a.err }, 401);
  const id = parseInt(c.req.param("id"));
  const r = await c.env.DB.prepare("DELETE FROM posts WHERE id = ?").bind(id).run();
  if (!r.meta.changes) return apiJson({ error: "Post not found" }, 404);
  return apiJson({ ok: true, deleted: id });
});
app.get("/api/categories", async (c) => {
  const a = apiAuth(c);
  if (!a.ok) return apiJson({ error: a.err }, 401);
  const { results } = await c.env.DB.prepare("SELECT * FROM categories ORDER BY id").all();
  return apiJson({ categories: results });
});
app.post("/api/categories", async (c) => {
  const a = apiAuth(c);
  if (!a.ok) return apiJson({ error: a.err }, 401);
  let body;
  try {
    body = await c.req.json();
  } catch {
    return apiJson({ error: "Invalid JSON" }, 400);
  }
  if (!body.name) return apiJson({ error: "name required" }, 400);
  const slug = body.slug || slugify(body.name);
  const r = await c.env.DB.prepare("INSERT INTO categories (name, slug, parent, description, count) VALUES (?,?,?,?,0)").bind(body.name, slug, body.parent || 0, body.description || "").run();
  return apiJson({ ok: true, id: r.meta.last_row_id, slug }, 201);
});
app.get("/api/media", async (c) => {
  const a = apiAuth(c);
  if (!a.ok) return apiJson({ error: a.err }, 401);
  const { results } = await c.env.DB.prepare("SELECT * FROM media ORDER BY id DESC LIMIT 100").all();
  return apiJson({ media: results });
});
app.post("/api/media", async (c) => {
  const a = apiAuth(c);
  if (!a.ok) return apiJson({ error: a.err }, 401);
  let body;
  try {
    body = await c.req.json();
  } catch {
    return apiJson({ error: "Invalid JSON" }, 400);
  }
  if (!body.filename || !body.dataBase64) return apiJson({ error: "filename and dataBase64 required" }, 400);
  const buf = Uint8Array.from(atob(body.dataBase64), (ch) => ch.charCodeAt(0));
  const id = Date.now() % 1e8;
  const key = `media/${id}-${body.filename}`;
  await c.env.R2.put(key, buf, { httpMetadata: { contentType: body.mimeType || "application/octet-stream" } });
  const path = `media/${id}-${body.filename}`;
  const r = await c.env.DB.prepare("INSERT INTO media (id, filename, path, mime_type, alt, width, height) VALUES (?,?,?,?,?,?,?)").bind(id, body.filename, path, body.mimeType || "", body.alt || "", body.width || null, body.height || null).run();
  return apiJson({ ok: true, id, path, url: `/${path}` }, 201);
});
app.get("/api/tags", async (c) => {
  const a = apiAuth(c);
  if (!a.ok) return apiJson({ error: a.err }, 401);
  const { results } = await c.env.DB.prepare("SELECT * FROM tags ORDER BY id").all();
  return apiJson({ tags: results });
});
app.get("/api/pages", async (c) => {
  const a = apiAuth(c);
  if (!a.ok) return apiJson({ error: a.err }, 401);
  const { results } = await c.env.DB.prepare("SELECT id, lang, slug, title, path, date, translation_id FROM pages ORDER BY id").all();
  return apiJson({ pages: results });
});
var OLD_URL_REDIRECTS = {
  // 同品牌重复评测合并（2026-08-23）：中英文均单跳到流量/内容主 URL
  "/virtualcardx2026-2": "/virtualcardx2026.txt",
  "/en/virtualcardx2026-2": "/virtualcardx2026.txt",
  "/2026/07/13/coca-visa-card-review": "/2026/07/31/coca-card-review-2026",
  "/en/2026/07/13/coca-visa-card-review": "/en/2026/07/31/coca-card-review-2026",
  "/2026/07/13/paymier-cross-border-payment-virtual-card": "/2025/05/19/paymier",
  "/en/2026/07/13/paymier-cross-border-payment-virtual-card": "/en/2025/05/19/paymier",
  "/2025/02/10/nginx-\u670D\u52A1\u5668\u642D\u5EFAwordpress\u4F7F\u7528rank-math-seo\u63D2\u4EF6\u751F\u6210sitemaps\u9700\u8981\u8FDB\u884C\u7684\u989D\u5916": "/2025/02/10/nginx-wordpress-rank-math-sitemap-config",
  "/2025/12/02/\u514D\u8D39\u9886\u53D6\u4E00\u4E2A\u6708google-gemini\u4F01\u4E1A\u7248": "/2025/12/02/free-google-gemini-enterprise-1-month",
  "/category/virutal-credit-card/virtual-credit-card-platform-summary": "/virtual-credit-card",
  "/en/category/virutal-credit-card/virtual-credit-card-platform-summary": "/en/virtual-credit-card",
  "/en/category/virutal-credit-card/virtual-credit-card-platform-summary/page/2": "/en/virtual-credit-card",
  "/2025/02/10/nginx-\u670D\u52A1\u5668\u642D\u5EFAwordpress\u4F7F\u7528rank-math-seo\u63D2\u4EF6\u751F\u6210sitem": "/2025/02/10/nginx-wordpress-rank-math-sitemap-config",
  "/en/2025/07/21/\u4E00\u6587\u770B\u61C2avalanche-card\uFF0C\u5168\u7403\u516C\u94FEtop10\u63A8\u51FA\u7684visa\u5361": "/2025/07/21/avalanche-card-visa-crypto-guide",
  "/2025/02/08/\u4E00\u7BC7\u6587\u7AE0\u5F7B\u5E95\u5F04\u6E05\u695A\u539F\u751Fip\u3001\u4F4F\u5B85ip\u3001isp-ip\u4E0Ehost-ip\u5230\u5E95\u5982\u4F55": "/2025/02/08/native-ip-residential-ip-isp-host-ip-guide",
  "/2025/07/21/\u4E00\u6587\u770B\u61C2avalanche-card\uFF0C\u5168\u7403\u516C\u94FEtop10\u63A8\u51FA\u7684visa\u5361": "/2025/07/21/avalanche-card-visa-crypto-guide",
  "/en/2025/05/21/\u514Dkyc\u865A\u62DF\u4FE1\u7528\u5361\u5E73\u53F0\u63A8\u8350-\u6843\u5B50\u718Ataozixiong\u865A\u62DF\u5361\u5E73\u53F0": "/2025/05/21/taozixiong",
  "/en/2025/06/11/debian-\u4E0B\u914D\u7F6E-socks5-\u4EE3\u7406\u670D\u52A1\u7AEF\u8F6F\u4EF6-dante": "/2025/06/11/debian-socks5-proxy-dante-setup",
  "/2025/06/11/debian-\u4E0B\u914D\u7F6E-socks5-\u4EE3\u7406\u670D\u52A1\u7AEF\u8F6F\u4EF6-dante": "/2025/06/11/debian-socks5-proxy-dante-setup",
  "/en/2025/05/13/\u5982\u4F55\u514D\u8D39\u83B7\u53D6\u4E34\u65F6\u6559\u80B2\u90AE\u7BB1\uFF08bbaa-edu-pl\u7ED3\u5C3E\uFF09": "/2026/07/05/bbaa-edu-pl-temp-email",
  "/en/2025/04/07/\u865A\u62DF\u4FE1\u7528\u5361\u5E73\u53F0\u6C47\u603B-ucards\u865A\u62DF\u4FE1\u7528\u5361\u5E73\u53F0\uFF08\u4F18\u5494\uFF09": "/2025/04/07/ucards-virtual-credit-card-review",
  "/en/2025/05/19/\u4EB2\u6D4B-xtransfer\uFF1A\u8DE8\u5883\u6536\u6B3E\u7684\u9AD8\u6548\u4E4B\u9009\u4E0E\u907F\u5751\u6307\u5357": "/2026/07/05/xtransfer",
  "/en/2025/07/07/cloudflare-15\u5E74\u514D\u8D39ssl\u8BC1\u4E66\u5B8C\u6574\u7533\u8BF7\u6307\u5357": "/2025/07/07/cloudflare-free-ssl-15years",
  "/2025/05/11/\u514D\u8D39\u9886\u53D6\u8C37\u6B4Cgemini\u9AD8\u7EA7\u7248\u653B\u7565\uFF0C\u9644\u7F8Eedu\u90AE\u7BB1\u6CE8\u518C\u6559\u7A0B": "/2025/05/11/free-google-gemini-advanced-edu-email",
  "/2025/02/10/debian-\u7CFB\u7EDF\u65E0\u4EBA\u503C\u5B88\u81EA\u52A8\u66F4\u65B0\u8BBE\u7F6E\u5168\u6D41\u7A0B\uFF1A\u4ECE\u5B89\u88C5\u5230\u914D": "/2025/02/10/debian-unattended-upgrades-setup",
  "/2025/04/07/\u865A\u62DF\u4FE1\u7528\u5361\u5E73\u53F0\u6C47\u603B-ucards\u865A\u62DF\u4FE1\u7528\u5361\u5E73\u53F0\uFF08\u4F18\u5494\uFF09": "/2025/04/07/ucards-virtual-credit-card-review",
  "/2025/04/13/win11\u7684edge\u8BBF\u95EE\u5F02\u5E38\uFF0C\u663E\u793Adns-\u9519\u8BEF\u5982\u4F55\u5904\u7406": "/2025/04/13/win11-edge-dns-error-fix",
  "/2025/05/13/\u5982\u4F55\u514D\u8D39\u83B7\u53D6\u4E34\u65F6\u6559\u80B2\u90AE\u7BB1\uFF08bbaa-edu-pl\u7ED3\u5C3E\uFF09": "/2026/07/05/bbaa-edu-pl-temp-email",
  "/en/2025/05/20/\u5982\u4F55\u514D\u8D39\u89E3\u9501cursor-pro\uFF0C\u544A\u522B14\u5929\u9650\u5236": "/2025/05/20/unlock-cursor-pro-free",
  "/en/2025/03/31/apache\u4E0Bhttps\u53CD\u5411\u4EE3\u7406uvicorn": "/2025/03/31/apache-https-reverse-proxy-uvicorn",
  "/en/2025/02/16/\u4F18\u79C0\u7684\u865A\u62DF\u4FE1\u7528\u5361\u5E73\u53F0\u63A8\u8350-hornetpay": "/2025/02/16/hornetpay-no-kyc-virtual-card-review",
  "/en/2025/04/07/\u865A\u62DF\u5361\u5E73\u53F0\u6C47\u603B-valitop\u865A\u62DF\u5361\u5E73\u53F0\u9CB8\u5361": "/2025/04/07/valitop-virtual-card-review",
  "/en/2025/04/07/\u865A\u62DF\u5361\u5E73\u53F0\u6C47\u603B-zeptocard\u865A\u62DF\u5361\u5E73\u53F0": "/2025/04/07/zeptocard-virtual-card-review",
  "/2025/05/20/\u5982\u4F55\u514D\u8D39\u89E3\u9501cursor-pro\uFF0C\u544A\u522B14\u5929\u9650\u5236": "/2025/05/20/unlock-cursor-pro-free",
  "/2025/12/02/\u514D\u8D39\u9886\u53D6\u4E00\u4E2A\u6708google-gemini-\u4F01\u4E1A\u7248": "/2025/12/02/free-google-gemini-enterprise-1-month",
  "/2025/02/06/\u5728debian-12\u4E0A\u624B\u52A8\u5B89\u88C5wordpress": "/2025/02/06/install-wordpress-on-debian-12",
  "/2025/05/14/\u5982\u4F55\u4E3Awordpress\u7F51\u7AD9\u5F00\u542F\u8C03\u8BD5\u6A21\u5F0F\u6392\u67E5\u9519\u8BEF": "/2026/07/05/wordpress-debug-mode",
  "/2025/04/05/\u65E0\u9700kyc\u7684\u865A\u62DF\u4FE1\u7528\u5361\u63A8\u8350-nexa\u865A\u62DF\u4FE1\u7528\u5361": "/2025/04/05/nexa-no-kyc-virtual-card-review",
  "/en/2025/02/14/2025-\u5E74\u4E94\u6B3E\u5E38\u7528\u805A\u5408-ai-\u5E94\u7528\u8BC4\u6D4B": "/2026/07/05/ai-app-review-2025",
  "/en/2025/07/20/\u56FD\u5185\u865A\u62DF\u4FE1\u7528\u5361\u5E73\u53F0\u8DD1\u8DEF\u68B3\u7406\u53CA\u98CE\u9669\u89C4\u907F\u5EFA\u8BAE": "/2026/07/05/vcc-platform-risk-warning",
  "/en/2025/05/19/\u514Dkyc\u865A\u62DF\u4FE1\u7528\u5361\u5E73\u53F0-cardking": "/2025/05/19/cardking",
  "/en/2025/05/21/\u8D44\u8D39\u8D85\u4F4E\u7684\u865A\u62DF\u4FE1\u7528\u5361\u5E73\u53F0-4399pay": "/2025/05/21/4399pay",
  "/en/2025/04/07/\u865A\u62DF\u5361\u5E73\u53F0\u6C47\u603B-visapay\u865A\u62DF\u5361\u5E73\u53F0": "/2025/04/07/visapay-virtual-card-review",
  "/en/2025/04/07/\u865A\u62DF\u5361\u5E73\u53F0\u6C47\u603B-cvcwallet\u865A\u62DF\u5361": "/2025/04/07/cvcwallet-virtual-card-review",
  "/2025/03/31/apache\u4E0Bhttps\u53CD\u5411\u4EE3\u7406uvicorn": "/2025/03/31/apache-https-reverse-proxy-uvicorn",
  "/2025/02/16/\u4F18\u79C0\u7684\u865A\u62DF\u4FE1\u7528\u5361\u5E73\u53F0\u63A8\u8350-hornetpay": "/2025/02/16/hornetpay-no-kyc-virtual-card-review",
  "/2025/04/07/\u865A\u62DF\u5361\u5E73\u53F0\u6C47\u603B-valitop\u865A\u62DF\u5361\u5E73\u53F0\u9CB8\u5361": "/2025/04/07/valitop-virtual-card-review",
  "/en/2025/04/07/\u865A\u62DF\u5361\u5E73\u53F0\u6C47\u603B-afrocard\u865A\u62DF\u5361": "/2025/04/07/afrocard-virtual-card-review",
  "/2025/05/20/skype\u505C\u6B62\u8FD0\u8425\u540E\uFF0C\u5916\u8D38\u4EBA\u6253\u56FD\u9645\u7535\u8BDD\u600E\u4E48\u529E": "/2026/07/05/skype-alternatives-overseas-calls",
  "/2025/05/27/\u5206\u4EAB\u4E00\u4E2A\u68C0\u6D4Blinkedin\u8D26\u53F7\u8BC4\u5206\u7684\u7F51\u7AD9": "/2025/05/27/linkedin-account-score-checker",
  "/en/2025/04/07/\u865A\u62DF\u5361\u5E73\u53F0\u6C47\u603B-icard\u865A\u62DF\u5361\u5E73\u53F0": "/2025/04/07/icard-virtual-card-review",
  "/2025/04/07/\u865A\u62DF\u5361\u5E73\u53F0\u6C47\u603B-visapay\u865A\u62DF\u5361\u5E73\u53F0": "/2025/04/07/visapay-virtual-card-review",
  "/2025/07/20/\u5F53\u524D\u56FD\u9645\u4E3B\u6D41\u5927\u6A21\u578Bapi\u8054\u7F51\u641C\u7D22\u80FD\u529B\u5206\u6790": "/2025/07/20/llm-api-web-search-comparison",
  "/2025/07/20/\u56FD\u5185\u865A\u62DF\u4FE1\u7528\u5361\u5E73\u53F0\u8DD1\u8DEF\u68B3\u7406\u53CA\u98CE\u9669\u89C4\u907F\u5EFA\u8BAE": "/2026/07/05/vcc-platform-risk-warning",
  "/2025/02/14/2025-\u5E74\u4E94\u6B3E\u5E38\u7528\u805A\u5408-ai-\u5E94\u7528\u8BC4\u6D4B": "/2026/07/05/ai-app-review-2025",
  "/2025/04/07/\u865A\u62DF\u5361\u5E73\u53F0\u6C47\u603B-afrocard\u865A\u62DF\u5361": "/2025/04/07/afrocard-virtual-card-review",
  "/2025/06/08/\u5916\u8D38\u884C\u4E1A\u5982\u4F55\u505A\u597D\u4E00\u4EFD\u5B8C\u6574\u7684\u5BA2\u6237\u80CC\u8C03\u6D41\u7A0B": "/2025/06/08/foreign-trade-customer-background-check",
  "/2025/05/14/\u5982\u4F55\u83B7\u53D6\u7A33\u5B9A\u53EF\u957F\u671F\u4F7F\u7528\u7684\u56FD\u5916\u6559\u80B2\u90AE\u7BB1": "/2026/07/05/edu-email-guide",
  "/2025/04/07/\u865A\u62DF\u5361\u5E73\u53F0\u6C47\u603B-icard\u865A\u62DF\u5361\u5E73\u53F0": "/2025/04/07/icard-virtual-card-review",
  "/2025/02/04/\u5982\u4F55\u5224\u65AD\u57DF\u540D\u662F\u5426\u88ABgoogle\u60E9\u7F5A\uFF1F": "/2025/02/04/how-to-check-if-domain-penalized-by-google",
  "/en/2025/05/19/\u865A\u62DF\u4FE1\u7528\u5361\u5E73\u53F0-paymier": "/2025/05/19/paymier",
  "/2025/06/01/webhostmost-\u514D\u8D39\u8BA1\u5212\u8C03\u6574": "/2025/06/01/webhostmost-free-plan-changes",
  "/2025/04/05/2025\u5E74\u5341\u6B3E\u5E38\u7528\u7684\u4E2D\u5FC3\u5316\u7535\u5B50\u94B1\u5305": "/2025/04/05/top-10-centralized-crypto-wallets-2025",
  "/en/2025/02/14/5ber-esim\u5361\u8DD1\u8DEF\u4E86\uFF1F": "/2026/07/05/5ber-esim-solution",
  "/2025/02/13/\u865A\u62DF\u4FE1\u7528\u5361\u5361\u5934\u8BC4\u6D4B\uFF1A404038": "/2025/02/13/virtual-card-bin-404038-review",
  "/en/2025/02/14/vcc247\u865A\u62DF\u4FE1\u7528\u5361\u5E73\u53F0": "/2025/02/14/vcc247-virtual-credit-card-review",
  "/2026/07/04/\u76EE\u524D\u56FD\u5185\u53EF\u7528\u7684\u4E2D\u8F6Capi\u670D\u52A1\u5217\u8868": "/2026/07/05/china-api-proxy-list",
  "/2025/06/08/\u4E2A\u4EBA\u5982\u4F55\u505A\u5916\u8D38\u63A5\u5355\uFF08\u5B9E\u64CD\u6307\u5357\uFF09": "/2025/06/08/how-to-do-foreign-trade-guide",
  "/en/2025/02/12/amzkeys\u865A\u62DF\u5361\u5E73\u53F0": "/2025/02/12/amzkeys-virtual-card-review",
  "/2025/05/10/web3\u652F\u4ED8\u5E73\u53F0deerpay": "/2026/07/05/deerpay-web3-payment",
  "/en/2025/02/11/infini\u4E07\u4E8B\u8FBEu\u5361": "/2025/02/11/infini-mastercard-usdt-card",
  "/2025/02/14/5ber-esim\u5361\u8DD1\u8DEF\u4E86\uFF1F": "/2026/07/05/5ber-esim-solution",
  "/2025/02/14/5ber-esim\u5361\u8DD1\u8DEF": "/2026/07/05/5ber-esim-solution",
  "/2025/01/31/\u5982\u4F55\u8FDB\u884Cgoogle\u8D26\u53F7\u89E3\u5C01": "/2025/01/31/how-to-unban-google-account",
  "/2025/02/12/redotpay\u865A\u62DF\u4FE1\u7528\u5361": "/2025/02/12/redotpay-virtual-credit-card-review",
  "/2025/02/14/vcc247\u865A\u62DF\u4FE1\u7528\u5361\u5E73\u53F0": "/2025/02/14/vcc247-virtual-credit-card-review",
  "/en/2025/02/12/foton\u865A\u62DF\u4FE1\u7528\u5361": "/2025/02/12/foton-virtual-credit-card-review",
  "/2025/02/12/amzkeys\u865A\u62DF\u5361\u5E73\u53F0": "/2025/02/12/amzkeys-virtual-card-review",
  "/2025/02/11/mipay\u865A\u62DF\u4FE1\u7528\u5361\u5E73\u53F0": "/2025/02/11/mipay-virtual-card-review",
  "/2025/02/11/infini\u4E07\u4E8B\u8FBEu\u5361": "/2025/02/11/infini-mastercard-usdt-card",
  "/en/2025/05/13/\u5982\u4F55\u83B7\u53D6\u4E34\u65F6\u90AE\u7BB1": "/2025/05/13/how-to-get-temporary-email",
  "/2025/02/12/foton\u865A\u62DF\u4FE1\u7528\u5361": "/2025/02/12/foton-virtual-credit-card-review",
  "/2025/02/11/trx\u80FD\u91CF\u79DF\u7528\u5E73\u53F0": "/2025/02/11/tron-trx-energy-rental-platform",
  "/2025/05/13/\u5982\u4F55\u83B7\u53D6\u4E34\u65F6\u90AE\u7BB1": "/2025/05/13/how-to-get-temporary-email",
  "/2025/02/11/\u4F18\u6613\u4ED8\u865A\u62DF\u4FE1\u7528\u5361": "/2025/02/11/youyifu-virtual-credit-card-review",
  "/2025/02/11/\u52A0\u5BC6\u8D27\u5E01\u5151\u6362\u5E73\u53F0": "/2025/02/11/how-to-use-decentralized-exchange-dex",
  "/2025/05/19/worldfirst": "/2026/07/05/worldfirst",
  "/2025/05/19/airwallex": "/2026/07/05/airwallex",
  "/2025/05/19/xtransfer": "/2026/07/05/xtransfer",
  "/2025/05/19/lianlian": "/2026/07/05/lianlian",
  "/2025/05/19/skyee": "/2026/07/05/skyee",
  "/2025/05/18/photonpay": "/2026/07/05/photonpay",
  "/2025/05/19/pingpongx": "/2026/07/05/pingpongx",
  "/en/2025/05/19/airwallex": "/en/2026/07/05/airwallex",
  "/en/2025/05/19/skyee": "/en/2026/07/05/skyee",
  "/en/2025/05/19/lianlian": "/en/2026/07/05/lianlian",
  "/en/2025/05/19/worldfirst": "/en/2026/07/05/worldfirst",
  "/2026/08/02/cardking-review-2026": "/2025/05/19/cardking",
  "/en/2026/07/04/tailscale-a-simple-guide-to-network-monitoring": "/en/2026/07/04/tailscale-intranet-penetration-guide",
  "/2025/05/21/linkedin-account-restrict-reason": "/2026/07/05/linkedin-account-restrict-reason",
  "/2025/07/28/facebook-ad-check": "/2026/07/05/facebook-ad-check",
  "/en/2025/07/28/facebook-ad-check": "/en/2026/07/05/facebook-ad-check",
  "/en/2026/07/05/virtualbox-p-core-and-e-core-fix": "/en/2026/07/05/virtualbox-p-core-e-core-fix",
  "/virutal-credit-card/virtual-credit-card-platform-summary": "/virtual-credit-card",
  "/en/virutal-credit-card/virtual-credit-card-platform-summary": "/en/virtual-credit-card",
  "/virutal-credit-card/virtual-credit-card-platform-summary/page/6": "/virtual-credit-card",
  "/en/virutal-credit-card/virtual-credit-card-platform-summary/page/3": "/en/virtual-credit-card",
  "/en/virutal-credit-card/page/3": "/en/virtual-credit-card",
  "/virutal-credit-card": "/virtual-credit-card",
  "/en/virutal-credit-card": "/en/virtual-credit-card",
  "/tag/kyc-free-virtual-credit-card": "/virtual-credit-card",
  "/en/tag/solvocard": "/en/2026/07/04/solvocard-review"
};
var EN_OLD_PATH_REDIRECTS = {
  "2026/07/31/free-developer-tools-and-saas-resources-2026": "2026/07/31/free-developer-tools-saas-resources-2026",
  "2026/07/28/whatsapp-for-foreign-trade-customer-development": "2026/07/28/whatsapp-foreign-trade-customer-development",
  "2026/07/25/stripe-hk-registration-guide-for-sellers-in-china": "2026/07/25/stripe-hk-register-guide-china-seller",
  "2026/07/10/ai-overviews-of-seo-traffic-strategy": "2026/07/10/ai-overviews-seo-traffic-strategy",
  "2026/07/06/virtual-credit-card-rankings-2026": "2026/07/06/virtual-credit-card-ranking-2026",
  "2025/12/20/u-bitget0u": "2025/12/20/bitget",
  "2025/07/21/\u4E00\u6587\u770B\u61C2avalanche-card\uFF0C\u5168\u7403\u516C\u94FEtop10\u63A8\u51FA\u7684visa\u5361": "2025/07/21/avalanche-card-visa-crypto-guide",
  "2025/05/22/winprocard": "2025/05/22/wintopay",
  "2025/05/21/\u514Dkyc\u865A\u62DF\u4FE1\u7528\u5361\u5E73\u53F0\u63A8\u8350-\u6843\u5B50\u718Ataozixiong\u865A\u62DF\u5361\u5E73\u53F0": "2025/05/21/taozixiong",
  "2025/05/21/\u8D44\u8D39\u8D85\u4F4E\u7684\u865A\u62DF\u4FE1\u7528\u5361\u5E73\u53F0-4399pay": "2025/05/21/4399pay",
  "2025/05/19/\u865A\u62DF\u4FE1\u7528\u5361\u5E73\u53F0-paymier": "2025/05/19/paymier",
  "2025/05/19/\u514Dkyc\u865A\u62DF\u4FE1\u7528\u5361\u5E73\u53F0-cardking": "2025/05/19/cardking",
  "2025/04/07/\u865A\u62DF\u5361\u5E73\u53F0\u6C47\u603B-zeptocard\u865A\u62DF\u5361\u5E73\u53F0": "2025/04/07/zeptocard-virtual-card-review",
  "2025/04/07/\u865A\u62DF\u5361\u5E73\u53F0\u6C47\u603B-visapay\u865A\u62DF\u5361\u5E73\u53F0": "2025/04/07/visapay-virtual-card-review",
  "2025/04/07/\u865A\u62DF\u5361\u5E73\u53F0\u6C47\u603B-valitop\u865A\u62DF\u5361\u5E73\u53F0\u9CB8\u5361": "2025/04/07/valitop-virtual-card-review",
  "2025/04/07/\u865A\u62DF\u4FE1\u7528\u5361\u5E73\u53F0\u6C47\u603B-ucards\u865A\u62DF\u4FE1\u7528\u5361\u5E73\u53F0\uFF08\u4F18\u5494\uFF09": "2025/04/07/ucards-virtual-credit-card-review",
  "2025/04/07/\u865A\u62DF\u5361\u5E73\u53F0\u6C47\u603B-cvcwallet\u865A\u62DF\u5361": "2025/04/07/cvcwallet-virtual-card-review",
  "2025/04/07/\u865A\u62DF\u5361\u5E73\u53F0\u6C47\u603B-afrocard\u865A\u62DF\u5361": "2025/04/07/afrocard-virtual-card-review",
  "2025/04/07/\u865A\u62DF\u5361\u5E73\u53F0\u6C47\u603B-icard\u865A\u62DF\u5361\u5E73\u53F0": "2025/04/07/icard-virtual-card-review",
  "2025/04/06/\u514Dkyc\u865A\u62DF\u4FE1\u7528\u5361-\u4E09\u53EA\u7334\u865A\u62DF\u4FE1\u7528\u5361": "2025/04/06/three-monkeys-no-kyc-virtual-card",
  "2025/04/05/\u65E0\u9700kyc\u7684\u865A\u62DF\u4FE1\u7528\u5361\u63A8\u8350-nexa\u865A\u62DF\u4FE1\u7528\u5361": "2025/04/05/nexa-no-kyc-virtual-card-review",
  "2025/04/05/2025\u5E74\u5341\u6B3E\u5E38\u7528\u7684\u4E2D\u5FC3\u5316\u7535\u5B50\u94B1\u5305": "2025/04/05/top-10-centralized-crypto-wallets-2025",
  "2025/02/16/\u4F18\u79C0\u7684\u865A\u62DF\u4FE1\u7528\u5361\u5E73\u53F0\u63A8\u8350-hornetpay": "2025/02/16/hornetpay-no-kyc-virtual-card-review",
  "2025/02/14/vcc247\u865A\u62DF\u4FE1\u7528\u5361\u5E73\u53F0": "2025/02/14/vcc247-virtual-credit-card-review",
  "2025/02/13/\u865A\u62DF\u4FE1\u7528\u5361\u5361\u5934\u8BC4\u6D4B\uFF1A404038": "2025/02/13/virtual-card-bin-404038-review",
  "2025/02/12/amzkeys\u865A\u62DF\u5361\u5E73\u53F0": "2025/02/12/amzkeys-virtual-card-review",
  "2025/02/12/foton\u865A\u62DF\u4FE1\u7528\u5361": "2025/02/12/foton-virtual-credit-card-review",
  "2025/02/12/redotpay\u865A\u62DF\u4FE1\u7528\u5361": "2025/02/12/redotpay-virtual-credit-card-review",
  "2025/02/11/infini\u4E07\u4E8B\u8FBEu\u5361": "2025/02/11/infini-mastercard-usdt-card",
  "2025/02/11/\u4F18\u6613\u4ED8\u865A\u62DF\u4FE1\u7528\u5361": "2025/02/11/youyifu-virtual-credit-card-review",
  "2025/02/11/mipay\u865A\u62DF\u4FE1\u7528\u5361\u5E73\u53F0": "2025/02/11/mipay-virtual-card-review",
  // 2026-08-19 审计补充: Bing PageStats 中 404 的 EN 旧路径
  "2025/03/27/linkedin-account-recovery-guide-2025": "2025/03/27/2025-linkedin-account-recover",
  "2026/07/05/edu-email-guide-en": "2026/07/05/edu-email-guide",
  "2026/07/05/deerpay-web3-payment-review": "2026/07/05/deerpay-web3-payment",
  "2026/07/04/tailscale-networking-review-setup-guide": "2026/07/04/tailscale-intranet-penetration-guide",
  "2026/07/05/virtualbox-p-core-e-core-fix-en": "2026/07/05/virtualbox-p-core-e-core-fix",
  "2026/08/10/cardecho-virtual-credit-card-review-en": "virtual-credit-card"
};
var OLD_CAT_REDIRECTS = [
  ["/virtual-credit-card/virtual-credit-card-platform-summary", "/virtual-credit-card"],
  ["/virtual-credit-card/virtual-credit-card-bin-check-and-test", "/virtual-credit-card"],
  // 拼写错误旧分类 virutal-credit-card (含分页变体, Bing 4xx 主源)
  ["/virutal-credit-card", "/virtual-credit-card"],
  ["/category/virutal-credit-card", "/virtual-credit-card"],
  ["/vps", "/technology-share"],
  ["/mobile-card", "/resource-share"],
  ["/residential-ip", "/technology-share"],
  ["/electronic-wallet", "/cryptocurrency"],
  ["/experience-sharing", "/technology-share"],
  ["/technology-share/wordpress", "/technology-share"],
  ["/technology-share/seo", "/seo"],
  ["/social-media/facebook", "/social-media"],
  ["/social-media/linkedin-account-operation", "/social-media"],
  ["/experience-sharing/foreign-trade-customer-acquisition", "/social-media"]
];
var index_default = app;
app.get("*", async (c) => {
  try {
    if (/\/null\/?$/.test(c.req.path)) {
      return c.redirect(c.req.path.replace(/\/null\/?$/, "/"), 301);
    }
    const lang = getLang(c.req.path);
    const clean = c.req.path.replace(/^\/+|\/+$/g, "");
    const postPath = clean.startsWith("en/") ? clean.slice(3) : clean;
    if (lang === "en" && EN_OLD_PATH_REDIRECTS[postPath]) {
      return c.redirect(`/en/${EN_OLD_PATH_REDIRECTS[postPath]}/`, 301);
    }
    {
      const decodedPath = "/" + decodeURIComponent(c.req.path).replace(/^\/+|\/+$/g, "");
      const target = OLD_URL_REDIRECTS[decodedPath];
      if (target) {
        return c.redirect(/\.[a-z0-9]+$/i.test(target) ? target : `${target}/`, 301);
      }
    }
    for (const [from, to] of OLD_CAT_REDIRECTS) {
      if (postPath === from.slice(1) || postPath.startsWith(from.slice(1) + "/")) {
        return c.redirect(`${lang === "en" ? "/en" : ""}${to}/`, 301);
      }
    }
    const s = c.req.query("s");
    if (s && s.trim()) {
      return c.html(await handleSearch(c, lang, s.trim()));
    }
    if (postPath === "" || postPath === "en") {
      const html = await renderHomePage(c, lang, 1);
      return html ? c.html(html) : c.notFound();
    }
    const pageSlug = postPath.split("/")[0];
    const pageRes = await c.env.DB.prepare("SELECT slug, title, content, path FROM pages WHERE slug = ? AND lang = ? LIMIT 1").bind(pageSlug, lang).all();
    if (pageRes.results.length) {
      const pg = pageRes.results[0];
      let pageContent = pg.content;
      pageContent = await rewriteImages(c, pageContent, pg.title);
      const base = baseOf(lang);
      const pageUrl = `${SITE}${base}${pg.slug}/`;
      const body = `<div class="page-content"><nav class="breadcrumbs" aria-label="Breadcrumb"><a href="${base}">${lang === "en" ? "Home" : "\u9996\u9875"}</a> / <span>${esc(pg.title)}</span></nav><h1 class="page-title">${esc(pg.title)}</h1>${pageContent}</div>`;
      const pageType = pg.slug === "about" ? "AboutPage" : pg.slug === "contact" ? "ContactPage" : "WebPage";
      const pageJsonld = { "@context": "https://schema.org", "@graph": [
        { "@type": pageType, "@id": `${pageUrl}#webpage`, url: pageUrl, name: pg.title, inLanguage: lang === "en" ? "en" : "zh-CN", isPartOf: { "@id": `${SITE}${base}#website` } },
        { "@type": "BreadcrumbList", itemListElement: [
          { "@type": "ListItem", position: 1, name: lang === "en" ? "Home" : "\u9996\u9875", item: `${SITE}${base}` },
          { "@type": "ListItem", position: 2, name: pg.title, item: pageUrl }
        ] }
      ] };
      return c.html(layout(lang, `${pg.title} - VirtualCardx`, pg.title, body, { noSidebar: true, path: `${pg.slug}/`, jsonld: pageJsonld }));
    }
    const parts = postPath.split("/").filter(Boolean);
    if (parts.length >= 1 && parts.length <= 4) {
      let page = 1;
      let catParts = parts;
      if (parts.length >= 3 && parts[parts.length - 2] === "page") {
        const parsed = parsePage(parts[parts.length - 1]);
        if (parsed === null) return c.notFound();
        page = parsed;
        catParts = parts.slice(0, parts.length - 2);
      }
      if (catParts.length >= 1 && catParts.length <= 2) {
        if (page === 1 && parts.length >= 3) {
          const catPath = catParts.join("/");
          return c.redirect(`${baseOf(lang)}${catPath}/`, 301);
        }
        const catHtml = await renderCategory(c, lang, catParts[0], catParts[1] || null, page);
        if (catHtml) return c.html(catHtml);
      }
    }
    const dm = postPath.match(/^(\d{4})\/(\d{2})\/(\d{2})\/(.+)$/);
    if (dm) {
      const slug = dm[4];
      const { results: np } = await c.env.DB.prepare("SELECT id FROM posts WHERE path = ? AND lang = ? AND status = 'publish' LIMIT 1").bind(slug, lang).all();
      if (np.length) return c.redirect(`${baseOf(lang)}${slug}/`, 301);
    }
    if (postPath) {
      const { results } = await c.env.DB.prepare("SELECT * FROM posts WHERE path = ? AND lang = ? AND status = 'publish' LIMIT 1").bind(postPath, lang).all();
      if (!results.length) {
        if (lang === "en") {
          const { results: zhResults } = await c.env.DB.prepare("SELECT * FROM posts WHERE path = ? AND lang = 'zh' AND status = 'publish' LIMIT 1").bind(postPath).all();
          if (zhResults.length) {
            const zp = zhResults[0];
            const base = "/en/";
            let content = zp.content;
            content = await rewriteImages(c, content, zp.title);
            const recent = await recentPosts(c, "en");
            const body = `<article class="article">
            <div class="article-header">
              <h1>${esc(zp.title)}</h1>
              <div class="article-meta">
                <span>\u{1F550} ${esc(fmtDate(zp.date))}</span>
                <span>\u270D\uFE0F Moyi Foreign Trade</span>
              </div>
            </div>
            <div class="content">${content}</div>
            <div class="article-footer">
              <a class="lang-toggle" href="/${postPath}/">\u{1F310} \u9605\u8BFB\u4E2D\u6587\u7248</a>
            </div>
          </article>`;
            return c.html(layout(
              "en",
              `${zp.title} - VirtualCardx`,
              (zp.excerpt || "").replace(/<[^>]+>/g, "").slice(0, 150),
              body,
              { recentPosts: recent, path: `${postPath}/`, extraHead: `<link rel="alternate" hreflang="zh" href="${SITE}/${postPath}/"><link rel="alternate" hreflang="en" href="${SITE}/en/${postPath}/"><link rel="alternate" hreflang="x-default" href="${SITE}/${postPath}/">` }
            ));
          }
        }
      }
      if (results.length) {
        const p = results[0];
        const base = baseOf(lang);
        const path = postPath;
        const altHref = lang === "zh" ? `/en/${path}/` : `/${path}/`;
        const curHref = lang === "zh" ? `/${path}/` : `/en/${path}/`;
        const altLang = lang === "zh" ? "en" : "zh";
        let content = p.content;
        content = await rewriteImages(c, content, p.title);
        let fm = p.featured_media;
        if (!fm && p.translation_id) {
          const { results: pairRes } = await c.env.DB.prepare(
            "SELECT featured_media FROM posts WHERE translation_id = ? AND featured_media IS NOT NULL AND featured_media != 0 AND id != ? LIMIT 1"
          ).bind(p.translation_id, p.id).all();
          if (pairRes.length) fm = pairRes[0].featured_media;
        }
        let heroHtml = "";
        let ogImageTag = "";
        let articleImage = "";
        if (fm) {
          const { results: mRes } = await c.env.DB.prepare("SELECT path, alt, width, height FROM media WHERE id = ?").bind(fm).all();
          if (mRes.length) {
            const mp = mRes[0];
            articleImage = `${SITE}/${mp.path}`;
            heroHtml = `<img class="article-hero" src="/${mp.path}" alt="${esc(mp.alt || p.title)}"${mp.width && mp.height ? ` width="${mp.width}" height="${mp.height}"` : ""} fetchpriority="high" decoding="async">`;
            ogImageTag = `<meta property="og:image" content="${SITE}/${mp.path}"><meta property="og:image:alt" content="${esc(mp.alt || p.title)}"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:image" content="${SITE}/${mp.path}">`;
          }
        }
        const recent = await recentPosts(c, lang);
        const articleUrl = `${SITE}${baseOf(lang)}${path}/`;
        const articleDesc = (p.excerpt || "").replace(/<[^>]+>/g, "").slice(0, 150);
        const body = `<article class="article">
      <nav class="breadcrumbs" aria-label="Breadcrumb"><a href="${base}">${lang === "en" ? "Home" : "\u9996\u9875"}</a> / <span>${esc(p.title)}</span></nav>
      <div class="article-header">
        <h1>${esc(p.title)}</h1>
        <div class="article-meta">
          <span>\u{1F550} ${esc(fmtDate(p.date))}</span>
          <a class="author-link" href="${base}about/">\u270D\uFE0F ${lang === "en" ? "Moyi Foreign Trade" : "\u6728\u6613\u5916\u8D38"}</a>
        </div>
      </div>
      ${heroHtml}
      <div class="content">${content}</div>
      <div class="article-footer">
        <a class="lang-toggle" href="${altHref}">${altLang === "en" ? "\u{1F310} Read in English" : "\u{1F310} \u9605\u8BFB\u4E2D\u6587\u7248"}</a>
      </div>
    </article>`;
        return c.html(layout(
          lang,
          `${p.title} - VirtualCardx`,
          articleDesc,
          body,
          {
            recentPosts: recent,
            path: `${path}/`,
            ogType: "article",
            jsonld: { "@context": "https://schema.org", "@graph": [
              {
                "@type": "Article",
                "@id": `${articleUrl}#article`,
                headline: p.title.slice(0, 110),
                description: articleDesc,
                url: articleUrl,
                image: articleImage ? [articleImage] : void 0,
                datePublished: (p.date || "").slice(0, 10),
                dateModified: (p.modified || p.date || "").slice(0, 10),
                inLanguage: lang === "en" ? "en" : "zh-CN",
                author: { "@type": "Person", name: lang === "en" ? "Moyi Foreign Trade" : "\u6728\u6613\u5916\u8D38", url: `${SITE}${base}about/` },
                publisher: { "@type": "Organization", "@id": `${SITE}/#organization`, name: "VirtualCardx", logo: { "@type": "ImageObject", url: `${SITE}/media/1556-cropped-logo.png`, width: 128, height: 45 } },
                mainEntityOfPage: { "@id": `${articleUrl}#webpage` },
                isPartOf: { "@id": `${SITE}${base}#website` }
              },
              { "@type": "WebPage", "@id": `${articleUrl}#webpage`, url: articleUrl, name: p.title, inLanguage: lang === "en" ? "en" : "zh-CN", mainEntity: { "@id": `${articleUrl}#article` } },
              { "@type": "BreadcrumbList", itemListElement: [
                { "@type": "ListItem", position: 1, name: lang === "en" ? "Home" : "\u9996\u9875", item: `${SITE}${base}` },
                { "@type": "ListItem", position: 2, name: p.title, item: articleUrl }
              ] }
            ] },
            extraHead: `${ogImageTag}<link rel="alternate" hreflang="${altLang}" href="${SITE}${altHref}"><link rel="alternate" hreflang="${lang}" href="${SITE}${curHref}"><link rel="alternate" hreflang="x-default" href="${SITE}${lang === "zh" ? curHref : altHref}">`
          }
        ));
      }
    }
    {
      const rawPath = c.req.path.replace(/^\/|\/$/g, "");
      const REDIRECTS = {
        "2025/07/07/cloudflare-free-ssl-15years": "2026/07/04/cloudflare-15-year-free-ssl-certificate-guide",
        "en/2025/07/07/cloudflare-free-ssl-15years": "en/2026/07/04/cloudflare-15-year-free-ssl-certificate-guide"
      };
      if (REDIRECTS[rawPath]) return c.redirect(`/${REDIRECTS[rawPath]}/`, 301);
    }
    {
      const rawPath = c.req.path;
      const m = rawPath.match(/^\/(en\/)?(tag|author|feed|comments|news|wp-(?:json|admin|content|includes|login\.php)|xmlrpc\.php|readme\.html|license\.txt|blog)(?:\/|$)/);
      if (m) {
        const base = m[1] || "";
        const target = m[2] === "tag" ? `${base}virtual-credit-card/` : base;
        return c.redirect(`/${target}`, 301);
      }
      const d = rawPath.match(/^\/(en\/)?\d{4}(?:\/\d{2})?(?:\/.*)?$/);
      if (d) return c.redirect(`/${d[1] || ""}`, 301);
      if (/\/null\/?$/.test(rawPath)) {
        return c.redirect(rawPath.replace(/\/null\/?$/, "/"), 301);
      }
    }
    return c.html(layout(lang, "404 Not Found - VirtualCardx", "Page not found", `
    <div class="notfound">
      <div class="code">404</div>
      <h1>${lang === "en" ? "Page not found" : "\u9875\u9762\u4E0D\u5B58\u5728"}</h1>
      <p><a href="${baseOf(lang)}">${lang === "en" ? "\u2190 Back to home" : "\u2190 \u8FD4\u56DE\u9996\u9875"}</a></p>
    </div>`, { noSidebar: true }), 404);
  } catch (e) {
    return c.text("ERROR: " + e.message + "\n" + (e.stack || "").split("\n").slice(0, 5).join("\n"));
  }
});
export {
  index_default as default
};
