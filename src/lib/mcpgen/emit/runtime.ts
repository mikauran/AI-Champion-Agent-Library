// Embedded Python runtime helpers. These are fixed text, reviewed in one place; the emitter only
// adds data tables and tool bodies around them. Rules they enforce (design doc section 5):
//  - every failure is a fixed, caller-safe message: never str(exception), never a traceback,
//    never an upstream body (rows 7 and 8);
//  - error shape keys are ok/kind/message/hint (at most one of the four leak-detector words);
//  - responses are projected to at most 12 fields (row 2); page sizes are clamped (row 3).

export const RUNTIME_COMMON = `PROJECTION_MAX_FIELDS = 12
_INTERNAL_MESSAGE = "The tool could not complete the request."
_MATCH_MODES = ("equals", "contains", "startsWith")


class _Fail(Exception):
    """A failure with a fixed, caller-safe message. Never built from exception text."""

    def __init__(self, kind, message, hint=None):
        super().__init__(kind)
        self.kind = kind
        self.message = message
        self.hint = hint


def _err(kind, message, hint=None):
    return {"ok": False, "kind": kind, "message": message, "hint": hint}


def _fail(failure):
    return _err(failure.kind, failure.message, failure.hint)


def _no_results(entity, hint=None):
    return {
        "ok": True,
        "results": [],
        "count": 0,
        "message": "No matches found for the requested " + entity + " filter.",
        "hint": hint,
    }


def _not_found(entity, identifier):
    text = "".join(ch for ch in str(identifier) if ch.isprintable())[:80]
    return _err("not_found", "No " + entity + " found for " + text + ".")


def _clamp(n, lo, hi):
    try:
        n = int(n)
    except (TypeError, ValueError, OverflowError):
        n = lo
    return max(lo, min(hi, n))


def _bound(v, lo=None, hi=None):
    try:
        v = float(v)
    except (TypeError, ValueError, OverflowError):
        v = lo if lo is not None else 0.0
    if v != v:
        v = lo if lo is not None else 0.0
    if lo is not None:
        v = max(lo, v)
    if hi is not None:
        v = min(hi, v)
    return v


def _qv(value):
    if isinstance(value, bool):
        return "true" if value else "false"
    return str(value)


def _project(obj, fields):
    """Keep only the listed fields (at most 12). Unlisted fields are never forwarded."""
    if not isinstance(obj, dict):
        return {}
    return {name: obj[name] for name in list(fields)[:PROJECTION_MAX_FIELDS] if name in obj}


def _select_fields(requested, allowed, default):
    if isinstance(requested, (list, tuple)):
        picked = []
        for name in requested:
            if isinstance(name, str) and name in allowed and name not in picked:
                picked.append(name)
        if picked:
            return picked[:PROJECTION_MAX_FIELDS]
    return list(default)[:PROJECTION_MAX_FIELDS]


def _num(value):
    try:
        number = float(str(value).strip())
    except (TypeError, ValueError):
        return None
    return number if math.isfinite(number) else None


def _match(cell, mode, value):
    """Case-insensitive match; equals compares numerically when both sides are numbers."""
    text = "" if cell is None else str(cell).strip()
    wanted = str(value).strip()
    if mode == "equals":
        a, b = _num(text), _num(wanted)
        if a is not None and b is not None:
            return a == b
        return text.casefold() == wanted.casefold()
    if mode == "contains":
        return wanted.casefold() in text.casefold()
    if mode == "startsWith":
        return text.casefold().startswith(wanted.casefold())
    return False
`

export const RUNTIME_QUERY = `

def _query_problem(allowed, describe_tool, field, value, match):
    if match not in _MATCH_MODES:
        return _err("invalid_argument", "match must be one of: equals, contains, startsWith.")
    if (field is None) != (value is None):
        return _err("invalid_argument", "Give both field and value to filter, or neither to list rows.")
    if field is not None and field not in allowed:
        return _err("invalid_argument", "Unknown field. Call " + describe_tool + " to list the available fields.")
    if value is not None and len(str(value)) > 256:
        return _err("invalid_argument", "value is too long (at most 256 characters).")
    return None
`

/** HTTP runtime. The auth branch is emitted only for the scheme the source declares. */
export function runtimeHttp(scheme: 'none' | 'apiKeyHeader' | 'apiKeyQuery' | 'bearer'): string {
  const authLines: Record<string, string[]> = {
    none: [],
    apiKeyHeader: ['    headers[AUTH_NAME] = key'],
    apiKeyQuery: ['    query[AUTH_NAME] = key'],
    bearer: ['    headers["Authorization"] = "Bearer " + key'],
  }
  const authBlock =
    scheme === 'none'
      ? ''
      : [
          '    key = os.environ.get(AUTH_ENV, "")',
          '    if not key:',
          '        raise _Fail("auth", _AUTH_MESSAGE)',
          ...authLines[scheme],
        ].join('\n') + '\n'
  return `

_ENVELOPE_KEYS = ("items", "results", "data", "content", "records", "rows", "entries", "values")


def _raw_get(path, params):
    """One upstream GET. Returns (status code, body text). Tests replace this function."""
    base = os.environ.get(BASE_URL_ENV, "")
    if not base:
        raise _Fail("config", "The server is not configured: set " + BASE_URL_ENV + ".")
    headers = {"Accept": "application/json"}
    query = dict(params or {})
${authBlock}    response = httpx.get(
        base.rstrip("/") + path,
        params=query,
        headers=headers,
        timeout=10.0,
        follow_redirects=False,
    )
    return response.status_code, response.text


def _map_http_failure(code):
    """Map an upstream status code to a fixed failure, or None when the call succeeded."""
    if code in (401, 403):
        return _Fail("auth", _AUTH_MESSAGE)
    if code == 404:
        return _Fail("not_found", "The requested item was not found.")
    if code == 429 or code >= 500:
        return _Fail("upstream", _UPSTREAM_MESSAGE)
    if code < 200 or code >= 300:
        return _Fail("invalid_request", "The upstream service rejected the request; check the arguments.")
    return None


def _http_json(path, params=None):
    attempt = 0
    while True:
        try:
            code, text = _raw_get(path, params)
        except _Fail:
            raise
        except Exception:
            code, text = None, ""
        transient = code is None or code == 429 or code >= 500
        if transient and attempt < MAX_RETRIES:
            attempt += 1
            time.sleep(0.5 * attempt)
            continue
        if code is None:
            raise _Fail("upstream", _UPSTREAM_MESSAGE)
        failure = _map_http_failure(code)
        if failure is not None:
            raise failure
        if len(text) > MAX_RESPONSE_CHARS:
            raise _Fail("upstream", "The upstream service returned more data than this server accepts; narrow the request.")
        try:
            return json.loads(text)
        except ValueError:
            raise _Fail("upstream", "The upstream service returned an unreadable response.")


def _seg(value):
    text = str(value).strip()
    if not text or len(text) > 128:
        raise _Fail("invalid_argument", "The identifier must be between 1 and 128 characters.")
    return urllib.parse.quote(text, safe="")


def _dicts(values):
    return [entry for entry in values if isinstance(entry, dict)]


def _rows(data):
    """Rows from a list response or from a common envelope. Anything else is an honest failure."""
    if isinstance(data, list):
        return _dicts(data)
    if isinstance(data, dict):
        for name in _ENVELOPE_KEYS:
            if isinstance(data.get(name), list):
                return _dicts(data[name])
        lists = [value for value in data.values() if isinstance(value, list)]
        if len(lists) == 1:
            return _dicts(lists[0])
    raise _Fail("upstream", "The upstream service returned an unexpected response shape.")


def _item(data):
    if isinstance(data, list):
        rows = _dicts(data)
        return rows[0] if rows else None
    if isinstance(data, dict):
        for name in _ENVELOPE_KEYS:
            if isinstance(data.get(name), list):
                rows = _dicts(data[name])
                return rows[0] if rows else None
        return data or None
    return None


def _nested_hits(entries, key_fields, value_fields, needle, value):
    """Entries of a nested array that match the key (and the value when given)."""
    hits = []
    if not isinstance(entries, list):
        return hits
    targets = list(key_fields) or list(value_fields)
    for entry in entries:
        if not isinstance(entry, dict):
            continue
        if not any(_match(entry.get(name), "equals", needle) for name in targets):
            continue
        if value is not None and key_fields and value_fields:
            if not any(_match(entry.get(name), "equals", value) for name in value_fields):
                continue
        hits.append({name: entry.get(name) for name in list(key_fields) + list(value_fields) if name in entry})
        if len(hits) >= 20:
            break
    return hits
`
}

export const RUNTIME_DATASET = `

_ROWS = None


def _load_rows():
    """Load the whole file first, then assign module state (never half-loaded)."""
    global _ROWS
    if _ROWS is None:
        path = os.environ.get(DATA_FILE_ENV, "")
        if not path:
            raise _Fail("config", "The server is not configured: set " + DATA_FILE_ENV + ".")
        try:
            with open(path, newline="", encoding="utf-8-sig") as handle:
                loaded = [dict(row) for row in csv.DictReader(handle)]
        except (OSError, csv.Error, UnicodeDecodeError):
            raise _Fail("config", "The data file could not be read; check " + DATA_FILE_ENV + ".")
        _ROWS = loaded
    return _ROWS
`

export const RUNTIME_SQL = `

def _like(value):
    return str(value).replace("!", "!!").replace("%", "!%").replace("_", "!_")


def _connect():
    """Read-only SQLite connection (the DSN variable holds a database file location)."""
    location = os.environ.get(DSN_ENV, "")
    if not location:
        raise _Fail("config", "The server is not configured: set " + DSN_ENV + ".")
    try:
        conn = sqlite3.connect(pathlib.Path(location).resolve().as_uri() + "?mode=ro", uri=True)
        conn.execute("PRAGMA query_only = ON")
        return conn
    except (sqlite3.Error, OSError, ValueError):
        raise _Fail("config", "The database could not be opened; check " + DSN_ENV + ".")


def _sql_query(entity, selected, field, match, value, limit, offset):
    """Parameterised query. Table and column names come only from the generated allow-list."""
    spec = _TABLES[entity]
    columns = spec["columns"]
    sql = "SELECT " + ", ".join(columns[name] for name in selected) + " FROM " + spec["table"]
    args = []
    if field is not None:
        column = columns[field]
        if match == "equals":
            sql += " WHERE " + column + " = ?"
            args.append(str(value))
        elif match == "contains":
            sql += " WHERE " + column + " LIKE ? ESCAPE '!'"
            args.append("%" + _like(value) + "%")
        else:
            sql += " WHERE " + column + " LIKE ? ESCAPE '!'"
            args.append(_like(value) + "%")
    if spec["order"]:
        sql += " ORDER BY " + spec["order"]
    sql += " LIMIT ? OFFSET ?"
    args.extend([limit, offset])
    conn = _connect()
    try:
        cursor = conn.execute(sql, args)
        return [dict(zip(selected, record)) for record in cursor.fetchall()]
    except sqlite3.Error:
        raise _Fail("upstream", "The database could not answer the query.")
    finally:
        conn.close()
`
